<?php

namespace App\Mcp\Prompts;

use App\Mcp\Support\McpAppContext;
use App\Modules\Database\Engines\NoSqlDatabaseEngine;
use App\Services\TenantManagerService;
use Laravel\Mcp\Request;
use Laravel\Mcp\Response;
use Laravel\Mcp\Server\Attributes\Description;
use Laravel\Mcp\Server\Attributes\Name;
use Laravel\Mcp\Server\Prompt;
use Laravel\Mcp\Server\Prompts\Argument;

#[Name('design-collection-schema')]
#[Description('Design a strict Zenbase NoSQL JSON validation schema for a collection based on existing collections and business requirements.')]
class DesignCollectionSchemaPrompt extends Prompt
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

        $collection = trim((string) $request->get('collection', 'items'));
        $requirements = trim((string) $request->get('requirements', 'Décrire les champs et règles métier souhaités.'));
        $existingCollections = $this->databaseEngine->listCollections();
        $collectionsJson = json_encode($existingCollections, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR);
        $allowedTypes = implode(', ', NoSqlDatabaseEngine::ALLOWED_SCHEMA_TYPES);

        return Response::text(<<<MARKDOWN
Conçois un **schéma de validation NoSQL Zenbase** propre et cohérent pour la collection `{$collection}` de l'application **{$app->name}**.

### Besoin métier
{$requirements}

### Collections et schémas existants
```json
{$collectionsJson}
```

### Règles de modélisation Zenbase
1. Utilise exclusivement les types autorisés par Zenbase : `{$allowedTypes}`.
2. Retourne le schéma au format exact :
   `{"strict": true|false, "fields": [{"name": "...", "type": "...", "required": true|false, "default": ..., "description": "..."}]}`.
3. Précise quand `strict: true` est recommandé (entités métier critiques) vs `strict: false` (métadonnées extensibles).
4. Évite les champs `blob` pour des fichiers lourds : préfère une référence vers Zenbase Storage (`file_id` / `file_url` de type `string`).
5. Si la collection existe déjà, propose `update_collection_schema` (après confirmation si des documents existants risquent de ne plus être conformes) ; sinon propose `create_collection`.
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
                description: 'Target NoSQL collection name (e.g. orders, invoices, projects).',
                required: true,
            ),
            new Argument(
                name: 'requirements',
                description: 'Business entities, fields, validation rules, and relations to model.',
                required: true,
            ),
        ];
    }
}
