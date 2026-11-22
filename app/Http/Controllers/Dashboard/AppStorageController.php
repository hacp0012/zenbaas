<?php

namespace App\Http\Controllers\Dashboard;

use App\Concerns\AuthorizesAppOwnership;
use App\Http\Controllers\Controller;
use App\Models\App;
use App\Models\AppFile;
use App\Modules\Storage\Exceptions\StorageQuotaExceededException;
use App\Modules\Storage\Services\StorageManagerService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\Response as SymfonyResponse;

class AppStorageController extends Controller
{
    use AuthorizesAppOwnership;

    public function __construct(public StorageManagerService $storageManager) {}

    /**
     * Serve or download a stored application file without requiring a public/storage OS symlink.
     */
    public function serve(Request $request, AppFile $file): SymfonyResponse
    {
        $disk = Storage::disk($file->disk ?: 'public');

        if (! $disk->exists($file->path)) {
            abort(404, 'Fichier introuvable sur le disque de stockage.');
        }

        $mimeType = $file->mime_type ?: 'application/octet-stream';
        $filename = $file->original_name ?: basename($file->path);

        if ($request->boolean('download')) {
            return $disk->download($file->path, $filename, [
                'Content-Type' => $mimeType,
            ]);
        }

        return $disk->response($file->path, $filename, [
            'Content-Type' => $mimeType,
            'Cache-Control' => 'public, max-age=3600',
        ]);
    }

    /**
     * Fallback handler for direct `/storage/tenants/{path}` URLs.
     */
    public function serveByTenantPath(Request $request, string $path): SymfonyResponse
    {
        $cleanPath = 'tenants/'.ltrim(str_replace(['\\', '..'], ['/', ''], $path), '/');
        $disk = Storage::disk('public');

        if (! $disk->exists($cleanPath)) {
            abort(404, 'Fichier introuvable.');
        }

        if ($request->boolean('download')) {
            return $disk->download($cleanPath, basename($cleanPath));
        }

        return $disk->response($cleanPath);
    }

    /**
     * Upload one or more files into the application's isolated storage directory from the Dashboard.
     */
    public function store(Request $request, App $app): RedirectResponse
    {
        $this->ensureAppOwnership($request, $app);

        $validated = $request->validate([
            'file' => ['nullable', 'file', 'max:51200'],
            'files' => ['nullable', 'array'],
            'files.*' => ['file', 'max:51200'],
            'folder' => ['nullable', 'string', 'max:120'],
            'path' => ['nullable', 'string', 'max:255'],
        ]);

        $folder = $validated['folder'] ?? '/';
        $customPath = $validated['path'] ?? null;
        $uploadedCount = 0;

        try {
            if ($request->hasFile('files')) {
                $uploadedFiles = $request->file('files');
                $totalIncomingBytes = 0;
                foreach ($uploadedFiles as $uploadedFile) {
                    $totalIncomingBytes += (int) $uploadedFile->getSize();
                }

                $this->storageManager->ensureStorageQuotaAvailable($app, $totalIncomingBytes);

                foreach ($uploadedFiles as $uploadedFile) {
                    $this->storageManager->upload($app, $uploadedFile, null, $folder);
                    $uploadedCount++;
                }
            } elseif ($request->hasFile('file')) {
                $this->storageManager->upload($app, $request->file('file'), $customPath, $folder);
                $uploadedCount = 1;
            } else {
                return back()->withErrors(['file' => 'Veuillez sélectionner au moins un fichier à téléverser.']);
            }
        } catch (StorageQuotaExceededException $e) {
            return back()
                ->withErrors([
                    'file' => $e->getMessage(),
                    'files' => $e->getMessage(),
                ])
                ->with('error', $e->getMessage());
        }

        return back()->with(
            'success',
            $uploadedCount > 1
                ? "{$uploadedCount} fichiers téléversés dans le stockage de l'application."
                : "Fichier téléversé dans le stockage de l'application."
        );
    }

    /**
     * Delete a single stored file belonging to the application.
     */
    public function destroy(Request $request, App $app, AppFile $file): RedirectResponse
    {
        $this->ensureAppOwnership($request, $app);

        if ($file->app_id !== $app->id) {
            abort(404);
        }

        $this->storageManager->delete($app, $file->id);

        return back()->with('success', 'Fichier supprimé.');
    }

    /**
     * Delete multiple selected files at once from the application's storage.
     */
    public function destroyBatch(Request $request, App $app): RedirectResponse
    {
        $this->ensureAppOwnership($request, $app);

        $validated = $request->validate([
            'ids' => ['required', 'array', 'min:1'],
            'ids.*' => ['required', 'string'],
        ]);

        $deleted = 0;
        foreach ($validated['ids'] as $fileId) {
            if ($this->storageManager->delete($app, (string) $fileId)) {
                $deleted++;
            }
        }

        return back()->with('success', "{$deleted} fichier(s) supprimé(s) du stockage.");
    }
}
