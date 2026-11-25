<?php

namespace App\Mcp\Tools\Database;

use App\Mcp\Support\McpAppContext;
use App\Modules\Database\Engines\NoSqlDatabaseEngine;
use App\Services\TenantManagerService;
use Illuminate\Contracts\JsonSchema\JsonSchema;
use Illuminate\JsonSchema\Types\Type;
use InvalidArgumentException;
use Laravel\Mcp\Request;
use Laravel\Mcp\Response;
use Laravel\Mcp\Server\Attributes\Description;
use Laravel\Mcp\Server\Attributes\Name;
use Laravel\Mcp\Server\Tool;
use Laravel\Mcp\Server\Tools\Annotations\IsDestructive;

#[Name('delete_collection')]
#[Description('Permanently delete a NoSQL collection along with all of its documents and schema definition.')]
#[IsDestructive]
class DeleteCollectionTool extends Tool
{
    public function __construct(
        public McpAppContext $context,
        public TenantManagerService $tenantManager,
        public NoSqlDatabaseEngine $databaseEngine,
    ) {}

    /**
     * Only expose this tool when database writes are enabled.
     */
    public function shouldRegister(): bool
    {
        return $this->context->canWriteDatabase();
    }

    /**
     * Handle the tool request.
     */
    public function handle(Request $request): Response
    {
        $validated = $request->validate([
            'collection' => ['required', 'string', 'max:64'],
        ]);

        $collection = (string) $validated['collection'];
        $this->tenantManager->connect($this->context->app());

        try {
            $deletedRecords = $this->databaseEngine->deleteCollection($collection);
        } catch (InvalidArgumentException $e) {
            return Response::error($e->getMessage());
        }

        return Response::text(json_encode([
            'collection' => $collection,
            'deleted_records_count' => $deletedRecords,
            'message' => "Collection « {$collection} » supprimée ({$deletedRecords} document(s) effacé(s)).",
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
            'collection' => $schema->string()
                ->description('Name of the collection to permanently delete.')
                ->required(),
        ];
    }
}
