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

#[Name('query_records')]
#[Description('Query, filter (SQLite JSON1), search, sort, paginate, or count JSON documents inside a NoSQL collection.')]
#[IsReadOnly]
class QueryRecordsTool extends Tool
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
            'filters' => ['nullable', 'array'],
            'filters.*.field' => ['required', 'string', 'max:120'],
            'filters.*.operator' => ['nullable', 'string', 'in:=,==,!=,<>,>,>=,<,<=,like,contains,in'],
            'filters.*.value' => ['nullable'],
            'search' => ['nullable', 'string', 'max:200'],
            'order_by' => ['nullable', 'string', 'max:120'],
            'direction' => ['nullable', 'string', 'in:asc,desc'],
            'limit' => ['nullable', 'integer', 'min:1', 'max:250'],
            'offset' => ['nullable', 'integer', 'min:0'],
            'page' => ['nullable', 'integer', 'min:1'],
            'count_only' => ['nullable', 'boolean'],
        ]);

        $collection = (string) $validated['collection'];
        $filters = is_array($validated['filters'] ?? null) ? $validated['filters'] : [];
        $orderBy = isset($validated['order_by']) ? (string) $validated['order_by'] : 'created_at';
        $direction = isset($validated['direction']) ? (string) $validated['direction'] : 'desc';
        $limit = isset($validated['limit']) ? (int) $validated['limit'] : 25;
        $offset = isset($validated['offset']) ? (int) $validated['offset'] : 0;
        $countOnly = (bool) ($validated['count_only'] ?? false);

        $this->tenantManager->connect($this->context->app());

        try {
            if ($countOnly) {
                $total = $this->databaseEngine->count($collection, $filters);

                return Response::text(json_encode([
                    'collection' => $collection,
                    'count' => $total,
                ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR));
            }

            if ($filters === [] && (isset($validated['search']) || isset($validated['page']))) {
                $paginated = $this->databaseEngine->paginate(
                    collection: $collection,
                    page: isset($validated['page']) ? (int) $validated['page'] : 1,
                    perPage: $limit,
                    search: isset($validated['search']) ? (string) $validated['search'] : null,
                    orderBy: $orderBy,
                    direction: $direction,
                );

                return Response::text(json_encode([
                    'collection' => $collection,
                    ...$paginated,
                ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR));
            }

            $records = $this->databaseEngine->query(
                collection: $collection,
                filters: $filters,
                orderBy: $orderBy,
                direction: $direction,
                limit: $limit,
                offset: $offset,
            );
            $total = $this->databaseEngine->count($collection, $filters);

            return Response::text(json_encode([
                'collection' => $collection,
                'items' => $records,
                'returned' => count($records),
                'total' => $total,
            ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR));
        } catch (InvalidArgumentException $e) {
            return Response::error($e->getMessage());
        }
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
                ->description('Name of the NoSQL collection to query.')
                ->required(),
            'filters' => $schema->array()
                ->description('Optional array of JSON1 filter conditions, each with field, operator (=, ==, !=, <>, >, >=, <, <=, like, contains, in), and value.')
                ->items($schema->object([
                    'field' => $schema->string()->description('Document field name (supports dotted paths like author.name) or id/created_at/updated_at.')->required(),
                    'operator' => $schema->string()->enum(['=', '==', '!=', '<>', '>', '>=', '<', '<=', 'like', 'contains', 'in'])->description('Comparison operator (default: =).'),
                    'value' => $schema->union(['string', 'number', 'boolean', 'array', 'null'])->description('Comparison value.'),
                ])),
            'search' => $schema->string()
                ->description('Optional full-text substring search across document IDs and JSON payloads (used when filters is empty).'),
            'order_by' => $schema->string()
                ->description('Field to sort by (default: created_at). Supports top-level or dotted JSON paths.'),
            'direction' => $schema->string()
                ->enum(['asc', 'desc'])
                ->description('Sort direction: asc or desc (default: desc).'),
            'limit' => $schema->integer()
                ->description('Maximum number of records to return (1-250, default: 25).')
                ->min(1)
                ->max(250),
            'offset' => $schema->integer()
                ->description('Offset for filtered queries (default: 0).')
                ->min(0),
            'page' => $schema->integer()
                ->description('1-based page number for paginated queries without filters.')
                ->min(1),
            'count_only' => $schema->boolean()
                ->description('When true, only returns the matching document count.'),
        ];
    }
}
