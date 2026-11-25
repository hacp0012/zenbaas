<?php

namespace App\Http\Controllers\Dashboard;

use App\Concerns\AuthorizesAppOwnership;
use App\Http\Controllers\Controller;
use App\Mcp\Servers\ZenbaseAppServer;
use App\Models\App;
use App\Modules\Auth\Models\TenantUser;
use App\Modules\Database\Engines\NoSqlDatabaseEngine;
use App\Modules\Functions\Models\AppFunction;
use App\Modules\Storage\Services\StorageManagerService;
use App\Services\TenantManagerService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
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

        $app = $user->apps()->create([
            'name' => $validated['name'],
            'description' => $validated['description'] ?? null,
            'public_key' => App::generatePublicKey(),
            'secret_key' => App::generateSecretKey(),
            'settings' => ['rate_limit' => 120, 'env_variables' => []],
        ]);

        $this->tenantManager->connect($app);

        return redirect()
            ->route('dashboard.apps.show', $app)
            ->with('success', "Application « {$app->name} » créée et base SQLite provisionnée.");
    }

    /**
     * Display the overview & API keys page for a specific application.
     */
    public function show(Request $request, App $app): Response
    {
        $this->ensureAppOwnership($request, $app);

        return Inertia::render('client/apps/show', [
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
            $tenantUsersQuery->where('email', 'like', '%'.$search.'%');
        }

        $tenantUsers = $tenantUsersQuery->get()->map(fn (TenantUser $u): array => [
            'id' => $u->id,
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

        if ($folder !== 'all' && $folder !== '') {
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
                'cors_origins' => $corsOrigins,
                'files' => $files,
                'functions' => $functions,
                'mcp_settings' => $app->mcpSettings(),
            ],
            'collections' => $collections,
            'apiBaseUrl' => url('/api/v1'),
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
