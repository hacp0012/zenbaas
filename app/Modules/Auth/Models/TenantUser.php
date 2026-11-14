<?php

namespace App\Modules\Auth\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;

/**
 * @property string $id
 * @property string $email
 * @property string|null $password_hash
 * @property string $auth_method
 * @property bool $is_blocked
 * @property string|null $otp_code
 * @property Carbon|null $otp_expires_at
 * @property string|null $access_token
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
#[Fillable(['email', 'password_hash', 'auth_method', 'is_blocked', 'otp_code', 'otp_expires_at', 'access_token'])]
#[Hidden(['password_hash', 'otp_code', 'access_token'])]
class TenantUser extends Model
{
    use HasUuids;

    protected $connection = 'tenant';

    protected $table = 'auth_users';

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'is_blocked' => 'boolean',
            'otp_expires_at' => 'datetime',
        ];
    }
}
