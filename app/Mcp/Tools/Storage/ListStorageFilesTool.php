<?php

namespace App\Mcp\Tools\Storage;

use App\Mcp\Support\McpAppContext;
use App\Models\AppFile;
use App\Modules\Storage\Services\StorageManagerService;
use Illuminate\Contracts\JsonSchema\JsonSchema;
use Illuminate\JsonSchema\Types\Type;
use Laravel\Mcp\Request;
use Laravel\Mcp\Response;
use Laravel\Mcp\Server\Attributes\Description;
use Laravel\Mcp\Server\Attributes\Name;
use Laravel\Mcp\Server\Tool;
use Laravel\Mcp\Server\Tools\Annotations\IsReadOnly;

#[Name('list_storage_files')]
#[Description('List files stored in the application\'s isolated Storage (optionally filtered by folder) along with current storage quota usage.')]
#[IsReadOnly]
class ListStorageFilesTool extends Tool
{
    public function __construct(
        public McpAppContext $context,
        public StorageManagerService $storageManager,
    ) {}

    /**
     * Handle the tool request.
     */
    public function handle(Request $request): Response
    {
        $validated = $request->validate([
            'folder' => ['nullable', 'string', 'max:255'],
            'limit' => ['nullable', 'integer', 'min:1', 'max:200'],
        ]);

        $app = $this->context->app();
        $folder = isset($validated['folder']) && trim((string) $validated['folder']) !== ''
            ? (string) $validated['folder']
            : null;
        $limit = isset($validated['limit']) ? (int) $validated['limit'] : 50;

        $allFiles = $this->storageManager->list($app, $folder);
        $files = $allFiles->take($limit)->map(fn (AppFile $file): array => [
            'id' => $file->id,
            'folder' => $file->folder,
            'path' => $file->path,
            'original_name' => $file->original_name,
            'size' => $file->size,
            'mime_type' => $file->mime_type,
            'url' => $file->url,
            'created_at' => $file->created_at?->toIso8601String(),
        ])->values()->all();

        return Response::text(json_encode([
            'files' => $files,
            'returned' => count($files),
            'total' => $allFiles->count(),
            'usage' => $this->storageManager->getStorageUsageSummary($app),
        ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR));
    }

    /**
     * Get the tool's input schema.
     *
     * @return array<string, Type>
     */
    public function schema(JsonSchema $schema): array
    {
        return [
            'folder' => $schema->string()
                ->description('Optional logical folder path (e.g. / or /avatars).'),
            'limit' => $schema->integer()
                ->description('Maximum number of files to return (1-200, default: 50).')
                ->min(1)
                ->max(200),
        ];
    }
}
