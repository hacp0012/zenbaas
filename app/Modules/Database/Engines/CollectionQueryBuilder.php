<?php

namespace App\Modules\Database\Engines;

class CollectionQueryBuilder
{
    /**
     * @var array<int, array{field: string, operator: string, value: mixed}>
     */
    private array $filters = [];

    private ?string $orderByField = null;

    private string $orderDirection = 'asc';

    private ?int $limitCount = null;

    private ?int $offsetCount = null;

    public function __construct(
        private NoSqlDatabaseEngine $engine,
        private string $collection,
    ) {}

    /**
     * Add a filter clause on a JSON attribute.
     */
    public function where(string $field, string $operator, mixed $value = null): self
    {
        if (func_num_args() === 2) {
            $value = $operator;
            $operator = '==';
        }

        $this->filters[] = [
            'field' => $field,
            'operator' => $operator,
            'value' => $value,
        ];

        return $this;
    }

    /**
     * Order query results by a JSON attribute or metadata column.
     */
    public function orderBy(string $field, string $direction = 'asc'): self
    {
        $this->orderByField = $field;
        $this->orderDirection = strtolower($direction) === 'desc' ? 'desc' : 'asc';

        return $this;
    }

    /**
     * Limit the number of returned documents.
     */
    public function limit(int $limit): self
    {
        $this->limitCount = max(1, $limit);

        return $this;
    }

    /**
     * Skip a number of documents.
     */
    public function offset(int $offset): self
    {
        $this->offsetCount = max(0, $offset);

        return $this;
    }

    /**
     * Execute the query and return matching documents.
     *
     * @return array<int, array<string, mixed>>
     */
    public function get(): array
    {
        return $this->engine->query(
            $this->collection,
            $this->filters,
            $this->orderByField,
            $this->orderDirection,
            $this->limitCount,
            $this->offsetCount,
        );
    }

    /**
     * Alias for `get()` to support `.select()` style queries.
     *
     * @return array<int, array<string, mixed>>
     */
    public function select(): array
    {
        return $this->get();
    }

    /**
     * Find a single document by ID.
     *
     * @return array<string, mixed>|null
     */
    public function find(string $id): ?array
    {
        return $this->engine->find($this->collection, $id);
    }

    /**
     * Create a new document in the collection.
     *
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    public function create(array $data): array
    {
        return $this->engine->create($this->collection, $data);
    }

    /**
     * Update an existing document by ID.
     *
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>|null
     */
    public function update(string $id, array $data): ?array
    {
        return $this->engine->update($this->collection, $id, $data);
    }

    /**
     * Delete a document by ID.
     */
    public function delete(string $id): bool
    {
        return $this->engine->delete($this->collection, $id);
    }

    /**
     * Get the schema defined on this collection, or null if schema-less.
     *
     * @return array<string, mixed>|null
     */
    public function getSchema(): ?array
    {
        return $this->engine->getCollectionSchema($this->collection);
    }

    /**
     * Define or remove (when null) the schema for this collection.
     *
     * @param  array<string, mixed>|null  $schema
     * @return array<string, mixed>|null
     */
    public function setSchema(?array $schema): ?array
    {
        return $this->engine->updateCollectionSchema($this->collection, $schema);
    }
}
