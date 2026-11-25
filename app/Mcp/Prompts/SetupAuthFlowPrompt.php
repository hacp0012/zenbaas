<?php

namespace App\Mcp\Prompts;

use App\Mcp\Support\McpAppContext;
use Laravel\Mcp\Request;
use Laravel\Mcp\Response;
use Laravel\Mcp\Server\Attributes\Description;
use Laravel\Mcp\Server\Attributes\Name;
use Laravel\Mcp\Server\Prompt;
use Laravel\Mcp\Server\Prompts\Argument;

#[Name('setup-auth-flow')]
#[Description('Generate a complete tenant authentication flow using @zenbase/sdk (email/password, 6-digit OTP, session listeners, and route guards).')]
class SetupAuthFlowPrompt extends Prompt
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
        $method = strtolower(trim((string) $request->get('method', 'both')));
        if (! in_array($method, ['password', 'otp', 'both'], true)) {
            $method = 'both';
        }

        $framework = trim((string) $request->get('framework', 'React + TypeScript'));
        $corsOrigins = $app->corsOrigins()->orderBy('origin')->pluck('origin')->values()->all();
        $corsList = $corsOrigins !== [] ? implode(', ', $corsOrigins) : '(aucune origine CORS configurée — pensez à autoriser votre origine frontend dans le Dashboard)';
        $endpointBase = url('/');

        return Response::text(<<<MARKDOWN
Génère un **flux complet d'authentification utilisateur** avec `@zenbase/sdk` (`zb.auth`) pour l'application **{$app->name}**.

### Paramètres
- **Méthode souhaitée** : `{$method}` (`password` = Email/Mot de passe, `otp` = Code OTP 6 chiffres par e-mail, `both` = les deux)
- **Stack cible** : {$framework}
- **Endpoint Zenbase** : `{$endpointBase}`
- **Origines CORS autorisées** : {$corsList}

### Consignes d'implémentation
1. Consulte `zenbase://docs/sdk-reference` pour les signatures exactes de `zb.auth` (`signUp`, `signInWithPassword`, `sendOtp`, `verifyOtp`, `getUser`, `updatePassword`, `signOut`, `onAuthStateChange`).
2. Initialise le client SDK côté client avec la **clé publique (`zb_pub_...`)** via variable d'environnement — n'utilise **jamais** la clé secrète `zb_sec_...` dans le navigateur.
3. Gère la persistance et la restauration propre de la session (`getUser()`, `setToken()`, `clearSession()`), ainsi que le désabonnement de `onAuthStateChange` au démontage du composant.
4. Traite explicitement les cas d'erreur `{ data, error }` (identifiants invalides, code OTP expiré après 10 min, utilisateur bloqué).
5. Propose un hook/provider d'authentification et un composant de protection de routes privées.
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
                name: 'method',
                description: 'Authentication mode: password, otp, or both (default: both).',
                required: false,
            ),
            new Argument(
                name: 'framework',
                description: 'Target frontend stack (default: React + TypeScript).',
                required: false,
            ),
        ];
    }
}
