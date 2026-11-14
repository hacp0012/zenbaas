<?php

namespace App\Http\Controllers\Dashboard;

use App\Concerns\AuthorizesAppOwnership;
use App\Http\Controllers\Controller;
use App\Models\App;
use App\Modules\Database\Engines\NoSqlDatabaseEngine;
use App\Services\TenantManagerService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use InvalidArgumentException;

class AppDatabaseController extends Controller
{
    use AuthorizesAppOwnership;

    public function __construct(
        public TenantManagerService $tenantManager,
        public NoSqlDatabaseEngine $engine,
    ) {}

    /**
     * Create a new collection in the application's SQLite database (with optional schema).
     */
    public function storeCollection(Request $request, App $app): RedirectResponse
    {
        $this->ensureAppOwnership($request, $app);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:64', 'regex:/^[a-zA-Z0-9_-]+$/'],
            'schema' => ['nullable', 'string'],
        ]);

        $schema = null;
        if (! empty($validated['schema'])) {
            $decodedSchema = json_decode($validated['schema'], true);
            if (is_array($decodedSchema)) {
                $schema = $decodedSchema;
            }
        }

        try {
            $this->tenantManager->connect($app);
            $name = $this->engine->createCollection($validated['name'], $schema);

            return redirect()
                ->route('dashboard.apps.database', ['app' => $app->id, 'collection' => $name])
                ->with('success', "Collection « {$name} » créée.");
        } catch (InvalidArgumentException $e) {
            return back()->withErrors(['name' => $e->getMessage()]);
        }
    }

    /**
     * Update or remove the optional schema of a collection.
     */
    public function updateCollectionSchema(Request $request, App $app, string $collection): RedirectResponse
    {
        $this->ensureAppOwnership($request, $app);

        $rawSchema = $request->input('schema');
        $decodedSchema = null;

        if (is_string($rawSchema) && trim($rawSchema) !== '') {
            $parsed = json_decode($rawSchema, true);
            if (! is_array($parsed)) {
                return back()->withErrors(['schema' => 'Le schéma fourni doit être un objet JSON valide.']);
            }
            $decodedSchema = $parsed;
        } elseif (is_array($rawSchema)) {
            $decodedSchema = $rawSchema;
        }

        try {
            $this->tenantManager->connect($app);
            $updated = $this->engine->updateCollectionSchema($collection, $decodedSchema);

            $message = $updated !== null
                ? "Schéma de la collection « {$collection} » enregistré avec succès."
                : "La collection « {$collection} » est désormais sans schéma (Schema-less).";

            return back()->with('success', $message);
        } catch (InvalidArgumentException $e) {
            return back()->withErrors(['schema' => $e->getMessage()]);
        }
    }

    /**
     * Delete a collection and all its documents from the application's SQLite database.
     */
    public function destroyCollection(Request $request, App $app, string $collection): RedirectResponse
    {
        $this->ensureAppOwnership($request, $app);

        $this->tenantManager->connect($app);
        $this->engine->deleteCollection($collection);

        return redirect()
            ->route('dashboard.apps.database', ['app' => $app->id])
            ->with('success', "Collection « {$collection} » supprimée.");
    }

    /**
     * Insert a new JSON document into a collection from the Dashboard explorer.
     */
    public function storeRecord(Request $request, App $app, string $collection): RedirectResponse
    {
        $this->ensureAppOwnership($request, $app);

        $validated = $request->validate([
            'data' => ['required', 'string'],
            'custom_id' => ['nullable', 'string', 'max:64', 'regex:/^[a-zA-Z0-9_-]+$/'],
        ]);

        $decoded = json_decode($validated['data'], true);

        if (! is_array($decoded)) {
            return back()->withErrors(['data' => 'Le contenu doit être un objet JSON valide.']);
        }

        try {
            $this->tenantManager->connect($app);
            $this->engine->create($collection, $decoded, $validated['custom_id'] ?? null);

            return redirect()
                ->route('dashboard.apps.database', ['app' => $app->id, 'collection' => $collection])
                ->with('success', 'Document JSON inséré avec succès.');
        } catch (InvalidArgumentException $e) {
            return back()->withErrors(['data' => $e->getMessage()])->with('error', $e->getMessage());
        }
    }

    /**
     * Update an existing JSON document from the Dashboard explorer.
     */
    public function updateRecord(Request $request, App $app, string $collection, string $recordId): RedirectResponse
    {
        $this->ensureAppOwnership($request, $app);

        $validated = $request->validate([
            'data' => ['required', 'string'],
        ]);

        $decoded = json_decode($validated['data'], true);

        if (! is_array($decoded)) {
            return back()->withErrors(['data' => 'Le contenu doit être un objet JSON valide.']);
        }

        try {
            $this->tenantManager->connect($app);
            $this->engine->update($collection, $recordId, $decoded, true);

            return back()->with('success', "Document « {$recordId} » mis à jour.");
        } catch (InvalidArgumentException $e) {
            return back()->withErrors(['data' => $e->getMessage()])->with('error', $e->getMessage());
        }
    }

    /**
     * Delete a single JSON document from a collection.
     */
    public function destroyRecord(Request $request, App $app, string $collection, string $recordId): RedirectResponse
    {
        $this->ensureAppOwnership($request, $app);

        $this->tenantManager->connect($app);
        $this->engine->delete($collection, $recordId);

        return back()->with('success', 'Document supprimé.');
    }
}
