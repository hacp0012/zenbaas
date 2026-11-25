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

#[Name('delete_record')]
#[Description('Permanently delete a single JSON document by ID from a NoSQL collection.')]
#[IsDestructive]
class DeleteRecordTool extends Tool
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
            'record_id' => ['required', 'string', 'max:128'],
        ]);

        $this->tenantManager->connect($this->context->app());

        try {
            $deleted = $this->databaseEngine->delete(
                (string) $validated['collection'],
                (string) $validated['record_id'],
            );
        } catch (InvalidArgumentException $e) {
            return Response::error($e->getMessage());
        }

        if (! $deleted) {
            return Response::error("Document [{$validated['record_id']}] introuvable dans la collection [{$validated['collection']}].");
        }

        return Response::text(json_encode([
            'deleted' => true,
            'collection' => (string) $validated['collection'],
            'record_id' => (string) $validated['record_id'],
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
                ->description('Name of the collection.')
                ->required(),
            'record_id' => $schema->string()
                ->description('Unique ID of the document to permanently delete.')
                ->required(),
        ];
    }
}
