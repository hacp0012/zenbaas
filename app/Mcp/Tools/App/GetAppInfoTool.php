<?php

namespace App\Mcp\Tools\App;

use App\Mcp\Support\McpAppContext;
use App\Modules\Auth\Models\TenantUser;
use App\Modules\Database\Engines\NoSqlDatabaseEngine;
use App\Modules\Storage\Services\StorageManagerService;
use App\Services\TenantManagerService;
use Illuminate\Contracts\JsonSchema\JsonSchema;
use Illuminate\JsonSchema\Types\Type;
use Laravel\Mcp\Request;
use Laravel\Mcp\Response;
use Laravel\Mcp\Server\Attributes\Description;
use Laravel\Mcp\Server\Attributes\Name;
use Laravel\Mcp\Server\Tool;
use Laravel\Mcp\Server\Tools\Annotations\IsReadOnly;

#[Name('get_app_info')]
#[Description('Get metadata, resource counts, CORS origins, available environment variable keys (never secret values), storage usage, and active MCP permissions for the current Zenbase application.')]
#[IsReadOnly]
class GetAppInfoTool extends Tool
{
    public function __construct(
        public McpAppContext $context,
        public TenantManagerService $tenantManager,
        public NoSqlDatabaseEngine $databaseEngine,
        public StorageManagerService $storageManager,
    ) {}

    /**
     * Handle the tool request.
     */
    public function handle(Request $request): Response
    {
        $app = $this->context->app();
        $this->tenantManager->connect($app);

        $collections = $this->databaseEngine->listCollections();
        $globalEnv = is_array($app->settings['env_variables'] ?? null)
            ? array_keys($app->settings['env_variables'])
            : [];

        $payload = [
            'id' => $app->id,
            'name' => $app->name,
            'description' => $app->description,
            'public_key' => $app->public_key,
            'api_base_url' => url('/api/v1'),
            'api_calls_count' => $app->api_calls_count,
            'database_size_bytes' => $this->tenantManager->getDatabaseSizeBytes($app),
            'counts' => [
                'collections' => count($collections),
                'tenant_users' => TenantUser::query()->count(),
                'files' => $app->files()->count(),
                'functions' => $app->functions()->count(),
                'cors_origins' => $app->corsOrigins()->count(),
            ],
            'cors_origins' => $app->corsOrigins()->orderBy('origin')->pluck('origin')->values()->all(),
            'global_env_keys' => array_map('strval', $globalEnv),
            'storage_usage' => $this->storageManager->getStorageUsageSummary($app),
            'mcp_permissions' => $app->mcpSettings(),
            'created_at' => $app->created_at?->toIso8601String(),
        ];

        return Response::text(json_encode($payload, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR));
    }

    /**
     * Get the tool's input schema.
     *
     * @return array<string, Type>
     */
    public function schema(JsonSchema $schema): array
    {
        return [];
    }
}
