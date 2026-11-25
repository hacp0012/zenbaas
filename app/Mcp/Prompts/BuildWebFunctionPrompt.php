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

#[Name('build-web-function')]
#[Description('Guide an AI agent to design and write a sandbox-compliant Zenbase PHP Serverless Web Function using the application\'s collections and official PHP stubs.')]
class BuildWebFunctionPrompt extends Prompt
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

        $functionName = (string) $request->get('function_name', 'my-function');
        $goal = (string) $request->get('goal', 'Décrire l\'objectif métier de la Web Function.');
        $collectionNames = array_column($this->databaseEngine->listCollections(), 'name');
        $collectionsList = $collectionNames !== [] ? implode(', ', $collectionNames) : '(aucune collection existante)';
        $globalEnvKeys = is_array($app->settings['env_variables'] ?? null)
            ? array_map('strval', array_keys($app->settings['env_variables']))
            : [];
        $envList = $globalEnvKeys !== [] ? implode(', ', $globalEnvKeys) : '(aucune variable globale)';

        return Response::text(<<<MARKDOWN
Écris une **Web Function PHP Serverless Zenbase** nommée `{$functionName}` pour l'application **{$app->name}**.

### Objectif
{$goal}

### Contexte de l'application
- **Collections disponibles** : {$collectionsList}
- **Variables d'environnement globales (noms)** : {$envList}

### Règles strictes du Sandbox Zenbase
1. Lis d'abord les ressources `zenbase://docs/function-stubs` et `zenbase://docs/web-functions` pour l'API exacte de `\$context` (`\$context->database->collection(...)`, `\$context->storage`, `\$context->auth`, `\$context->env['CLE']`).
2. Le script doit commencer immédiatement par `return function (\$event, \$context) { ... };` (sans `use`, sans PHPDoc avant `return`, sans type-hint natif `\Zenbase\Context`). Place `/** @var \Zenbase\Context \$context */` à l'intérieur de la closure.
3. N'utilise jamais de fonctions interdites (`exec`, `shell_exec`, `eval`, `include`, `require`, `file_get_contents`, `curl_exec`, `getenv`, etc.).
4. Retourne un tableau `['status' => 200, 'data' => ...]` ou directement les données JSON (timeout max : 5 secondes).
5. Si le tool `upsert_function` est disponible, propose de déployer et tester la fonction avec `invoke_function`.
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
                name: 'function_name',
                description: 'Target Web Function slug (alphanumeric, underscores, hyphens).',
                required: true,
            ),
            new Argument(
                name: 'goal',
                description: 'Business logic or endpoint behavior to implement.',
                required: true,
            ),
        ];
    }
}
