<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\App;
use App\Models\AppFile;
use App\Models\PlatformSetting;
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
     * Display the Super-Admin global dashboard with summary KPIs, charts, and system monitoring.
     */
    public function index(): Response
    {
        $apps = App::query()
            ->with(['user:id,name,email,is_suspended'])
            ->withCount(['files', 'functions'])
            ->orderByDesc('api_calls_count')
            ->get();

        $totalDbBytes = 0;
        $mcpEnabledCount = 0;

        foreach ($apps as $app) {
            $totalDbBytes += $this->tenantManager->getDatabaseSizeBytes($app);
            if ($app->mcpSettings()['enabled']) {
                $mcpEnabledCount++;
            }
        }

        $totalFileBytes = (int) AppFile::query()->sum('size');
        $totalStorageBytes = $totalDbBytes + $totalFileBytes;
        $platformSettings = PlatformSetting::allSettings();
        $globalMaxStorageMb = $platformSettings['global_max_storage_mb'];
        $globalMaxStorageBytes = $globalMaxStorageMb !== null ? $globalMaxStorageMb * 1024 * 1024 : null;

        $recentFunctionLogs = AppFunction::query()
            ->with('app:id,name')
            ->whereNotNull('logs')
            ->orderByDesc('updated_at')
            ->limit(15)
            ->get()
            ->flatMap(function (AppFunction $fn): array {
                $logs = is_array($fn->logs) ? array_slice($fn->logs, 0, 3) : [];

                return array_map(fn (array $log): array => [
                    'app_name' => $fn->app instanceof App ? $fn->app->name : 'App',
                    'function_name' => $fn->name,
                    'timestamp' => $log['timestamp'] ?? null,
                    'status' => $log['status'] ?? 200,
                    'duration_ms' => $log['duration_ms'] ?? 0,
                    'error' => $log['error'] ?? null,
                ], $logs);
            })
            ->take(10)
            ->values()
            ->all();

        $topAppsByApi = $apps
            ->take(6)
            ->map(fn (App $app): array => [
                'id' => $app->id,
                'label' => $app->name,
                'sublabel' => $app->user instanceof User ? $app->user->name : '—',
                'value' => $app->api_calls_count,
            ])
            ->values()
            ->all();

        $monthNames = [1 => 'Jan', 2 => 'Fév', 3 => 'Mar', 4 => 'Avr', 5 => 'Mai', 6 => 'Juin', 7 => 'Juil', 8 => 'Août', 9 => 'Sep', 10 => 'Oct', 11 => 'Nov', 12 => 'Déc'];
        $appsTimeline = [];
        for ($i = 5; $i >= 0; $i--) {
            $monthStart = now()->startOfMonth()->subMonths($i);
            $monthEnd = $monthStart->copy()->endOfMonth();
            $count = $apps->filter(fn (App $a): bool => $a->created_at !== null && $a->created_at->between($monthStart, $monthEnd))->count();

            $appsTimeline[] = [
                'label' => ($monthNames[$monthStart->month] ?? $monthStart->format('M')).' '.$monthStart->format('y'),
                'value' => $count,
            ];
        }

        $sqliteVersionRow = DB::selectOne('select sqlite_version() as version');
        $sqliteVersion = is_object($sqliteVersionRow) && isset($sqliteVersionRow->version)
            ? (string) $sqliteVersionRow->version
            : '3.x';

        $activeUsers = User::query()->where('is_suspended', false)->count();
        $suspendedUsers = User::query()->where('is_suspended', true)->count();

        return Inertia::render('admin/dashboard', [
            'stats' => [
                'total_users' => $activeUsers + $suspendedUsers,
                'active_users' => $activeUsers,
                'suspended_users' => $suspendedUsers,
                'total_apps' => $apps->count(),
                'mcp_enabled_apps' => $mcpEnabledCount,
                'total_api_calls' => (int) App::query()->sum('api_calls_count'),
                'total_files' => AppFile::query()->count(),
                'total_functions' => AppFunction::query()->count(),
                'total_storage_bytes' => $totalStorageBytes,
                'files_storage_bytes' => $totalFileBytes,
                'databases_storage_bytes' => $totalDbBytes,
                'global_max_storage_mb' => $globalMaxStorageMb,
                'global_max_storage_bytes' => $globalMaxStorageBytes,
            ],
            'charts' => [
                'top_apps_by_api' => $topAppsByApi,
                'apps_timeline' => $appsTimeline,
                'storage_distribution' => [
                    ['label' => 'Bases SQLite', 'value' => $totalDbBytes, 'color' => '#10b981'],
                    ['label' => 'Fichiers Storage', 'value' => $totalFileBytes, 'color' => '#3b82f6'],
                ],
                'users_distribution' => [
                    ['label' => 'Actifs', 'value' => $activeUsers, 'color' => '#10b981'],
                    ['label' => 'Suspendus', 'value' => $suspendedUsers, 'color' => '#ef4444'],
                ],
            ],
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
