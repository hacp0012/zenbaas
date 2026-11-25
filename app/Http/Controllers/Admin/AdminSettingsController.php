<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\App;
use App\Models\AppFile;
use App\Models\PlatformSetting;
use App\Models\User;
use App\Services\TenantManagerService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class AdminSettingsController extends Controller
{
    public function __construct(public TenantManagerService $tenantManager) {}

    /**
     * Display the global platform default settings page (Users & Rate Limits).
     */
    public function configs(): Response
    {
        return Inertia::render('admin/settings/configs', [
            'configs' => PlatformSetting::allSettings(),
        ]);
    }

    /**
     * Save the global platform default settings (Users & Rate Limits).
     */
    public function updateConfigs(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'default_user_expiration_days' => ['nullable', 'integer', 'min:1', 'max:3650'],
            'default_user_max_storage_mb' => ['nullable', 'integer', 'min:1', 'max:1048576'],
            'default_user_max_apps' => ['required', 'integer', 'min:1', 'max:1000'],
            'default_rate_limit_enabled' => ['required', 'boolean'],
            'default_rate_limit_key_by' => ['required', 'string', 'in:app,ip'],
            'default_api_rate_limit' => ['required', 'integer', 'min:10', 'max:10000'],
            'default_auth_rate_limit' => ['required', 'integer', 'min:5', 'max:2000'],
            'default_functions_rate_limit' => ['required', 'integer', 'min:5', 'max:5000'],
            'default_storage_rate_limit' => ['required', 'integer', 'min:5', 'max:2000'],
            'default_mcp_rate_limit' => ['required', 'integer', 'min:10', 'max:5000'],
        ]);

        PlatformSetting::saveSettings([
            'default_user_expiration_days' => $validated['default_user_expiration_days'] !== null
                ? (int) $validated['default_user_expiration_days']
                : null,
            'default_user_max_storage_mb' => $validated['default_user_max_storage_mb'] !== null
                ? (int) $validated['default_user_max_storage_mb']
                : null,
            'default_user_max_apps' => (int) $validated['default_user_max_apps'],
            'default_rate_limit_enabled' => (bool) $validated['default_rate_limit_enabled'],
            'default_rate_limit_key_by' => $validated['default_rate_limit_key_by'] === 'ip' ? 'ip' : 'app',
            'default_api_rate_limit' => (int) $validated['default_api_rate_limit'],
            'default_auth_rate_limit' => (int) $validated['default_auth_rate_limit'],
            'default_functions_rate_limit' => (int) $validated['default_functions_rate_limit'],
            'default_storage_rate_limit' => (int) $validated['default_storage_rate_limit'],
            'default_mcp_rate_limit' => (int) $validated['default_mcp_rate_limit'],
        ]);

        return back()->with('success', 'Configurations globales par défaut enregistrées avec succès.');
    }

    /**
     * Display the global platform Storage quota configuration and usage charts page.
     */
    public function storage(): Response
    {
        $settings = PlatformSetting::allSettings();
        $apps = App::query()->with('user:id,name,email')->get();

        $totalDbBytes = 0;
        $storageByApp = [];

        $fileBytesByApp = AppFile::query()
            ->selectRaw('app_id, COALESCE(SUM(size), 0) as total_bytes, COUNT(*) as files_count')
            ->groupBy('app_id')
            ->get()
            ->keyBy('app_id');

        foreach ($apps as $app) {
            $dbBytes = $this->tenantManager->getDatabaseSizeBytes($app);
            $totalDbBytes += $dbBytes;

            /** @var object{total_bytes: int|string, files_count: int|string}|null $fileRow */
            $fileRow = $fileBytesByApp->get($app->id);
            $fileBytes = $fileRow ? (int) $fileRow->total_bytes : 0;
            $filesCount = $fileRow ? (int) $fileRow->files_count : 0;

            $storageByApp[] = [
                'id' => $app->id,
                'name' => $app->name,
                'owner' => $app->user instanceof User ? $app->user->name : '—',
                'db_bytes' => $dbBytes,
                'files_bytes' => $fileBytes,
                'total_bytes' => $dbBytes + $fileBytes,
                'files_count' => $filesCount,
            ];
        }

        usort($storageByApp, fn (array $a, array $b): int => $b['total_bytes'] <=> $a['total_bytes']);

        $totalFileBytes = (int) AppFile::query()->sum('size');
        $totalFilesCount = AppFile::query()->count();

        // Storage breakdown by file MIME category
        $imageBytes = (int) AppFile::query()->where('mime_type', 'like', 'image/%')->sum('size');
        $pdfBytes = (int) AppFile::query()->where('mime_type', 'application/pdf')->sum('size');
        $mediaBytes = (int) AppFile::query()
            ->where(function ($q): void {
                $q->where('mime_type', 'like', 'video/%')
                    ->orWhere('mime_type', 'like', 'audio/%');
            })
            ->sum('size');
        $codeBytes = (int) AppFile::query()
            ->where(function ($q): void {
                $q->where('mime_type', 'like', 'text/%')
                    ->orWhere('mime_type', 'like', '%json%')
                    ->orWhere('mime_type', 'like', '%javascript%')
                    ->orWhere('mime_type', 'like', '%xml%')
                    ->orWhere('mime_type', 'like', '%php%');
            })
            ->sum('size');
        $otherFileBytes = max(0, $totalFileBytes - ($imageBytes + $pdfBytes + $mediaBytes + $codeBytes));

        // Top storage consumers by User
        $userStorageRows = DB::table('app_files')
            ->join('apps', 'app_files.app_id', '=', 'apps.id')
            ->join('users', 'apps.user_id', '=', 'users.id')
            ->selectRaw('users.id, users.name, users.email, users.max_storage_mb, COALESCE(SUM(app_files.size), 0) as used_bytes, COUNT(app_files.id) as files_count')
            ->groupBy('users.id', 'users.name', 'users.email', 'users.max_storage_mb')
            ->orderByDesc('used_bytes')
            ->limit(8)
            ->get()
            ->map(fn (object $row): array => [
                'id' => (int) $row->id,
                'name' => (string) $row->name,
                'email' => (string) $row->email,
                'max_storage_mb' => $row->max_storage_mb !== null ? (int) $row->max_storage_mb : null,
                'used_bytes' => (int) $row->used_bytes,
                'files_count' => (int) $row->files_count,
            ])
            ->all();

        $totalUsedBytes = $totalDbBytes + $totalFileBytes;
        $globalMaxMb = $settings['global_max_storage_mb'];
        $globalMaxBytes = $globalMaxMb !== null ? $globalMaxMb * 1024 * 1024 : null;

        return Inertia::render('admin/settings/storage', [
            'storageConfig' => [
                'global_max_storage_mb' => $globalMaxMb,
                'global_max_storage_bytes' => $globalMaxBytes,
            ],
            'storageSummary' => [
                'total_used_bytes' => $totalUsedBytes,
                'files_bytes' => $totalFileBytes,
                'databases_bytes' => $totalDbBytes,
                'total_files_count' => $totalFilesCount,
                'total_apps_count' => $apps->count(),
                'total_users_count' => User::query()->where('is_admin', false)->count(),
                'remaining_bytes' => $globalMaxBytes !== null ? max(0, $globalMaxBytes - $totalUsedBytes) : null,
            ],
            'mimeBreakdown' => [
                ['label' => 'Bases SQLite', 'bytes' => $totalDbBytes, 'color' => '#10b981'],
                ['label' => 'Images', 'bytes' => $imageBytes, 'color' => '#3b82f6'],
                ['label' => 'Documents PDF', 'bytes' => $pdfBytes, 'color' => '#f43f5e'],
                ['label' => 'Vidéo / Audio', 'bytes' => $mediaBytes, 'color' => '#8b5cf6'],
                ['label' => 'Code / JSON / Texte', 'bytes' => $codeBytes, 'color' => '#f59e0b'],
                ['label' => 'Autres fichiers', 'bytes' => $otherFileBytes, 'color' => '#64748b'],
            ],
            'topApps' => array_slice($storageByApp, 0, 8),
            'topUsers' => $userStorageRows,
        ]);
    }

    /**
     * Save the global maximum storage limit for the Zenbase platform.
     */
    public function updateStorage(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'global_max_storage_mb' => ['nullable', 'integer', 'min:10', 'max:104857600'],
        ]);

        $limitMb = $validated['global_max_storage_mb'] !== null
            ? (int) $validated['global_max_storage_mb']
            : null;

        PlatformSetting::saveSettings([
            'global_max_storage_mb' => $limitMb,
        ]);

        $message = $limitMb !== null
            ? "Quota global de stockage défini à {$limitMb} Mo."
            : 'Quota global de stockage défini sur Illimité.';

        return back()->with('success', $message);
    }
}
