<?php

namespace App\Modules\Database\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Database\Engines\NoSqlDatabaseEngine;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use InvalidArgumentException;

class DatabaseApiController extends Controller
{
    public function __construct(public NoSqlDatabaseEngine $engine) {}

    /**
     * List all collections for the current application.
     */
    public function indexCollections(): JsonResponse
    {
        return response()->json([
            'data' => $this->engine->listCollections(),
            'error' => null,
        ]);
    }

    /**
     * Create a new collection in the current application's SQLite database.
     */
    public function storeCollection(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:64', 'regex:/^[a-zA-Z0-9_-]+$/'],
            'schema' => ['nullable', 'array'],
        ]);

        try {
            $name = $this->engine->createCollection($validated['name'], $validated['schema'] ?? null);
            $schema = $this->engine->getCollectionSchema($name);

            return response()->json([
                'data' => [
                    'name' => $name,
                    'schema' => $schema,
                ],
                'error' => null,
            ], 201);
        } catch (InvalidArgumentException $e) {
            return response()->json([
                'data' => null,
                'error' => $e->getMessage(),
            ], 422);
        }
    }

    /**
     * Get the schema of a collection (or null if schema-less).
     */
    public function showCollectionSchema(string $collection): JsonResponse
    {
        try {
            return response()->json([
                'data' => [
                    'collection' => $collection,
                    'schema' => $this->engine->getCollectionSchema($collection),
                ],
                'error' => null,
            ]);
        } catch (InvalidArgumentException $e) {
            return response()->json([
                'data' => null,
                'error' => $e->getMessage(),
            ], 422);
        }
    }

    /**
     * Update or clear the schema of a collection.
     */
    public function updateCollectionSchema(Request $request, string $collection): JsonResponse
    {
        try {
            $schemaInput = $request->input('schema');
            $schema = is_array($schemaInput) ? $schemaInput : null;
            $updated = $this->engine->updateCollectionSchema($collection, $schema);

            return response()->json([
                'data' => [
                    'collection' => $collection,
                    'schema' => $updated,
                ],
                'error' => null,
            ]);
        } catch (InvalidArgumentException $e) {
            return response()->json([
                'data' => null,
                'error' => $e->getMessage(),
            ], 422);
        }
    }

    /**
     * Delete a collection and all its documents.
     */
    public function destroyCollection(string $collection): JsonResponse
    {
        try {
            $this->engine->deleteCollection($collection);

            return response()->json([
                'data' => ['deleted' => true, 'collection' => $collection],
                'error' => null,
            ]);
        } catch (InvalidArgumentException $e) {
            return response()->json([
                'data' => null,
                'error' => $e->getMessage(),
            ], 422);
        }
    }

    /**
     * Query documents in a collection.
     */
    public function indexRecords(Request $request, string $collection): JsonResponse
    {
        try {
            $filters = [];
            $rawWhere = $request->input('where');

            if (is_string($rawWhere) && $rawWhere !== '') {
                $decoded = json_decode($rawWhere, true);
                if (is_array($decoded)) {
                    $filters = $decoded;
                }
            } elseif (is_array($rawWhere)) {
                $filters = $rawWhere;
            }

            $orderBy = $request->string('orderBy')->toString() ?: null;
            $direction = $request->string('direction', 'asc')->toString();
            $limit = $request->filled('limit') ? $request->integer('limit') : null;
            $offset = $request->filled('offset') ? $request->integer('offset') : null;

            $records = $this->engine->query($collection, $filters, $orderBy, $direction, $limit, $offset);

            return response()->json([
                'data' => $records,
                'error' => null,
            ]);
        } catch (InvalidArgumentException $e) {
            return response()->json([
                'data' => null,
                'error' => $e->getMessage(),
            ], 422);
        }
    }

    /**
     * Create a new document in a collection.
     */
    public function storeRecord(Request $request, string $collection): JsonResponse
    {
        try {
            $payload = $request->input('data');

            if (! is_array($payload)) {
                $payload = $request->all();
            }

            $record = $this->engine->create($collection, $payload);

            return response()->json([
                'data' => $record,
                'error' => null,
            ], 201);
        } catch (InvalidArgumentException $e) {
            return response()->json([
                'data' => null,
                'error' => $e->getMessage(),
            ], 422);
        }
    }

    /**
     * Retrieve a single document by ID from a collection.
     */
    public function showRecord(string $collection, string $recordId): JsonResponse
    {
        try {
            $record = $this->engine->find($collection, $recordId);

            if (! $record) {
                return response()->json([
                    'data' => null,
                    'error' => 'Document introuvable.',
                ], 404);
            }

            return response()->json([
                'data' => $record,
                'error' => null,
            ]);
        } catch (InvalidArgumentException $e) {
            return response()->json([
                'data' => null,
                'error' => $e->getMessage(),
            ], 422);
        }
    }

    /**
     * Update a document by ID in a collection.
     */
    public function updateRecord(Request $request, string $collection, string $recordId): JsonResponse
    {
        try {
            $payload = $request->input('data');

            if (! is_array($payload)) {
                $payload = $request->except(['_replace']);
            }

            $replace = $request->boolean('_replace', false);
            $record = $this->engine->update($collection, $recordId, $payload, $replace);

            if (! $record) {
                return response()->json([
                    'data' => null,
                    'error' => 'Document introuvable.',
                ], 404);
            }

            return response()->json([
                'data' => $record,
                'error' => null,
            ]);
        } catch (InvalidArgumentException $e) {
            return response()->json([
                'data' => null,
                'error' => $e->getMessage(),
            ], 422);
        }
    }

    /**
     * Delete a document by ID from a collection.
     */
    public function destroyRecord(string $collection, string $recordId): JsonResponse
    {
        try {
            $deleted = $this->engine->delete($collection, $recordId);

            if (! $deleted) {
                return response()->json([
                    'data' => null,
                    'error' => 'Document introuvable.',
                ], 404);
            }

            return response()->json([
                'data' => ['deleted' => true, 'id' => $recordId],
                'error' => null,
            ]);
        } catch (InvalidArgumentException $e) {
            return response()->json([
                'data' => null,
                'error' => $e->getMessage(),
            ], 422);
        }
    }
}
