<?php

namespace App\Models;

use Database\Factories\UserFactory;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Carbon;
use Laravel\Fortify\Contracts\PasskeyUser;
use Laravel\Fortify\PasskeyAuthenticatable;
use Laravel\Fortify\TwoFactorAuthenticatable;

/**
 * @property int $id
 * @property string $name
 * @property string $email
 * @property Carbon|null $email_verified_at
 * @property string $password
 * @property bool $is_admin
 * @property bool $is_suspended
 * @property int $max_apps
 * @property int|null $max_storage_mb
 * @property Carbon|null $expires_at
 * @property string|null $two_factor_secret
 * @property string|null $two_factor_recovery_codes
 * @property Carbon|null $two_factor_confirmed_at
 * @property string|null $remember_token
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
#[Fillable(['name', 'email', 'password', 'is_admin', 'is_suspended', 'max_apps', 'max_storage_mb', 'expires_at'])]
#[Hidden(['password', 'two_factor_secret', 'two_factor_recovery_codes', 'remember_token'])]
class User extends Authenticatable implements MustVerifyEmail, PasskeyUser
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, Notifiable, PasskeyAuthenticatable, TwoFactorAuthenticatable;

    /**
     * Get the applications owned by the user.
     *
     * @return HasMany<App, $this>
     */
    public function apps(): HasMany
    {
        return $this->hasMany(App::class);
    }

    /**
     * Determine whether the user's account expiration date has passed.
     */
    public function isExpired(): bool
    {
        return $this->expires_at !== null && $this->expires_at->isPast();
    }

    /**
     * Determine whether the user is suspended manually or due to expiration.
     */
    public function isSuspendedOrExpired(): bool
    {
        return (bool) $this->is_suspended || $this->isExpired();
    }

    /**
     * Return the user's maximum allowed storage quota in bytes, or null when unlimited.
     */
    public function maxStorageBytes(): ?int
    {
        if ($this->max_storage_mb === null) {
            return null;
        }

        return max(1, (int) $this->max_storage_mb) * 1024 * 1024;
    }

    /**
     * Calculate the total file storage currently consumed across all applications owned by the user.
     */
    public function usedStorageBytes(): int
    {
        return (int) AppFile::query()
            ->whereIn('app_id', $this->apps()->select('id'))
            ->sum('size');
    }

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'is_admin' => 'boolean',
            'is_suspended' => 'boolean',
            'max_apps' => 'integer',
            'max_storage_mb' => 'integer',
            'expires_at' => 'datetime',
            'two_factor_confirmed_at' => 'datetime',
        ];
    }
}
