<?php

namespace App\Mcp\Prompts;

use App\Mcp\Support\McpAppContext;
use Laravel\Mcp\Request;
use Laravel\Mcp\Response;
use Laravel\Mcp\Server\Attributes\Description;
use Laravel\Mcp\Server\Attributes\Name;
use Laravel\Mcp\Server\Prompt;
use Laravel\Mcp\Server\Prompts\Argument;

#[Name('debug-web-function')]
#[Description('Diagnose and fix a Zenbase PHP Web Function using its live source code, recent execution logs/errors, env key names, and sandbox rules.')]
class DebugWebFunctionPrompt extends Prompt
{
    public function __construct(
        public McpAppContext $context,
    ) {}

    /**
     * Handle the prompt request.
     */
    public function handle(Request $request): Response
    {
        $app = $this->context->app();
        $functionName = trim((string) $request->get('function_name', ''));

        if ($functionName === '') {
            return Response::error('L\'argument `function_name` est requis.');
        }

        $function = $app->functions()->where('name', $functionName)->first();

        if (! $function) {
            $available = $app->functions()->orderBy('name')->pluck('name')->all();
            $availableList = $available !== [] ? implode(', ', $available) : '(aucune fonction déployée)';

            return Response::error("Web Function « {$functionName} » introuvable. Fonctions disponibles : {$availableList}.");
        }

        $globalEnvKeys = is_array($app->settings['env_variables'] ?? null)
            ? array_map('strval', array_keys($app->settings['env_variables']))
            : [];
        $functionEnvKeys = is_array($function->env_variables)
            ? array_map('strval', array_keys($function->env_variables))
            : [];
        $allEnvKeys = array_values(array_unique([...$globalEnvKeys, ...$functionEnvKeys]));
        $envList = $allEnvKeys !== [] ? implode(', ', $allEnvKeys) : '(aucune clé .env configurée)';

        $recentLogs = array_slice(is_array($function->logs) ? $function->logs : [], 0, 10);
        $logsJson = json_encode($recentLogs, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR);
        $statusLabel = $function->is_active ? 'active' : 'désactivée';

        return Response::text(<<<MARKDOWN
Diagnostique et corrige la **Web Function PHP Serverless** `{$function->name}` (statut : {$statusLabel}) de l'application **{$app->name}**.

### Clés d'environnement disponibles (valeurs masquées)
{$envList}

### Code source actuel
```php
{$function->code}
```

### 10 derniers journaux d'exécution
```json
{$logsJson}
```

### Consignes de diagnostic
1. Analyse les erreurs, statuts HTTP, durées (`duration_ms`, timeout max **5 secondes**) et sorties `output` dans les logs ci-dessus.
2. Vérifie la conformité au runtime Zenbase (consulte `zenbase://docs/function-stubs` et `zenbase://docs/web-functions` si nécessaire) :
   - Le script doit commencer directement par `return function (\$event, \$context)` (aucun `use` ni PHPDoc avant `return`, aucun type-hint natif `\Zenbase\Context`).
   - APIs disponibles : `\$context->database->collection(...)`, `\$context->storage`, `\$context->auth`, `\$context->env['CLE']`.
   - Aucune fonction interdite par le sandbox (`exec`, `eval`, `file_get_contents`, `curl_exec`, `getenv`, `include`, etc.).
3. Explique précisément la cause racine du bug et propose le code PHP corrigé complet.
4. Si `upsert_function` et `invoke_function` sont actifs, demande confirmation avant de déployer puis tester avec un payload reproductible.
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
                description: 'Slug of the Web Function to diagnose and fix.',
                required: true,
            ),
        ];
    }
}
