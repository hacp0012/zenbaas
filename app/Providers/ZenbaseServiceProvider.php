<?php

namespace App\Providers;

use App\Mcp\Support\McpAppContext;
use App\Models\App;
use App\Modules\Database\Engines\NoSqlDatabaseEngine;
use App\Modules\Functions\Services\FunctionRunnerService;
use App\Modules\Storage\Services\StorageManagerService;
use App\Services\AppLogService;
use App\Services\TenantManagerService;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class ZenbaseServiceProvider extends ServiceProvider
{
    /**
     * Register Zenbase core services in the container.
     */
    public function register(): void
    {
        $this->app->singleton(TenantManagerService::class);
        $this->app->singleton(NoSqlDatabaseEngine::class);
        $this->app->singleton(StorageManagerService::class);
        $this->app->singleton(AppLogService::class);
        $this->app->singleton(FunctionRunnerService::class);
        $this->app->scoped(McpAppContext::class);
    }

    /**
     * Bootstrap Zenbase services and rate limiters.
     */
    public function boot(): void
    {
        // Let DynamicCors manage CORS dynamically per application on SDK routes
        Config::set('cors.paths', []);

        RateLimiter::for('zenbase-api', fn (Request $request): Limit => $this->buildAppRateLimit(
            request: $request,
            bucket: 'api',
            settingKey: 'api_per_minute',
            forceIpScope: false,
            scopeLabel: 'API',
        ));

        RateLimiter::for('zenbase-auth', fn (Request $request): Limit => $this->buildAppRateLimit(
            request: $request,
            bucket: 'auth',
            settingKey: 'auth_per_minute',
            forceIpScope: true,
            scopeLabel: 'Authentification',
        ));

        RateLimiter::for('zenbase-functions', fn (Request $request): Limit => $this->buildAppRateLimit(
            request: $request,
            bucket: 'functions',
            settingKey: 'functions_per_minute',
            forceIpScope: false,
            scopeLabel: 'Web Functions',
        ));

        RateLimiter::for('zenbase-storage', fn (Request $request): Limit => $this->buildAppRateLimit(
            request: $request,
            bucket: 'storage',
            settingKey: 'storage_per_minute',
            forceIpScope: false,
            scopeLabel: 'Stockage',
        ));

        RateLimiter::for('zenbase-mcp', fn (Request $request): Limit => $this->buildAppRateLimit(
            request: $request,
            bucket: 'mcp',
            settingKey: 'mcp_per_minute',
            forceIpScope: false,
            scopeLabel: 'Serveur MCP',
        ));
    }

    /**
     * Build a dynamic per-application RateLimiter Limit with a consistent JSON 429 response.
     *
     * @param  'api_per_minute'|'auth_per_minute'|'functions_per_minute'|'storage_per_minute'|'mcp_per_minute'  $settingKey
     */
    private function buildAppRateLimit(
        Request $request,
        string $bucket,
        string $settingKey,
        bool $forceIpScope,
        string $scopeLabel,
    ): Limit {
        $app = $request->attributes->get('current_app');

        if (! $app instanceof App) {
            return Limit::perMinute(60)
                ->by("zenbase_{$bucket}_ip:".($request->ip() ?? 'unknown'))
                ->response(fn (Request $req, array $headers): JsonResponse => $this->tooManyRequestsResponse($scopeLabel, 60, $headers));
        }

        $limits = $app->rateLimitSettings();

        if (! $limits['enabled']) {
            return Limit::none();
        }

        $maxAttempts = $limits[$settingKey];
        $keySuffix = ($forceIpScope || $limits['key_by'] === 'ip')
            ? $app->id.':'.($request->ip() ?? 'unknown')
            : $app->id;

        return Limit::perMinute($maxAttempts)
            ->by("zenbase_{$bucket}:{$keySuffix}")
            ->response(fn (Request $req, array $headers): JsonResponse => $this->tooManyRequestsResponse($scopeLabel, $maxAttempts, $headers));
    }

    /**
     * Build a standardized Zenbase JSON 429 Too Many Requests response.
     *
     * @param  array<string, mixed>  $headers
     */
    private function tooManyRequestsResponse(string $scopeLabel, int $limit, array $headers): JsonResponse
    {
        $retryAfter = isset($headers['Retry-After']) ? (int) $headers['Retry-After'] : 60;

        return response()->json([
            'data' => null,
            'error' => "Limite de débit atteinte pour le module {$scopeLabel} ({$limit} requêtes/minute). Réessayez dans {$retryAfter} seconde(s).",
            'meta' => [
                'scope' => $scopeLabel,
                'limit_per_minute' => $limit,
                'retry_after' => $retryAfter,
            ],
        ], 429, $headers);
    }
}
