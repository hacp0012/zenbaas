<?php

namespace App\Providers;

use App\Models\App;
use App\Modules\Database\Engines\NoSqlDatabaseEngine;
use App\Modules\Functions\Services\FunctionRunnerService;
use App\Modules\Storage\Services\StorageManagerService;
use App\Services\TenantManagerService;
use Illuminate\Cache\RateLimiting\Limit;
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
        $this->app->singleton(FunctionRunnerService::class);
    }

    /**
     * Bootstrap Zenbase services and rate limiters.
     */
    public function boot(): void
    {
        // Let DynamicCors manage CORS dynamically per application on SDK routes
        Config::set('cors.paths', []);

        RateLimiter::for('zenbase-api', function (Request $request): Limit {
            /** @var App|null $app */
            $app = $request->attributes->get('current_app');
            $maxAttempts = (int) ($app?->settings['rate_limit'] ?? 120);

            return Limit::perMinute(max(10, $maxAttempts))
                ->by('zenbase_app:'.($app?->id ?? $request->ip()));
        });
    }
}
