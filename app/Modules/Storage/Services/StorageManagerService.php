<?php

namespace App\Modules\Storage\Services;

use App\Models\App;
use App\Models\AppFile;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class StorageManagerService
{
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
