<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property string $app_id
 * @property string $source
 * @property string $level
 * @property string $action
 * @property string|null $method
 * @property string|null $path
 * @property int|null $status_code
 * @property int|null $duration_ms
 * @property string|null $api_key_role
 * @property string|null $ip_address
 * @property string|null $message
 * @property array<string, mixed>|null $context
 * @property Carbon|null $created_at
 */
#[Fillable([
    'app_id',
    'source',
    'level',
    'action',
    'method',
    'path',
    'status_code',
    'duration_ms',
    'api_key_role',
    'ip_address',
    'message',
    'context',
    'created_at',
])]
class AppLog extends Model
{
    public const UPDATED_AT = null;

    public const SOURCE_API = 'api';

    public const SOURCE_AUTH = 'auth';

    public const SOURCE_FUNCTIONS = 'functions';

    public const SOURCE_MCP = 'mcp';

    public const SOURCE_STORAGE = 'storage';

    public const LEVEL_INFO = 'info';

    public const LEVEL_WARNING = 'warning';

    public const LEVEL_ERROR = 'error';

    /**
     * All supported per-application log sources.
     *
     * @var array<int, string>
     */
    public const SOURCES = [
        self::SOURCE_API,
        self::SOURCE_AUTH,
        self::SOURCE_FUNCTIONS,
        self::SOURCE_MCP,
        self::SOURCE_STORAGE,
    ];

    /**
     * All supported log levels.
     *
     * @var array<int, string>
     */
    public const LEVELS = [
        self::LEVEL_INFO,
        self::LEVEL_WARNING,
        self::LEVEL_ERROR,
    ];

    /**
     * Get the application that owns this log entry.
     *
     * @return BelongsTo<App, $this>
     */
    public function app(): BelongsTo
    {
        return $this->belongsTo(App::class);
    }

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'status_code' => 'integer',
            'duration_ms' => 'integer',
            'context' => 'array',
            'created_at' => 'datetime',
        ];
    }
}
