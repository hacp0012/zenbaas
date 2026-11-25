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
use Laravel\Mcp\Server\Tools\Annotations\IsReadOnly;

#[Name('get_record')]
#[Description('Fetch a single JSON document by its ID from a NoSQL collection.')]
#[IsReadOnly]
class GetRecordTool extends Tool
{
    public function __construct(
        public McpAppContext $context,
        public TenantManagerService $tenantManager,
        public NoSqlDatabaseEngine $databaseEngine,
    ) {}

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
            $record = $this->databaseEngine->find(
                (string) $validated['collection'],
                (string) $validated['record_id'],
            );
        } catch (InvalidArgumentException $e) {
            return Response::error($e->getMessage());
        }

        if ($record === null) {
            return Response::error("Document [{$validated['record_id']}] introuvable dans la collection [{$validated['collection']}].");
        }

        return Response::text(json_encode($record, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR));
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
                ->description('Unique document ID.')
                ->required(),
        ];
    }
}
