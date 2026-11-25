<?php

namespace App\Mcp\Tools\Database;

use App\Mcp\Support\McpAppContext;
use App\Modules\Database\Engines\NoSqlDatabaseEngine;
use App\Services\TenantManagerService;
use Illuminate\Contracts\JsonSchema\JsonSchema;
use Illuminate\JsonSchema\Types\Type;
use Laravel\Mcp\Request;
use Laravel\Mcp\Response;
use Laravel\Mcp\Server\Attributes\Description;
use Laravel\Mcp\Server\Attributes\Name;
use Laravel\Mcp\Server\Tool;
use Laravel\Mcp\Server\Tools\Annotations\IsReadOnly;

#[Name('list_collections')]
#[Description('List all NoSQL collections in the application\'s isolated SQLite database with document counts and optional validation schemas.')]
#[IsReadOnly]
class ListCollectionsTool extends Tool
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
        $this->tenantManager->connect($this->context->app());

        $collections = $this->databaseEngine->listCollections();

        return Response::text(json_encode([
            'collections' => $collections,
            'total' => count($collections),
        ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR));
    }

    /**
     * Get the tool's input schema.
     *
     * @return array<string, Type>
     */
    public function schema(JsonSchema $schema): array
    {
        return [];
    }
}
