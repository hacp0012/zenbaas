<?php

namespace App\Services;

use App\Models\App;
use App\Models\AppLog;
use Illuminate\Support\Str;
use Throwable;

class AppLogService
{
    public const MAX_LOGS_PER_APP = 1000;

    public const RETENTION_DAYS = 7;

    /**
     * Keys that must never be persisted inside log contexts.
     *
     * @var array<int, string>
     */
    private const SENSITIVE_KEYS = [
        'password',
        'password_confirmation',
        'password_hash',
        'new_password',
        'current_password',
        'token',
        'access_token',
        'refresh_token',
        'otp',
        'otp_code',
        'code',
        'secret',
        'secret_key',
        'api_key',
        'authorization',
        'env_variables',
    ];

    /**
     * Persist a sanitized per-application log entry with bounded retention.
     *
     * @param  array<string, mixed>  $context
     */
    public function record(
        App|string $app,
        string $source,
        string $level,
        string $action,
        ?string $method = null,
        ?string $path = null,
        ?int $statusCode = null,
        ?int $durationMs = null,
        ?string $apiKeyRole = null,
        ?string $ipAddress = null,
        ?string $message = null,
        array $context = [],
        bool $forcePrune = false,
    ): ?AppLog {
        $appId = $app instanceof App ? $app->id : $app;
        $normalizedSource = in_array($source, AppLog::SOURCES, true) ? $source : AppLog::SOURCE_API;
        $normalizedLevel = in_array($level, AppLog::LEVELS, true) ? $level : AppLog::LEVEL_INFO;

        try {
            $sanitizedContext = $this->sanitizeContext($context);

            $entry = AppLog::query()->create([
                'app_id' => $appId,
                'source' => $normalizedSource,
                'level' => $normalizedLevel,
                'action' => Str::limit($this->redactSecrets($action), 160, ''),
                'method' => $method !== null ? Str::limit(strtoupper($method), 12, '') : null,
                'path' => $path !== null ? Str::limit($this->redactSecrets($path), 255, '') : null,
                'status_code' => $statusCode,
                'duration_ms' => $durationMs !== null ? max(0, $durationMs) : null,
                'api_key_role' => $apiKeyRole !== null ? Str::limit($apiKeyRole, 20, '') : null,
                'ip_address' => $ipAddress !== null ? Str::limit($ipAddress, 45, '') : null,
                'message' => $message !== null ? Str::limit($this->redactSecrets($message), 1000) : null,
                'context' => count($sanitizedContext) > 0 ? $sanitizedContext : null,
                'created_at' => now(),
            ]);

            if ($forcePrune || random_int(1, 20) === 1) {
                $this->pruneForApp($appId);
            }

            return $entry;
        } catch (Throwable) {
            return null;
        }
    }

    /**
     * Enforce time-based and count-based retention for a single application.
     */
    public function pruneForApp(App|string $app, int $maxEntries = self::MAX_LOGS_PER_APP, int $retentionDays = self::RETENTION_DAYS): int
    {
        $appId = $app instanceof App ? $app->id : $app;
        $deleted = 0;

        if ($retentionDays > 0) {
            $deleted += AppLog::query()
                ->where('app_id', $appId)
                ->where('created_at', '<', now()->subDays($retentionDays))
                ->delete();
        }

        if ($maxEntries > 0) {
            /** @var int|null $thresholdId */
            $thresholdId = AppLog::query()
                ->where('app_id', $appId)
                ->orderByDesc('id')
                ->offset($maxEntries)
                ->limit(1)
                ->value('id');

            if ($thresholdId !== null) {
                $deleted += AppLog::query()
                    ->where('app_id', $appId)
                    ->where('id', '<=', $thresholdId)
                    ->delete();
            }
        }

        return $deleted;
    }

    /**
     * Redact Zenbase secret keys, bearer tokens, and raw secret values from free-form text.
     */
    public function redactSecrets(string $value): string
    {
        $patterns = [
            '/zb_sec_[A-Za-z0-9_\-]+/' => 'zb_sec_[REDACTED]',
            '/zb_token_[A-Za-z0-9_\-]+/' => 'zb_token_[REDACTED]',
            '/Bearer\s+[A-Za-z0-9\-._~+\/]+=*/i' => 'Bearer [REDACTED]',
        ];

        $result = $value;
        foreach ($patterns as $pattern => $replacement) {
            $replaced = preg_replace($pattern, $replacement, $result);
            if (is_string($replaced)) {
                $result = $replaced;
            }
        }

        return $result;
    }

    /**
     * Recursively strip sensitive keys and redact secret strings from context arrays.
     *
     * @param  array<string, mixed>  $context
     * @return array<string, mixed>
     */
    private function sanitizeContext(array $context, int $depth = 0): array
    {
        if ($depth > 3) {
            return [];
        }

        $sanitized = [];
        foreach ($context as $key => $value) {
            $normalizedKey = strtolower((string) $key);

            if (in_array($normalizedKey, self::SENSITIVE_KEYS, true)) {
                continue;
            }

            if (is_array($value)) {
                /** @var array<string, mixed> $nested */
                $nested = $value;
                $sanitized[$key] = $this->sanitizeContext($nested, $depth + 1);

                continue;
            }

            if (is_string($value)) {
                $sanitized[$key] = Str::limit($this->redactSecrets($value), 300);

                continue;
            }

            if (is_int($value) || is_float($value) || is_bool($value) || $value === null) {
                $sanitized[$key] = $value;
            }
        }

        return $sanitized;
    }
}
