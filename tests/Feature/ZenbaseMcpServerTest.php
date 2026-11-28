<?php

use App\Mcp\Prompts\AuditAppSecurityPrompt;
use App\Mcp\Prompts\BuildWebFunctionPrompt;
use App\Mcp\Prompts\BuildWebhookFunctionPrompt;
use App\Mcp\Prompts\DebugWebFunctionPrompt;
use App\Mcp\Prompts\DesignCollectionSchemaPrompt;
use App\Mcp\Prompts\GenerateSdkTypesPrompt;
use App\Mcp\Prompts\ScaffoldCrudModulePrompt;
use App\Mcp\Prompts\SetupAuthFlowPrompt;
use App\Mcp\Resources\AppOverviewResource;
use App\Mcp\Resources\AppSecurityResource;
use App\Mcp\Resources\CollectionSchemaResource;
use App\Mcp\Resources\FunctionCodeResource;
use App\Mcp\Resources\FunctionStubsResource;
use App\Mcp\Resources\SdkDocsResource;
use App\Mcp\Resources\SdkReferenceResource;
use App\Mcp\Resources\WebFunctionsDocsResource;
use App\Mcp\Servers\ZenbaseAppServer;
use App\Mcp\Support\McpAppContext;
use App\Mcp\Tools\App\GetAppInfoTool;
use App\Mcp\Tools\Auth\ListTenantUsersTool;
use App\Mcp\Tools\Auth\ManageTenantUserTool;
use App\Mcp\Tools\Database\CreateCollectionTool;
use App\Mcp\Tools\Database\CreateRecordTool;
use App\Mcp\Tools\Database\DeleteCollectionTool;
use App\Mcp\Tools\Database\DeleteRecordTool;
use App\Mcp\Tools\Database\GetCollectionSchemaTool;
use App\Mcp\Tools\Database\GetRecordTool;
use App\Mcp\Tools\Database\ListCollectionsTool;
use App\Mcp\Tools\Database\QueryRecordsTool;
use App\Mcp\Tools\Database\UpdateCollectionSchemaTool;
use App\Mcp\Tools\Database\UpdateRecordTool;
use App\Mcp\Tools\Functions\GetFunctionCodeTool;
use App\Mcp\Tools\Functions\InvokeFunctionTool;
use App\Mcp\Tools\Functions\ListFunctionsTool;
use App\Mcp\Tools\Functions\UpsertFunctionTool;
use App\Mcp\Tools\Storage\DeleteStorageFileTool;
use App\Mcp\Tools\Storage\ListStorageFilesTool;
use App\Models\App;
use App\Models\User;
use App\Modules\Auth\Actions\AuthManager;
use App\Modules\Database\Engines\NoSqlDatabaseEngine;
use App\Modules\Storage\Services\StorageManagerService;
use App\Services\TenantManagerService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Illuminate\Testing\TestResponse;

uses(RefreshDatabase::class);

/**
 * Helper to create a Zenbase app with custom MCP settings.
 *
 * @param  array<string, mixed>  $mcpSettings
 * @param  array<string, mixed>  $extraSettings
 */
function makeMcpApp(array $mcpSettings = [], array $extraSettings = [], ?User $owner = null): App
{
    $user = $owner ?? User::factory()->create();

    return App::factory()->create([
        'user_id' => $user->id,
        'settings' => [
            'rate_limit' => 120,
            'env_variables' => [],
            ...$extraSettings,
            'mcp' => [
                'enabled' => true,
                'read_only' => true,
                'allow_functions' => false,
                'allow_auth_management' => false,
                'allow_storage_write' => false,
                ...$mcpSettings,
            ],
        ],
    ]);
}

/**
 * Helper to send a JSON-RPC 2.0 MCP HTTP request to POST /mcp.
 *
 * @param  array<string, mixed>  $params
 * @param  array<string, string>  $headers
 */
function postMcpRpc(mixed $testCase, string $method, array $params = [], array $headers = [], int|string $id = 1): TestResponse
{
    return $testCase->postJson('/mcp', [
        'jsonrpc' => '2.0',
        'id' => $id,
        'method' => $method,
        'params' => $params,
    ], [
        'Accept' => 'application/json, text/event-stream',
        ...$headers,
    ]);
}

test('mcp endpoint rejects missing, invalid, public, disabled, suspended, and expired requests', function () {
    $app = makeMcpApp(['enabled' => true]);

    // Missing key -> 401
    postMcpRpc($this, 'initialize', ['protocolVersion' => '2025-06-18', 'capabilities' => [], 'clientInfo' => ['name' => 'test', 'version' => '1.0']])
        ->assertUnauthorized();

    // Invalid key -> 401
    postMcpRpc($this, 'initialize', [], ['Authorization' => 'Bearer zb_sec_invalid_key'])
        ->assertUnauthorized();

    // Public key -> 403
    postMcpRpc($this, 'initialize', [], ['Authorization' => "Bearer {$app->public_key}"])
        ->assertForbidden()
        ->assertJsonPath('error.code', -32003);

    // MCP disabled by default -> 403
    $disabledApp = App::factory()->create();
    postMcpRpc($this, 'initialize', [], ['Authorization' => "Bearer {$disabledApp->secret_key}"])
        ->assertForbidden();

    // Suspended owner -> 403
    $suspendedOwner = User::factory()->create(['is_suspended' => true]);
    $suspendedApp = makeMcpApp(['enabled' => true], owner: $suspendedOwner);
    postMcpRpc($this, 'initialize', [], ['Authorization' => "Bearer {$suspendedApp->secret_key}"])
        ->assertForbidden();

    // Expired owner -> 403
    $expiredOwner = User::factory()->create(['expires_at' => now()->subDay()]);
    $expiredApp = makeMcpApp(['enabled' => true], owner: $expiredOwner);
    postMcpRpc($this, 'initialize', [], ['Authorization' => "Bearer {$expiredApp->secret_key}"])
        ->assertForbidden();

    app(TenantManagerService::class)->deleteDatabase($app);
    app(TenantManagerService::class)->deleteDatabase($disabledApp);
    app(TenantManagerService::class)->deleteDatabase($suspendedApp);
    app(TenantManagerService::class)->deleteDatabase($expiredApp);
});

test('mcp http endpoint initializes and enforces read-only tool visibility over json-rpc', function () {
    $app = makeMcpApp(['enabled' => true, 'read_only' => true]);

    $initResponse = postMcpRpc($this, 'initialize', [
        'protocolVersion' => '2025-06-18',
        'capabilities' => [],
        'clientInfo' => ['name' => 'pest-client', 'version' => '1.0.0'],
    ], ['Authorization' => "Bearer {$app->secret_key}"])
        ->assertOk()
        ->assertJsonPath('result.serverInfo.name', 'zenbase-app');

    expect($initResponse->json('result.capabilities'))->toHaveKeys(['tools', 'resources', 'prompts']);

    // Also works with X-Zenbase-Api-Key header
    $listResponse = postMcpRpc($this, 'tools/list', [], [
        'X-Zenbase-Api-Key' => $app->secret_key,
    ])->assertOk();

    $toolNames = collect($listResponse->json('result.tools'))->pluck('name')->all();

    expect($toolNames)->toContain(
        'get_app_info',
        'list_collections',
        'get_collection_schema',
        'query_records',
        'get_record',
        'list_tenant_users',
        'list_storage_files',
        'list_functions',
        'get_function_code',
    );
    expect($toolNames)->not->toContain(
        'create_collection',
        'create_record',
        'delete_collection',
        'manage_tenant_user',
        'delete_storage_file',
        'upsert_function',
        'invoke_function',
    );

    // Direct call to write tool is rejected when read_only is true
    postMcpRpc($this, 'tools/call', [
        'name' => 'create_record',
        'arguments' => [
            'collection' => 'notes',
            'data' => ['title' => 'Blocked'],
        ],
    ], ['Authorization' => "Bearer {$app->secret_key}"])
        ->assertStatus(400)
        ->assertJsonPath('error.message', 'Tool [create_record] not found.');

    expect($app->fresh()->api_calls_count)->toBe(3);

    app(TenantManagerService::class)->deleteDatabase($app);
});

test('mcp server enforces strict tenant isolation across two apps over http', function () {
    $appA = makeMcpApp(['enabled' => true, 'read_only' => false]);
    $appB = makeMcpApp(['enabled' => true, 'read_only' => false]);

    postMcpRpc($this, 'tools/call', [
        'name' => 'create_record',
        'arguments' => [
            'collection' => 'secrets',
            'data' => ['label' => 'Only for App A'],
        ],
    ], ['Authorization' => "Bearer {$appA->secret_key}"])->assertOk();

    $listB = postMcpRpc($this, 'tools/call', [
        'name' => 'list_collections',
        'arguments' => [],
    ], ['Authorization' => "Bearer {$appB->secret_key}"])->assertOk();

    $payloadB = json_decode((string) $listB->json('result.content.0.text'), true);
    expect($payloadB['collections'])->toBeEmpty();

    app(TenantManagerService::class)->deleteDatabase($appA);
    app(TenantManagerService::class)->deleteDatabase($appB);
});

test('mcp app info and database tools handle schemas, crud, filtering, and hide secrets', function () {
    $app = makeMcpApp(
        ['enabled' => true, 'read_only' => false],
        ['env_variables' => ['STRIPE_SECRET' => 'sk_live_super_secret']],
    );
    $app->corsOrigins()->create(['origin' => 'https://frontend.example.com']);

    app(McpAppContext::class)->setApp($app);
    app(TenantManagerService::class)->connect($app);

    // get_app_info exposes env key names only, never values or secret_key
    $info = ZenbaseAppServer::tool(GetAppInfoTool::class);
    $info->assertOk()
        ->assertSee($app->name)
        ->assertSee('STRIPE_SECRET')
        ->assertDontSee('sk_live_super_secret')
        ->assertDontSee($app->secret_key);

    // Create collection with strict schema
    ZenbaseAppServer::tool(CreateCollectionTool::class, [
        'name' => 'products',
        'schema' => [
            'strict' => true,
            'fields' => [
                ['name' => 'title', 'type' => 'string', 'required' => true],
                ['name' => 'price', 'type' => 'number', 'required' => true],
                ['name' => 'in_stock', 'type' => 'boolean', 'required' => false, 'default' => true],
            ],
        ],
    ])->assertOk()->assertSee('products');

    ZenbaseAppServer::tool(GetCollectionSchemaTool::class, ['collection' => 'products'])
        ->assertOk()
        ->assertSee('"strict": true')
        ->assertSee('"title"');

    // Schema violation returns tool error
    ZenbaseAppServer::tool(CreateRecordTool::class, [
        'collection' => 'products',
        'data' => ['title' => 'Invalid', 'price' => 'not-a-number'],
    ])->assertHasErrors();

    // Valid record creation
    $created = ZenbaseAppServer::tool(CreateRecordTool::class, [
        'collection' => 'products',
        'data' => ['title' => 'Clavier Mécanique', 'price' => 129.5],
        'custom_id' => 'prod-001',
    ])->assertOk()->assertSee('Clavier Mécanique');

    // Get record
    ZenbaseAppServer::tool(GetRecordTool::class, [
        'collection' => 'products',
        'record_id' => 'prod-001',
    ])->assertOk()->assertSee('"in_stock": true');

    // Update record
    ZenbaseAppServer::tool(UpdateRecordTool::class, [
        'collection' => 'products',
        'record_id' => 'prod-001',
        'data' => ['price' => 99.9],
    ])->assertOk()->assertSee('99.9');

    // Query with JSON1 filter
    ZenbaseAppServer::tool(QueryRecordsTool::class, [
        'collection' => 'products',
        'filters' => [
            ['field' => 'price', 'operator' => '<', 'value' => 110],
        ],
    ])->assertOk()->assertSee('prod-001');

    // List collections
    ZenbaseAppServer::tool(ListCollectionsTool::class)
        ->assertOk()
        ->assertSee('products');

    // Update schema to schema-less
    ZenbaseAppServer::tool(UpdateCollectionSchemaTool::class, [
        'collection' => 'products',
        'schema' => null,
    ])->assertOk()->assertSee('"schema": null');

    // Delete record & collection
    ZenbaseAppServer::tool(DeleteRecordTool::class, [
        'collection' => 'products',
        'record_id' => 'prod-001',
    ])->assertOk()->assertSee('"deleted": true');

    ZenbaseAppServer::tool(DeleteCollectionTool::class, [
        'collection' => 'products',
    ])->assertOk()->assertSee('products');

    app(TenantManagerService::class)->deleteDatabase($app);
});

test('mcp auth, storage, and functions tools respect granular permissions and sandbox rules', function () {
    Storage::fake('public');

    $app = makeMcpApp([
        'enabled' => true,
        'read_only' => false,
        'allow_functions' => true,
        'allow_auth_management' => true,
        'allow_storage_write' => true,
    ]);

    app(McpAppContext::class)->setApp($app);
    app(TenantManagerService::class)->connect($app);

    // Auth: sign up a tenant user and verify secrets are never exposed
    $signedUp = app(AuthManager::class)->signUp('client@example.com', 'TopSecret123!');
    $tenantUserId = $signedUp['user']->id;

    ZenbaseAppServer::tool(ListTenantUsersTool::class, ['search' => 'client@'])
        ->assertOk()
        ->assertSee('client@example.com')
        ->assertDontSee($signedUp['token'])
        ->assertDontSee('password_hash');

    ZenbaseAppServer::tool(ManageTenantUserTool::class, [
        'user_id' => $tenantUserId,
        'action' => 'block',
    ])->assertOk()->assertSee('"is_blocked": true');

    ZenbaseAppServer::tool(ManageTenantUserTool::class, [
        'user_id' => $tenantUserId,
        'action' => 'unblock',
    ])->assertOk()->assertSee('"is_blocked": false');

    ZenbaseAppServer::tool(ManageTenantUserTool::class, [
        'user_id' => $tenantUserId,
        'action' => 'delete',
    ])->assertOk()->assertSee('"deleted": true');

    // Storage: create a file, list it, and delete it
    $storedFile = app(StorageManagerService::class)->putContent($app, 'docs/hello.txt', 'Bonjour Zenbase', 'text/plain');

    ZenbaseAppServer::tool(ListStorageFilesTool::class, ['folder' => '/docs'])
        ->assertOk()
        ->assertSee('hello.txt');

    ZenbaseAppServer::tool(DeleteStorageFileTool::class, ['file' => $storedFile->id])
        ->assertOk()
        ->assertSee('"deleted": true');

    // Web Functions: sandbox rejects forbidden code
    ZenbaseAppServer::tool(UpsertFunctionTool::class, [
        'name' => 'bad-fn',
        'code' => 'return function($event, $context) { return shell_exec("whoami"); };',
    ])->assertHasErrors()->assertSee('sandbox');

    // Web Functions: create valid function, inspect, and invoke
    ZenbaseAppServer::tool(UpsertFunctionTool::class, [
        'name' => 'greet-user',
        'description' => 'Salue un utilisateur',
        'code' => 'return function($event, $context) { return ["greeting" => "Bonjour " . ($event["name"] ?? "Monde")]; };',
    ])->assertOk()->assertSee('"status": "created"');

    // Attach a secret env var to the function and verify get_function_code hides its value
    $fn = $app->functions()->where('name', 'greet-user')->firstOrFail();
    $fn->update(['env_variables' => ['WEBHOOK_TOKEN' => 'whsec_hidden_value']]);

    ZenbaseAppServer::tool(ListFunctionsTool::class)
        ->assertOk()
        ->assertSee('greet-user')
        ->assertSee('WEBHOOK_TOKEN')
        ->assertDontSee('whsec_hidden_value');

    ZenbaseAppServer::tool(GetFunctionCodeTool::class, ['name' => 'greet-user'])
        ->assertOk()
        ->assertSee('Bonjour')
        ->assertSee('WEBHOOK_TOKEN')
        ->assertDontSee('whsec_hidden_value');

    ZenbaseAppServer::tool(InvokeFunctionTool::class, [
        'name' => 'greet-user',
        'payload' => ['name' => 'Zenbase'],
    ])->assertOk()->assertSee('Bonjour Zenbase');

    app(TenantManagerService::class)->deleteDatabase($app);
});

test('mcp resources and prompts return app metadata, schemas, stubs, docs, and guided workflows without leaking secrets', function () {
    $app = makeMcpApp(
        ['enabled' => true, 'read_only' => true],
        ['env_variables' => ['STRIPE_WEBHOOK_SECRET' => 'whsec_super_secret_never_leak']],
    );

    $app->corsOrigins()->create(['origin' => '*']);
    $app->functions()->create([
        'name' => 'process-order',
        'description' => 'Process orders',
        'code' => "return function (\$event, \$context) { return ['status' => 200, 'data' => ['ok' => true]]; };",
        'env_variables' => ['ORDER_API_TOKEN' => 'tok_hidden_value'],
        'logs' => [
            [
                'timestamp' => now()->toIso8601String(),
                'status' => 500,
                'duration_ms' => 12.4,
                'output' => null,
                'error' => 'Undefined array key "order_id"',
            ],
        ],
        'is_active' => true,
    ]);

    app(McpAppContext::class)->setApp($app);
    app(TenantManagerService::class)->connect($app);

    app(NoSqlDatabaseEngine::class)->createCollection('articles', [
        'strict' => false,
        'fields' => [
            ['name' => 'title', 'type' => 'string', 'required' => true],
        ],
    ]);
    app(NoSqlDatabaseEngine::class)->createCollection('notes', null);

    // 8 Resources
    ZenbaseAppServer::resource(AppOverviewResource::class)
        ->assertOk()
        ->assertSee($app->name)
        ->assertSee('articles')
        ->assertDontSee('whsec_super_secret_never_leak');

    ZenbaseAppServer::resource(AppSecurityResource::class)
        ->assertOk()
        ->assertSee('"has_wildcard": true')
        ->assertSee('notes')
        ->assertSee('STRIPE_WEBHOOK_SECRET')
        ->assertDontSee('whsec_super_secret_never_leak')
        ->assertDontSee('tok_hidden_value');

    ZenbaseAppServer::resource(CollectionSchemaResource::class, ['collection' => 'articles'])
        ->assertOk()
        ->assertSee('"title"');

    ZenbaseAppServer::resource(FunctionCodeResource::class, ['function' => 'process-order'])
        ->assertOk()
        ->assertSee('return function ($event, $context)');

    ZenbaseAppServer::resource(FunctionStubsResource::class)
        ->assertOk()
        ->assertSee('CollectionQueryBuilder');

    ZenbaseAppServer::resource(WebFunctionsDocsResource::class)
        ->assertOk()
        ->assertSee('Web Functions');

    ZenbaseAppServer::resource(SdkDocsResource::class)
        ->assertOk()
        ->assertSee('@hacp0012/zenbase-sdk');

    ZenbaseAppServer::resource(SdkReferenceResource::class)
        ->assertOk()
        ->assertSee('CollectionQueryBuilder');

    // 8 Guided Prompts
    ZenbaseAppServer::prompt(GenerateSdkTypesPrompt::class, ['target_file' => 'src/types/zb.ts'])
        ->assertOk()
        ->assertSee('src/types/zb.ts')
        ->assertSee('articles');

    ZenbaseAppServer::prompt(BuildWebFunctionPrompt::class, [
        'function_name' => 'sync-orders',
        'goal' => 'Synchroniser les commandes',
    ])->assertOk()
        ->assertSee('sync-orders')
        ->assertSee('zenbase://docs/function-stubs')
        ->assertSee('$context->database');

    ZenbaseAppServer::prompt(DebugWebFunctionPrompt::class, [
        'function_name' => 'process-order',
    ])->assertOk()
        ->assertSee('process-order')
        ->assertSee('Undefined array key')
        ->assertSee('ORDER_API_TOKEN')
        ->assertDontSee('tok_hidden_value')
        ->assertDontSee('whsec_super_secret_never_leak');

    ZenbaseAppServer::prompt(DesignCollectionSchemaPrompt::class, [
        'collection' => 'invoices',
        'requirements' => 'Factures avec numéro, montant et statut payé',
    ])->assertOk()
        ->assertSee('invoices')
        ->assertSee('blob');

    ZenbaseAppServer::prompt(ScaffoldCrudModulePrompt::class, [
        'collection' => 'articles',
        'framework' => 'Next.js',
    ])->assertOk()
        ->assertSee('articles')
        ->assertSee('Next.js')
        ->assertSee('zenbase://docs/sdk-reference');

    ZenbaseAppServer::prompt(SetupAuthFlowPrompt::class, [
        'method' => 'otp',
        'framework' => 'React',
    ])->assertOk()
        ->assertSee('otp')
        ->assertSee('zb_pub_');

    ZenbaseAppServer::prompt(BuildWebhookFunctionPrompt::class, [
        'provider' => 'Stripe',
        'function_name' => 'stripe-webhook',
    ])->assertOk()
        ->assertSee('stripe-webhook')
        ->assertSee('hash_equals')
        ->assertSee('STRIPE_WEBHOOK_SECRET')
        ->assertDontSee('whsec_super_secret_never_leak');

    ZenbaseAppServer::prompt(AuditAppSecurityPrompt::class)
        ->assertOk()
        ->assertSee('process-order')
        ->assertSee('STRIPE_WEBHOOK_SECRET')
        ->assertDontSee('whsec_super_secret_never_leak')
        ->assertDontSee('tok_hidden_value');

    expect(ZenbaseAppServer::resourceCatalog())->toHaveCount(8);
    expect(ZenbaseAppServer::promptCatalog())->toHaveCount(8);

    app(TenantManagerService::class)->deleteDatabase($app);
});

test('dashboard mcp page renders and updates settings with strict ownership enforcement', function () {
    $owner = User::factory()->create();
    $otherUser = User::factory()->create();
    $app = App::factory()->create(['user_id' => $owner->id]);

    // Owner can view MCP configuration page and dedicated AI Skills page
    $this->actingAs($owner)
        ->get("/dashboard/apps/{$app->id}/mcp")
        ->assertOk();

    $this->actingAs($owner)
        ->get("/dashboard/apps/{$app->id}/skills")
        ->assertOk();

    // Non-owner receives 404 (AuthorizesAppOwnership hides existence of other users' apps)
    $this->actingAs($otherUser)
        ->get("/dashboard/apps/{$app->id}/mcp")
        ->assertNotFound();

    $this->actingAs($otherUser)
        ->get("/dashboard/apps/{$app->id}/skills")
        ->assertNotFound();

    $this->actingAs($otherUser)
        ->put("/dashboard/apps/{$app->id}/mcp", [
            'enabled' => true,
            'read_only' => false,
            'allow_functions' => true,
            'allow_auth_management' => true,
            'allow_storage_write' => true,
        ])
        ->assertNotFound();

    // Owner enables MCP in read-only mode (sub-write flags must be forced false)
    $this->actingAs($owner)
        ->put("/dashboard/apps/{$app->id}/mcp", [
            'enabled' => true,
            'read_only' => true,
            'allow_functions' => true,
            'allow_auth_management' => true,
            'allow_storage_write' => true,
        ])
        ->assertRedirect();

    $app->refresh();
    expect($app->mcpSettings())->toBe([
        'enabled' => true,
        'read_only' => true,
        'allow_functions' => false,
        'allow_auth_management' => false,
        'allow_storage_write' => false,
    ]);

    // Owner switches to read-write with functions enabled
    $this->actingAs($owner)
        ->put("/dashboard/apps/{$app->id}/mcp", [
            'enabled' => true,
            'read_only' => false,
            'allow_functions' => true,
            'allow_auth_management' => false,
            'allow_storage_write' => true,
        ])
        ->assertRedirect();

    $app->refresh();
    expect($app->mcpSettings())->toBe([
        'enabled' => true,
        'read_only' => false,
        'allow_functions' => true,
        'allow_auth_management' => false,
        'allow_storage_write' => true,
    ]);

    app(TenantManagerService::class)->deleteDatabase($app);
});

test('authenticated users can download client agent skills individually and as a zip bundle', function () {
    $user = User::factory()->create();

    // Guest is redirected to login
    $this->get('/dashboard/skills/zenbase-sdk-integration/SKILL.md')
        ->assertRedirect('/login');
    $this->get('/dashboard/skills/zenbase-skills.zip')
        ->assertRedirect('/login');

    // Individual skill downloads succeed for all 3 client skills
    foreach (['zenbase-sdk-integration', 'zenbase-web-functions', 'zenbase-mcp-workflow'] as $slug) {
        $response = $this->actingAs($user)
            ->get("/dashboard/skills/{$slug}/SKILL.md")
            ->assertOk();

        expect($response->headers->get('content-type'))->toContain('text/markdown');
        expect((string) file_get_contents($response->getFile()->getPathname()))
            ->toContain("name: {$slug}");
    }

    // Unknown skill slug returns 404
    $this->actingAs($user)
        ->get('/dashboard/skills/unknown-skill/SKILL.md')
        ->assertNotFound();

    // ZIP bundle contains all 3 skills in their target directories
    $zipResponse = $this->actingAs($user)
        ->get('/dashboard/skills/zenbase-skills.zip')
        ->assertOk();

    expect($zipResponse->headers->get('content-type'))->toContain('application/zip');
    expect($zipResponse->headers->get('content-disposition'))->toContain('zenbase-skills.zip');

    $zipContent = (string) $zipResponse->getContent();
    expect(substr($zipContent, 0, 4))->toBe("PK\x03\x04");
    expect($zipContent)->toContain("PK\x05\x06");
    expect($zipContent)->toContain('zenbase-sdk-integration/SKILL.md');
    expect($zipContent)->toContain('zenbase-web-functions/SKILL.md');
    expect($zipContent)->toContain('zenbase-mcp-workflow/SKILL.md');
    expect($zipContent)->toContain('name: zenbase-sdk-integration');
});
