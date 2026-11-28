<?php

namespace App\Mcp\Prompts;

use App\Mcp\Support\McpAppContext;
use App\Modules\Database\Engines\NoSqlDatabaseEngine;
use App\Services\TenantManagerService;
use InvalidArgumentException;
use Laravel\Mcp\Request;
use Laravel\Mcp\Response;
use Laravel\Mcp\Server\Attributes\Description;
use Laravel\Mcp\Server\Attributes\Name;
use Laravel\Mcp\Server\Prompt;
use Laravel\Mcp\Server\Prompts\Argument;

#[Name('scaffold-crud-module')]
#[Description('Generate a strongly typed @hacp0012/zenbase-sdk CRUD module (queries, JSON1 filters, pagination, mutations) from a live collection schema.')]
class ScaffoldCrudModulePrompt extends Prompt
{
    public function __construct(
        public McpAppContext $context,
        public TenantManagerService $tenantManager,
        public NoSqlDatabaseEngine $databaseEngine,
    ) {}

    /**
     * Handle the prompt request.
     */
    public function handle(Request $request): Response
    {
        $app = $this->context->app();
        $this->tenantManager->connect($app);

        $collection = trim((string) $request->get('collection', ''));
        $framework = trim((string) $request->get('framework', 'React + TypeScript'));

        if ($collection === '') {
            return Response::error('L\'argument `collection` est requis.');
        }

        $schema = null;
        $sampleRecords = [];

        try {
            $schema = $this->databaseEngine->getCollectionSchema($collection);
            $sampleRecords = $this->databaseEngine->collection($collection)->orderBy('created_at', 'desc')->limit(2)->get();
        } catch (InvalidArgumentException $e) {
            return Response::error($e->getMessage());
        }

        $schemaJson = json_encode($schema, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR);
        $samplesJson = json_encode($sampleRecords, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR);
        $endpointBase = url('/');

        return Response::text(<<<MARKDOWN
Génère un **module CRUD complet et typé** avec `@hacp0012/zenbase-sdk` pour la collection `{$collection}` de l'application **{$app->name}** (cible : **{$framework}**).

### Schéma actuel de `{$collection}`
```json
{$schemaJson}
```

### Exemples de documents existants (max 2)
```json
{$samplesJson}
```

### Consignes d'implémentation
1. Consulte `zenbase://docs/sdk-reference` si besoin pour vérifier les signatures exactes de `@hacp0012/zenbase-sdk`.
2. Définis les interfaces TypeScript (`Create...Input`, `Update...Input`, document complet avec `id`, `created_at`, `updated_at`) à partir du schéma réel (ou des exemples si schema-less).
3. Implémente les opérations :
   - Liste paginée avec `.paginate({ page, perPage, search })` et filtres JSON1 (`.where(...)`, `.whereIn(...)`, `.whereContains(...)`, `.orderBy(...)`).
   - Lecture unitaire `.find(id)`.
   - Création `.create(payload)`, mise à jour partielle `.update(id, partial)` et suppression `.delete(id)`.
4. Gère systématiquement le retour `{ data, error }` de chaque appel SDK sans avaler les erreurs.
5. Configure le client avec `endpoint: '{$endpointBase}'` et la clé publique (`zb_pub_...`) via variable d'environnement — ne jamais utiliser `zb_sec_...` côté frontend.
MARKDOWN);
    }

    /**
     * Get the prompt's arguments.
     *
     * @return array<int, Argument>
     */
    public function arguments(): array
    {
        return [
            new Argument(
                name: 'collection',
                description: 'Existing NoSQL collection name to scaffold CRUD operations for.',
                required: true,
            ),
            new Argument(
                name: 'framework',
                description: 'Target frontend or backend stack (default: React + TypeScript).',
                required: false,
            ),
        ];
    }
}
