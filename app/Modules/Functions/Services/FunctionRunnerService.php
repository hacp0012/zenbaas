<?php

namespace App\Modules\Functions\Services;

use App\Models\App;
use App\Models\AppLog;
use App\Modules\Auth\Models\TenantUser;
use App\Modules\Database\Engines\NoSqlDatabaseEngine;
use App\Modules\Functions\Models\AppFunction;
use App\Modules\Storage\Services\StorageManagerService;
use App\Services\AppLogService;
use App\Services\TenantManagerService;
use Closure;
use InvalidArgumentException;
use Throwable;

class FunctionRunnerService
{
    /**
     * List of forbidden PHP functions and keywords in user-provided serverless functions.
     *
     * @var array<int, string>
     */
    private const FORBIDDEN_IDENTIFIERS = [
        'exec',
        'shell_exec',
        'system',
        'passthru',
        'proc_open',
        'popen',
        'pcntl_exec',
        'pcntl_fork',
        'eval',
        'assert',
        'create_function',
        'include',
        'include_once',
        'require',
        'require_once',
        'file_get_contents',
        'file_put_contents',
        'fopen',
        'fwrite',
        'unlink',
        'rmdir',
        'mkdir',
        'chmod',
        'chown',
        'symlink',
        'link',
        'fsockopen',
        'pfsockopen',
        'stream_socket_client',
        'stream_socket_server',
        'curl_exec',
        'curl_multi_exec',
        'dl',
        'phpinfo',
        'getenv',
        'putenv',
        'ini_set',
        'ini_alter',
        'apache_setenv',
        'posix_kill',
        'posix_mkfifo',
        'posix_setpgid',
        'posix_setsid',
        'posix_setuid',
    ];

    public function __construct(
        public TenantManagerService $tenantManager,
        public NoSqlDatabaseEngine $databaseEngine,
        public StorageManagerService $storageManager,
        public AppLogService $appLogService,
    ) {}

    /**
     * Validate user-submitted PHP function code against the sandbox security rules.
     *
     * @throws InvalidArgumentException
     */
    public function validateCode(string $code): void
    {
        $trimmed = trim($code);

        if ($trimmed === '') {
            throw new InvalidArgumentException('Le code de la fonction ne peut pas être vide.');
        }

        if (str_contains($trimmed, '`')) {
            throw new InvalidArgumentException('L\'opérateur backtick (`) est interdit dans les Web Functions.');
        }

        $source = str_starts_with($trimmed, '<?php') ? $trimmed : "<?php\n".$trimmed;
        $tokens = @token_get_all($source);

        $forbiddenLookup = array_flip(self::FORBIDDEN_IDENTIFIERS);

        foreach ($tokens as $token) {
            if (! is_array($token)) {
                continue;
            }

            [$id, $text] = $token;
            $lower = strtolower($text);

            if (in_array($id, [T_EVAL, T_INCLUDE, T_INCLUDE_ONCE, T_REQUIRE, T_REQUIRE_ONCE, T_EXIT], true)) {
                throw new InvalidArgumentException("Instruction PHP interdite dans le sandbox : [{$text}].");
            }

            if ($id === T_STRING && isset($forbiddenLookup[$lower])) {
                throw new InvalidArgumentException("Fonction PHP interdite dans le sandbox : [{$text}()].");
            }
        }

        if (! str_contains($trimmed, 'function')) {
            throw new InvalidArgumentException('Le script doit retourner une fonction anonyme : return function($event, $context) { ... };');
        }
    }

    /**
     * Execute a serverless PHP function inside the isolated tenant context and record execution logs.
     *
     * @param  array<string, mixed>  $payload
     * @param  array<string, mixed>  $headers
     * @return array{status: int, data: mixed, error: string|null, duration_ms: float}
     */
    public function execute(
        App $app,
        AppFunction $function,
        array $payload = [],
        array $headers = [],
        ?TenantUser $tenantUser = null,
    ): array {
        if (! $function->is_active) {
            $errorMessage = "La fonction [{$function->name}] est désactivée.";
            $this->recordUnifiedLog($app, $function, 403, 0.0, null, $errorMessage);

            return [
                'status' => 403,
                'data' => null,
                'error' => $errorMessage,
                'duration_ms' => 0.0,
            ];
        }

        $startTime = microtime(true);
        $previousTimeLimit = (int) ini_get('max_execution_time');

        try {
            $this->validateCode($function->code);
            $this->tenantManager->connect($app);

            $globalEnv = is_array($app->settings['env_variables'] ?? null)
                ? $app->settings['env_variables']
                : [];
            $functionEnv = is_array($function->env_variables) ? $function->env_variables : [];

            $context = new ZenbaseFunctionContext(
                $app,
                $this->databaseEngine,
                $this->storageManager,
                array_merge($globalEnv, $functionEnv),
                $tenantUser,
            );

            $event = [
                ...$payload,
                'payload' => $payload,
                'headers' => $headers,
            ];

            $closure = $this->compileClosure($function->code);

            @set_time_limit(5);
            ob_start();
            $rawResult = $closure($event, $context);
            $stdout = ob_get_clean() ?: '';

            $durationMs = round((microtime(true) - $startTime) * 1000, 2);

            $status = 200;
            $responseData = $rawResult;

            if (is_array($rawResult) && isset($rawResult['status']) && is_numeric($rawResult['status']) && array_key_exists('data', $rawResult)) {
                $status = (int) $rawResult['status'];
                $responseData = $rawResult['data'];
            }

            $outputText = $stdout !== '' ? $stdout : json_encode($responseData, JSON_UNESCAPED_UNICODE);

            $this->appendLog($function, [
                'timestamp' => now()->toIso8601String(),
                'status' => $status,
                'duration_ms' => $durationMs,
                'output' => $outputText,
                'error' => null,
            ]);

            $this->recordUnifiedLog($app, $function, $status, $durationMs, is_string($outputText) ? $outputText : null, null);

            return [
                'status' => $status,
                'data' => $responseData,
                'error' => null,
                'duration_ms' => $durationMs,
            ];
        } catch (Throwable $e) {
            if (ob_get_level() > 0) {
                @ob_end_clean();
            }

            $durationMs = round((microtime(true) - $startTime) * 1000, 2);

            $this->appendLog($function, [
                'timestamp' => now()->toIso8601String(),
                'status' => 500,
                'duration_ms' => $durationMs,
                'output' => null,
                'error' => $e->getMessage(),
            ]);

            $this->recordUnifiedLog($app, $function, 500, $durationMs, null, $e->getMessage());

            return [
                'status' => 500,
                'data' => null,
                'error' => $e->getMessage(),
                'duration_ms' => $durationMs,
            ];
        } finally {
            @set_time_limit($previousTimeLimit);
        }
    }

    /**
     * Compile the validated PHP closure string into an executable Closure.
     */
    private function compileClosure(string $code): Closure
    {
        $cleanCode = preg_replace('/^\s*<\?php\b/i', '', trim($code)) ?? trim($code);

        if (! str_starts_with(ltrim($cleanCode), 'return')) {
            $cleanCode = 'return '.$cleanCode;
        }

        if (! str_ends_with(rtrim($cleanCode), ';')) {
            $cleanCode .= ';';
        }

        $loader = static function () use ($cleanCode): mixed {
            return eval($cleanCode);
        };

        $closure = $loader();

        if (! $closure instanceof Closure) {
            throw new InvalidArgumentException('Le code doit retourner une Closure valide : return function($event, $context) { ... };');
        }

        return $closure;
    }

    /**
     * Append an execution log entry to the function's history (retaining the latest 50 logs).
     *
     * @param  array<string, mixed>  $entry
     */
    private function appendLog(AppFunction $function, array $entry): void
    {
        $logs = is_array($function->logs) ? $function->logs : [];
        array_unshift($logs, $entry);
        $function->update([
            'logs' => array_slice($logs, 0, 50),
        ]);
    }

    /**
     * Record a unified per-application function log when invoked outside the API v1 gateway (Dashboard IDE or MCP).
     */
    private function recordUnifiedLog(
        App $app,
        AppFunction $function,
        int $status,
        float $durationMs,
        ?string $output,
        ?string $error,
    ): void {
        $request = request();

        // API v1 invocations are already recorded by RecordAppActivityLog middleware
        if ($request->is('api/v1/functions/*')) {
            return;
        }

        $trigger = $request->is('mcp') || $request->is('mcp/*') ? 'mcp' : 'dashboard';
        $level = $status >= 500
            ? AppLog::LEVEL_ERROR
            : ($status >= 400 ? AppLog::LEVEL_WARNING : AppLog::LEVEL_INFO);

        $context = [
            'function_id' => $function->id,
            'function_name' => $function->name,
            'trigger' => $trigger,
        ];

        if ($output !== null && $output !== '') {
            $context['output_preview'] = $output;
        }

        $this->appLogService->record(
            app: $app,
            source: AppLog::SOURCE_FUNCTIONS,
            level: $level,
            action: "function.invoke:{$function->name}",
            method: 'EXEC',
            path: "/functions/{$function->name}",
            statusCode: $status,
            durationMs: (int) round($durationMs),
            apiKeyRole: $trigger,
            ipAddress: $request->ip(),
            message: $error ?? "Exécution de la fonction [{$function->name}] terminée (HTTP {$status}).",
            context: $context,
        );
    }
}
