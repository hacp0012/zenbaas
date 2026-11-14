<?php

namespace App\Http\Middleware;

use App\Models\App;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class DynamicCors
{
    /**
     * Handle an incoming SDK API request and apply dynamic per-application CORS headers.
     *
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $origin = $request->header('Origin');

        if (! $origin) {
            if ($request->isMethod('OPTIONS')) {
                return response('', 204, $this->corsHeaders('*'));
            }

            return $next($request);
        }

        $app = $this->resolveApp($request);
        $apiKey = $this->extractApiKey($request);
        $isSecretKey = $apiKey !== null && str_starts_with($apiKey, 'zb_sec_');

        if ($app && ! $isSecretKey) {
            $allowedOrigins = $app->corsOrigins()->pluck('origin')->all();

            if (count($allowedOrigins) > 0 && ! in_array('*', $allowedOrigins, true) && ! in_array($origin, $allowedOrigins, true)) {
                return response()->json([
                    'data' => null,
                    'error' => "Origine [{$origin}] non autorisée par la politique CORS de cette application.",
                ], 403);
            }
        }

        if ($request->isMethod('OPTIONS')) {
            return response('', 204, $this->corsHeaders($origin));
        }

        $response = $next($request);

        foreach ($this->corsHeaders($origin) as $header => $value) {
            $response->headers->set($header, $value);
        }

        return $response;
    }

    /**
     * Resolve the target application from request attributes or API key headers.
     */
    private function resolveApp(Request $request): ?App
    {
        $current = $request->attributes->get('current_app');

        if ($current instanceof App) {
            return $current;
        }

        $apiKey = $this->extractApiKey($request);

        if (! $apiKey) {
            return null;
        }

        $app = App::query()
            ->where('public_key', $apiKey)
            ->orWhere('secret_key', $apiKey)
            ->first();

        if ($app) {
            $request->attributes->set('current_app', $app);
        }

        return $app;
    }

    /**
     * Extract the API key from request headers.
     */
    private function extractApiKey(Request $request): ?string
    {
        $key = $request->header('X-Zenbase-Api-Key') ?? $request->header('X-API-Key');

        if ($key) {
            return trim($key);
        }

        $bearer = $request->bearerToken();

        if ($bearer && (str_starts_with($bearer, 'zb_pub_') || str_starts_with($bearer, 'zb_sec_'))) {
            return trim($bearer);
        }

        return null;
    }

    /**
     * Build the CORS headers array for the given origin.
     *
     * @return array<string, string>
     */
    private function corsHeaders(string $origin): array
    {
        return [
            'Access-Control-Allow-Origin' => $origin,
            'Access-Control-Allow-Methods' => 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
            'Access-Control-Allow-Headers' => 'Content-Type, Authorization, X-Zenbase-Api-Key, X-API-Key, X-Zenbase-User-Token, Accept, Origin',
            'Access-Control-Max-Age' => '86400',
        ];
    }
}
