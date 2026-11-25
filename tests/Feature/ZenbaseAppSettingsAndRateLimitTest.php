<?php

use App\Models\App;
use App\Models\User;
use App\Services\TenantManagerService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\RateLimiter;

uses(RefreshDatabase::class);

test('app owners can view and update rate limits and advanced settings with strict ownership enforcement', function () {
    $owner = User::factory()->create();
    $otherUser = User::factory()->create();
    $app = App::factory()->create([
        'user_id' => $owner->id,
        'name' => 'App Initiale',
        'description' => 'Description initiale',
    ]);

    // Owner can access both Settings sub-pages
    $this->actingAs($owner)
        ->get(route('dashboard.apps.settings.rate_limits', $app))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('client/apps/settings/rate-limits')
            ->where('rateLimits.enabled', true)
            ->where('rateLimits.api_per_minute', 120)
            ->where('rateLimits.auth_per_minute', 30)
        );

    $this->actingAs($owner)
        ->get(route('dashboard.apps.settings.advanced', $app))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('client/apps/settings/advanced')
            ->where('app.name', 'App Initiale')
        );

    // Non-owner receives 404 on both GET and PUT routes
    $this->actingAs($otherUser)
        ->get(route('dashboard.apps.settings.rate_limits', $app))
        ->assertNotFound();

    $this->actingAs($otherUser)
        ->get(route('dashboard.apps.settings.advanced', $app))
        ->assertNotFound();

    $this->actingAs($otherUser)
        ->put(route('dashboard.apps.settings.rate_limits.update', $app), [
            'enabled' => false,
            'key_by' => 'ip',
            'api_per_minute' => 250,
            'auth_per_minute' => 20,
            'functions_per_minute' => 50,
            'storage_per_minute' => 40,
            'mcp_per_minute' => 80,
        ])
        ->assertNotFound();

    $this->actingAs($otherUser)
        ->put(route('dashboard.apps.settings.advanced.update', $app), [
            'name' => 'Pirated',
            'description' => 'Nope',
        ])
        ->assertNotFound();

    // Owner updates Rate Limits
    $this->actingAs($owner)
        ->put(route('dashboard.apps.settings.rate_limits.update', $app), [
            'enabled' => true,
            'key_by' => 'ip',
            'api_per_minute' => 300,
            'auth_per_minute' => 15,
            'functions_per_minute' => 90,
            'storage_per_minute' => 45,
            'mcp_per_minute' => 200,
        ])
        ->assertRedirect()
        ->assertSessionHas('success');

    $app->refresh();
    expect($app->rateLimitSettings())->toBe([
        'enabled' => true,
        'key_by' => 'ip',
        'api_per_minute' => 300,
        'auth_per_minute' => 15,
        'functions_per_minute' => 90,
        'storage_per_minute' => 45,
        'mcp_per_minute' => 200,
    ]);
    expect($app->settings['rate_limit'])->toBe(300);

    // Validation rejects out-of-range values
    $this->actingAs($owner)
        ->put(route('dashboard.apps.settings.rate_limits.update', $app), [
            'enabled' => true,
            'key_by' => 'invalid',
            'api_per_minute' => 2,
            'auth_per_minute' => 1,
            'functions_per_minute' => 0,
            'storage_per_minute' => 0,
            'mcp_per_minute' => 1,
        ])
        ->assertSessionHasErrors([
            'key_by',
            'api_per_minute',
            'auth_per_minute',
            'functions_per_minute',
            'storage_per_minute',
            'mcp_per_minute',
        ]);

    // Owner updates Advanced general metadata
    $this->actingAs($owner)
        ->put(route('dashboard.apps.settings.advanced.update', $app), [
            'name' => 'App Renommée',
            'description' => 'Nouvelle description avancée',
        ])
        ->assertRedirect()
        ->assertSessionHas('success');

    $app->refresh();
    expect($app->name)->toBe('App Renommée');
    expect($app->description)->toBe('Nouvelle description avancée');

    app(TenantManagerService::class)->deleteDatabase($app);
});

test('configured per-app rate limits are enforced on api endpoints and return zenbase 429 json', function () {
    $owner = User::factory()->create();
    $app = App::factory()->create([
        'user_id' => $owner->id,
        'settings' => [
            'rate_limit' => 120,
            'rate_limits' => [
                'enabled' => true,
                'key_by' => 'app',
                'api_per_minute' => 120,
                'auth_per_minute' => 5,
                'functions_per_minute' => 60,
                'storage_per_minute' => 60,
                'mcp_per_minute' => 120,
            ],
        ],
    ]);

    app(TenantManagerService::class)->connect($app);

    // Hit /api/v1/auth/signin 5 times (within auth_per_minute = 5)
    for ($i = 0; $i < 5; $i++) {
        $this->withHeader('X-Zenbase-Api-Key', $app->secret_key)
            ->postJson('/api/v1/auth/signin', [
                'email' => 'missing@example.com',
                'password' => 'wrongpass',
            ])
            ->assertStatus(401);
    }

    // 6th request within the same minute must be throttled with HTTP 429 JSON envelope
    $this->withHeader('X-Zenbase-Api-Key', $app->secret_key)
        ->postJson('/api/v1/auth/signin', [
            'email' => 'missing@example.com',
            'password' => 'wrongpass',
        ])
        ->assertStatus(429)
        ->assertJsonPath('data', null)
        ->assertJsonPath('meta.scope', 'Authentification')
        ->assertJsonPath('meta.limit_per_minute', 5);

    // Disabling rate limits allows requests immediately
    $settings = $app->settings;
    $settings['rate_limits']['enabled'] = false;
    $app->update(['settings' => $settings]);
    RateLimiter::clear("zenbase_auth:{$app->id}:127.0.0.1");

    $this->withHeader('X-Zenbase-Api-Key', $app->secret_key)
        ->postJson('/api/v1/auth/signin', [
            'email' => 'missing@example.com',
            'password' => 'wrongpass',
        ])
        ->assertStatus(401);

    app(TenantManagerService::class)->deleteDatabase($app);
});
