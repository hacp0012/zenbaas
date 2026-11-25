<?php

namespace App\Actions\Fortify;

use App\Concerns\PasswordValidationRules;
use App\Concerns\ProfileValidationRules;
use App\Models\PlatformSetting;
use App\Models\User;
use Illuminate\Support\Facades\Validator;
use Laravel\Fortify\Contracts\CreatesNewUsers;

class CreateNewUser implements CreatesNewUsers
{
    use PasswordValidationRules, ProfileValidationRules;

    /**
     * Validate and create a newly registered user.
     *
     * @param  array<string, string>  $input
     */
    public function create(array $input): User
    {
        Validator::make($input, [
            ...$this->profileRules(),
            'password' => $this->passwordRules(),
        ])->validate();

        $isFirstUser = User::query()->count() === 0;
        $defaults = PlatformSetting::allSettings();
        $expiresAt = (! $isFirstUser && $defaults['default_user_expiration_days'] !== null)
            ? now()->addDays($defaults['default_user_expiration_days'])
            : null;

        return User::create([
            'name' => $input['name'],
            'email' => $input['email'],
            'password' => $input['password'],
            'is_admin' => $isFirstUser,
            'is_suspended' => false,
            'max_apps' => $defaults['default_user_max_apps'],
            'max_storage_mb' => $defaults['default_user_max_storage_mb'],
            'expires_at' => $expiresAt,
        ]);
    }
}
