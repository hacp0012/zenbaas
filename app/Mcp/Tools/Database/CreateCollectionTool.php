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

#[Name('create_collection')]
#[Description('Create (or ensure existence of) a NoSQL collection in the application database, optionally with a validation schema.')]
#[IsIdempotent]
class CreateCollectionTool extends Tool
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
            'name' => ['required', 'string', 'max:64'],
            'schema' => ['nullable', 'array'],
            'schema.strict' => ['nullable', 'boolean'],
            'schema.fields' => ['nullable', 'array'],
        ]);

        $this->tenantManager->connect($this->context->app());

        try {
            $schema = is_array($validated['schema'] ?? null) ? $validated['schema'] : null;
            $cleanName = $this->databaseEngine->createCollection((string) $validated['name'], $schema);
            $savedSchema = $this->databaseEngine->getCollectionSchema($cleanName);
        } catch (InvalidArgumentException $e) {
            return Response::error($e->getMessage());
        }

        return Response::text(json_encode([
            'collection' => $cleanName,
            'schema' => $savedSchema,
            'message' => "Collection « {$cleanName} » prête.",
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
            'name' => $schema->string()
                ->description('Collection identifier (alphanumeric, underscores, hyphens).')
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
            ])->description('Optional validation schema for the collection.'),
        ];
    }
}
