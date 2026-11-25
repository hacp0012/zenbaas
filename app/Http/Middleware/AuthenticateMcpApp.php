<?php

namespace App\Http\Middleware;

use App\Mcp\Support\McpAppContext;
use App\Models\App;
use App\Services\TenantManagerService;
use Closure;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class AuthenticateMcpApp
{
    public function __construct(
        public TenantManagerService $tenantManager,
        public McpAppContext $mcpContext,
    ) {}

    /**
     * Authenticate an incoming MCP request using the application's secret API key (`zb_sec_...`).
     *
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $apiKey = $this->extractApiKey($request);

        if ($apiKey === null) {
            return $this->errorResponse(
                $request,
                401,
                -32001,
                'Clé d\'API secrète manquante. Fournissez Authorization: Bearer zb_sec_... ou l\'en-tête X-Zenbase-Api-Key.',
            );
        }

        if (str_starts_with($apiKey, 'zb_pub_')) {
            return $this->errorResponse(
                $request,
                403,
                -32003,
                'Les clés publiques (zb_pub_...) ne sont pas autorisées sur le serveur MCP. Utilisez la clé secrète (zb_sec_...) de votre application.',
            );
        }

        $app = App::query()
            ->with('user')
            ->where('secret_key', $apiKey)
            ->first();

        if (! $app instanceof App) {
            if (App::query()->where('public_key', $apiKey)->exists()) {
                return $this->errorResponse(
                    $request,
                    403,
                    -32003,
                    'Les clés publiques ne sont pas autorisées sur le serveur MCP. Utilisez la clé secrète (zb_sec_...) de votre application.',
                );
            }

            return $this->errorResponse(
                $request,
                401,
                -32001,
                'Clé d\'API secrète invalide.',
            );
        }

        if ($app->user !== null && $app->user->isSuspendedOrExpired()) {
            return $this->errorResponse(
                $request,
                403,
                -32003,
                'Le compte propriétaire de cette application est suspendu ou expiré.',
            );
        }

        if (! $app->mcpSettings()['enabled']) {
            return $this->errorResponse(
                $request,
                403,
                -32003,
                'Le serveur MCP est désactivé pour cette application. Activez-le dans le Dashboard Zenbase.',
            );
        }

        $request->attributes->set('current_app', $app);
        $request->attributes->set('api_key_role', 'secret');

        $this->tenantManager->connect($app);
        $this->mcpContext->setApp($app);

        $app->increment('api_calls_count');

        return $next($request);
    }

    /**
     * Extract an API key from standard Bearer or Zenbase headers.
     */
    private function extractApiKey(Request $request): ?string
    {
        $bearer = $request->bearerToken();

        if (is_string($bearer) && trim($bearer) !== '') {
            return trim($bearer);
        }

        $headerKey = $request->header('X-Zenbase-Api-Key') ?? $request->header('X-API-Key');

        if (is_string($headerKey) && trim($headerKey) !== '') {
            return trim($headerKey);
        }

        return null;
    }

    /**
     * Build a JSON-RPC 2.0 compatible HTTP error response.
     */
    private function errorResponse(Request $request, int $status, int $code, string $message): JsonResponse
    {
        $decoded = json_decode((string) $request->getContent(), true);
        $requestId = is_array($decoded) && (is_int($decoded['id'] ?? null) || is_string($decoded['id'] ?? null))
            ? $decoded['id']
            : null;

        return response()->json([
            'jsonrpc' => '2.0',
            'id' => $requestId,
            'error' => [
                'code' => $code,
                'message' => $message,
            ],
        ], $status);
    }
}
