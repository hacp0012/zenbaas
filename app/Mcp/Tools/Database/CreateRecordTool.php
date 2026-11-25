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

#[Name('create_record')]
#[Description('Insert a new JSON document into a NoSQL collection (automatically validates against the collection schema when defined).')]
class CreateRecordTool extends Tool
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
            'data' => ['required', 'array'],
            'custom_id' => ['nullable', 'string', 'max:128'],
        ]);

        $this->tenantManager->connect($this->context->app());

        try {
            $record = $this->databaseEngine->create(
                collection: (string) $validated['collection'],
                data: (array) $validated['data'],
                customId: isset($validated['custom_id']) ? (string) $validated['custom_id'] : null,
            );
        } catch (InvalidArgumentException $e) {
            return Response::error($e->getMessage());
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
                ->description('Name of the target collection (created automatically if it does not exist).')
                ->required(),
            'data' => $schema->object()
                ->description('JSON document payload to insert.')
                ->required(),
            'custom_id' => $schema->string()
                ->description('Optional custom document ID (alphanumeric, underscores, hyphens). Defaults to a UUID.'),
        ];
    }
}
