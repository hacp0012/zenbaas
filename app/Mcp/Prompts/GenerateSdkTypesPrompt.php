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

#[Name('generate-sdk-types')]
#[Description('Generate strict TypeScript interfaces and typed @hacp0012/zenbase-sdk collection helpers based on the current application\'s NoSQL collections and schemas.')]
class GenerateSdkTypesPrompt extends Prompt
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

        $collections = $this->databaseEngine->listCollections();
        $targetFile = (string) $request->get('target_file', 'src/lib/zenbase-types.ts');
        $collectionsJson = json_encode($collections, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);

        return Response::text(<<<MARKDOWN
Génère le fichier TypeScript `{$targetFile}` pour l'application Zenbase **{$app->name}** (`{$app->id}`).

### Collections et schémas actuels
```json
{$collectionsJson}
```

### Consignes
1. Crée une interface TypeScript stricte par collection (en incluant `id: string`, `created_at: string`, `updated_at: string`, et les champs du schéma — en typant `blob` avec `{ __type: 'blob'; mime_type: string; name?: string | null; size: number; data: string }`).
2. Pour les collections sans schéma (`schema: null`), inspecte 1 ou 2 documents via `query_records` afin d'inférer les champs réels.
3. Ajoute un helper d'initialisation `@hacp0012/zenbase-sdk` utilisant `endpoint: '{$this->endpointBase()}'` et des variables d'environnement (`VITE_ZENBASE_URL`, `VITE_ZENBASE_PUBLIC_KEY`) sans jamais coder en dur la clé secrète `zb_sec_...`.
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
                name: 'target_file',
                description: 'Destination TypeScript file path (default: src/lib/zenbase-types.ts).',
                required: false,
            ),
        ];
    }

    /**
     * Return the base endpoint URL for the Zenbase instance.
     */
    private function endpointBase(): string
    {
        return url('/');
    }
}
