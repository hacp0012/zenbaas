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
