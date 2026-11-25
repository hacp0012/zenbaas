<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\App;
use App\Models\AppFile;
use App\Models\User;
use App\Modules\Functions\Models\AppFunction;
use App\Services\TenantManagerService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\Response as SymfonyResponse;

class AdminDiagnosticController extends Controller
{
    public function __construct(public TenantManagerService $tenantManager) {}

    /**
     * Display the filterable, paginated list of all platform applications with statistical charts.
     */
    public function apps(Request $request): Response
    {
        $search = trim($request->string('search')->toString());
        $ownerStatus = $request->string('owner_status', 'all')->toString();
        $mcpStatus = $request->string('mcp_status', 'all')->toString();
        $sort = in_array($request->string('sort', 'created_at')->toString(), ['created_at', 'api_calls_count', 'name', 'files_count', 'functions_count'], true)
            ? $request->string('sort', 'created_at')->toString()
            : 'created_at';
        $direction = $request->string('direction', 'desc')->toString() === 'asc' ? 'asc' : 'desc';
        $perPage = in_array($request->integer('per_page', 10), [10, 25, 50, 100], true)
            ? $request->integer('per_page', 10)
            : 10;

        $query = App::query()
            ->with(['user:id,name,email,is_suspended,expires_at'])
            ->withCount(['files', 'functions', 'corsOrigins']);

        if ($search !== '') {
            $query->where(function ($q) use ($search): void {
                $q->where('name', 'like', '%'.$search.'%')
                    ->orWhere('id', 'like', '%'.$search.'%')
                    ->orWhere('description', 'like', '%'.$search.'%')
                    ->orWhereHas('user', function ($userQuery) use ($search): void {
                        $userQuery->where('name', 'like', '%'.$search.'%')
                            ->orWhere('email', 'like', '%'.$search.'%');
                    });
            });
        }

        if ($ownerStatus === 'active') {
            $query->whereHas('user', fn ($u) => $u->where('is_suspended', false));
        } elseif ($ownerStatus === 'suspended') {
            $query->whereHas('user', fn ($u) => $u->where('is_suspended', true));
        }

        if ($mcpStatus === 'enabled') {
            $query->whereRaw("json_extract(settings, '$.mcp.enabled') = 1");
        } elseif ($mcpStatus === 'disabled') {
            $query->where(function ($q): void {
                $q->whereNull('settings')
                    ->orWhereRaw("COALESCE(json_extract(settings, '$.mcp.enabled'), 0) = 0");
            });
        }

        $paginator = $query
            ->orderBy($sort, $direction)
            ->orderByDesc('id')
            ->paginate($perPage)
            ->withQueryString();

        $fileBytesByApp = AppFile::query()
            ->whereIn('app_id', $paginator->getCollection()->pluck('id')->all())
            ->selectRaw('app_id, COALESCE(SUM(size), 0) as total_bytes')
            ->groupBy('app_id')
            ->pluck('total_bytes', 'app_id');

        $items = $paginator->getCollection()->map(function (App $app) use ($fileBytesByApp): array {
            $mcp = $app->mcpSettings();
            $rateLimits = $app->rateLimitSettings();

            return [
                'id' => $app->id,
                'name' => $app->name,
                'description' => $app->description,
                'public_key' => $app->public_key,
                'api_calls_count' => $app->api_calls_count,
                'files_count' => $app->files_count,
                'functions_count' => $app->functions_count,
                'cors_origins_count' => $app->cors_origins_count,
                'database_size_bytes' => $this->tenantManager->getDatabaseSizeBytes($app),
                'files_size_bytes' => (int) ($fileBytesByApp[$app->id] ?? 0),
                'mcp_enabled' => $mcp['enabled'],
                'mcp_read_only' => $mcp['read_only'],
                'rate_limit_enabled' => $rateLimits['enabled'],
                'rate_limit_per_minute' => $rateLimits['api_per_minute'],
                'user' => $app->user ? [
                    'id' => $app->user->id,
                    'name' => $app->user->name,
                    'email' => $app->user->email,
                    'is_suspended' => $app->user->isSuspendedOrExpired(),
                ] : null,
                'created_at' => $app->created_at?->toIso8601String(),
            ];
        })->all();

        // Platform-wide application charts
        $allApps = App::query()
            ->with('user:id,name,is_suspended')
            ->withCount(['files', 'functions'])
            ->get();

        $mcpEnabledCount = 0;
        $withFunctionsCount = 0;
        $withFilesCount = 0;
        $activeOwnerAppsCount = 0;
        $suspendedOwnerAppsCount = 0;

        foreach ($allApps as $a) {
            if ($a->mcpSettings()['enabled']) {
                $mcpEnabledCount++;
            }
            if (($a->functions_count ?? 0) > 0) {
                $withFunctionsCount++;
            }
            if (($a->files_count ?? 0) > 0) {
                $withFilesCount++;
            }
            if ($a->user && $a->user->is_suspended) {
                $suspendedOwnerAppsCount++;
            } else {
                $activeOwnerAppsCount++;
            }
        }

        // Apps created per month over the last 6 months
        $monthNames = [1 => 'Jan', 2 => 'Fév', 3 => 'Mar', 4 => 'Avr', 5 => 'Mai', 6 => 'Juin', 7 => 'Juil', 8 => 'Août', 9 => 'Sep', 10 => 'Oct', 11 => 'Nov', 12 => 'Déc'];
        $appsTimeline = [];
        for ($i = 5; $i >= 0; $i--) {
            $monthStart = now()->startOfMonth()->subMonths($i);
            $monthEnd = $monthStart->copy()->endOfMonth();
            $count = $allApps->filter(fn (App $a): bool => $a->created_at !== null && $a->created_at->between($monthStart, $monthEnd))->count();

            $appsTimeline[] = [
                'label' => ($monthNames[$monthStart->month] ?? $monthStart->format('M')).' '.$monthStart->format('y'),
                'value' => $count,
            ];
        }

        $topApiApps = $allApps
            ->sortByDesc('api_calls_count')
            ->take(6)
            ->values()
            ->map(fn (App $a): array => [
                'id' => $a->id,
                'label' => $a->name,
                'sublabel' => $a->user instanceof User ? $a->user->name : '—',
                'value' => $a->api_calls_count,
            ])
            ->all();

        return Inertia::render('admin/diagnostic/apps', [
            'paginatedApps' => [
                'items' => $items,
                'total' => $paginator->total(),
                'page' => $paginator->currentPage(),
                'per_page' => $paginator->perPage(),
                'last_page' => $paginator->lastPage(),
            ],
            'filters' => [
                'search' => $search,
                'owner_status' => $ownerStatus,
                'mcp_status' => $mcpStatus,
                'sort' => $sort,
                'direction' => $direction,
                'per_page' => $perPage,
            ],
            'appCharts' => [
                'total_apps' => $allApps->count(),
                'active_owner_apps' => $activeOwnerAppsCount,
                'suspended_owner_apps' => $suspendedOwnerAppsCount,
                'mcp_enabled_apps' => $mcpEnabledCount,
                'with_functions_apps' => $withFunctionsCount,
                'with_files_apps' => $withFilesCount,
                'timeline' => $appsTimeline,
                'top_api_apps' => $topApiApps,
            ],
        ]);
    }

    /**
     * Display system logs (Laravel application log + Web Functions execution logs) for technical diagnosis.
     */
    public function logs(Request $request): Response
    {
        $level = strtoupper(trim($request->string('level', 'ALL')->toString()));
        $search = trim($request->string('search')->toString());
        $limit = in_array($request->integer('limit', 100), [50, 100, 200, 500], true)
            ? $request->integer('limit', 100)
            : 100;

        $logPath = storage_path('logs/laravel.log');
        $logExists = is_file($logPath);
        $logSizeBytes = $logExists ? (int) filesize($logPath) : 0;
        $logUpdatedAt = $logExists ? Carbon::createFromTimestamp((int) filemtime($logPath))->toIso8601String() : null;

        $parsedEntries = $logExists ? $this->parseLaravelLog($logPath, 500) : [];

        $levelCounts = [
            'ERROR' => 0,
            'WARNING' => 0,
            'INFO' => 0,
            'DEBUG' => 0,
        ];

        foreach ($parsedEntries as $entry) {
            $bucket = match ($entry['level']) {
                'EMERGENCY', 'ALERT', 'CRITICAL', 'ERROR' => 'ERROR',
                'WARNING', 'NOTICE' => 'WARNING',
                'INFO' => 'INFO',
                default => 'DEBUG',
            };
            $levelCounts[$bucket]++;
        }

        $filteredEntries = array_values(array_filter($parsedEntries, function (array $entry) use ($level, $search): bool {
            if ($level !== 'ALL' && $level !== '') {
                $matchesLevel = match ($level) {
                    'ERROR' => in_array($entry['level'], ['EMERGENCY', 'ALERT', 'CRITICAL', 'ERROR'], true),
                    'WARNING' => in_array($entry['level'], ['WARNING', 'NOTICE'], true),
                    default => $entry['level'] === $level,
                };

                if (! $matchesLevel) {
                    return false;
                }
            }

            if ($search !== '') {
                $needle = mb_strtolower($search);
                $haystack = mb_strtolower($entry['message']."\n".$entry['trace']);

                return str_contains($haystack, $needle);
            }

            return true;
        }));

        $functionLogs = AppFunction::query()
            ->with('app:id,name')
            ->whereNotNull('logs')
            ->orderByDesc('updated_at')
            ->limit(25)
            ->get()
            ->flatMap(function (AppFunction $fn): array {
                $logs = is_array($fn->logs) ? array_slice($fn->logs, 0, 5) : [];

                return array_map(fn (array $log): array => [
                    'app_id' => $fn->app_id,
                    'app_name' => $fn->app instanceof App ? $fn->app->name : 'App',
                    'function_name' => $fn->name,
                    'timestamp' => $log['timestamp'] ?? null,
                    'status' => (int) ($log['status'] ?? 200),
                    'duration_ms' => (float) ($log['duration_ms'] ?? 0),
                    'output' => $log['output'] ?? null,
                    'error' => $log['error'] ?? null,
                ], $logs);
            })
            ->sortByDesc('timestamp')
            ->take(50)
            ->values()
            ->all();

        return Inertia::render('admin/diagnostic/logs', [
            'systemLogs' => array_slice($filteredEntries, 0, $limit),
            'totalMatchingLogs' => count($filteredEntries),
            'totalParsedLogs' => count($parsedEntries),
            'levelCounts' => $levelCounts,
            'logFileInfo' => [
                'exists' => $logExists,
                'path' => 'storage/logs/laravel.log',
                'size_bytes' => $logSizeBytes,
                'updated_at' => $logUpdatedAt,
            ],
            'functionLogs' => $functionLogs,
            'filters' => [
                'level' => $level ?: 'ALL',
                'search' => $search,
                'limit' => $limit,
            ],
        ]);
    }

    /**
     * Download the raw `storage/logs/laravel.log` file.
     */
    public function downloadLogs(): SymfonyResponse
    {
        $logPath = storage_path('logs/laravel.log');

        if (! is_file($logPath)) {
            abort(404, 'Aucun fichier de journal système trouvé.');
        }

        return response()->download($logPath, 'zenbase-system-'.now()->format('Ymd-His').'.log', [
            'Content-Type' => 'text/plain; charset=UTF-8',
        ]);
    }

    /**
     * Clear the Laravel system log file.
     */
    public function clearLogs(): RedirectResponse
    {
        $logPath = storage_path('logs/laravel.log');

        if (is_file($logPath)) {
            file_put_contents($logPath, '');
        }

        return back()->with('success', 'Le journal système (laravel.log) a été vidé.');
    }

    /**
     * Parse the tail of `laravel.log` into newest-first structured log entries.
     *
     * @return array<int, array{id: string, timestamp: string, environment: string, level: string, message: string, trace: string}>
     */
    private function parseLaravelLog(string $path, int $maxEntries = 500): array
    {
        $maxReadBytes = 1024 * 1024; // Read up to the last 1 MB for fast parsing
        $size = (int) filesize($path);

        if ($size <= 0) {
            return [];
        }

        $handle = fopen($path, 'rb');
        if ($handle === false) {
            return [];
        }

        if ($size > $maxReadBytes) {
            fseek($handle, $size - $maxReadBytes);
            // Discard partial first line
            fgets($handle);
        }

        $raw = stream_get_contents($handle);
        fclose($handle);

        if (! is_string($raw) || trim($raw) === '') {
            return [];
        }

        $lines = preg_split('/\r\n|\r|\n/', $raw) ?: [];
        $entries = [];
        $current = null;

        foreach ($lines as $line) {
            if (preg_match('/^\[(\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}(?:\.\d+)?)\]\s+([^.]+)\.([A-Z]+):\s*(.*)$/', $line, $matches)) {
                if ($current !== null) {
                    $entries[] = $current;
                }

                $current = [
                    'id' => md5($matches[1].$matches[3].$matches[4].count($entries)),
                    'timestamp' => $matches[1],
                    'environment' => trim($matches[2]),
                    'level' => strtoupper(trim($matches[3])),
                    'message' => trim($matches[4]),
                    'trace' => '',
                ];
            } elseif ($current !== null && trim($line) !== '') {
                $current['trace'] = $current['trace'] === '' ? $line : $current['trace']."\n".$line;
            }
        }

        if ($current !== null) {
            $entries[] = $current;
        }

        $entries = array_reverse($entries);

        return array_slice($entries, 0, $maxEntries);
    }
}
