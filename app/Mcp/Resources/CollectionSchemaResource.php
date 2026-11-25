<?php

namespace App\Mcp\Resources;

use App\Mcp\Support\McpAppContext;
use App\Modules\Database\Engines\NoSqlDatabaseEngine;
use App\Services\TenantManagerService;
use InvalidArgumentException;
use Laravel\Mcp\Request;
use Laravel\Mcp\Response;
use Laravel\Mcp\Server\Attributes\Description;
use Laravel\Mcp\Server\Attributes\MimeType;
use Laravel\Mcp\Server\Attributes\Name;
use Laravel\Mcp\Server\Contracts\HasUriTemplate;
use Laravel\Mcp\Server\Resource;
use Laravel\Mcp\Support\UriTemplate;

#[Name('collection_schema')]
#[Description('JSON validation schema and field types for a specific NoSQL collection in the current application.')]
#[MimeType('application/json')]
class CollectionSchemaResource extends Resource implements HasUriTemplate
{
    public function __construct(
        public McpAppContext $context,
        public TenantManagerService $tenantManager,
        public NoSqlDatabaseEngine $databaseEngine,
    ) {}

    /**
     * Get the URI pattern for the resource template.
     */
    public function uriTemplate(): UriTemplate
    {
        return new UriTemplate('zenbase://collections/{collection}/schema');
    }

    /**
     * Handle the resource request.
     */
    public function handle(Request $request): Response
    {
        $collection = (string) $request->get('collection', '');

        if ($collection === '') {
            return Response::error('Paramètre {collection} manquant dans l\'URI.');
        }

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
}
