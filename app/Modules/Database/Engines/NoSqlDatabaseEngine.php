<?php

namespace App\Modules\Database\Engines;

use Illuminate\Database\ConnectionInterface;
use Illuminate\Database\Query\Builder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use InvalidArgumentException;

class NoSqlDatabaseEngine
{
    /**
     * Supported field types for optional collection schemas.
     *
     * @var array<int, string>
     */
    public const ALLOWED_SCHEMA_TYPES = [
        'string',
        'number',
        'boolean',
        'object',
        'array',
        'blob',
    ];

    /**
     *List of allowed SQL comparison operators for JSON queries.
     *
     * @var array<int, string>
     */
    private const ALLOWED_OPERATORS = [
        '=',
        '==',
        '!=',
        '<>',
        '>',
        '>=',
        '<',
        '<=',
        'like',
        'contains',
        'in',
    ];

    /**
     * Create a new BLOB descriptor object ready to be stored in the JSON database.
     *
     * @return array{__type: string, mime_type: string, name: string|null, size: int, data: string}
     */
    public static function makeBlob(
        string $binaryOrBase64,
        string $mimeType = 'application/octet-stream',
        ?string $name = null,
        bool $isAlreadyBase64 = false,
    ): array {
        if ($isAlreadyBase64) {
            $cleanBase64 = preg_replace('/^data:[^;]+;base64,/', '', trim($binaryOrBase64)) ?? '';
            $decoded = base64_decode($cleanBase64, true);

            if ($decoded === false) {
                throw new InvalidArgumentException('Le contenu BLOB fourni n\'est pas une chaîne Base64 valide.');
            }

            $base64 = base64_encode($decoded);
            $size = strlen($decoded);
        } else {
            $base64 = base64_encode($binaryOrBase64);
            $size = strlen($binaryOrBase64);
        }

        return [
            '__type' => 'blob',
            'mime_type' => $mimeType !== '' ? $mimeType : 'application/octet-stream',
            'name' => $name,
            'size' => $size,
            'data' => $base64,
        ];
    }

    /**
     * Determine whether a value represents a Zenbase BLOB object.
     */
    public static function isBlobValue(mixed $value): bool
    {
        return is_array($value)
            && ($value['__type'] ?? null) === 'blob'
            && isset($value['data'])
            && is_string($value['data']);
    }

    /**
     * Start a fluent query builder for a specific collection.
     */
    public function collection(string $name): CollectionQueryBuilder
    {
        $cleanName = $this->sanitizeIdentifier($name);

        return new CollectionQueryBuilder($this, $cleanName);
    }

    /**
     * Return all collections with their document counts and optional schema for the active tenant connection.
     *
     * @return array<int, array{name: string, count: int, schema: array<string, mixed>|null, created_at: string|null}>
     */
    public function listCollections(): array
    {
        $db = $this->connection();

        $registered = $db->table('collections')
            ->orderBy('name')
            ->get()
            ->keyBy('name');

        $counts = $db->table('records')
            ->selectRaw('collection, COUNT(*) as aggregate')
            ->groupBy('collection')
            ->pluck('aggregate', 'collection');

        $allNames = collect($registered->keys())
            ->merge($counts->keys())
            ->unique()
            ->sort()
            ->values();

        return $allNames->map(function (string $name) use ($registered, $counts): array {
            $row = $registered->get($name);
            $schema = null;

            if ($row && isset($row->schema) && is_string($row->schema) && $row->schema !== '') {
                $decoded = json_decode($row->schema, true);
                if (is_array($decoded) && ! empty($decoded['fields'])) {
                    $schema = $decoded;
                }
            }

            return [
                'name' => $name,
                'count' => (int) ($counts->get($name, 0)),
                'schema' => $schema,
                'created_at' => $row->created_at ?? null,
            ];
        })->all();
    }

    /**
     * Ensure a collection is registered in the `collections` metadata table, optionally setting its schema.
     *
     * @param  array<string, mixed>|null  $schema
     */
    public function createCollection(string $name, ?array $schema = null): string
    {
        $cleanName = $this->sanitizeIdentifier($name);
        $db = $this->connection();
        $now = now()->toIso8601String();
        $normalizedSchema = $this->normalizeSchema($schema);

        $existing = $db->table('collections')->where('name', $cleanName)->first();

        if (! $existing) {
            $db->table('collections')->insert([
                'name' => $cleanName,
                'schema' => $normalizedSchema !== null ? json_encode($normalizedSchema, JSON_UNESCAPED_UNICODE) : null,
                'created_at' => $now,
                'updated_at' => $now,
            ]);
        } elseif ($schema !== null) {
            $db->table('collections')
                ->where('name', $cleanName)
                ->update([
                    'schema' => $normalizedSchema !== null ? json_encode($normalizedSchema, JSON_UNESCAPED_UNICODE) : null,
                    'updated_at' => $now,
                ]);
        }

        return $cleanName;
    }

    /**
     * Retrieve the schema defined on a collection, or null if the collection is schema-less.
     *
     * @return array{strict: bool, fields: array<int, array{name: string, type: string, required: bool, default?: mixed, description?: string|null}>}|null
     */
    public function getCollectionSchema(string $name): ?array
    {
        $cleanName = $this->sanitizeIdentifier($name);
        $row = $this->connection()
            ->table('collections')
            ->where('name', $cleanName)
            ->first();

        if (! $row || ! isset($row->schema) || ! is_string($row->schema) || $row->schema === '') {
            return null;
        }

        $decoded = json_decode($row->schema, true);

        if (! is_array($decoded) || empty($decoded['fields'])) {
            return null;
        }

        return $this->normalizeSchema($decoded);
    }

    /**
     * Update or remove (when null/empty) the schema of a collection.
     *
     * @param  array<string, mixed>|null  $schema
     * @return array<string, mixed>|null
     */
    public function updateCollectionSchema(string $name, ?array $schema): ?array
    {
        $cleanName = $this->sanitizeIdentifier($name);
        $db = $this->connection();
        $now = now()->toIso8601String();

        $normalized = $this->normalizeSchema($schema);

        $exists = $db->table('collections')->where('name', $cleanName)->exists();

        if (! $exists) {
            $db->table('collections')->insert([
                'name' => $cleanName,
                'schema' => $normalized !== null ? json_encode($normalized, JSON_UNESCAPED_UNICODE) : null,
                'created_at' => $now,
                'updated_at' => $now,
            ]);
        } else {
            $db->table('collections')
                ->where('name', $cleanName)
                ->update([
                    'schema' => $normalized !== null ? json_encode($normalized, JSON_UNESCAPED_UNICODE) : null,
                    'updated_at' => $now,
                ]);
        }

        return $normalized;
    }

    /**
     * Delete a collection and all of its records.
     */
    public function deleteCollection(string $name): int
    {
        $cleanName = $this->sanitizeIdentifier($name);
        $db = $this->connection();

        $deletedRecords = $db->table('records')->where('collection', $cleanName)->delete();
        $db->table('collections')->where('name', $cleanName)->delete();

        return $deletedRecords;
    }

    /**
     * Insert a new JSON document into the given collection.
     *
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    public function create(string $collection, array $data, ?string $customId = null): array
    {
        $cleanCollection = $this->createCollection($collection);
        $id = $customId ? $this->sanitizeIdentifier($customId) : (string) Str::uuid();
        $now = now()->toIso8601String();

        unset($data['id'], $data['collection'], $data['created_at'], $data['updated_at']);

        $validatedData = $this->normalizeBlobsAndValidateSchema($cleanCollection, $data, false);

        $this->connection()->table('records')->insert([
            'id' => $id,
            'collection' => $cleanCollection,
            'data' => json_encode($validatedData, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR),
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        return $this->formatRecord((object) [
            'id' => $id,
            'collection' => $cleanCollection,
            'data' => json_encode($validatedData, JSON_UNESCAPED_UNICODE),
            'created_at' => $now,
            'updated_at' => $now,
        ]);
    }

    /**
     * Find a single JSON document by ID inside a collection.
     *
     * @return array<string, mixed>|null
     */
    public function find(string $collection, string $id): ?array
    {
        $cleanCollection = $this->sanitizeIdentifier($collection);

        $row = $this->connection()
            ->table('records')
            ->where('collection', $cleanCollection)
            ->where('id', $id)
            ->first();

        return $row ? $this->formatRecord($row) : null;
    }

    /**
     * Update an existing JSON document (merges top-level keys by default, or replaces when $replace = true).
     *
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>|null
     */
    public function update(string $collection, string $id, array $data, bool $replace = false): ?array
    {
        $cleanCollection = $this->sanitizeIdentifier($collection);
        $existing = $this->find($cleanCollection, $id);

        if (! $existing) {
            return null;
        }

        unset($data['id'], $data['collection'], $data['created_at'], $data['updated_at']);

        $existingPayload = $existing['data'] ?? [];
        $mergedPayload = $replace ? $data : array_replace($existingPayload, $data);
        $validatedPayload = $this->normalizeBlobsAndValidateSchema($cleanCollection, $mergedPayload, false);
        $now = now()->toIso8601String();

        $this->connection()
            ->table('records')
            ->where('collection', $cleanCollection)
            ->where('id', $id)
            ->update([
                'data' => json_encode($validatedPayload, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR),
                'updated_at' => $now,
            ]);

        return $this->find($cleanCollection, $id);
    }

    /**
     * Delete a single JSON document by ID from a collection.
     */
    public function delete(string $collection, string $id): bool
    {
        $cleanCollection = $this->sanitizeIdentifier($collection);

        $deleted = $this->connection()
            ->table('records')
            ->where('collection', $cleanCollection)
            ->where('id', $id)
            ->delete();

        return $deleted > 0;
    }

    /**
     * Paginate documents inside a collection with optional search and ordering (capable of handling hundreds/thousands of records).
     *
     * @return array{items: array<int, array<string, mixed>>, total: int, page: int, per_page: int, last_page: int}
     */
    public function paginate(
        string $collection,
        int $page = 1,
        int $perPage = 25,
        ?string $search = null,
        ?string $orderBy = 'created_at',
        string $direction = 'desc',
    ): array {
        $cleanCollection = $this->sanitizeIdentifier($collection);
        $safePage = max(1, $page);
        $safePerPage = max(1, min($perPage, 250));

        $query = $this->connection()
            ->table('records')
            ->where('collection', $cleanCollection);

        if ($search !== null && trim($search) !== '') {
            $term = '%'.trim($search).'%';
            $query->where(function (Builder $q) use ($term): void {
                $q->where('id', 'like', $term)
                    ->orWhere('data', 'like', $term);
            });
        }

        $total = (int) (clone $query)->count();
        $lastPage = max(1, (int) ceil($total / $safePerPage));
        $currentPage = min($safePage, $lastPage);

        $dir = strtolower($direction) === 'asc' ? 'asc' : 'desc';

        if ($orderBy !== null && $orderBy !== '') {
            if (in_array($orderBy, ['id', 'created_at', 'updated_at'], true)) {
                $query->orderBy($orderBy, $dir);
            } else {
                $jsonPath = $this->toJsonPath($orderBy);
                $query->orderByRaw("json_extract(data, ?) {$dir}", [$jsonPath]);
            }
        } else {
            $query->orderBy('created_at', 'desc');
        }

        $rows = $query
            ->offset(($currentPage - 1) * $safePerPage)
            ->limit($safePerPage)
            ->get();

        $items = $rows->map(fn (object $row): array => $this->formatRecord($row))->all();

        return [
            'items' => $items,
            'total' => $total,
            'page' => $currentPage,
            'per_page' => $safePerPage,
            'last_page' => $lastPage,
        ];
    }

    /**
     * Execute a filtered query on a collection using SQLite JSON1 `json_extract`.
     *
     * @param  array<int, array{field?: string, operator?: string, value?: mixed}>  $filters
     * @return array<int, array<string, mixed>>
     */
    public function query(
        string $collection,
        array $filters = [],
        ?string $orderBy = null,
        string $direction = 'asc',
        ?int $limit = null,
        ?int $offset = null,
    ): array {
        $cleanCollection = $this->sanitizeIdentifier($collection);

        $query = $this->connection()
            ->table('records')
            ->where('collection', $cleanCollection);

        foreach ($filters as $filter) {
            if (! is_array($filter) || empty($filter['field'])) {
                continue;
            }

            $field = (string) $filter['field'];
            $operator = strtolower((string) ($filter['operator'] ?? '='));
            $value = $filter['value'] ?? null;

            $this->applyJsonFilter($query, $field, $operator, $value);
        }

        if ($orderBy !== null && $orderBy !== '') {
            $dir = strtolower($direction) === 'desc' ? 'desc' : 'asc';

            if (in_array($orderBy, ['id', 'created_at', 'updated_at'], true)) {
                $query->orderBy($orderBy, $dir);
            } else {
                $jsonPath = $this->toJsonPath($orderBy);
                $query->orderByRaw("json_extract(data, ?) {$dir}", [$jsonPath]);
            }
        } else {
            $query->orderBy('created_at', 'desc');
        }

        if ($limit !== null && $limit > 0) {
            $query->limit(min($limit, 1000));
        }

        if ($offset !== null && $offset >= 0) {
            $query->offset($offset);
        }

        return $query
            ->get()
            ->map(fn (object $row): array => $this->formatRecord($row))
            ->all();
    }

    /**
     * Count documents matching optional SQLite JSON1 filters in a collection.
     *
     * @param  array<int, array{field?: string, operator?: string, value?: mixed}>  $filters
     */
    public function count(string $collection, array $filters = []): int
    {
        $cleanCollection = $this->sanitizeIdentifier($collection);

        $query = $this->connection()
            ->table('records')
            ->where('collection', $cleanCollection);

        foreach ($filters as $filter) {
            if (! is_array($filter) || empty($filter['field'])) {
                continue;
            }

            $field = (string) $filter['field'];
            $operator = strtolower((string) ($filter['operator'] ?? '='));
            $value = $filter['value'] ?? null;

            $this->applyJsonFilter($query, $field, $operator, $value);
        }

        return (int) $query->count();
    }

    /**
     * Normalize a collection schema definition or return null if empty.
     *
     * @param  array<string, mixed>|null  $schema
     * @return array{strict: bool, fields: array<int, array{name: string, type: string, required: bool, default?: mixed, description?: string|null}>}|null
     */
    public function normalizeSchema(?array $schema): ?array
    {
        if ($schema === null || empty($schema['fields']) || ! is_array($schema['fields'])) {
            return null;
        }

        $normalizedFields = [];

        foreach ($schema['fields'] as $key => $fieldDef) {
            if (! is_array($fieldDef)) {
                continue;
            }

            $fieldName = isset($fieldDef['name']) && is_string($fieldDef['name'])
                ? trim($fieldDef['name'])
                : (is_string($key) ? trim($key) : '');

            if ($fieldName === '' || in_array($fieldName, ['id', 'collection', 'created_at', 'updated_at'], true)) {
                continue;
            }

            if (! preg_match('/^[a-zA-Z0-9_]+$/', $fieldName)) {
                throw new InvalidArgumentException("Nom de champ de schéma invalide : [{$fieldName}]. Utilisez uniquement lettres, chiffres et underscores.");
            }

            $type = strtolower(trim((string) ($fieldDef['type'] ?? 'string')));
            if (! in_array($type, self::ALLOWED_SCHEMA_TYPES, true)) {
                throw new InvalidArgumentException("Type de champ non supporté [{$type}] pour [{$fieldName}]. Types autorisés : ".implode(', ', self::ALLOWED_SCHEMA_TYPES).'.');
            }

            $entry = [
                'name' => $fieldName,
                'type' => $type,
                'required' => (bool) ($fieldDef['required'] ?? false),
                'description' => isset($fieldDef['description']) && is_string($fieldDef['description'])
                    ? trim($fieldDef['description'])
                    : null,
            ];

            if (array_key_exists('default', $fieldDef) && $fieldDef['default'] !== null && $fieldDef['default'] !== '') {
                $entry['default'] = $fieldDef['default'];
            }

            $normalizedFields[$fieldName] = $entry;
        }

        if ($normalizedFields === []) {
            return null;
        }

        return [
            'strict' => (bool) ($schema['strict'] ?? false),
            'fields' => array_values($normalizedFields),
        ];
    }

    /**
     * Normalize BLOB objects recursively and validate the document against the collection's schema if defined.
     *
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    private function normalizeBlobsAndValidateSchema(string $collection, array $data, bool $isPartialUpdate = false): array
    {
        $normalizedData = $this->normalizeBlobsRecursively($data);
        $schema = $this->getCollectionSchema($collection);

        if ($schema === null || empty($schema['fields'])) {
            return $normalizedData;
        }

        $fieldsByName = [];
        foreach ($schema['fields'] as $fieldDef) {
            $fieldsByName[$fieldDef['name']] = $fieldDef;
        }

        if (! $isPartialUpdate) {
            foreach ($fieldsByName as $fieldName => $fieldDef) {
                $isMissingOrNull = ! array_key_exists($fieldName, $normalizedData) || $normalizedData[$fieldName] === null;

                if ($isMissingOrNull && array_key_exists('default', $fieldDef)) {
                    $normalizedData[$fieldName] = $fieldDef['default'];
                    $isMissingOrNull = false;
                }

                if ($fieldDef['required'] && $isMissingOrNull) {
                    throw new InvalidArgumentException("Validation du schéma [{$collection}] échouée : le champ requis « {$fieldName} » ({$fieldDef['type']}) est manquant.");
                }
            }
        }

        if (! empty($schema['strict'])) {
            foreach (array_keys($normalizedData) as $providedKey) {
                if (! isset($fieldsByName[$providedKey])) {
                    throw new InvalidArgumentException("Validation du schéma strict [{$collection}] échouée : le champ « {$providedKey} » n'est pas déclaré dans le schéma de la collection.");
                }
            }
        }

        foreach ($normalizedData as $fieldName => $value) {
            if (! isset($fieldsByName[$fieldName])) {
                continue;
            }

            $fieldDef = $fieldsByName[$fieldName];

            if ($value === null) {
                if ($fieldDef['required']) {
                    throw new InvalidArgumentException("Validation du schéma [{$collection}] échouée : le champ requis « {$fieldName} » ne peut pas être null.");
                }

                continue;
            }

            if (! $this->matchesSchemaType($value, $fieldDef['type'])) {
                throw new InvalidArgumentException(
                    "Validation du schéma [{$collection}] échouée : le champ « {$fieldName} » doit être de type « {$fieldDef['type']} »."
                );
            }
        }

        return $normalizedData;
    }

    /**
     * Recursively normalize any BLOB objects (`__type === 'blob'`) inside a JSON document.
     *
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    private function normalizeBlobsRecursively(array $data): array
    {
        foreach ($data as $key => $value) {
            if (is_array($value)) {
                if (($value['__type'] ?? null) === 'blob') {
                    if (! isset($value['data']) || ! is_string($value['data'])) {
                        throw new InvalidArgumentException("Le champ BLOB « {$key} » doit contenir une propriété « data » encodée en Base64.");
                    }

                    $data[$key] = self::makeBlob(
                        $value['data'],
                        isset($value['mime_type']) && is_string($value['mime_type']) ? $value['mime_type'] : 'application/octet-stream',
                        isset($value['name']) && is_string($value['name']) ? $value['name'] : null,
                        true,
                    );
                } else {
                    $data[$key] = $this->normalizeBlobsRecursively($value);
                }
            }
        }

        return $data;
    }

    /**
     * Check whether a value matches a declared Zenbase collection schema type.
     */
    private function matchesSchemaType(mixed $value, string $expectedType): bool
    {
        return match ($expectedType) {
            'string' => is_string($value),
            'number' => is_int($value) || is_float($value),
            'boolean' => is_bool($value),
            'blob' => self::isBlobValue($value),
            'array' => is_array($value) && array_is_list($value) && ! self::isBlobValue($value),
            'object' => is_array($value) && ! self::isBlobValue($value) && (! array_is_list($value) || $value === []),
            default => true,
        };
    }

    /**
     * Apply a single JSON or column filter to the query builder.
     */
    private function applyJsonFilter(Builder $query, string $field, string $operator, mixed $value): void
    {
        if (! in_array($operator, self::ALLOWED_OPERATORS, true)) {
            throw new InvalidArgumentException("Opérateur de filtre non supporté : [{$operator}].");
        }

        if ($operator === '==') {
            $operator = '=';
        }

        if (in_array($field, ['id', 'created_at', 'updated_at'], true)) {
            if ($operator === 'in' && is_array($value)) {
                $query->whereIn($field, $value);

                return;
            }

            if ($operator === 'contains') {
                $query->where($field, 'like', '%'.$value.'%');

                return;
            }

            $query->where($field, $operator, $value);

            return;
        }

        $jsonPath = $this->toJsonPath($field);

        if ($operator === 'in') {
            $values = is_array($value) ? array_values($value) : [$value];

            if ($values === []) {
                $query->whereRaw('1 = 0');

                return;
            }

            $placeholders = implode(', ', array_fill(0, count($values), '?'));
            $query->whereRaw("json_extract(data, ?) IN ({$placeholders})", [$jsonPath, ...$values]);

            return;
        }

        if ($operator === 'contains') {
            $query->whereRaw('json_extract(data, ?) LIKE ?', [$jsonPath, '%'.$value.'%']);

            return;
        }

        if ($value === null) {
            if ($operator === '=') {
                $query->whereRaw('json_extract(data, ?) IS NULL', [$jsonPath]);
            } else {
                $query->whereRaw('json_extract(data, ?) IS NOT NULL', [$jsonPath]);
            }

            return;
        }

        if (is_bool($value)) {
            $value = $value ? 1 : 0;
        }

        $sqlOperator = $operator === 'like' ? 'LIKE' : $operator;

        $query->whereRaw("json_extract(data, ?) {$sqlOperator} ?", [$jsonPath, $value]);
    }

    /**
     * Format a raw database record row into a normalized document array.
     *
     * @return array<string, mixed>
     */
    private function formatRecord(object $row): array
    {
        $decoded = is_string($row->data) ? (json_decode($row->data, true) ?? []) : (array) $row->data;

        return [
            'id' => (string) $row->id,
            'collection' => (string) $row->collection,
            ...$decoded,
            'data' => $decoded,
            'created_at' => $row->created_at,
            'updated_at' => $row->updated_at,
        ];
    }

    /**
     * Convert a dotted field name (e.g. `author.name`) into a safe SQLite JSON path (`$.author.name`).
     */
    private function toJsonPath(string $field): string
    {
        $clean = trim($field);

        if (! preg_match('/^[a-zA-Z0-9_.]+$/', $clean)) {
            throw new InvalidArgumentException("Chemin de champ JSON invalide : [{$field}].");
        }

        return '$.'.$clean;
    }

    /**
     * Validate a collection or record identifier.
     */
    private function sanitizeIdentifier(string $identifier): string
    {
        $clean = trim($identifier);

        if ($clean === '' || ! preg_match('/^[a-zA-Z0-9_-]+$/', $clean)) {
            throw new InvalidArgumentException("Identifiant de collection ou document invalide : [{$identifier}].");
        }

        return $clean;
    }

    /**
     * Get the active tenant SQLite connection.
     */
    private function connection(): ConnectionInterface
    {
        return DB::connection('tenant');
    }
}
