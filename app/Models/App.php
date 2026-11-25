<?php

namespace App\Models;

use App\Modules\Functions\Models\AppFunction;
use Database\Factories\AppFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;

/**
 * @property string $id
 * @property int $user_id
 * @property string $name
 * @property string|null $description
 * @property string $public_key
 * @property string $secret_key
 * @property array<string, mixed>|null $database_config
 * @property array<string, mixed>|null $settings
 * @property int $api_calls_count
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
#[Fillable(['user_id', 'name', 'description', 'public_key', 'secret_key', 'database_config', 'settings', 'api_calls_count'])]
class App extends Model
{
    /** @use HasFactory<AppFactory> */
    use HasFactory, HasUuids;

    /**
     * Generate a new public API key (`zb_pub_...`).
     */
    public static function generatePublicKey(): string
    {
        return 'zb_pub_'.Str::random(36);
    }

    /**
     * Generate a new secret/service API key (`zb_sec_...`).
     */
    public static function generateSecretKey(): string
    {
        return 'zb_sec_'.Str::random(40);
    }

    /**
     * Bootstrap the model and its traits.
     */
    protected static function booted(): void
    {
        static::creating(function (App $app): void {
            if (empty($app->public_key)) {
                $app->public_key = self::generatePublicKey();
            }

            if (empty($app->secret_key)) {
                $app->secret_key = self::generateSecretKey();
            }
        });
    }

    /**
     * Get the owner of the application.
     *
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get the CORS origins allowed for the application.
     *
     * @return HasMany<AppCors, $this>
     */
    public function corsOrigins(): HasMany
    {
        return $this->hasMany(AppCors::class);
    }

    /**
     * Get the stored files belonging to the application.
     *
     * @return HasMany<AppFile, $this>
     */
    public function files(): HasMany
    {
        return $this->hasMany(AppFile::class);
    }

    /**
     * Get the serverless PHP functions belonging to the application.
     *
     * @return HasMany<AppFunction, $this>
     */
    public function functions(): HasMany
    {
        return $this->hasMany(AppFunction::class);
    }

    /**
     * Get the per-application activity logs.
     *
     * @return HasMany<AppLog, $this>
     */
    public function logs(): HasMany
    {
        return $this->hasMany(AppLog::class);
    }

    /**
     * Return the default MCP configuration for an application.
     *
     * @return array{
     *     enabled: bool,
     *     read_only: bool,
     *     allow_functions: bool,
     *     allow_auth_management: bool,
     *     allow_storage_write: bool
     * }
     */
    public static function defaultMcpSettings(): array
    {
        return [
            'enabled' => false,
            'read_only' => true,
            'allow_functions' => false,
            'allow_auth_management' => false,
            'allow_storage_write' => false,
        ];
    }

    /**
     * Return the normalized MCP configuration for this application.
     *
     * @return array{
     *     enabled: bool,
     *     read_only: bool,
     *     allow_functions: bool,
     *     allow_auth_management: bool,
     *     allow_storage_write: bool
     * }
     */
    public function mcpSettings(): array
    {
        $defaults = self::defaultMcpSettings();
        $mcp = is_array($this->settings['mcp'] ?? null) ? $this->settings['mcp'] : [];

        $readOnly = array_key_exists('read_only', $mcp)
            ? (bool) $mcp['read_only']
            : $defaults['read_only'];

        return [
            'enabled' => (bool) ($mcp['enabled'] ?? $defaults['enabled']),
            'read_only' => $readOnly,
            'allow_functions' => ! $readOnly && (bool) ($mcp['allow_functions'] ?? $defaults['allow_functions']),
            'allow_auth_management' => ! $readOnly && (bool) ($mcp['allow_auth_management'] ?? $defaults['allow_auth_management']),
            'allow_storage_write' => ! $readOnly && (bool) ($mcp['allow_storage_write'] ?? $defaults['allow_storage_write']),
        ];
    }

    /**
     * Return the default rate limiting configuration for an application.
     *
     * @return array{
     *     enabled: bool,
     *     key_by: 'app'|'ip',
     *     api_per_minute: int,
     *     auth_per_minute: int,
     *     functions_per_minute: int,
     *     storage_per_minute: int,
     *     mcp_per_minute: int
     * }
     */
    public static function defaultRateLimitSettings(): array
    {
        $platform = PlatformSetting::allSettings();

        return [
            'enabled' => $platform['default_rate_limit_enabled'],
            'key_by' => $platform['default_rate_limit_key_by'],
            'api_per_minute' => $platform['default_api_rate_limit'],
            'auth_per_minute' => $platform['default_auth_rate_limit'],
            'functions_per_minute' => $platform['default_functions_rate_limit'],
            'storage_per_minute' => $platform['default_storage_rate_limit'],
            'mcp_per_minute' => $platform['default_mcp_rate_limit'],
        ];
    }

    /**
     * Return the normalized rate limiting configuration for this application.
     *
     * @return array{
     *     enabled: bool,
     *     key_by: 'app'|'ip',
     *     api_per_minute: int,
     *     auth_per_minute: int,
     *     functions_per_minute: int,
     *     storage_per_minute: int,
     *     mcp_per_minute: int
     * }
     */
    public function rateLimitSettings(): array
    {
        $defaults = self::defaultRateLimitSettings();
        $configured = is_array($this->settings['rate_limits'] ?? null)
            ? $this->settings['rate_limits']
            : [];

        $legacyApiLimit = isset($this->settings['rate_limit'])
            ? (int) $this->settings['rate_limit']
            : $defaults['api_per_minute'];

        $keyBy = ($configured['key_by'] ?? $defaults['key_by']) === 'ip' ? 'ip' : 'app';

        return [
            'enabled' => array_key_exists('enabled', $configured)
                ? (bool) $configured['enabled']
                : $defaults['enabled'],
            'key_by' => $keyBy,
            'api_per_minute' => max(10, min(10000, (int) ($configured['api_per_minute'] ?? $legacyApiLimit))),
            'auth_per_minute' => max(5, min(2000, (int) ($configured['auth_per_minute'] ?? $defaults['auth_per_minute']))),
            'functions_per_minute' => max(5, min(5000, (int) ($configured['functions_per_minute'] ?? $defaults['functions_per_minute']))),
            'storage_per_minute' => max(5, min(2000, (int) ($configured['storage_per_minute'] ?? $defaults['storage_per_minute']))),
            'mcp_per_minute' => max(10, min(5000, (int) ($configured['mcp_per_minute'] ?? $legacyApiLimit))),
        ];
    }

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'database_config' => 'array',
            'settings' => 'array',
            'api_calls_count' => 'integer',
        ];
    }
}
