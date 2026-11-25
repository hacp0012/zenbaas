<?php

namespace App\Mcp\Resources;

use App\Mcp\Support\McpAppContext;
use App\Modules\Auth\Models\TenantUser;
use App\Modules\Database\Engines\NoSqlDatabaseEngine;
use App\Modules\Functions\Models\AppFunction;
use App\Modules\Storage\Services\StorageManagerService;
use App\Services\TenantManagerService;
use Laravel\Mcp\Request;
use Laravel\Mcp\Response;
use Laravel\Mcp\Server\Attributes\Description;
use Laravel\Mcp\Server\Attributes\MimeType;
use Laravel\Mcp\Server\Attributes\Name;
use Laravel\Mcp\Server\Attributes\Uri;
use Laravel\Mcp\Server\Resource;

#[Name('app_security')]
#[Description('Consolidated JSON security posture of the current Zenbase application: CORS origins, MCP permissions, schema-less collections, active functions, env key names (redacted), and tenant user metrics.')]
#[Uri('zenbase://app/security')]
#[MimeType('application/json')]
class AppSecurityResource extends Resource
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
        $schemalessCollections = [];
        $nonStrictCollections = [];

        foreach ($collections as $collection) {
            if (($collection['schema'] ?? null) === null) {
                $schemalessCollections[] = $collection['name'];
            } elseif (! (bool) ($collection['schema']['strict'] ?? false)) {
                $nonStrictCollections[] = $collection['name'];
            }
        }

        $corsOrigins = $app->corsOrigins()->orderBy('origin')->pluck('origin')->values()->all();
        $hasWildcardCors = in_array('*', $corsOrigins, true);

        $globalEnvKeys = is_array($app->settings['env_variables'] ?? null)
            ? array_map('strval', array_keys($app->settings['env_variables']))
            : [];

        $functionsSummary = $app->functions()
            ->orderBy('name')
            ->get()
            ->map(function (AppFunction $fn): array {
                $envKeys = is_array($fn->env_variables)
                    ? array_map('strval', array_keys($fn->env_variables))
                    : [];

                return [
                    'name' => $fn->name,
                    'is_active' => $fn->is_active,
                    'env_keys' => $envKeys,
                    'recent_errors_count' => collect($fn->logs ?? [])
                        ->filter(fn (array $log): bool => ! empty($log['error']))
                        ->count(),
                ];
            })
            ->all();

        $totalUsers = TenantUser::query()->count();
        $blockedUsers = TenantUser::query()->where('is_blocked', true)->count();

        $payload = [
            'app' => [
                'id' => $app->id,
                'name' => $app->name,
                'rate_limit_per_minute' => (int) ($app->settings['rate_limit'] ?? 120),
            ],
            'cors' => [
                'origins' => $corsOrigins,
                'count' => count($corsOrigins),
                'has_wildcard' => $hasWildcardCors,
            ],
            'mcp_permissions' => $app->mcpSettings(),
            'database' => [
                'collections_count' => count($collections),
                'schemaless_collections' => $schemalessCollections,
                'non_strict_schema_collections' => $nonStrictCollections,
            ],
            'functions' => [
                'global_env_keys' => $globalEnvKeys,
                'items' => $functionsSummary,
            ],
            'auth' => [
                'tenant_users_total' => $totalUsers,
                'tenant_users_blocked' => $blockedUsers,
            ],
            'storage_usage' => $this->storageManager->getStorageUsageSummary($app),
        ];

        return Response::text(json_encode($payload, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR));
    }
}
