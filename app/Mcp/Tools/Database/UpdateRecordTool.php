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

#[Name('update_record')]
#[Description('Update an existing JSON document in a NoSQL collection (merges top-level keys by default, or replaces the entire payload when replace=true).')]
class UpdateRecordTool extends Tool
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
            'data' => ['required', 'array'],
            'replace' => ['nullable', 'boolean'],
        ]);

        $this->tenantManager->connect($this->context->app());

        try {
            $updated = $this->databaseEngine->update(
                collection: (string) $validated['collection'],
                id: (string) $validated['record_id'],
                data: (array) $validated['data'],
                replace: (bool) ($validated['replace'] ?? false),
            );
        } catch (InvalidArgumentException $e) {
            return Response::error($e->getMessage());
        }

        if ($updated === null) {
            return Response::error("Document [{$validated['record_id']}] introuvable dans la collection [{$validated['collection']}].");
        }

        return Response::text(json_encode($updated, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR));
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
                ->description('Unique ID of the document to update.')
                ->required(),
            'data' => $schema->object()
                ->description('Fields to merge or replace in the JSON document.')
                ->required(),
            'replace' => $schema->boolean()
                ->description('When true, replaces the entire document payload instead of merging top-level keys (default: false).'),
        ];
    }
}
