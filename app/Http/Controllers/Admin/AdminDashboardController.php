<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\App;
use App\Models\AppFile;
use App\Models\User;
use App\Modules\Functions\Models\AppFunction;
use App\Services\TenantManagerService;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class AdminDashboardController extends Controller
{
    public function __construct(public TenantManagerService $tenantManager) {}

    /**
     * Display the Super-Admin global dashboard and system monitoring.
     */
    public function index(): Response
    {
        $apps = App::query()
            ->with(['user:id,name,email,is_suspended'])
            ->withCount(['files', 'functions', 'corsOrigins'])
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->get()
            ->map(function (App $app): array {
                $dbBytes = $this->tenantManager->getDatabaseSizeBytes($app);

                return [
                    'id' => $app->id,
                    'name' => $app->name,
                    'description' => $app->description,
                    'public_key' => $app->public_key,
                    'api_calls_count' => $app->api_calls_count,
                    'files_count' => $app->files_count,
                    'functions_count' => $app->functions_count,
                    'cors_origins_count' => $app->cors_origins_count,
                    'database_size_bytes' => $dbBytes,
                    'user' => $app->user ? [
                        'id' => $app->user->id,
                        'name' => $app->user->name,
                        'email' => $app->user->email,
                        'is_suspended' => $app->user->is_suspended,
                    ] : null,
                    'created_at' => $app->created_at?->toIso8601String(),
                ];
            });

        $totalDbBytes = $apps->sum('database_size_bytes');
        $totalFileBytes = (int) AppFile::query()->sum('size');

        $recentFunctionLogs = AppFunction::query()
            ->with('app:id,name')
            ->whereNotNull('logs')
            ->orderByDesc('updated_at')
            ->limit(15)
            ->get()
            ->flatMap(function (AppFunction $fn): array {
                $logs = is_array($fn->logs) ? array_slice($fn->logs, 0, 3) : [];

                return array_map(fn (array $log): array => [
                    'app_name' => $fn->app?->name ?? 'App',
                    'function_name' => $fn->name,
                    'timestamp' => $log['timestamp'] ?? null,
                    'status' => $log['status'] ?? 200,
                    'duration_ms' => $log['duration_ms'] ?? 0,
                    'error' => $log['error'] ?? null,
                ], $logs);
            })
            ->take(15)
            ->values()
            ->all();

        $sqliteVersion = DB::selectOne('select sqlite_version() as version')?->version ?? '3.x';

        return Inertia::render('admin/dashboard', [
            'stats' => [
                'total_users' => User::query()->count(),
                'active_users' => User::query()->where('is_suspended', false)->count(),
                'suspended_users' => User::query()->where('is_suspended', true)->count(),
                'total_apps' => $apps->count(),
                'total_api_calls' => (int) App::query()->sum('api_calls_count'),
                'total_files' => AppFile::query()->count(),
                'total_functions' => AppFunction::query()->count(),
                'total_storage_bytes' => $totalDbBytes + $totalFileBytes,
                'files_storage_bytes' => $totalFileBytes,
                'databases_storage_bytes' => $totalDbBytes,
            ],
            'apps' => $apps,
            'systemHealth' => [
                'status' => 'operational',
                'php_version' => PHP_VERSION,
                'laravel_version' => app()->version(),
                'sqlite_version' => $sqliteVersion,
                'recent_logs' => $recentFunctionLogs,
            ],
        ]);
    }
}
