<?php

namespace App\Http\Middleware;

use App\Models\App;
use App\Models\AppLog;
use App\Modules\Auth\Models\TenantUser;
use App\Services\AppLogService;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Symfony\Component\HttpFoundation\Response;

class RecordAppActivityLog
{
    public function __construct(public AppLogService $appLogService) {}

    /**
     * Timestamp incoming API and MCP requests so latency can be recorded on termination.
     *
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $request->attributes->set('zenbase_log_started_at', microtime(true));

        return $next($request);
    }

    /**
     * Persist a sanitized per-application activity log after the HTTP response is generated.
     */
    public function terminate(Request $request, Response $response): void
    {
        if ($request->isMethod('OPTIONS')) {
            return;
        }

        $app = $request->attributes->get('current_app');

        if (! $app instanceof App) {
            return;
        }

        $startedAt = $request->attributes->get('zenbase_log_started_at');
        $durationMs = is_float($startedAt)
            ? (int) round((microtime(true) - $startedAt) * 1000)
            : null;

        $statusCode = $response->getStatusCode();
        $path = '/'.ltrim($request->path(), '/');
        $source = $this->resolveSource($request);
        $decodedBody = $this->decodeJsonResponse($response);

        [$action, $context, $rpcErrorMessage] = $this->extractActionAndContext($request, $source, $decodedBody);

        $level = $this->resolveLevel($statusCode, $rpcErrorMessage !== null);
        $message = $this->resolveMessage($statusCode, $source, $action, $decodedBody, $rpcErrorMessage);

        if ($statusCode === 429) {
            $retryAfter = $response->headers->get('Retry-After');
            if ($retryAfter !== null) {
                $context['retry_after_seconds'] = (int) $retryAfter;
            }
            $context['rate_limited'] = true;
        }

        $origin = $request->header('Origin');
        if (is_string($origin) && $origin !== '') {
            $context['origin'] = $origin;
        }

        $apiKeyRole = $request->attributes->get('api_key_role');

        $this->appLogService->record(
            app: $app,
            source: $source,
            level: $level,
            action: $action,
            method: $request->method(),
            path: $path,
            statusCode: $statusCode,
            durationMs: $durationMs,
            apiKeyRole: is_string($apiKeyRole) ? $apiKeyRole : null,
            ipAddress: $request->ip(),
            message: $message,
            context: $context,
        );
    }

    /**
     * Determine the Zenbase module source from the request path.
     */
    private function resolveSource(Request $request): string
    {
        if ($request->is('mcp') || $request->is('mcp/*')) {
            return AppLog::SOURCE_MCP;
        }

        if ($request->is('api/v1/auth') || $request->is('api/v1/auth/*')) {
            return AppLog::SOURCE_AUTH;
        }

        if ($request->is('api/v1/storage') || $request->is('api/v1/storage/*')) {
            return AppLog::SOURCE_STORAGE;
        }

        if ($request->is('api/v1/functions') || $request->is('api/v1/functions/*')) {
            return AppLog::SOURCE_FUNCTIONS;
        }

        return AppLog::SOURCE_API;
    }

    /**
     * Extract a semantic action name and sanitized structured metadata from the request.
     *
     * @param  array<string, mixed>|null  $decodedBody
     * @return array{0: string, 1: array<string, mixed>, 2: string|null}
     */
    private function extractActionAndContext(Request $request, string $source, ?array $decodedBody): array
    {
        $context = [];
        $rpcErrorMessage = null;

        if ($source === AppLog::SOURCE_MCP) {
            $rpcMethod = $request->input('method');
            $rpcParams = $request->input('params');
            $action = is_string($rpcMethod) && $rpcMethod !== '' ? "mcp.{$rpcMethod}" : 'mcp.request';

            if (is_string($rpcMethod) && $rpcMethod !== '') {
                $context['rpc_method'] = $rpcMethod;
            }

            if (is_array($rpcParams)) {
                if (isset($rpcParams['name']) && is_string($rpcParams['name'])) {
                    $action .= ':'.$rpcParams['name'];
                    $context['target'] = $rpcParams['name'];
                } elseif (isset($rpcParams['uri']) && is_string($rpcParams['uri'])) {
                    $action .= ':'.$rpcParams['uri'];
                    $context['target'] = $rpcParams['uri'];
                }
            }

            if (is_array($decodedBody)) {
                if (isset($decodedBody['error']) && is_array($decodedBody['error'])) {
                    $errMsg = $decodedBody['error']['message'] ?? 'Erreur JSON-RPC MCP';
                    $rpcErrorMessage = is_string($errMsg) ? $errMsg : 'Erreur JSON-RPC MCP';
                } elseif (isset($decodedBody['result']['isError']) && $decodedBody['result']['isError'] === true) {
                    $firstText = $decodedBody['result']['content'][0]['text'] ?? null;
                    $rpcErrorMessage = is_string($firstText) ? $firstText : 'Erreur lors de l\'exécution de l\'outil MCP.';
                }
            }

            return [$action, $context, $rpcErrorMessage];
        }

        if ($source === AppLog::SOURCE_AUTH) {
            $suffix = ltrim(str_replace('api/v1/auth', '', $request->path()), '/');
            $action = match ($suffix) {
                'signup' => 'auth.signup',
                'signin' => 'auth.signin',
                'otp/send' => 'auth.otp.send',
                'otp/verify' => 'auth.otp.verify',
                'user' => 'auth.me',
                'password' => 'auth.password.update',
                'signout' => 'auth.signout',
                default => 'auth.request',
            };

            $email = $request->input('email');
            if (is_string($email) && $email !== '') {
                $context['email'] = strtolower(trim($email));
            }

            $tenantUser = $request->attributes->get('current_tenant_user');
            if ($tenantUser instanceof TenantUser) {
                $context['tenant_user_id'] = $tenantUser->id;
                if (! isset($context['email'])) {
                    $context['email'] = $tenantUser->email;
                }
            }

            return [$action, $context, null];
        }

        if ($source === AppLog::SOURCE_STORAGE) {
            $suffix = ltrim(str_replace('api/v1/storage', '', $request->path()), '/');
            $action = match (true) {
                $suffix === 'upload' => 'storage.upload',
                $suffix === 'usage' => 'storage.usage',
                $suffix === 'files' => 'storage.list',
                str_starts_with($suffix, 'files/') && $request->isMethod('DELETE') => 'storage.delete',
                default => 'storage.request',
            };

            $folder = $request->input('folder');
            if (is_string($folder) && trim($folder) !== '') {
                $context['folder'] = trim($folder);
            }

            $uploadedFile = $request->file('file');
            if ($uploadedFile instanceof UploadedFile) {
                $context['file_name'] = $uploadedFile->getClientOriginalName();
                $context['size_bytes'] = $uploadedFile->getSize();
                $context['mime_type'] = $uploadedFile->getClientMimeType();
            }

            return [$action, $context, null];
        }

        if ($source === AppLog::SOURCE_FUNCTIONS) {
            $functionName = $request->route('functionName');

            if (is_string($functionName) && $functionName !== '') {
                $context['function_name'] = $functionName;
                $context['trigger'] = 'api';

                return ["function.invoke:{$functionName}", $context, null];
            }

            return ['functions.list', $context, null];
        }

        // Default: API / Database module
        $relativePath = ltrim(str_replace('api/v1/', '', $request->path()), '/');
        $collection = $request->route('collection');
        $recordId = $request->route('recordId');

        if (is_string($collection) && $collection !== '') {
            $context['collection'] = $collection;
        }
        if (is_string($recordId) && $recordId !== '') {
            $context['record_id'] = $recordId;
        }

        $tenantUser = $request->attributes->get('current_tenant_user');
        if ($tenantUser instanceof TenantUser) {
            $context['tenant_user_id'] = $tenantUser->id;
        }

        $action = strtoupper($request->method()).' '.($relativePath !== '' ? $relativePath : 'api');

        return [$action, $context, null];
    }

    /**
     * Resolve the log severity level from HTTP status code and JSON-RPC status.
     */
    private function resolveLevel(int $statusCode, bool $hasRpcError): string
    {
        if ($statusCode >= 500 || $hasRpcError) {
            return AppLog::LEVEL_ERROR;
        }

        if ($statusCode >= 400) {
            return AppLog::LEVEL_WARNING;
        }

        return AppLog::LEVEL_INFO;
    }

    /**
     * Extract a concise human-readable message from the JSON response or generate a default summary.
     *
     * @param  array<string, mixed>|null  $decodedBody
     */
    private function resolveMessage(
        int $statusCode,
        string $source,
        string $action,
        ?array $decodedBody,
        ?string $rpcErrorMessage,
    ): string {
        if ($rpcErrorMessage !== null) {
            return $rpcErrorMessage;
        }

        if (is_array($decodedBody)) {
            if (isset($decodedBody['error']) && is_string($decodedBody['error']) && $decodedBody['error'] !== '') {
                return $decodedBody['error'];
            }

            if (isset($decodedBody['error']['message']) && is_string($decodedBody['error']['message'])) {
                return $decodedBody['error']['message'];
            }

            if ($statusCode >= 400 && isset($decodedBody['message']) && is_string($decodedBody['message']) && $decodedBody['message'] !== '') {
                return $decodedBody['message'];
            }
        }

        if ($statusCode === 429) {
            return 'Limite de débit atteinte (HTTP 429).';
        }

        if ($statusCode >= 500) {
            return "Erreur interne lors de l'opération {$action}.";
        }

        if ($statusCode >= 400) {
            return "Requête refusée (HTTP {$statusCode}) sur {$action}.";
        }

        return match ($source) {
            AppLog::SOURCE_AUTH => "Opération d'authentification {$action} réussie.",
            AppLog::SOURCE_STORAGE => "Opération de stockage {$action} réussie.",
            AppLog::SOURCE_FUNCTIONS => "Appel de fonction {$action} réussi.",
            AppLog::SOURCE_MCP => "Requête MCP {$action} traitée avec succès.",
            default => "Requête API {$action} traitée avec succès.",
        };
    }

    /**
     * Safely decode a JSON response body when available.
     *
     * @return array<string, mixed>|null
     */
    private function decodeJsonResponse(Response $response): ?array
    {
        $content = $response->getContent();
        if (! is_string($content) || $content === '' || strlen($content) > 65536) {
            return null;
        }

        $decoded = json_decode($content, true);

        return is_array($decoded) ? $decoded : null;
    }
}
