<?php

use App\Models\App;
use App\Models\User;
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

    $this->actingAs($admin)
        ->patch(route('admin.users.toggle_status', $client))
        ->assertRedirect();

    expect($client->fresh()->is_suspended)->toBeTrue();

    $this->actingAs($admin)
        ->delete(route('admin.users.destroy', $client))
        ->assertRedirect();

    $this->assertDatabaseMissing('users', ['id' => $client->id]);
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
        ->assertInertia(fn ($page) => $page->component('client/apps/show'));

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
