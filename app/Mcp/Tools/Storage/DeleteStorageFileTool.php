<?php

namespace App\Mcp\Tools\Storage;

use App\Mcp\Support\McpAppContext;
use App\Modules\Storage\Services\StorageManagerService;
use Illuminate\Contracts\JsonSchema\JsonSchema;
use Illuminate\JsonSchema\Types\Type;
use Laravel\Mcp\Request;
use Laravel\Mcp\Response;
use Laravel\Mcp\Server\Attributes\Description;
use Laravel\Mcp\Server\Attributes\Name;
use Laravel\Mcp\Server\Tool;
use Laravel\Mcp\Server\Tools\Annotations\IsDestructive;

#[Name('delete_storage_file')]
#[Description('Permanently delete a stored file belonging to the current application by file UUID, path, or original filename.')]
#[IsDestructive]
class DeleteStorageFileTool extends Tool
{
    public function __construct(
        public McpAppContext $context,
        public StorageManagerService $storageManager,
    ) {}

    /**
     * Only expose this tool when storage writes are explicitly allowed.
     */
    public function shouldRegister(): bool
    {
        return $this->context->canWriteStorage();
    }

    /**
     * Handle the tool request.
     */
    public function handle(Request $request): Response
    {
        $validated = $request->validate([
            'file' => ['required', 'string', 'max:255'],
        ]);

        $fileIdentifier = (string) $validated['file'];
        $deleted = $this->storageManager->delete($this->context->app(), $fileIdentifier);

        if (! $deleted) {
            return Response::error("Fichier [{$fileIdentifier}] introuvable dans le stockage de cette application.");
        }

        return Response::text(json_encode([
            'deleted' => true,
            'file' => $fileIdentifier,
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
            'file' => $schema->string()
                ->description('File UUID, stored path, or original filename to permanently delete.')
                ->required(),
        ];
    }
}
