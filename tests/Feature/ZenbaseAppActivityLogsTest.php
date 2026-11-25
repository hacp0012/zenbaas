<?php

use App\Models\App;
use App\Models\AppLog;
use App\Models\User;
use App\Modules\Functions\Models\AppFunction;
use App\Services\AppLogService;
use App\Services\TenantManagerService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

uses(RefreshDatabase::class);

test('api, auth, storage, functions, and mcp requests are logged per application without leaking secrets', function () {
    Storage::fake('public');

    $owner = User::factory()->create();
    $app = App::factory()->create([
        'user_id' => $owner->id,
        'settings' => [
            'rate_limit' => 120,
            'mcp' => [
                'enabled' => true,
                'read_only' => false,
                'allow_functions' => true,
                'allow_auth_management' => true,
                'allow_storage_write' => true,
            ],
        ],
    ]);

    app(TenantManagerService::class)->connect($app);

    // 1. API (Database) call
    $this->withHeader('X-Zenbase-Api-Key', $app->secret_key)
        ->postJson('/api/v1/collections', ['name' => 'articles'])
        ->assertCreated();

    // 2. Auth call (password must NEVER be stored in log context or message)
    $this->withHeader('X-Zenbase-Api-Key', $app->public_key)
        ->postJson('/api/v1/auth/signup', [
            'name' => 'Alice Dev',
            'email' => 'alice@example.test',
            'password' => 'SuperSecretPass999!',
        ])
        ->assertCreated();

    // 3. Auth failure (401 warning)
    $this->withHeader('X-Zenbase-Api-Key', $app->public_key)
        ->postJson('/api/v1/auth/signin', [
            'email' => 'alice@example.test',
            'password' => 'WrongPassword123!',
        ])
        ->assertUnauthorized();

    // 4. Storage upload
    $this->withHeader('X-Zenbase-Api-Key', $app->secret_key)
        ->post('/api/v1/storage/upload', [
            'file' => UploadedFile::fake()->create('report.pdf', 32, 'application/pdf'),
            'folder' => 'reports',
        ])
        ->assertCreated();

    // 5. Web Function invocation via API
    AppFunction::query()->create([
        'app_id' => $app->id,
        'name' => 'ping-fn',
        'code' => 'return function ($event, $context) { return ["pong" => true]; };',
        'is_active' => true,
    ]);

    $this->withHeader('X-Zenbase-Api-Key', $app->public_key)
        ->postJson('/api/v1/functions/ping-fn/invoke', ['hello' => 'world'])
        ->assertOk();

    // 6. MCP JSON-RPC call
    $this->withHeader('Authorization', 'Bearer '.$app->secret_key)
        ->postJson('/mcp', [
            'jsonrpc' => '2.0',
            'id' => 1,
            'method' => 'tools/list',
            'params' => [],
        ])
        ->assertOk();

    $logs = AppLog::query()->where('app_id', $app->id)->get();

    expect($logs->where('source', AppLog::SOURCE_API)->count())->toBeGreaterThanOrEqual(1);
    expect($logs->where('source', AppLog::SOURCE_AUTH)->count())->toBe(2);
    expect($logs->where('source', AppLog::SOURCE_STORAGE)->count())->toBe(1);
    expect($logs->where('source', AppLog::SOURCE_FUNCTIONS)->count())->toBe(1);
    expect($logs->where('source', AppLog::SOURCE_MCP)->count())->toBe(1);

    // Ensure no raw secret key or password ever leaked into logs
    $serializedLogs = json_encode($logs->toArray());
    expect($serializedLogs)->not->toContain('SuperSecretPass999!');
    expect($serializedLogs)->not->toContain('WrongPassword123!');
    expect($serializedLogs)->not->toContain($app->secret_key);

    // Verify Auth log metadata
    $signupLog = $logs->firstWhere('action', 'auth.signup');
    expect($signupLog)->not->toBeNull();
    expect($signupLog->status_code)->toBe(201);
    expect($signupLog->level)->toBe(AppLog::LEVEL_INFO);
    expect($signupLog->context['email'] ?? null)->toBe('alice@example.test');

    $failedSigninLog = $logs->firstWhere('action', 'auth.signin');
    expect($failedSigninLog)->not->toBeNull();
    expect($failedSigninLog->status_code)->toBe(401);
    expect($failedSigninLog->level)->toBe(AppLog::LEVEL_WARNING);

    // Verify MCP log metadata
    $mcpLog = $logs->firstWhere('source', AppLog::SOURCE_MCP);
    expect($mcpLog)->not->toBeNull();
    expect($mcpLog->action)->toBe('mcp.tools/list');
    expect($mcpLog->api_key_role)->toBe('secret');

    app(TenantManagerService::class)->deleteDatabase($app);
});

test('cors rejections and rate limit 429 responses are captured in per-app logs', function () {
    $owner = User::factory()->create();
    $app = App::factory()->create([
        'user_id' => $owner->id,
        'settings' => [
            'rate_limits' => [
                'enabled' => true,
                'key_by' => 'app',
                'api_per_minute' => 10,
                'auth_per_minute' => 10,
                'functions_per_minute' => 10,
                'storage_per_minute' => 10,
                'mcp_per_minute' => 10,
            ],
        ],
    ]);

    $app->corsOrigins()->create(['origin' => 'https://allowed.example.com']);
    app(TenantManagerService::class)->connect($app);

    // Trigger CORS 403 rejection
    $this->withHeaders([
        'X-Zenbase-Api-Key' => $app->public_key,
        'Origin' => 'https://blocked.evil.test',
    ])->getJson('/api/v1/collections')->assertForbidden();

    // First 10 valid API calls succeed, 11th hits 429 rate limit
    for ($i = 0; $i < 10; $i++) {
        $this->flushHeaders()
            ->withHeader('X-Zenbase-Api-Key', $app->public_key)
            ->getJson('/api/v1/collections')
            ->assertOk();
    }

    $this->flushHeaders()
        ->withHeader('X-Zenbase-Api-Key', $app->public_key)
        ->getJson('/api/v1/collections')
        ->assertStatus(429);

    $corsLog = AppLog::query()->where('app_id', $app->id)->where('status_code', 403)->first();
    expect($corsLog)->not->toBeNull();
    expect($corsLog->level)->toBe(AppLog::LEVEL_WARNING);
    expect($corsLog->context['origin'] ?? null)->toBe('https://blocked.evil.test');

    $rateLimitLog = AppLog::query()->where('app_id', $app->id)->where('status_code', 429)->first();
    expect($rateLimitLog)->not->toBeNull();
    expect($rateLimitLog->level)->toBe(AppLog::LEVEL_WARNING);
    expect($rateLimitLog->context['rate_limited'] ?? false)->toBeTrue();

    app(TenantManagerService::class)->deleteDatabase($app);
});

test('owner can view, filter, export, and clear app logs while non-owners receive 404', function () {
    $owner = User::factory()->create();
    $otherUser = User::factory()->create();
    $app = App::factory()->create(['user_id' => $owner->id]);

    app(TenantManagerService::class)->connect($app);

    $logService = app(AppLogService::class);
    $logService->record($app, AppLog::SOURCE_API, AppLog::LEVEL_INFO, 'GET collections', 'GET', '/api/v1/collections', 200, 12, 'public', '127.0.0.1', 'OK');
    $logService->record($app, AppLog::SOURCE_MCP, AppLog::LEVEL_ERROR, 'mcp.tools/call:broken', 'POST', '/mcp', 500, 45, 'secret', '127.0.0.1', 'MCP failure');

    // Non-owner gets 404 (not 403)
    $this->actingAs($otherUser)->get(route('dashboard.apps.logs', $app))->assertNotFound();
    $this->actingAs($otherUser)->get(route('dashboard.apps.logs.export', $app))->assertNotFound();
    $this->actingAs($otherUser)->delete(route('dashboard.apps.logs.clear', $app))->assertNotFound();

    // Owner views filtered MCP error logs
    $this->actingAs($owner)
        ->get(route('dashboard.apps.logs', ['app' => $app, 'source' => 'mcp', 'level' => 'error']))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('client/apps/logs')
            ->where('summary.total', 2)
            ->where('summary.error_count', 1)
            ->where('sourceCounts.api', 1)
            ->where('sourceCounts.mcp', 1)
            ->has('logs.data', 1)
            ->where('logs.data.0.source', 'mcp')
        );

    // Owner exports JSON logs
    $exportResponse = $this->actingAs($owner)
        ->get(route('dashboard.apps.logs.export', ['app' => $app, 'source' => 'mcp']));
    $exportResponse->assertOk();
    $exportedContent = $exportResponse->streamedContent();
    expect($exportedContent)->toContain('mcp.tools/call:broken');

    // Owner clears MCP logs only
    $this->actingAs($owner)
        ->delete(route('dashboard.apps.logs.clear', $app), ['source' => 'mcp'])
        ->assertRedirect()
        ->assertSessionHas('success');

    expect(AppLog::query()->where('app_id', $app->id)->count())->toBe(1);
    expect(AppLog::query()->where('app_id', $app->id)->first()?->source)->toBe(AppLog::SOURCE_API);

    app(TenantManagerService::class)->deleteDatabase($app);
});

test('app log retention prunes old entries and caps count per app', function () {
    $owner = User::factory()->create();
    $app = App::factory()->create(['user_id' => $owner->id]);

    $logService = app(AppLogService::class);

    // Insert an expired entry (10 days old)
    AppLog::query()->create([
        'app_id' => $app->id,
        'source' => AppLog::SOURCE_API,
        'level' => AppLog::LEVEL_INFO,
        'action' => 'old.entry',
        'created_at' => now()->subDays(10),
    ]);

    for ($i = 1; $i <= 5; $i++) {
        $logService->record($app, AppLog::SOURCE_API, AppLog::LEVEL_INFO, "recent.{$i}", 'GET', '/api/v1/collections', 200, 5);
    }

    $deleted = $logService->pruneForApp($app, maxEntries: 3, retentionDays: 7);

    expect($deleted)->toBe(3);
    expect(AppLog::query()->where('app_id', $app->id)->count())->toBe(3);
    expect(AppLog::query()->where('app_id', $app->id)->where('action', 'old.entry')->exists())->toBeFalse();
});
