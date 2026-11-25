<?php

namespace App\Mcp\Resources;

use App\Mcp\Support\McpAppContext;
use App\Modules\Auth\Models\TenantUser;
use App\Modules\Database\Engines\NoSqlDatabaseEngine;
use App\Modules\Storage\Services\StorageManagerService;
use App\Services\TenantManagerService;
use Laravel\Mcp\Request;
use Laravel\Mcp\Response;
use Laravel\Mcp\Server\Attributes\Description;
use Laravel\Mcp\Server\Attributes\MimeType;
use Laravel\Mcp\Server\Attributes\Name;
use Laravel\Mcp\Server\Attributes\Uri;
use Laravel\Mcp\Server\Resource;

#[Name('app_overview')]
#[Description('Consolidated JSON overview of the current Zenbase application: collections, schemas, functions, CORS origins, storage usage, and MCP permissions.')]
#[Uri('zenbase://app/overview')]
#[MimeType('application/json')]
class AppOverviewResource extends Resource
{
    public function __construct(
        public McpAppContext $context,
        public TenantManagerService $tenantManager,
        public NoSqlDatabaseEngine $databaseEngine,
        public StorageManagerService $storageManager,
    ) {}

    /**
     * Handle the resource request.
     */
    public function handle(Request $request): Response
    {
        $app = $this->context->app();
        $this->tenantManager->connect($app);

        $collections = $this->databaseEngine->listCollections();
        $globalEnvKeys = is_array($app->settings['env_variables'] ?? null)
            ? array_map('strval', array_keys($app->settings['env_variables']))
            : [];

        $payload = [
            'app' => [
                'id' => $app->id,
                'name' => $app->name,
                'description' => $app->description,
                'public_key' => $app->public_key,
                'api_base_url' => url('/api/v1'),
                'database_size_bytes' => $this->tenantManager->getDatabaseSizeBytes($app),
                'tenant_users_count' => TenantUser::query()->count(),
                'cors_origins' => $app->corsOrigins()->orderBy('origin')->pluck('origin')->values()->all(),
                'global_env_keys' => $globalEnvKeys,
                'mcp_permissions' => $app->mcpSettings(),
            ],
            'collections' => $collections,
            'functions' => $app->functions()
                ->orderBy('name')
                ->get(['id', 'name', 'description', 'is_active', 'updated_at'])
                ->toArray(),
            'storage_usage' => $this->storageManager->getStorageUsageSummary($app),
        ];

        return Response::text(json_encode($payload, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR));
    }
}
