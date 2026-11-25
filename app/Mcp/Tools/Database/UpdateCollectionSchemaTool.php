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
use Laravel\Mcp\Server\Tools\Annotations\IsIdempotent;

#[Name('update_collection_schema')]
#[Description('Create, update, or clear (pass null/empty fields) the validation schema of a NoSQL collection.')]
#[IsIdempotent]
class UpdateCollectionSchemaTool extends Tool
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
            'schema' => ['nullable', 'array'],
            'schema.strict' => ['nullable', 'boolean'],
            'schema.fields' => ['nullable', 'array'],
        ]);

        $collection = (string) $validated['collection'];
        $schemaInput = is_array($validated['schema'] ?? null) ? $validated['schema'] : null;

        $this->tenantManager->connect($this->context->app());

        try {
            $normalized = $this->databaseEngine->updateCollectionSchema($collection, $schemaInput);
        } catch (InvalidArgumentException $e) {
            return Response::error($e->getMessage());
        }

        return Response::text(json_encode([
            'collection' => $collection,
            'schema' => $normalized,
            'message' => $normalized === null
                ? "Schéma de la collection « {$collection} » supprimé (mode sans schéma)."
                : "Schéma de la collection « {$collection} » mis à jour.",
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
            'schema' => $schema->object([
                'strict' => $schema->boolean()->description('Reject undeclared fields when true.'),
                'fields' => $schema->array()->items($schema->object([
                    'name' => $schema->string()->required(),
                    'type' => $schema->string()->enum(NoSqlDatabaseEngine::ALLOWED_SCHEMA_TYPES)->required(),
                    'required' => $schema->boolean(),
                    'default' => $schema->union(['string', 'number', 'boolean', 'array', 'object', 'null']),
                    'description' => $schema->string(),
                ])),
            ])->description('New schema object, or null to revert to schema-less mode.'),
        ];
    }
}
