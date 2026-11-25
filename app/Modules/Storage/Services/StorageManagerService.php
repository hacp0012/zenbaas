<?php

namespace App\Modules\Storage\Services;

use App\Models\App;
use App\Models\AppFile;
use App\Models\PlatformSetting;
use App\Models\User;
use App\Modules\Storage\Exceptions\StorageQuotaExceededException;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class StorageManagerService
{
    /**
     * Ensure that the application owner has enough remaining storage quota for incoming bytes.
     *
     * @throws StorageQuotaExceededException
     */
    public function ensureStorageQuotaAvailable(App $app, int $incomingBytes): void
    {
        $safeIncoming = max(0, $incomingBytes);

        // 1. Check global Zenbase system storage limit (when configured)
        $platformSettings = PlatformSetting::allSettings();
        $globalMaxMb = $platformSettings['global_max_storage_mb'];

        if ($globalMaxMb !== null) {
            $globalMaxBytes = $globalMaxMb * 1024 * 1024;
            $globalUsedBytes = (int) AppFile::query()->sum('size');

            if (($globalUsedBytes + $safeIncoming) > $globalMaxBytes) {
                $usedFormatted = $this->formatBytes($globalUsedBytes);
                $incomingFormatted = $this->formatBytes($safeIncoming);

                throw new StorageQuotaExceededException(
                    "Capacité globale de stockage Zenbase atteinte ({$globalMaxMb} Mo max, {$usedFormatted} utilisés, +{$incomingFormatted} demandés). Contactez l'administrateur."
                );
            }
        }

        // 2. Check per-user storage quota
        $owner = $app->user;

        if (! $owner || $owner->is_admin) {
            return;
        }

        $maxBytes = $owner->maxStorageBytes();

        if ($maxBytes === null) {
            return;
        }

        $usedBytes = $this->getUserUsedStorageBytes($owner);

        if (($usedBytes + $safeIncoming) > $maxBytes) {
            $maxMb = (int) $owner->max_storage_mb;
            $usedFormatted = $this->formatBytes($usedBytes);
            $incomingFormatted = $this->formatBytes($safeIncoming);

            throw new StorageQuotaExceededException(
                "Quota de stockage dépassé : votre compte est limité à {$maxMb} Mo ({$usedFormatted} déjà utilisés, +{$incomingFormatted} demandés). Supprimez des fichiers ou contactez l'administrateur."
            );
        }
    }

    /**
     * Get the total bytes currently stored across all applications owned by the user.
     */
    public function getUserUsedStorageBytes(User $user): int
    {
        return $user->usedStorageBytes();
    }

    /**
     * Return a detailed storage usage and quota summary for the given application and its owner.
     *
     * @return array{
     *     app_bytes: int,
     *     app_files_count: int,
     *     user_used_bytes: int,
     *     max_storage_mb: int|null,
     *     max_storage_bytes: int|null,
     *     remaining_bytes: int|null
     * }
     */
    public function getStorageUsageSummary(App $app): array
    {
        $owner = $app->user;
        $appBytes = (int) $app->files()->sum('size');
        $appFilesCount = (int) $app->files()->count();
        $userUsedBytes = $owner ? $this->getUserUsedStorageBytes($owner) : $appBytes;
        $maxStorageMb = ($owner && ! $owner->is_admin) ? $owner->max_storage_mb : null;
        $maxStorageBytes = ($owner && ! $owner->is_admin) ? $owner->maxStorageBytes() : null;
        $remainingBytes = $maxStorageBytes !== null ? max(0, $maxStorageBytes - $userUsedBytes) : null;

        return [
            'app_bytes' => $appBytes,
            'app_files_count' => $appFilesCount,
            'user_used_bytes' => $userUsedBytes,
            'max_storage_mb' => $maxStorageMb,
            'max_storage_bytes' => $maxStorageBytes,
            'remaining_bytes' => $remainingBytes,
        ];
    }

    /**
     * Format a byte count into a human-readable French unit string.
     */
    public function formatBytes(int $bytes): string
    {
        if ($bytes <= 0) {
            return '0 o';
        }

        $units = ['o', 'Ko', 'Mo', 'Go'];
        $power = min((int) floor(log($bytes, 1024)), count($units) - 1);

        return round($bytes / (1024 ** $power), 2).' '.$units[$power];
    }

    /**
     * Upload a file for the given application into its isolated storage directory.
     */
    public function upload(
        App $app,
        UploadedFile $file,
        ?string $customPath = null,
        ?string $folder = null,
        string $disk = 'public',
    ): AppFile {
        $this->ensureStorageQuotaAvailable($app, (int) $file->getSize());

        $normalizedFolder = $this->normalizeFolder($folder, $customPath);
        $originalName = $file->getClientOriginalName();

        if ($customPath !== null && trim($customPath) !== '') {
            $cleanRelative = ltrim(str_replace('\\', '/', $customPath), '/');
            $cleanRelative = str_replace('..', '', $cleanRelative);
            $targetFilename = basename($cleanRelative);
        } else {
            $extension = $file->getClientOriginalExtension();
            $base = Str::slug(pathinfo($originalName, PATHINFO_FILENAME)) ?: 'file';
            $targetFilename = $base.'-'.Str::lower(Str::random(8)).($extension ? '.'.$extension : '');
        }

        $folderSegment = trim($normalizedFolder, '/');
        $tenantDir = 'tenants/'.$app->id.($folderSegment !== '' ? '/'.$folderSegment : '');

        $storedPath = $file->storeAs($tenantDir, $targetFilename, ['disk' => $disk]);

        return AppFile::query()->create([
            'app_id' => $app->id,
            'disk' => $disk,
            'folder' => $normalizedFolder,
            'path' => (string) $storedPath,
            'original_name' => $originalName,
            'size' => (int) $file->getSize(),
            'mime_type' => $file->getClientMimeType() ?: ($file->getMimeType() ?: 'application/octet-stream'),
        ]);
    }

    /**
     * Store raw string/binary content as a file in the application's isolated storage (e.g. from a Web Function).
     */
    public function putContent(
        App $app,
        string $relativePath,
        string $contents,
        string $mimeType = 'text/plain',
        string $disk = 'public',
    ): AppFile {
        $this->ensureStorageQuotaAvailable($app, strlen($contents));

        $normalizedFolder = $this->normalizeFolder(null, $relativePath);
        $cleanRelative = ltrim(str_replace(['\\', '..'], ['/', ''], $relativePath), '/');
        $filename = basename($cleanRelative) ?: 'file-'.Str::random(6).'.txt';

        $folderSegment = trim($normalizedFolder, '/');
        $fullDiskPath = 'tenants/'.$app->id.($folderSegment !== '' ? '/'.$folderSegment : '').'/'.$filename;

        Storage::disk($disk)->put($fullDiskPath, $contents);

        return AppFile::query()->create([
            'app_id' => $app->id,
            'disk' => $disk,
            'folder' => $normalizedFolder,
            'path' => $fullDiskPath,
            'original_name' => $filename,
            'size' => strlen($contents),
            'mime_type' => $mimeType,
        ]);
    }

    /**
     * List all files belonging to an application, optionally filtered by folder.
     *
     * @return Collection<int, AppFile>
     */
    public function list(App $app, ?string $folder = null): Collection
    {
        $query = $app->files()->orderByDesc('created_at')->orderByDesc('id');

        if ($folder !== null && $folder !== '') {
            $query->where('folder', $this->normalizeFolder($folder));
        }

        return $query->get();
    }

    /**
     * Delete a single file belonging to an application by ID or path.
     */
    public function delete(App $app, string $fileIdOrPath): bool
    {
        $file = $app->files()
            ->where(function ($query) use ($fileIdOrPath): void {
                $query->where('id', $fileIdOrPath)
                    ->orWhere('path', $fileIdOrPath)
                    ->orWhere('original_name', $fileIdOrPath);
            })
            ->first();

        if (! $file) {
            return false;
        }

        Storage::disk($file->disk ?: 'public')->delete($file->path);
        $file->delete();

        return true;
    }

    /**
     * Delete all stored files for an application.
     */
    public function deleteAllForApp(App $app, string $disk = 'public'): void
    {
        Storage::disk($disk)->deleteDirectory('tenants/'.$app->id);
        $app->files()->delete();
    }

    /**
     * Normalize a logical folder path (e.g. `/avatars`).
     */
    public function normalizeFolder(?string $folder, ?string $customPath = null): string
    {
        if (($folder === null || trim($folder) === '') && $customPath !== null && str_contains($customPath, '/')) {
            $folder = dirname(str_replace('\\', '/', $customPath));
        }

        if ($folder === null || trim($folder) === '' || $folder === '.' || $folder === '/') {
            return '/';
        }

        $clean = trim(str_replace(['\\', '..'], ['/', ''], $folder), '/');

        return $clean === '' ? '/' : '/'.$clean;
    }
}
