<?php

namespace App\Mcp\Prompts;

use App\Mcp\Support\McpAppContext;
use App\Modules\Auth\Models\TenantUser;
use App\Modules\Database\Engines\NoSqlDatabaseEngine;
use App\Modules\Functions\Models\AppFunction;
use App\Modules\Storage\Services\StorageManagerService;
use App\Services\TenantManagerService;
use Laravel\Mcp\Request;
use Laravel\Mcp\Response;
use Laravel\Mcp\Server\Attributes\Description;
use Laravel\Mcp\Server\Attributes\Name;
use Laravel\Mcp\Server\Prompt;

#[Name('audit-app-security')]
#[Description('Audit the current Zenbase application security posture: CORS origins, MCP permissions, schema-less collections, Web Functions, and tenant auth.')]
class AuditAppSecurityPrompt extends Prompt
{
    public function __construct(
        public McpAppContext $context,
        public TenantManagerService $tenantManager,
        public NoSqlDatabaseEngine $databaseEngine,
        public StorageManagerService $storageManager,
    ) {}

    /**
     * Handle the prompt request.
     */
    public function handle(Request $request): Response
    {
        $app = $this->context->app();
        $this->tenantManager->connect($app);

        $collections = $this->databaseEngine->listCollections();
        $corsOrigins = $app->corsOrigins()->orderBy('origin')->pluck('origin')->values()->all();
        $globalEnvKeys = is_array($app->settings['env_variables'] ?? null)
            ? array_map('strval', array_keys($app->settings['env_variables']))
            : [];

        $functions = $app->functions()
            ->orderBy('name')
            ->get()
            ->map(fn (AppFunction $fn): array => [
                'name' => $fn->name,
                'is_active' => $fn->is_active,
                'env_keys' => is_array($fn->env_variables) ? array_map('strval', array_keys($fn->env_variables)) : [],
            ])
            ->all();

        $snapshot = [
            'app' => [
                'id' => $app->id,
                'name' => $app->name,
                'rate_limit_per_minute' => (int) ($app->settings['rate_limit'] ?? 120),
            ],
            'cors_origins' => $corsOrigins,
            'mcp_permissions' => $app->mcpSettings(),
            'collections' => $collections,
            'functions' => [
                'global_env_keys' => $globalEnvKeys,
                'items' => $functions,
            ],
            'auth' => [
                'total_users' => TenantUser::query()->count(),
                'blocked_users' => TenantUser::query()->where('is_blocked', true)->count(),
            ],
            'storage_usage' => $this->storageManager->getStorageUsageSummary($app),
        ];

        $snapshotJson = json_encode($snapshot, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR);

        return Response::text(<<<MARKDOWN
Réalise un **audit de sécurité actionnable** pour l'application Zenbase **{$app->name}** (`{$app->id}`).

### État actuel de l'application (secrets masqués)
```json
{$snapshotJson}
```

### Points à auditer et prioriser (Critique / Moyen / Faible)
1. **CORS** : vérifie l'absence de wildcard `*` ou d'origines de développement (`localhost`) en production, ou à l'inverse l'absence d'origine configurée.
2. **Permissions MCP** : vérifie si le mode écriture ou les permissions destructives (`allow_functions`, `allow_auth_management`, `allow_storage_write`) sont activées sans besoin immédiat.
3. **Schémas NoSQL** : identifie les collections sans schéma (`schema: null`) ou non strictes (`strict: false`) susceptibles d'accepter des payloads non validés.
4. **Web Functions PHP** : si des fonctions actives existent, propose d'inspecter leur code via `get_function_code` ou `zenbase://functions/{function}/code` pour vérifier les contrôles `\$context->auth->check()`, la validation des entrées et les signatures webhook.
5. **Quotas & Rate limiting** : vérifie le plafond `rate_limit_per_minute` et l'utilisation du stockage.

Termine par un plan d'action concret classé par ordre de priorité.
MARKDOWN);
    }
}
