<?php

namespace App\Mcp\Prompts;

use App\Mcp\Support\McpAppContext;
use App\Modules\Database\Engines\NoSqlDatabaseEngine;
use App\Services\TenantManagerService;
use Illuminate\Support\Str;
use Laravel\Mcp\Request;
use Laravel\Mcp\Response;
use Laravel\Mcp\Server\Attributes\Description;
use Laravel\Mcp\Server\Attributes\Name;
use Laravel\Mcp\Server\Prompt;
use Laravel\Mcp\Server\Prompts\Argument;

#[Name('build-webhook-function')]
#[Description('Generate a sandbox-compliant Zenbase PHP Web Function to securely receive webhooks with HMAC SHA-256 verification and idempotent persistence.')]
class BuildWebhookFunctionPrompt extends Prompt
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

        $provider = trim((string) $request->get('provider', 'Stripe'));
        $defaultSlug = Str::slug($provider.'-webhook') ?: 'webhook-handler';
        $functionName = trim((string) $request->get('function_name', $defaultSlug)) ?: $defaultSlug;

        $collectionNames = array_column($this->databaseEngine->listCollections(), 'name');
        $collectionsList = $collectionNames !== [] ? implode(', ', $collectionNames) : '(aucune collection existante)';

        $globalEnvKeys = is_array($app->settings['env_variables'] ?? null)
            ? array_map('strval', array_keys($app->settings['env_variables']))
            : [];
        $envList = $globalEnvKeys !== [] ? implode(', ', $globalEnvKeys) : '(aucune clé globale configurée)';

        return Response::text(<<<MARKDOWN
Écris une **Web Function PHP Serverless Zenbase** nommée `{$functionName}` pour recevoir et traiter les webhooks **{$provider}** de l'application **{$app->name}**.

### Contexte de l'application
- **Collections existantes** : {$collectionsList}
- **Variables d'environnement globales (noms)** : {$envList}
- **URL d'invocation API** : `POST /api/v1/functions/{$functionName}/invoke`

### Exigences de sécurité & conformité Sandbox
1. Consulte `zenbase://docs/function-stubs` et `zenbase://docs/web-functions` avant de coder.
2. Le script doit commencer immédiatement par `return function (\$event, \$context)` (sans `use`, sans PHPDoc avant `return`, sans type-hint natif `\Zenbase\Context`). Place `/** @var \Zenbase\Context \$context */` à l'intérieur.
3. Lis le secret webhook depuis `\$context->env['...']` et vérifie la signature cryptographique avec `hash_hmac('sha256', ...)` + `hash_equals(...)` (en lisant l'en-tête en minuscules depuis `\$event['headers'][...][0] ?? ''`). Retourne `['status' => 401, 'data' => ...]` si invalide.
4. Implémente une **idempotence** en vérifiant l'identifiant d'événement dans une collection dédiée (ex. `webhook_events`) via `\$context->database->collection('webhook_events')->where('event_id', '==', \$eventId)->get()` avant traitement.
5. Respecte strictement le timeout de **5 secondes** et n'utilise aucune fonction PHP bloquée par le sandbox.
6. Indique les clés `.env` à configurer dans le Dashboard (**Web Functions PHP → Variables d'Env**).
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
                name: 'provider',
                description: 'Webhook source provider (e.g. Stripe, GitHub, Resend, LemonSqueezy).',
                required: true,
            ),
            new Argument(
                name: 'function_name',
                description: 'Optional Web Function slug (defaults to <provider>-webhook).',
                required: false,
            ),
        ];
    }
}
