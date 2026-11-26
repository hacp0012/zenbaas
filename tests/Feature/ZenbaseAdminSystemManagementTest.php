<?php

use App\Actions\Fortify\CreateNewUser;
use App\Models\App;
use App\Models\PlatformSetting;
use App\Models\User;
use App\Modules\Storage\Exceptions\StorageQuotaExceededException;
use App\Modules\Storage\Services\StorageManagerService;
use App\Services\TenantManagerService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;

uses(RefreshDatabase::class);

test('non-admin users receive 403 on all new admin settings and diagnostic routes', function () {
    $client = User::factory()->create();

    $this->actingAs($client)->get(route('admin.settings.configs'))->assertForbidden();
    $this->actingAs($client)->put(route('admin.settings.configs.update'), [])->assertForbidden();
    $this->actingAs($client)->get(route('admin.settings.storage'))->assertForbidden();
    $this->actingAs($client)->put(route('admin.settings.storage.update'), [])->assertForbidden();
    $this->actingAs($client)->get(route('admin.diagnostic.apps'))->assertForbidden();
    $this->actingAs($client)->get(route('admin.diagnostic.logs'))->assertForbidden();
    $this->actingAs($client)->delete(route('admin.diagnostic.logs.clear'))->assertForbidden();
});

test('admin can configure global default settings and new users and apps inherit them', function () {
    $admin = User::factory()->admin()->create();

    $this->actingAs($admin)
        ->get(route('admin.settings.configs'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('admin/settings/configs')
            ->where('configs.default_user_max_apps', 1)
            ->where('configs.default_api_rate_limit', 120)
            ->where('configs.default_function_mail_per_minute', 30)
            ->where('configs.default_function_mail_per_invocation', 5)
            ->where('configs.default_function_mail_max_recipients', 10)
            ->where('configs.default_function_http_per_invocation', 5)
            ->where('configs.default_function_http_timeout_seconds', 3)
        );

    $this->actingAs($admin)
        ->put(route('admin.settings.configs.update'), [
            'default_user_expiration_days' => 45,
            'default_user_max_storage_mb' => 250,
            'default_user_max_apps' => 4,
            'default_rate_limit_enabled' => true,
            'default_rate_limit_key_by' => 'ip',
            'default_api_rate_limit' => 300,
            'default_auth_rate_limit' => 20,
            'default_functions_rate_limit' => 90,
            'default_storage_rate_limit' => 50,
            'default_mcp_rate_limit' => 150,
            'default_function_mail_per_minute' => 60,
            'default_function_mail_per_invocation' => 8,
            'default_function_mail_max_recipients' => 20,
            'default_function_http_per_invocation' => 12,
            'default_function_http_timeout_seconds' => 4,
        ])
        ->assertRedirect()
        ->assertSessionHas('success');

    $saved = PlatformSetting::allSettings();
    expect($saved['default_user_expiration_days'])->toBe(45);
    expect($saved['default_user_max_storage_mb'])->toBe(250);
    expect($saved['default_user_max_apps'])->toBe(4);
    expect($saved['default_api_rate_limit'])->toBe(300);
    expect($saved['default_rate_limit_key_by'])->toBe('ip');
    expect($saved['default_function_mail_per_minute'])->toBe(60);
    expect($saved['default_function_mail_per_invocation'])->toBe(8);
    expect($saved['default_function_mail_max_recipients'])->toBe(20);
    expect($saved['default_function_http_per_invocation'])->toBe(12);
    expect($saved['default_function_http_timeout_seconds'])->toBe(4);

    // Newly self-registered user inherits platform defaults
    $newUser = app(CreateNewUser::class)->create([
        'name' => 'Dev Inscrit',
        'email' => 'inscrit@zenbase.test',
        'password' => 'Password123!',
        'password_confirmation' => 'Password123!',
    ]);

    expect($newUser->max_apps)->toBe(4);
    expect($newUser->max_storage_mb)->toBe(250);
    expect($newUser->expires_at)->not->toBeNull();

    // Mark email as verified to pass the dashboard 'verified' middleware
    $newUser->forceFill(['email_verified_at' => now()])->save();

    // Newly created app inherits default rate limit settings including Web Functions mail & HTTP quotas
    $this->actingAs($newUser)
        ->post(route('dashboard.apps.store'), [
            'name' => 'App Héritée',
            'description' => 'Teste les valeurs par défaut',
        ])
        ->assertRedirect()
        ->assertSessionHas('success');

    $createdApp = App::query()->where('user_id', $newUser->id)->firstOrFail();
    $appLimits = $createdApp->rateLimitSettings();
    expect($appLimits['api_per_minute'])->toBe(300);
    expect($appLimits['key_by'])->toBe('ip');
    expect($appLimits['auth_per_minute'])->toBe(20);
    expect($appLimits['function_mail_per_minute'])->toBe(60);
    expect($appLimits['function_mail_per_invocation'])->toBe(8);
    expect($appLimits['function_mail_max_recipients'])->toBe(20);
    expect($appLimits['function_http_per_invocation'])->toBe(12);
    expect($appLimits['function_http_timeout_seconds'])->toBe(4);

    app(TenantManagerService::class)->deleteDatabase($createdApp);
});

test('admin global config validation rejects out-of-range web function mail and http limits', function () {
    $admin = User::factory()->admin()->create();

    $this->actingAs($admin)
        ->put(route('admin.settings.configs.update'), [
            'default_user_expiration_days' => null,
            'default_user_max_storage_mb' => 100,
            'default_user_max_apps' => 1,
            'default_rate_limit_enabled' => true,
            'default_rate_limit_key_by' => 'app',
            'default_api_rate_limit' => 120,
            'default_auth_rate_limit' => 30,
            'default_functions_rate_limit' => 60,
            'default_storage_rate_limit' => 60,
            'default_mcp_rate_limit' => 120,
            'default_function_mail_per_minute' => 0,
            'default_function_mail_per_invocation' => 99,
            'default_function_mail_max_recipients' => 100,
            'default_function_http_per_invocation' => 50,
            'default_function_http_timeout_seconds' => 10,
        ])
        ->assertSessionHasErrors([
            'default_function_mail_per_minute',
            'default_function_mail_per_invocation',
            'default_function_mail_max_recipients',
            'default_function_http_per_invocation',
            'default_function_http_timeout_seconds',
        ]);
});

test('admin can configure global storage quota and uploads enforce the system-wide limit', function () {
    Storage::fake('public');

    $admin = User::factory()->admin()->create();
    $client = User::factory()->create(['max_storage_mb' => null]);
    $app = App::factory()->create(['user_id' => $client->id]);

    $this->actingAs($admin)
        ->get(route('admin.settings.storage'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('admin/settings/storage')
            ->where('storageConfig.global_max_storage_mb', null)
        );

    // Set global platform storage limit to 10 MB
    $this->actingAs($admin)
        ->put(route('admin.settings.storage.update'), [
            'global_max_storage_mb' => 10,
        ])
        ->assertRedirect()
        ->assertSessionHas('success');

    expect(PlatformSetting::allSettings()['global_max_storage_mb'])->toBe(10);

    // Attempting to store more than 10 MB triggers StorageQuotaExceededException even though user quota is unlimited
    $storageManager = app(StorageManagerService::class);
    expect(fn () => $storageManager->ensureStorageQuotaAvailable($app, 11 * 1024 * 1024))
        ->toThrow(StorageQuotaExceededException::class);

    app(TenantManagerService::class)->deleteDatabase($app);
});

test('admin diagnostic app list supports filtering and pagination and dashboard renders summary charts', function () {
    $admin = User::factory()->admin()->create();
    $activeClient = User::factory()->create(['name' => 'Alice Active', 'is_suspended' => false]);
    $suspendedClient = User::factory()->suspended()->create(['name' => 'Bob Suspendu']);

    $app1 = App::factory()->create([
        'user_id' => $activeClient->id,
        'name' => 'Alpha CRM',
        'api_calls_count' => 500,
        'settings' => ['mcp' => ['enabled' => true, 'read_only' => true]],
    ]);
    $app2 = App::factory()->create([
        'user_id' => $suspendedClient->id,
        'name' => 'Beta Store',
        'api_calls_count' => 100,
        'settings' => ['mcp' => ['enabled' => false, 'read_only' => true]],
    ]);

    // Admin Dashboard renders summary charts without full apps list
    $this->actingAs($admin)
        ->get(route('admin.dashboard'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('admin/dashboard')
            ->has('charts.top_apps_by_api', 2)
            ->has('charts.apps_timeline', 6)
            ->has('charts.storage_distribution', 2)
            ->missing('apps')
        );

    // Diagnostic App List filters by search, owner status, and MCP status
    $this->actingAs($admin)
        ->get(route('admin.diagnostic.apps', ['search' => 'Alpha', 'mcp_status' => 'enabled']))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('admin/diagnostic/apps')
            ->where('paginatedApps.total', 1)
            ->where('paginatedApps.items.0.name', 'Alpha CRM')
        );

    $this->actingAs($admin)
        ->get(route('admin.diagnostic.apps', ['owner_status' => 'suspended']))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('admin/diagnostic/apps')
            ->where('paginatedApps.total', 1)
            ->where('paginatedApps.items.0.name', 'Beta Store')
        );

    // Diagnostic Logs page renders cleanly
    $this->actingAs($admin)
        ->get(route('admin.diagnostic.logs', ['level' => 'ERROR']))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('admin/diagnostic/logs')
            ->where('filters.level', 'ERROR')
            ->has('levelCounts')
        );

    app(TenantManagerService::class)->deleteDatabase($app1);
    app(TenantManagerService::class)->deleteDatabase($app2);
});
