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

#[Name('get_collection_schema')]
#[Description('Retrieve the validation schema (fields, types, required flags, strict mode) defined on a specific NoSQL collection, or null when schema-less.')]
#[IsReadOnly]
class GetCollectionSchemaTool extends Tool
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
        ]);

        $collection = (string) $validated['collection'];
        $this->tenantManager->connect($this->context->app());

        try {
            $schema = $this->databaseEngine->getCollectionSchema($collection);
        } catch (InvalidArgumentException $e) {
            return Response::error($e->getMessage());
        }

        return Response::text(json_encode([
            'collection' => $collection,
            'schema' => $schema,
            'allowed_types' => NoSqlDatabaseEngine::ALLOWED_SCHEMA_TYPES,
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
                ->description('Name of the collection (alphanumeric, underscores, hyphens).')
                ->required(),
        ];
    }
}
