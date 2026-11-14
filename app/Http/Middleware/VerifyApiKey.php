<?php

namespace App\Http\Middleware;

use App\Models\App;
use App\Modules\Auth\Actions\AuthManager;
use App\Services\TenantManagerService;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class VerifyApiKey
{
    public function __construct(
        public TenantManagerService $tenantManager,
        public AuthManager $authManager,
    ) {}

    /**
     * Validate the application API key, resolve the tenant SQLite database, and attach the app to the request.
     *
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $apiKey = $this->extractApiKey($request);

        if (! $apiKey) {
            return response()->json([
                'data' => null,
                'error' => 'Clé d\'API manquante. Fournissez l\'en-tête X-Zenbase-Api-Key.',
            ], 401);
        }

        /** @var App|null $app */
        $app = $request->attributes->get('current_app');

        if (! $app instanceof App || ($app->public_key !== $apiKey && $app->secret_key !== $apiKey)) {
            $app = App::query()
                ->with('user')
                ->where('public_key', $apiKey)
                ->orWhere('secret_key', $apiKey)
                ->first();
        } else {
            $app->loadMissing('user');
        }

        if (! $app) {
            return response()->json([
                'data' => null,
                'error' => 'Clé d\'API invalide.',
            ], 401);
        }

        if ($app->user && $app->user->is_suspended) {
            return response()->json([
                'data' => null,
                'error' => 'Le compte propriétaire de cette application est suspendu.',
            ], 403);
        }

        $role = $app->secret_key === $apiKey ? 'secret' : 'public';

        $request->attributes->set('current_app', $app);
        $request->attributes->set('api_key_role', $role);

        $app->increment('api_calls_count');

        $this->tenantManager->connect($app);

        $userToken = $this->extractUserToken($request);
        if ($userToken) {
            $tenantUser = $this->authManager->resolveUserFromToken($userToken);
            if ($tenantUser) {
                $request->attributes->set('current_tenant_user', $tenantUser);
            }
        }

        return $next($request);
    }

    /**
     * Extract the application API key from the request headers.
     */
    private function extractApiKey(Request $request): ?string
    {
        $headerKey = $request->header('X-Zenbase-Api-Key') ?? $request->header('X-API-Key');

        if ($headerKey && trim($headerKey) !== '') {
            return trim($headerKey);
        }

        $bearer = $request->bearerToken();

        if ($bearer && (str_starts_with($bearer, 'zb_pub_') || str_starts_with($bearer, 'zb_sec_'))) {
            return trim($bearer);
        }

        return null;
    }

    /**
     * Extract an optional tenant user Bearer token (`zb_token_...`) from the request headers.
     */
    private function extractUserToken(Request $request): ?string
    {
        $explicitHeader = $request->header('X-Zenbase-User-Token');

        if ($explicitHeader && trim($explicitHeader) !== '') {
            return trim($explicitHeader);
        }

        $bearer = $request->bearerToken();

        if ($bearer && str_starts_with($bearer, 'zb_token_')) {
            return trim($bearer);
        }

        return null;
    }
}
