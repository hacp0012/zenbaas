<?php

namespace App\Http\Controllers\Dashboard;

use App\Concerns\AuthorizesAppOwnership;
use App\Http\Controllers\Controller;
use App\Mcp\Servers\ZenbaseAppServer;
use App\Models\App;
use App\Models\AppFile;
use App\Models\AppLog;
use App\Modules\Auth\Models\TenantUser;
use App\Modules\Database\Engines\NoSqlDatabaseEngine;
use App\Modules\Functions\Models\AppFunction;
use App\Modules\Storage\Services\StorageManagerService;
use App\Services\AppLogService;
use App\Services\TenantManagerService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class ClientAppController extends Controller
{
    use AuthorizesAppOwnership;

    public function __construct(
        public TenantManagerService $tenantManager,
        public NoSqlDatabaseEngine $databaseEngine,
        public StorageManagerService $storageManager,
    ) {}

    /**
     * List all applications owned by the authenticated developer.
     */
    public function index(Request $request): Response|RedirectResponse
    {
        if ($request->user()?->is_admin) {
            return redirect()->route('admin.dashboard');
        }

        $apps = $request->user()
            ->apps()
            ->withCount(['files', 'functions', 'corsOrigins'])
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->get()
            ->map(fn (App $app): array => [
                'id' => $app->id,
                'name' => $app->name,
                'description' => $app->description,
                'public_key' => $app->public_key,
                'secret_key' => $app->secret_key,
                'api_calls_count' => $app->api_calls_count,
                'files_count' => $app->files_count,
                'functions_count' => $app->functions_count,
                'cors_origins_count' => $app->cors_origins_count,
                'database_size_bytes' => $this->tenantManager->getDatabaseSizeBytes($app),
                'created_at' => $app->created_at?->toIso8601String(),
            ]);

        return Inertia::render('client/apps/index', [
            'apps' => $apps,
        ]);
    }

    /**
     * Create a new isolated application and provision its SQLite database.
     */
    public function store(Request $request): RedirectResponse
    {
        if ($request->user()?->is_admin) {
            abort(403, 'Les administrateurs supervisent la plateforme et ne peuvent pas créer d\'applications clientes.');
        }

        $user = $request->user();
        $maxApps = max(1, (int) ($user->max_apps ?? 1));
        $currentAppsCount = $user->apps()->count();

        if ($currentAppsCount >= $maxApps) {
            return back()->withErrors([
                'name' => "Vous avez atteint la limite maximale d'applications autorisées pour votre compte ({$currentAppsCount}/{$maxApps}). Veuillez contacter l'administrateur pour augmenter votre quota.",
            ])->with('error', "Quota atteint : votre compte est limité à {$maxApps} application(s).");
        }

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'description' => ['nullable', 'string', 'max:500'],
        ]);

        $defaultRateLimits = App::defaultRateLimitSettings();

        $app = $user->apps()->create([
            'name' => $validated['name'],
            'description' => $validated['description'] ?? null,
            'public_key' => App::generatePublicKey(),
            'secret_key' => App::generateSecretKey(),
            'settings' => [
                'rate_limit' => $defaultRateLimits['api_per_minute'],
                'rate_limits' => $defaultRateLimits,
                'env_variables' => [],
            ],
        ]);

        $this->tenantManager->connect($app);

        return redirect()
            ->route('dashboard.apps.show', $app)
            ->with('success', "Application « {$app->name} » créée et base SQLite provisionnée.");
    }

    /**
     * Display the overview & analytics dashboard for a specific application.
     */
    public function show(Request $request, App $app): Response
    {
        $this->ensureAppOwnership($request, $app);

        $context = $this->buildBaseAppContext($app);

        return Inertia::render('client/apps/show', [
            ...$context,
            'analytics' => $this->buildAppAnalytics($app, $context),
        ]);
    }

    /**
     * Display the API keys & SDK quickstart integrations page for a specific application.
     */
    public function integrations(Request $request, App $app): Response
    {
        $this->ensureAppOwnership($request, $app);

        return Inertia::render('client/apps/integrations', [
            ...$this->buildBaseAppContext($app),
        ]);
    }

    /**
     * Display the Firebase-inspired NoSQL Database explorer page with pagination & schema support.
     */
    public function database(Request $request, App $app): Response
    {
        $this->ensureAppOwnership($request, $app);
        $context = $this->buildBaseAppContext($app);

        $collections = $context['collections'];
        $requestedCollection = $request->string('collection')->toString();
        $activeCollection = $requestedCollection !== ''
            ? $requestedCollection
            : ($collections[0]['name'] ?? null);

        $page = max(1, $request->integer('page', 1));
        $perPage = in_array($request->integer('per_page', 25), [10, 25, 50, 100, 250], true)
            ? $request->integer('per_page', 25)
            : 25;
        $search = $request->string('search')->toString();
        $orderBy = $request->string('order_by', 'created_at')->toString() ?: 'created_at';
        $direction = $request->string('direction', 'desc')->toString() === 'asc' ? 'asc' : 'desc';

        $pagination = [
            'items' => [],
            'total' => 0,
            'page' => 1,
            'per_page' => $perPage,
            'last_page' => 1,
        ];

        if ($activeCollection !== null) {
            try {
                $pagination = $this->databaseEngine->paginate(
                    $activeCollection,
                    $page,
                    $perPage,
                    $search !== '' ? $search : null,
                    $orderBy,
                    $direction,
                );
            } catch (\Throwable) {
                $pagination = [
                    'items' => [],
                    'total' => 0,
                    'page' => 1,
                    'per_page' => $perPage,
                    'last_page' => 1,
                ];
            }
        }

        return Inertia::render('client/apps/database', [
            ...$context,
            'activeCollection' => $activeCollection,
            'records' => $pagination['items'],
            'pagination' => [
                'total' => $pagination['total'],
                'page' => $pagination['page'],
                'per_page' => $pagination['per_page'],
                'last_page' => $pagination['last_page'],
            ],
            'dbFilters' => [
                'search' => $search,
                'order_by' => $orderBy,
                'direction' => $direction,
                'per_page' => $perPage,
            ],
        ]);
    }

    /**
     * Display the Authentication & Tenant Users management page for a specific application.
     */
    public function auth(Request $request, App $app): Response
    {
        $this->ensureAppOwnership($request, $app);
        $context = $this->buildBaseAppContext($app);

        $search = $request->string('search')->toString();
        $tenantUsersQuery = TenantUser::query()->orderByDesc('created_at')->orderByDesc('id');

        if ($search !== '') {
            $tenantUsersQuery->where(function ($query) use ($search): void {
                $query->where('email', 'like', '%'.$search.'%')
                    ->orWhere('name', 'like', '%'.$search.'%');
            });
        }

        $tenantUsers = $tenantUsersQuery->get()->map(fn (TenantUser $u): array => [
            'id' => $u->id,
            'name' => $u->name,
            'email' => $u->email,
            'auth_method' => $u->auth_method,
            'is_blocked' => $u->is_blocked,
            'created_at' => $u->created_at?->toIso8601String(),
        ]);

        return Inertia::render('client/apps/auth', [
            ...$context,
            'tenantUsers' => $tenantUsers,
            'userSearch' => $search,
        ]);
    }

    /**
     * Display the Professional File Storage management page with pagination, filtering & preview tools.
     */
    public function storage(Request $request, App $app): Response
    {
        $this->ensureAppOwnership($request, $app);
        $context = $this->buildBaseAppContext($app);

        $search = trim($request->string('search')->toString());
        $folder = trim($request->string('folder', 'all')->toString()) ?: 'all';
        $mimeCategory = trim($request->string('mime', 'all')->toString()) ?: 'all';
        $sortBy = in_array($request->string('sort', 'created_at')->toString(), ['created_at', 'size', 'original_name'], true)
            ? $request->string('sort', 'created_at')->toString()
            : 'created_at';
        $direction = $request->string('direction', 'desc')->toString() === 'asc' ? 'asc' : 'desc';
        $perPage = in_array($request->integer('per_page', 24), [12, 24, 48, 96], true)
            ? $request->integer('per_page', 24)
            : 24;
        $page = max(1, $request->integer('page', 1));

        $allFolders = $app->files()
            ->select('folder')
            ->distinct()
            ->orderBy('folder')
            ->pluck('folder')
            ->filter()
            ->values()
            ->all();

        if (! in_array('/', $allFolders, true)) {
            array_unshift($allFolders, '/');
        }

        $query = $app->files()->getQuery();

        if ($folder !== 'all') {
            $query->where('folder', $folder);
        }

        if ($search !== '') {
            $query->where(function ($q) use ($search): void {
                $q->where('original_name', 'like', '%'.$search.'%')
                    ->orWhere('path', 'like', '%'.$search.'%')
                    ->orWhere('mime_type', 'like', '%'.$search.'%');
            });
        }

        if ($mimeCategory !== 'all') {
            match ($mimeCategory) {
                'image' => $query->where('mime_type', 'like', 'image/%'),
                'video' => $query->where('mime_type', 'like', 'video/%'),
                'audio' => $query->where('mime_type', 'like', 'audio/%'),
                'pdf' => $query->where('mime_type', 'application/pdf'),
                'code' => $query->where(function ($q): void {
                    $q->where('mime_type', 'like', 'text/%')
                        ->orWhere('mime_type', 'like', '%json%')
                        ->orWhere('mime_type', 'like', '%javascript%')
                        ->orWhere('mime_type', 'like', '%xml%')
                        ->orWhere('mime_type', 'like', '%php%');
                }),
                default => null,
            };
        }

        $totalFiltered = (int) (clone $query)->count();
        $lastPage = max(1, (int) ceil($totalFiltered / $perPage));
        $currentPage = min($page, $lastPage);

        $paginatedItems = $query
            ->orderBy($sortBy, $direction)
            ->orderByDesc('id')
            ->offset(($currentPage - 1) * $perPage)
            ->limit($perPage)
            ->get();

        $totalBytes = (int) $app->files()->sum('size');
        $imagesCount = (int) $app->files()->where('mime_type', 'like', 'image/%')->count();

        return Inertia::render('client/apps/storage', [
            ...$context,
            'paginatedFiles' => [
                'items' => $paginatedItems,
                'total' => $totalFiltered,
                'page' => $currentPage,
                'per_page' => $perPage,
                'last_page' => $lastPage,
            ],
            'allFolders' => $allFolders,
            'storageStats' => [
                'total_files' => $context['app']['files_count'],
                'total_bytes' => $totalBytes,
                'images_count' => $imagesCount,
            ],
            'storageQuota' => $this->storageManager->getStorageUsageSummary($app),
            'storageFilters' => [
                'search' => $search,
                'folder' => $folder,
                'mime' => $mimeCategory,
                'sort' => $sortBy,
                'direction' => $direction,
                'per_page' => $perPage,
            ],
        ]);
    }

    /**
     * Display the Dynamic CORS rules page for a specific application.
     */
    public function cors(Request $request, App $app): Response
    {
        $this->ensureAppOwnership($request, $app);

        return Inertia::render('client/apps/cors', [
            ...$this->buildBaseAppContext($app),
        ]);
    }

    /**
     * Display the Serverless PHP Web Functions list & management overview page.
     */
    public function functions(Request $request, App $app): Response
    {
        $this->ensureAppOwnership($request, $app);

        $stubsPath = resource_path('stubs/zenbase-stubs.php');
        $stubsContent = file_exists($stubsPath) ? (string) file_get_contents($stubsPath) : '';

        return Inertia::render('client/apps/functions', [
            ...$this->buildBaseAppContext($app),
            'stubsContent' => $stubsContent,
            'globalEnv' => is_array($app->settings['env_variables'] ?? null) ? $app->settings['env_variables'] : [],
        ]);
    }

    /**
     * Display the dedicated full-page PHP Web Function IDE editor with autocomplete & live test runner.
     */
    public function functionEditor(Request $request, App $app, ?AppFunction $function = null): Response
    {
        $this->ensureAppOwnership($request, $app);

        if ($function !== null && $function->app_id !== $app->id) {
            abort(404);
        }

        $stubsPath = resource_path('stubs/zenbase-stubs.php');
        $stubsContent = file_exists($stubsPath) ? (string) file_get_contents($stubsPath) : '';

        return Inertia::render('client/apps/function-editor', [
            ...$this->buildBaseAppContext($app),
            'activeFunction' => $function,
            'stubsContent' => $stubsContent,
            'globalEnv' => is_array($app->settings['env_variables'] ?? null) ? $app->settings['env_variables'] : [],
        ]);
    }

    /**
     * Display the dedicated Environment Variables sub-page for Web Functions.
     */
    public function functionEnv(Request $request, App $app): Response
    {
        $this->ensureAppOwnership($request, $app);

        return Inertia::render('client/apps/function-env', [
            ...$this->buildBaseAppContext($app),
            'globalEnv' => is_array($app->settings['env_variables'] ?? null) ? $app->settings['env_variables'] : [],
        ]);
    }

    /**
     * Display the MCP Server configuration & AI client integration page for a specific application.
     */
    public function mcp(Request $request, App $app): Response
    {
        $this->ensureAppOwnership($request, $app);

        $mcpSettings = $app->mcpSettings();

        return Inertia::render('client/apps/mcp', [
            ...$this->buildBaseAppContext($app),
            'mcpEndpointUrl' => url('/mcp'),
            'mcpSettings' => $mcpSettings,
            'mcpTools' => ZenbaseAppServer::toolCatalog($mcpSettings),
            'mcpResources' => ZenbaseAppServer::resourceCatalog(),
            'mcpPrompts' => ZenbaseAppServer::promptCatalog(),
        ]);
    }

    /**
     * Display the downloadable Agent Skills page for AI coding assistants connected to this application.
     */
    public function skills(Request $request, App $app): Response
    {
        $this->ensureAppOwnership($request, $app);

        return Inertia::render('client/apps/skills', [
            ...$this->buildBaseAppContext($app),
            'mcpSkills' => AppMcpController::skillCatalog(),
        ]);
    }

    /**
     * Display the unified per-application activity logs page (API, Auth, Functions, MCP, Storage).
     */
    public function logs(Request $request, App $app): Response
    {
        $this->ensureAppOwnership($request, $app);

        $source = trim((string) $request->query('source', 'all'));
        $level = trim((string) $request->query('level', 'all'));
        $statusGroup = trim((string) $request->query('status', 'all'));
        $search = trim((string) $request->query('search', ''));
        $perPage = (int) $request->query('per_page', 30);
        if (! in_array($perPage, [20, 30, 50, 100], true)) {
            $perPage = 30;
        }

        $query = $app->logs()->orderByDesc('id');

        if (in_array($source, AppLog::SOURCES, true)) {
            $query->where('source', $source);
        } else {
            $source = 'all';
        }

        if (in_array($level, AppLog::LEVELS, true)) {
            $query->where('level', $level);
        } else {
            $level = 'all';
        }

        if ($statusGroup === '2xx') {
            $query->whereBetween('status_code', [200, 299]);
        } elseif ($statusGroup === '4xx') {
            $query->whereBetween('status_code', [400, 499]);
        } elseif ($statusGroup === '429') {
            $query->where('status_code', 429);
        } elseif ($statusGroup === '5xx') {
            $query->where('status_code', '>=', 500);
        } else {
            $statusGroup = 'all';
        }

        if ($search !== '') {
            $query->where(function ($subQuery) use ($search): void {
                $subQuery->where('action', 'like', "%{$search}%")
                    ->orWhere('path', 'like', "%{$search}%")
                    ->orWhere('message', 'like', "%{$search}%")
                    ->orWhere('ip_address', 'like', "%{$search}%");
            });
        }

        $paginator = $query->paginate($perPage)->withQueryString();

        $paginatedLogs = [
            'data' => $paginator->getCollection()->map(fn (AppLog $log): array => [
                'id' => $log->id,
                'source' => $log->source,
                'level' => $log->level,
                'action' => $log->action,
                'method' => $log->method,
                'path' => $log->path,
                'status_code' => $log->status_code,
                'duration_ms' => $log->duration_ms,
                'api_key_role' => $log->api_key_role,
                'ip_address' => $log->ip_address,
                'message' => $log->message,
                'context' => $log->context,
                'created_at' => $log->created_at?->toIso8601String(),
            ])->values()->all(),
            'current_page' => $paginator->currentPage(),
            'last_page' => $paginator->lastPage(),
            'per_page' => $paginator->perPage(),
            'total' => $paginator->total(),
            'from' => $paginator->firstItem(),
            'to' => $paginator->lastItem(),
        ];

        $rawSourceCounts = DB::table('app_logs')
            ->selectRaw('source, COUNT(*) as total')
            ->where('app_id', $app->id)
            ->groupBy('source')
            ->pluck('total', 'source');

        $sourceCounts = [
            'all' => 0,
            AppLog::SOURCE_API => (int) ($rawSourceCounts[AppLog::SOURCE_API] ?? 0),
            AppLog::SOURCE_AUTH => (int) ($rawSourceCounts[AppLog::SOURCE_AUTH] ?? 0),
            AppLog::SOURCE_FUNCTIONS => (int) ($rawSourceCounts[AppLog::SOURCE_FUNCTIONS] ?? 0),
            AppLog::SOURCE_MCP => (int) ($rawSourceCounts[AppLog::SOURCE_MCP] ?? 0),
            AppLog::SOURCE_STORAGE => (int) ($rawSourceCounts[AppLog::SOURCE_STORAGE] ?? 0),
        ];
        $sourceCounts['all'] = $sourceCounts[AppLog::SOURCE_API]
            + $sourceCounts[AppLog::SOURCE_AUTH]
            + $sourceCounts[AppLog::SOURCE_FUNCTIONS]
            + $sourceCounts[AppLog::SOURCE_MCP]
            + $sourceCounts[AppLog::SOURCE_STORAGE];

        $summaryRow = DB::table('app_logs')
            ->selectRaw('COUNT(*) as total')
            ->selectRaw("SUM(CASE WHEN level = 'info' THEN 1 ELSE 0 END) as info_count")
            ->selectRaw("SUM(CASE WHEN level = 'warning' THEN 1 ELSE 0 END) as warning_count")
            ->selectRaw("SUM(CASE WHEN level = 'error' THEN 1 ELSE 0 END) as error_count")
            ->selectRaw('SUM(CASE WHEN status_code = 429 THEN 1 ELSE 0 END) as rate_limited_count')
            ->selectRaw('AVG(duration_ms) as avg_duration_ms')
            ->where('app_id', $app->id)
            ->first();

        return Inertia::render('client/apps/logs', [
            ...$this->buildBaseAppContext($app),
            'logs' => $paginatedLogs,
            'sourceCounts' => $sourceCounts,
            'summary' => [
                'total' => (int) ($summaryRow->total ?? 0),
                'info_count' => (int) ($summaryRow->info_count ?? 0),
                'warning_count' => (int) ($summaryRow->warning_count ?? 0),
                'error_count' => (int) ($summaryRow->error_count ?? 0),
                'rate_limited_count' => (int) ($summaryRow->rate_limited_count ?? 0),
                'avg_duration_ms' => isset($summaryRow->avg_duration_ms) ? (int) round((float) $summaryRow->avg_duration_ms) : 0,
            ],
            'retention' => [
                'max_entries' => AppLogService::MAX_LOGS_PER_APP,
                'retention_days' => AppLogService::RETENTION_DAYS,
            ],
            'filters' => [
                'source' => $source,
                'level' => $level,
                'status' => $statusGroup,
                'search' => $search,
                'per_page' => $perPage,
            ],
        ]);
    }

    /**
     * Display the per-application Rate Limiting settings page.
     */
    public function settingsRateLimits(Request $request, App $app): Response
    {
        $this->ensureAppOwnership($request, $app);

        return Inertia::render('client/apps/settings/rate-limits', [
            ...$this->buildBaseAppContext($app),
            'rateLimits' => $app->rateLimitSettings(),
        ]);
    }

    /**
     * Display the Advanced application settings and lifecycle management page (including deletion).
     */
    public function settingsAdvanced(Request $request, App $app): Response
    {
        $this->ensureAppOwnership($request, $app);

        return Inertia::render('client/apps/settings/advanced', [
            ...$this->buildBaseAppContext($app),
        ]);
    }

    /**
     * Build the shared application context used by the ClientAppLayout sidebar and sub-pages.
     *
     * @return array<string, mixed>
     */
    private function buildBaseAppContext(App $app): array
    {
        $this->tenantManager->connect($app);

        $collections = $this->databaseEngine->listCollections();
        $tenantUsersCount = TenantUser::query()->count();
        $corsOrigins = $app->corsOrigins()->orderByDesc('created_at')->get();
        $files = $app->files()->orderByDesc('created_at')->limit(100)->get();
        $filesCount = $app->files()->count();
        $functions = $app->functions()->orderByDesc('created_at')->get();
        $logsCount = $app->logs()->count();
        $errorLogsCount = $app->logs()->where('level', AppLog::LEVEL_ERROR)->count();

        return [
            'app' => [
                'id' => $app->id,
                'name' => $app->name,
                'description' => $app->description,
                'public_key' => $app->public_key,
                'secret_key' => $app->secret_key,
                'api_calls_count' => $app->api_calls_count,
                'database_size_bytes' => $this->tenantManager->getDatabaseSizeBytes($app),
                'created_at' => $app->created_at?->toIso8601String(),
                'collections_count' => count($collections),
                'tenant_users_count' => $tenantUsersCount,
                'files_count' => $filesCount,
                'cors_origins_count' => $corsOrigins->count(),
                'functions_count' => $functions->count(),
                'logs_count' => $logsCount,
                'error_logs_count' => $errorLogsCount,
                'cors_origins' => $corsOrigins,
                'files' => $files,
                'functions' => $functions,
                'mcp_settings' => $app->mcpSettings(),
                'rate_limits' => $app->rateLimitSettings(),
            ],
            'collections' => $collections,
            'apiBaseUrl' => url('/api/v1'),
        ];
    }

    /**
     * Build real-time statistical analytics for the application dashboard charts.
     *
     * @param  array<string, mixed>  $context
     * @return array<string, mixed>
     */
    private function buildAppAnalytics(App $app, array $context): array
    {
        $today = now()->startOfDay();
        $startDate = $today->copy()->subDays(6);
        $startDateString = $startDate->toDateTimeString();

        /** @var array<string, array{date: string, label: string, records: int, users: int, files: int, function_runs: int}> $days */
        $days = [];
        for ($i = 0; $i < 7; $i++) {
            $day = $startDate->copy()->addDays($i);
            $key = $day->format('Y-m-d');
            $days[$key] = [
                'date' => $key,
                'label' => $day->format('d/m'),
                'records' => 0,
                'users' => 0,
                'files' => 0,
                'function_runs' => 0,
            ];
        }

        // 1. Daily NoSQL records created (tenant SQLite DB)
        $recentRecordDates = DB::connection('tenant')
            ->table('records')
            ->where('created_at', '>=', $startDateString)
            ->pluck('created_at');

        foreach ($recentRecordDates as $createdAt) {
            if (! is_string($createdAt) || $createdAt === '') {
                continue;
            }
            $dayKey = substr($createdAt, 0, 10);
            if (isset($days[$dayKey])) {
                $days[$dayKey]['records']++;
            }
        }

        // 2. Daily tenant users + auth method & status breakdown
        $tenantUsers = TenantUser::query()
            ->get(['auth_method', 'is_blocked', 'created_at']);

        $passwordUsers = 0;
        $otpUsers = 0;
        $otherAuthUsers = 0;
        $blockedUsers = 0;

        foreach ($tenantUsers as $tenantUser) {
            if ($tenantUser->is_blocked) {
                $blockedUsers++;
            }

            match (strtolower((string) $tenantUser->auth_method)) {
                'password' => $passwordUsers++,
                'otp' => $otpUsers++,
                default => $otherAuthUsers++,
            };

            $createdDay = $tenantUser->created_at?->format('Y-m-d');
            if ($createdDay !== null && isset($days[$createdDay])) {
                $days[$createdDay]['users']++;
            }
        }

        // 3. Files daily uploads + MIME breakdown
        $allFiles = $app->files()->get(['size', 'mime_type', 'created_at']);

        $mimeBuckets = [
            'images' => ['key' => 'images', 'label' => 'Images', 'count' => 0, 'bytes' => 0],
            'documents' => ['key' => 'documents', 'label' => 'PDF & Docs', 'count' => 0, 'bytes' => 0],
            'media' => ['key' => 'media', 'label' => 'Audio & Vidéo', 'count' => 0, 'bytes' => 0],
            'code' => ['key' => 'code', 'label' => 'Code & Texte', 'count' => 0, 'bytes' => 0],
            'other' => ['key' => 'other', 'label' => 'Autres', 'count' => 0, 'bytes' => 0],
        ];

        /** @var AppFile $file */
        foreach ($allFiles as $file) {
            $mime = strtolower((string) $file->mime_type);
            $size = (int) $file->size;

            $bucketKey = match (true) {
                str_starts_with($mime, 'image/') => 'images',
                $mime === 'application/pdf' || str_contains($mime, 'document') || str_contains($mime, 'word') || str_contains($mime, 'sheet') => 'documents',
                str_starts_with($mime, 'video/') || str_starts_with($mime, 'audio/') => 'media',
                str_starts_with($mime, 'text/') || str_contains($mime, 'json') || str_contains($mime, 'javascript') || str_contains($mime, 'xml') || str_contains($mime, 'php') => 'code',
                default => 'other',
            };

            $mimeBuckets[$bucketKey]['count']++;
            $mimeBuckets[$bucketKey]['bytes'] += $size;

            $fileDay = $file->created_at?->format('Y-m-d');
            if ($fileDay !== null && isset($days[$fileDay])) {
                $days[$fileDay]['files']++;
            }
        }

        // 4. Web Functions execution logs, latency & daily runs
        /** @var array<int, array{function_name: string, status: int, duration_ms: float, has_error: bool, timestamp: string}> $recentRuns */
        $recentRuns = [];
        $totalRuns = 0;
        $successRuns = 0;
        $errorRuns = 0;
        $totalDurationMs = 0.0;

        /** @var Collection<int, AppFunction> $functions */
        $functions = $app->functions()->get(['name', 'is_active', 'logs']);
        $activeFunctionsCount = 0;

        foreach ($functions as $fn) {
            if ($fn->is_active) {
                $activeFunctionsCount++;
            }

            $logs = is_array($fn->logs) ? $fn->logs : [];
            foreach ($logs as $log) {
                $totalRuns++;
                $hasError = ! empty($log['error']) || ((int) ($log['status'] ?? 200) >= 400);
                if ($hasError) {
                    $errorRuns++;
                } else {
                    $successRuns++;
                }

                $duration = is_numeric($log['duration_ms'] ?? null) ? (float) $log['duration_ms'] : 0.0;
                $totalDurationMs += $duration;

                $timestamp = is_string($log['timestamp'] ?? null) ? $log['timestamp'] : '';
                if ($timestamp !== '') {
                    try {
                        $runDay = Carbon::parse($timestamp)->format('Y-m-d');
                        if (isset($days[$runDay])) {
                            $days[$runDay]['function_runs']++;
                        }
                    } catch (\Throwable) {
                        // Ignore malformed historical timestamp entries
                    }
                }

                $recentRuns[] = [
                    'function_name' => $fn->name,
                    'status' => (int) ($log['status'] ?? 200),
                    'duration_ms' => round($duration, 2),
                    'has_error' => $hasError,
                    'timestamp' => $timestamp,
                ];
            }
        }

        usort($recentRuns, static fn (array $a, array $b): int => strcmp($b['timestamp'], $a['timestamp']));
        $latestRuns = array_reverse(array_slice($recentRuns, 0, 14));

        // 5. NoSQL collections breakdown
        /** @var array<int, array{name: string, count: int, schema?: array<string, mixed>|null}> $rawCollections */
        $rawCollections = is_array($context['collections'] ?? null) ? $context['collections'] : [];
        $totalRecords = 0;
        $collectionsBreakdown = [];

        foreach ($rawCollections as $col) {
            $count = $col['count'];
            $totalRecords += $count;
            $collectionsBreakdown[] = [
                'name' => $col['name'],
                'count' => $count,
                'has_schema' => ! empty($col['schema']),
            ];
        }

        usort($collectionsBreakdown, static fn (array $a, array $b): int => $b['count'] <=> $a['count']);

        $totalUsers = $tenantUsers->count();

        return [
            'daily_activity' => array_values($days),
            'total_records' => $totalRecords,
            'collections_breakdown' => array_slice($collectionsBreakdown, 0, 8),
            'storage_breakdown' => array_values($mimeBuckets),
            'storage_quota' => $this->storageManager->getStorageUsageSummary($app),
            'auth_breakdown' => [
                'total' => $totalUsers,
                'active' => max(0, $totalUsers - $blockedUsers),
                'blocked' => $blockedUsers,
                'password' => $passwordUsers,
                'otp' => $otpUsers,
                'other' => $otherAuthUsers,
            ],
            'functions_stats' => [
                'total_functions' => $functions->count(),
                'active_functions' => $activeFunctionsCount,
                'total_runs' => $totalRuns,
                'success_runs' => $successRuns,
                'error_runs' => $errorRuns,
                'success_rate' => $totalRuns > 0 ? round(($successRuns / $totalRuns) * 100, 1) : 100.0,
                'avg_duration_ms' => $totalRuns > 0 ? round($totalDurationMs / $totalRuns, 1) : 0.0,
                'recent_runs' => $latestRuns,
            ],
        ];
    }

    /**
     * Regenerate the public and secret API keys for an application.
     */
    public function regenerateKeys(Request $request, App $app): RedirectResponse
    {
        $this->ensureAppOwnership($request, $app);

        $app->update([
            'public_key' => App::generatePublicKey(),
            'secret_key' => App::generateSecretKey(),
        ]);

        return back()->with('success', 'Les clés API (publique et secrète) ont été régénérées.');
    }

    /**
     * Delete an application along with its isolated SQLite database and files.
     */
    public function destroy(Request $request, App $app): RedirectResponse
    {
        $this->ensureAppOwnership($request, $app);

        $this->tenantManager->deleteDatabase($app);
        $this->storageManager->deleteAllForApp($app);
        $app->delete();

        return redirect()
            ->route('dashboard')
            ->with('success', 'Application et ressources isolées supprimées.');
    }
}
