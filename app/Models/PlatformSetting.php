<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Schema;
use Throwable;

/**
 * @property string $key
 * @property array<string, mixed>|null $value
 */
#[Fillable(['key', 'value'])]
class PlatformSetting extends Model
{
    public $incrementing = false;

    protected $primaryKey = 'key';

    protected $keyType = 'string';

    /**
     * Hardcoded fallback platform defaults used before settings are customized.
     *
     * @return array{
     *     default_user_expiration_days: int|null,
     *     default_user_max_storage_mb: int|null,
     *     default_user_max_apps: int,
     *     default_rate_limit_enabled: bool,
     *     default_rate_limit_key_by: 'app'|'ip',
     *     default_api_rate_limit: int,
     *     default_auth_rate_limit: int,
     *     default_functions_rate_limit: int,
     *     default_storage_rate_limit: int,
     *     default_mcp_rate_limit: int,
     *     default_function_mail_per_minute: int,
     *     default_function_mail_per_invocation: int,
     *     default_function_mail_max_recipients: int,
     *     default_function_http_per_invocation: int,
     *     default_function_http_timeout_seconds: int,
     *     global_max_storage_mb: int|null
     * }
     */
    public static function defaults(): array
    {
        return [
            'default_user_expiration_days' => null,
            'default_user_max_storage_mb' => 100,
            'default_user_max_apps' => 1,
            'default_rate_limit_enabled' => true,
            'default_rate_limit_key_by' => 'app',
            'default_api_rate_limit' => 120,
            'default_auth_rate_limit' => 30,
            'default_functions_rate_limit' => 60,
            'default_storage_rate_limit' => 60,
            'default_mcp_rate_limit' => 120,
            'default_function_mail_per_minute' => 30,
            'default_function_mail_per_invocation' => 5,
            'default_function_mail_max_recipients' => 10,
            'default_function_http_per_invocation' => 5,
            'default_function_http_timeout_seconds' => 3,
            'global_max_storage_mb' => null,
        ];
    }

    /**
     * Return all platform settings merged with defaults.
     *
     * @return array{
     *     default_user_expiration_days: int|null,
     *     default_user_max_storage_mb: int|null,
     *     default_user_max_apps: int,
     *     default_rate_limit_enabled: bool,
     *     default_rate_limit_key_by: 'app'|'ip',
     *     default_api_rate_limit: int,
     *     default_auth_rate_limit: int,
     *     default_functions_rate_limit: int,
     *     default_storage_rate_limit: int,
     *     default_mcp_rate_limit: int,
     *     default_function_mail_per_minute: int,
     *     default_function_mail_per_invocation: int,
     *     default_function_mail_max_recipients: int,
     *     default_function_http_per_invocation: int,
     *     default_function_http_timeout_seconds: int,
     *     global_max_storage_mb: int|null
     * }
     */
    public static function allSettings(): array
    {
        $defaults = self::defaults();

        try {
            if (! Schema::hasTable('platform_settings')) {
                return $defaults;
            }

            $record = self::query()->find('platform_defaults');
            $stored = is_array($record?->value) ? $record->value : [];

            $keyBy = ($stored['default_rate_limit_key_by'] ?? $defaults['default_rate_limit_key_by']) === 'ip'
                ? 'ip'
                : 'app';

            return [
                'default_user_expiration_days' => array_key_exists('default_user_expiration_days', $stored)
                    ? ($stored['default_user_expiration_days'] !== null ? max(1, (int) $stored['default_user_expiration_days']) : null)
                    : $defaults['default_user_expiration_days'],
                'default_user_max_storage_mb' => array_key_exists('default_user_max_storage_mb', $stored)
                    ? ($stored['default_user_max_storage_mb'] !== null ? max(1, (int) $stored['default_user_max_storage_mb']) : null)
                    : $defaults['default_user_max_storage_mb'],
                'default_user_max_apps' => max(1, min(1000, (int) ($stored['default_user_max_apps'] ?? $defaults['default_user_max_apps']))),
                'default_rate_limit_enabled' => array_key_exists('default_rate_limit_enabled', $stored)
                    ? (bool) $stored['default_rate_limit_enabled']
                    : $defaults['default_rate_limit_enabled'],
                'default_rate_limit_key_by' => $keyBy,
                'default_api_rate_limit' => max(10, min(10000, (int) ($stored['default_api_rate_limit'] ?? $defaults['default_api_rate_limit']))),
                'default_auth_rate_limit' => max(5, min(2000, (int) ($stored['default_auth_rate_limit'] ?? $defaults['default_auth_rate_limit']))),
                'default_functions_rate_limit' => max(5, min(5000, (int) ($stored['default_functions_rate_limit'] ?? $defaults['default_functions_rate_limit']))),
                'default_storage_rate_limit' => max(5, min(2000, (int) ($stored['default_storage_rate_limit'] ?? $defaults['default_storage_rate_limit']))),
                'default_mcp_rate_limit' => max(10, min(5000, (int) ($stored['default_mcp_rate_limit'] ?? $defaults['default_mcp_rate_limit']))),
                'default_function_mail_per_minute' => max(1, min(500, (int) ($stored['default_function_mail_per_minute'] ?? $defaults['default_function_mail_per_minute']))),
                'default_function_mail_per_invocation' => max(1, min(25, (int) ($stored['default_function_mail_per_invocation'] ?? $defaults['default_function_mail_per_invocation']))),
                'default_function_mail_max_recipients' => max(1, min(50, (int) ($stored['default_function_mail_max_recipients'] ?? $defaults['default_function_mail_max_recipients']))),
                'default_function_http_per_invocation' => max(1, min(25, (int) ($stored['default_function_http_per_invocation'] ?? $defaults['default_function_http_per_invocation']))),
                'default_function_http_timeout_seconds' => max(1, min(4, (int) ($stored['default_function_http_timeout_seconds'] ?? $defaults['default_function_http_timeout_seconds']))),
                'global_max_storage_mb' => array_key_exists('global_max_storage_mb', $stored)
                    ? ($stored['global_max_storage_mb'] !== null ? max(10, (int) $stored['global_max_storage_mb']) : null)
                    : $defaults['global_max_storage_mb'],
            ];
        } catch (Throwable) {
            return $defaults;
        }
    }

    /**
     * Merge and persist a subset of platform settings.
     *
     * @param  array<string, mixed>  $values
     * @return array{
     *     default_user_expiration_days: int|null,
     *     default_user_max_storage_mb: int|null,
     *     default_user_max_apps: int,
     *     default_rate_limit_enabled: bool,
     *     default_rate_limit_key_by: 'app'|'ip',
     *     default_api_rate_limit: int,
     *     default_auth_rate_limit: int,
     *     default_functions_rate_limit: int,
     *     default_storage_rate_limit: int,
     *     default_mcp_rate_limit: int,
     *     default_function_mail_per_minute: int,
     *     default_function_mail_per_invocation: int,
     *     default_function_mail_max_recipients: int,
     *     default_function_http_per_invocation: int,
     *     default_function_http_timeout_seconds: int,
     *     global_max_storage_mb: int|null
     * }
     */
    public static function saveSettings(array $values): array
    {
        $current = self::allSettings();
        $merged = [...$current, ...$values];

        self::query()->updateOrCreate(
            ['key' => 'platform_defaults'],
            ['value' => $merged],
        );

        return self::allSettings();
    }

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'value' => 'array',
        ];
    }
}
