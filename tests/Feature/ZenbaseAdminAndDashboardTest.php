<?php

use App\Models\App;
use App\Models\User;
use App\Modules\Auth\Models\TenantUser;
use App\Services\TenantManagerService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

uses(RefreshDatabase::class);

test('non-admin users receive 403 when visiting admin routes', function () {
    $client = User::factory()->create();

    $this->actingAs($client)
        ->get(route('admin.dashboard'))
        ->assertForbidden();
});

test('admin users can view the global dashboard and manage client accounts', function () {
    $admin = User::factory()->admin()->create();
    $client = User::factory()->create(['name' => 'Jean Client']);

    $this->actingAs($admin)
        ->get(route('admin.dashboard'))
        ->assertOk();

    // Admin visiting /dashboard is redirected to /admin/dashboard and cannot create client apps
    $this->actingAs($admin)
        ->get(route('dashboard'))
        ->assertRedirect(route('admin.dashboard'));

    $this->actingAs($admin)
        ->post(route('dashboard.apps.store'), [
            'name' => 'App Interdite Admin',
        ])
        ->assertForbidden();

    $this->actingAs($admin)
        ->post(route('admin.users.store'), [
            'name' => 'Nouveau Dev',
            'email' => 'dev@zenbase.test',
            'password' => 'password123',
            'is_admin' => false,
        ])
        ->assertRedirect();

    $this->assertDatabaseHas('users', [
        'email' => 'dev@zenbase.test',
        'is_admin' => false,
    ]);

    // Admin can update a user's name and email
    $this->actingAs($admin)
        ->put(route('admin.users.update', $client), [
            'name' => 'Jean Client Modifié',
            'email' => 'jean.modifie@zenbase.test',
        ])
        ->assertRedirect()
        ->assertSessionHas('success');

    $this->assertDatabaseHas('users', [
        'id' => $client->id,
        'name' => 'Jean Client Modifié',
        'email' => 'jean.modifie@zenbase.test',
    ]);

    // Duplicate email is rejected
    $this->actingAs($admin)
        ->put(route('admin.users.update', $client), [
            'name' => 'Doublon',
            'email' => 'dev@zenbase.test',
        ])
        ->assertSessionHasErrors('email');

    // Non-admin cannot update user profiles
    $this->actingAs($client)
        ->put(route('admin.users.update', $admin), [
            'name' => 'Pirate',
            'email' => 'pirate@zenbase.test',
        ])
        ->assertForbidden();

    $this->actingAs($admin)
        ->patch(route('admin.users.toggle_status', $client))
        ->assertRedirect();

    expect($client->fresh()->is_suspended)->toBeTrue();

    $this->actingAs($admin)
        ->delete(route('admin.users.destroy', $client))
        ->assertRedirect();

    $this->assertDatabaseMissing('users', ['id' => $client->id]);
});

test('admin users index supports filtering by search, role, status, sorting, and pagination', function () {
    $admin = User::factory()->admin()->create([
        'name' => 'Root SuperAdmin',
        'email' => 'root@zenbase.test',
    ]);

    User::factory()->create([
        'name' => 'Alice Active',
        'email' => 'alice@zenbase.test',
        'is_suspended' => false,
    ]);

    User::factory()->suspended()->create([
        'name' => 'Bob Suspended',
        'email' => 'bob@zenbase.test',
    ]);

    User::factory()->expired()->create([
        'name' => 'Charlie Expired',
        'email' => 'charlie@zenbase.test',
    ]);

    User::factory()->count(12)->create();

    // Default pagination (15 per page, 16 total users -> page 1 has 15, page 2 has 1)
    $this->actingAs($admin)
        ->get(route('admin.users.index'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('admin/users/index')
            ->where('users.total', 16)
            ->where('users.page', 1)
            ->where('users.last_page', 2)
            ->where('users.per_page', 15)
            ->has('users.items', 15)
            ->where('stats.total', 16)
            ->where('stats.admins', 1)
            ->where('stats.suspended', 2)
            ->where('stats.expired', 1)
        );

    // Page 2 with custom per_page=10
    $this->actingAs($admin)
        ->get(route('admin.users.index', ['per_page' => 10, 'page' => 2]))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('users.page', 2)
            ->where('users.last_page', 2)
            ->where('users.per_page', 10)
            ->has('users.items', 6)
        );

    // Search by name / email
    $this->actingAs($admin)
        ->get(route('admin.users.index', ['search' => 'alice@zenbase']))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('users.total', 1)
            ->where('users.items.0.email', 'alice@zenbase.test')
        );

    // Role filter (admin only)
    $this->actingAs($admin)
        ->get(route('admin.users.index', ['role' => 'admin']))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('users.total', 1)
            ->where('users.items.0.email', 'root@zenbase.test')
        );

    // Status filter (expired only)
    $this->actingAs($admin)
        ->get(route('admin.users.index', ['status' => 'expired']))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('users.total', 1)
            ->where('users.items.0.email', 'charlie@zenbase.test')
        );

    // Status filter (suspended includes manually suspended + expired)
    $this->actingAs($admin)
        ->get(route('admin.users.index', ['status' => 'suspended']))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('users.total', 2)
        );

    // Sort by name ascending
    $this->actingAs($admin)
        ->get(route('admin.users.index', ['role' => 'client', 'status' => 'suspended', 'sort' => 'name', 'direction' => 'asc']))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('users.items.0.name', 'Bob Suspended')
            ->where('users.items.1.name', 'Charlie Expired')
        );
});

test('suspended or expired users are redirected to the account suspended page when accessing the client dashboard', function () {
    $suspendedUser = User::factory()->suspended()->create();

    $this->actingAs($suspendedUser)
        ->get(route('dashboard'))
        ->assertRedirect(route('account.suspended'));

    $this->actingAs($suspendedUser)
        ->get(route('account.suspended'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('auth/account-suspended')
            ->where('email', $suspendedUser->email)
        );

    $expiredUser = User::factory()->expired()->create();

    $this->actingAs($expiredUser)
        ->get(route('dashboard'))
        ->assertRedirect(route('account.suspended'));

    expect($expiredUser->fresh()->is_suspended)->toBeTrue();
});

test('admin can configure client max_apps quota and expiration date and client is restricted by max_apps', function () {
    $admin = User::factory()->admin()->create();
    $client = User::factory()->create(['max_apps' => 1]);

    // First app creation succeeds (default quota = 1)
    $this->actingAs($client)
        ->post(route('dashboard.apps.store'), [
            'name' => 'App 1 Autorisée',
        ])
        ->assertRedirect();

    expect($client->apps()->count())->toBe(1);

    // Second app creation is blocked because max_apps is 1
    $this->actingAs($client)
        ->post(route('dashboard.apps.store'), [
            'name' => 'App 2 Refusée',
        ])
        ->assertSessionHasErrors('name');

    expect($client->apps()->count())->toBe(1);

    // Admin increases max_apps to 3 and sets a future expiration date
    $futureDate = now()->addMonths(6)->toDateTimeString();
    $this->actingAs($admin)
        ->patch(route('admin.users.update_quota', $client), [
            'max_apps' => 3,
            'expires_at' => $futureDate,
        ])
        ->assertRedirect();

    expect($client->fresh()->max_apps)->toBe(3);
    expect($client->fresh()->expires_at)->not->toBeNull();

    // Client can now create a second app
    $this->actingAs($client->fresh())
        ->post(route('dashboard.apps.store'), [
            'name' => 'App 2 Autorisée après quota',
        ])
        ->assertRedirect();

    expect($client->apps()->count())->toBe(2);

    foreach ($client->apps as $createdApp) {
        app(TenantManagerService::class)->deleteDatabase($createdApp);
    }
});

test('clients can create an isolated application and cannot access another tenant application', function () {
    $owner = User::factory()->create();
    $otherClient = User::factory()->create();

    $this->actingAs($owner)
        ->post(route('dashboard.apps.store'), [
            'name' => 'Mon App Mobile',
            'description' => 'Backend Flutter isolé',
        ])
        ->assertRedirect();

    $app = App::query()->where('user_id', $owner->id)->firstOrFail();

    expect($app->public_key)->toStartWith('zb_pub_');
    expect($app->secret_key)->toStartWith('zb_sec_');

    $dbPath = app(TenantManagerService::class)->getDatabasePath($app);
    expect(file_exists($dbPath))->toBeTrue();

    $this->actingAs($owner)
        ->get(route('dashboard.apps.show', $app))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('client/apps/show')
            ->has('analytics.daily_activity', 7)
            ->has('analytics.storage_breakdown', 5)
            ->has('analytics.auth_breakdown')
            ->has('analytics.functions_stats')
        );

    $this->actingAs($owner)
        ->get(route('dashboard.apps.integrations', $app))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('client/apps/integrations')
            ->where('app.public_key', $app->public_key)
        );

    $this->actingAs($owner)
        ->get(route('dashboard.apps.database', $app))
        ->assertOk()
        ->assertInertia(fn ($page) => $page->component('client/apps/database'));

    $this->actingAs($owner)
        ->get(route('dashboard.apps.auth', $app))
        ->assertOk()
        ->assertInertia(fn ($page) => $page->component('client/apps/auth'));

    $this->actingAs($owner)
        ->get(route('dashboard.apps.storage', $app))
        ->assertOk()
        ->assertInertia(fn ($page) => $page->component('client/apps/storage'));

    $this->actingAs($owner)
        ->get(route('dashboard.apps.cors', $app))
        ->assertOk()
        ->assertInertia(fn ($page) => $page->component('client/apps/cors'));

    $this->actingAs($owner)
        ->get(route('dashboard.apps.functions', $app))
        ->assertOk()
        ->assertInertia(fn ($page) => $page->component('client/apps/functions'));

    $this->actingAs($otherClient)
        ->get(route('dashboard.apps.show', $app))
        ->assertNotFound();

    $this->actingAs($otherClient)
        ->get(route('dashboard.apps.integrations', $app))
        ->assertNotFound();

    $this->actingAs($otherClient)
        ->get(route('dashboard.apps.database', $app))
        ->assertNotFound();

    app(TenantManagerService::class)->deleteDatabase($app);
});

test('clients can manage collections, documents, CORS, files, and PHP functions from the dashboard', function () {
    Storage::fake('public');

    $owner = User::factory()->create();
    $app = App::factory()->for($owner)->create();

    // 1. Create collection, define optional schema with BLOB field & insert document
    $this->actingAs($owner)
        ->post(route('dashboard.apps.collections.store', $app), [
            'name' => 'articles',
        ])
        ->assertRedirect();

    $this->actingAs($owner)
        ->put(route('dashboard.apps.collections.schema', [$app, 'articles']), [
            'schema' => json_encode([
                'strict' => true,
                'fields' => [
                    ['name' => 'title', 'type' => 'string', 'required' => true],
                    ['name' => 'published', 'type' => 'boolean', 'required' => true],
                    ['name' => 'cover', 'type' => 'blob', 'required' => false],
                ],
            ]),
        ])
        ->assertRedirect();

    $this->actingAs($owner)
        ->post(route('dashboard.apps.records.store', [$app, 'articles']), [
            'data' => json_encode([
                'title' => 'Premier article',
                'published' => true,
                'cover' => [
                    '__type' => 'blob',
                    'mime_type' => 'image/png',
                    'name' => 'cover.png',
                    'data' => base64_encode('binary-png-content'),
                ],
            ]),
        ])
        ->assertRedirect();

    // 2. Add CORS origin
    $this->actingAs($owner)
        ->post(route('dashboard.apps.cors.store', $app), [
            'origin' => 'https://mon-frontend.com',
        ])
        ->assertRedirect();

    $this->assertDatabaseHas('app_cors', [
        'app_id' => $app->id,
        'origin' => 'https://mon-frontend.com',
    ]);

    // 3. Upload file
    $this->actingAs($owner)
        ->post(route('dashboard.apps.files.store', $app), [
            'file' => UploadedFile::fake()->create('guide.pdf', 64, 'application/pdf'),
            'folder' => '/docs',
        ])
        ->assertRedirect();

    $this->assertDatabaseHas('app_files', [
        'app_id' => $app->id,
        'folder' => '/docs',
        'original_name' => 'guide.pdf',
    ]);

    $uploadedFileModel = $app->files()->where('original_name', 'guide.pdf')->firstOrFail();

    $this->get($uploadedFileModel->url)
        ->assertOk();

    $this->get($uploadedFileModel->url.'?download=1')
        ->assertOk()
        ->assertHeader('Content-Disposition', 'attachment; filename=guide.pdf');

    // 4. Reject unsafe PHP function code containing forbidden calls
    $this->actingAs($owner)
        ->post(route('dashboard.apps.functions.store', $app), [
            'name' => 'unsafe-fn',
            'code' => 'return function($event, $context) { system("whoami"); };',
        ])
        ->assertSessionHasErrors('code');

    // 5. Create and invoke valid PHP function
    $this->actingAs($owner)
        ->post(route('dashboard.apps.functions.store', $app), [
            'name' => 'hello-world',
            'description' => 'Salutation',
            'code' => 'return function($event, $context) { return ["status" => 200, "data" => ["hello" => $event["payload"]["name"] ?? "World"]]; };',
            'env_variables' => ['SECRET' => '123'],
        ])
        ->assertRedirect();

    $fn = $app->functions()->where('name', 'hello-world')->firstOrFail();

    $this->actingAs($owner)
        ->post(route('dashboard.apps.functions.invoke', [$app, $fn]), [
            'payload' => json_encode(['name' => 'Zenbase']),
        ])
        ->assertRedirect();

    expect($fn->fresh()->logs)->toBeArray()->not->toBeEmpty();

    // 6. Test dedicated PHP IDE editor, .php download, .php upload, and environment variables sub-page
    $this->actingAs($owner)
        ->get(route('dashboard.apps.functions.editor', [$app, $fn]))
        ->assertOk()
        ->assertInertia(fn ($page) => $page->component('client/apps/function-editor'));

    $this->actingAs($owner)
        ->get(route('dashboard.apps.functions.download', [$app, $fn]))
        ->assertOk()
        ->assertHeader('Content-Disposition', 'attachment; filename="hello-world.php"');

    $this->actingAs($owner)
        ->get(route('dashboard.apps.functions.env', $app))
        ->assertOk()
        ->assertInertia(fn ($page) => $page->component('client/apps/function-env'));

    $this->actingAs($owner)
        ->put(route('dashboard.apps.functions.env.update', $app), [
            'scope' => 'global',
            'env_variables' => ['GLOBAL_API_KEY' => 'zb_global_secret'],
        ])
        ->assertRedirect();

    expect($app->fresh()->settings['env_variables']['GLOBAL_API_KEY'] ?? null)->toBe('zb_global_secret');

    $uploadedPhp = UploadedFile::fake()->createWithContent(
        'imported-hook.php',
        '<?php return function($event, $context) { return ["status" => 200, "data" => ["env" => $context->env["GLOBAL_API_KEY"] ?? null]]; };'
    );

    $this->actingAs($owner)
        ->post(route('dashboard.apps.functions.upload', $app), [
            'file' => $uploadedPhp,
        ])
        ->assertRedirect();

    expect($app->functions()->where('name', 'imported-hook')->exists())->toBeTrue();

    app(TenantManagerService::class)->deleteDatabase($app);
});

test('public sdk documentation page reads markdown files from /docs and each sdk directory', function () {
    $this->get(route('docs'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('docs/show')
            ->where('currentDoc.path', 'docs/README.md')
            ->where('currentDoc.nav_label', 'Présentation')
            ->where('currentDoc.category', 'Plateforme')
            ->has('documents', 10)
        );

    $this->get(route('docs', ['doc' => 'docs/web-functions.md']))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('docs/show')
            ->where('currentDoc.path', 'docs/web-functions.md')
            ->where('currentDoc.nav_label', 'Web Functions (PHP Serverless)')
            ->where('currentDoc.category', 'Plateforme')
        );

    $this->get(route('docs', ['doc' => 'sdks/js-ts/README.md']))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('docs/show')
            ->where('currentDoc.path', 'sdks/js-ts/README.md')
            ->where('currentDoc.sdk_label', 'Node.js & Web')
            ->where('currentDoc.nav_label', 'Introduction')
        );

    foreach ([
        'sdks/js-ts/docs/getting-started.md' => 'Démarrage & Initialisation',
        'sdks/js-ts/docs/database.md' => 'Base de données',
        'sdks/js-ts/docs/auth.md' => 'Authentification',
        'sdks/js-ts/docs/storage.md' => 'Stockage de fichiers',
        'sdks/js-ts/docs/functions.md' => 'Web Functions',
        'sdks/js-ts/docs/reference.md' => 'Références API',
    ] as $path => $expectedLabel) {
        $this->get(route('docs', ['doc' => $path]))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('docs/show')
                ->where('currentDoc.path', $path)
                ->where('currentDoc.parent_path', 'sdks/js-ts/README.md')
                ->where('currentDoc.nav_label', $expectedLabel)
            );
    }

    // Backward-compatible legacy query parameters resolve to the SDK's getting-started guide
    foreach (['sdks/js-ts.md', 'sdks/js-ts/docs/usage.md'] as $legacyPath) {
        $this->get(route('docs', ['doc' => $legacyPath]))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('docs/show')
                ->where('currentDoc.path', 'sdks/js-ts/docs/getting-started.md')
            );
    }
});

test('admin can set user max storage quota and uploads exceeding the limit are rejected', function () {
    Storage::fake('public');

    $admin = User::factory()->admin()->create();
    $client = User::factory()->create(['max_storage_mb' => 1]);
    $app = App::factory()->for($client)->create();

    // Admin creates a user with custom storage quota
    $this->actingAs($admin)
        ->post(route('admin.users.store'), [
            'name' => 'Dev Quota Stockage',
            'email' => 'storage-dev@zenbase.test',
            'password' => 'password123',
            'max_apps' => 2,
            'max_storage_mb' => 250,
        ])
        ->assertRedirect();

    $this->assertDatabaseHas('users', [
        'email' => 'storage-dev@zenbase.test',
        'max_storage_mb' => 250,
    ]);

    // Upload within 1 MB limit succeeds (600 KB)
    $this->actingAs($client)
        ->post(route('dashboard.apps.files.store', $app), [
            'file' => UploadedFile::fake()->create('part1.bin', 600),
            'folder' => '/uploads',
        ])
        ->assertRedirect()
        ->assertSessionHasNoErrors();

    // Second upload (600 KB -> 1.2 MB total > 1 MB quota) is rejected
    $this->actingAs($client)
        ->post(route('dashboard.apps.files.store', $app), [
            'file' => UploadedFile::fake()->create('part2.bin', 600),
            'folder' => '/uploads',
        ])
        ->assertSessionHasErrors('file');

    expect($app->files()->count())->toBe(1);

    // Admin increases client max_storage_mb to 5 MB
    $this->actingAs($admin)
        ->patch(route('admin.users.update_quota', $client), [
            'max_apps' => 1,
            'max_storage_mb' => 5,
            'expires_at' => null,
        ])
        ->assertRedirect();

    expect($client->fresh()->max_storage_mb)->toBe(5);

    // Second upload now succeeds
    $this->actingAs($client->fresh())
        ->post(route('dashboard.apps.files.store', $app), [
            'file' => UploadedFile::fake()->create('part2.bin', 600),
            'folder' => '/uploads',
        ])
        ->assertRedirect()
        ->assertSessionHasNoErrors();

    expect($app->files()->count())->toBe(2);

    // Admin sets unlimited storage (null)
    $this->actingAs($admin)
        ->patch(route('admin.users.update_quota', $client), [
            'max_apps' => 1,
            'max_storage_mb' => null,
            'expires_at' => null,
        ])
        ->assertRedirect();

    expect($client->fresh()->max_storage_mb)->toBeNull();

    app(TenantManagerService::class)->deleteDatabase($app);
});

test('unavailable routes render the custom 404 inertia page', function () {
    $this->get('/route-inexistante-zenbase')
        ->assertNotFound()
        ->assertInertia(fn ($page) => $page
            ->component('errors/not-found')
            ->where('status', 404)
            ->where('path', 'route-inexistante-zenbase')
        );
});

test('app owners can create and edit tenant user name and email with strict ownership and uniqueness checks', function () {
    $owner = User::factory()->create();
    $otherClient = User::factory()->create();
    $app = App::factory()->create(['user_id' => $owner->id]);

    // Create two tenant users (one with a name)
    $this->actingAs($owner)
        ->post(route('dashboard.apps.users.store', $app), [
            'name' => 'Alice Initiale',
            'email' => 'alice@app.test',
            'password' => 'secret123',
        ])
        ->assertRedirect()
        ->assertSessionHas('success');

    $this->actingAs($owner)
        ->post(route('dashboard.apps.users.store', $app), [
            'email' => 'bob@app.test',
            'password' => 'secret123',
        ])
        ->assertRedirect();

    app(TenantManagerService::class)->connect($app);
    $alice = TenantUser::query()->where('email', 'alice@app.test')->firstOrFail();
    expect($alice->name)->toBe('Alice Initiale');

    // Owner updates Alice's name and email
    $this->actingAs($owner)
        ->put(route('dashboard.apps.users.update', [$app, $alice->id]), [
            'name' => 'Alice Modifiée',
            'email' => 'alice.new@app.test',
        ])
        ->assertRedirect()
        ->assertSessionHas('success');

    $alice->refresh();
    expect($alice->name)->toBe('Alice Modifiée');
    expect($alice->email)->toBe('alice.new@app.test');

    // Duplicate email within the same app is rejected
    $this->actingAs($owner)
        ->put(route('dashboard.apps.users.update', [$app, $alice->id]), [
            'name' => 'Doublon',
            'email' => 'bob@app.test',
        ])
        ->assertSessionHasErrors('email');

    // Non-owner receives 404 (AuthorizesAppOwnership)
    $this->actingAs($otherClient)
        ->put(route('dashboard.apps.users.update', [$app, $alice->id]), [
            'name' => 'Intrus',
            'email' => 'intrus@app.test',
        ])
        ->assertNotFound();

    // Auth page renders updated user name and supports searching by name
    $this->actingAs($owner)
        ->get(route('dashboard.apps.auth', ['app' => $app, 'search' => 'Modifiée']))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('client/apps/auth')
            ->where('tenantUsers.total', 1)
            ->has('tenantUsers.items', 1)
            ->where('tenantUsers.items.0.name', 'Alice Modifiée')
            ->where('tenantUsers.items.0.email', 'alice.new@app.test')
        );

    app(TenantManagerService::class)->deleteDatabase($app);
});

test('client app auth page supports filtering by search, auth method, status, sorting, and pagination', function () {
    $owner = User::factory()->create();
    $app = App::factory()->create(['user_id' => $owner->id]);

    app(TenantManagerService::class)->connect($app);

    TenantUser::query()->create([
        'name' => 'Alice Password',
        'email' => 'alice@tenant.test',
        'password_hash' => bcrypt('secret123'),
        'auth_method' => 'password',
        'is_blocked' => false,
    ]);

    TenantUser::query()->create([
        'name' => 'Bob OTP Blocked',
        'email' => 'bob@tenant.test',
        'auth_method' => 'otp',
        'is_blocked' => true,
    ]);

    TenantUser::query()->create([
        'name' => 'Charlie OTP Active',
        'email' => 'charlie@tenant.test',
        'auth_method' => 'otp',
        'is_blocked' => false,
    ]);

    for ($i = 1; $i <= 14; $i++) {
        TenantUser::query()->create([
            'name' => sprintf('User %02d', $i),
            'email' => sprintf('user%02d@tenant.test', $i),
            'password_hash' => bcrypt('secret123'),
            'auth_method' => 'password',
            'is_blocked' => false,
        ]);
    }

    // Default pagination (15 per page, 17 total -> page 1 has 15, page 2 has 2)
    $this->actingAs($owner)
        ->get(route('dashboard.apps.auth', $app))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('client/apps/auth')
            ->where('tenantUsers.total', 17)
            ->where('tenantUsers.page', 1)
            ->where('tenantUsers.last_page', 2)
            ->where('tenantUsers.per_page', 15)
            ->has('tenantUsers.items', 15)
            ->where('userFilters.auth_method', 'all')
            ->where('userFilters.status', 'all')
        );

    // Custom per_page=10 on page 2
    $this->actingAs($owner)
        ->get(route('dashboard.apps.auth', ['app' => $app, 'per_page' => 10, 'page' => 2]))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('tenantUsers.page', 2)
            ->where('tenantUsers.last_page', 2)
            ->where('tenantUsers.per_page', 10)
            ->has('tenantUsers.items', 7)
        );

    // Filter by auth_method=otp
    $this->actingAs($owner)
        ->get(route('dashboard.apps.auth', ['app' => $app, 'auth_method' => 'otp']))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('tenantUsers.total', 2)
            ->has('tenantUsers.items', 2)
            ->where('userFilters.auth_method', 'otp')
        );

    // Filter by status=blocked
    $this->actingAs($owner)
        ->get(route('dashboard.apps.auth', ['app' => $app, 'status' => 'blocked']))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('tenantUsers.total', 1)
            ->where('tenantUsers.items.0.email', 'bob@tenant.test')
        );

    // Combined filter (auth_method=otp & status=active) + sort by email asc
    $this->actingAs($owner)
        ->get(route('dashboard.apps.auth', [
            'app' => $app,
            'auth_method' => 'otp',
            'status' => 'active',
            'sort' => 'email',
            'direction' => 'asc',
        ]))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('tenantUsers.total', 1)
            ->where('tenantUsers.items.0.email', 'charlie@tenant.test')
        );

    // Search by email case-insensitively
    $this->actingAs($owner)
        ->get(route('dashboard.apps.auth', ['app' => $app, 'search' => 'ALICE@TENANT']))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('tenantUsers.total', 1)
            ->where('tenantUsers.items.0.name', 'Alice Password')
        );

    app(TenantManagerService::class)->deleteDatabase($app);
});
