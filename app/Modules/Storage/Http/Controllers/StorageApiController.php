<?php

namespace App\Modules\Storage\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\App;
use App\Modules\Storage\Services\StorageManagerService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class StorageApiController extends Controller
{
    public function __construct(public StorageManagerService $storageManager) {}

    /**
     * List files stored in the current application.
     */
    public function index(Request $request): JsonResponse
    {
        /** @var App $app */
        $app = $request->attributes->get('current_app');
        $folder = $request->string('folder')->toString() ?: null;

        $files = $this->storageManager->list($app, $folder);

        return response()->json([
            'data' => $files,
            'error' => null,
        ]);
    }

    /**
     * Upload a file to the current application's isolated storage.
     */
    public function upload(Request $request): JsonResponse
    {
        $request->validate([
            'file' => ['required', 'file', 'max:20480'],
            'path' => ['nullable', 'string', 'max:255'],
            'folder' => ['nullable', 'string', 'max:255'],
        ]);

        /** @var App $app */
        $app = $request->attributes->get('current_app');

        $appFile = $this->storageManager->upload(
            $app,
            $request->file('file'),
            $request->string('path')->toString() ?: null,
            $request->string('folder')->toString() ?: null,
        );

        return response()->json([
            'url' => $appFile->url,
            'fileUrl' => $appFile->url,
            'data' => [
                'id' => $appFile->id,
                'url' => $appFile->url,
                'fileUrl' => $appFile->url,
                'path' => $appFile->path,
                'folder' => $appFile->folder,
                'original_name' => $appFile->original_name,
                'size' => $appFile->size,
                'mime_type' => $appFile->mime_type,
                'created_at' => $appFile->created_at,
            ],
            'error' => null,
        ], 201);
    }

    /**
     * Delete a file from the current application's storage.
     */
    public function destroy(Request $request, string $file): JsonResponse
    {
        /** @var App $app */
        $app = $request->attributes->get('current_app');

        $deleted = $this->storageManager->delete($app, $file);

        if (! $deleted) {
            return response()->json([
                'data' => null,
                'error' => 'Fichier introuvable.',
            ], 404);
        }

        return response()->json([
            'data' => ['deleted' => true, 'file' => $file],
            'error' => null,
        ]);
    }
}
