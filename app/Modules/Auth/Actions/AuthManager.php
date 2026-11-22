<?php

namespace App\Modules\Auth\Actions;

use App\Mail\TenantOtpMail;
use App\Modules\Auth\Models\TenantUser;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use RuntimeException;

class AuthManager
{
    public function __construct(public TokenGenerator $tokenGenerator) {}

    /**
     * Register a new tenant user with email and password.
     *
     * @return array{user: TenantUser, token: string}
     */
    public function signUp(string $email, string $password): array
    {
        $normalizedEmail = mb_strtolower(trim($email));

        $existing = TenantUser::query()->where('email', $normalizedEmail)->first();

        if ($existing) {
            throw new RuntimeException('Un utilisateur avec cette adresse e-mail existe déjà.');
        }

        $token = $this->tokenGenerator->generate();

        $user = TenantUser::query()->create([
            'email' => $normalizedEmail,
            'password_hash' => Hash::make($password),
            'auth_method' => 'password',
            'is_blocked' => false,
            'access_token' => $token,
        ]);

        return [
            'user' => $user,
            'token' => $token,
        ];
    }

    /**
     * Authenticate a tenant user with email and password.
     *
     * @return array{user: TenantUser, token: string}
     */
    public function signInWithPassword(string $email, string $password): array
    {
        $normalizedEmail = mb_strtolower(trim($email));

        $user = TenantUser::query()->where('email', $normalizedEmail)->first();

        if (! $user || ! $user->password_hash || ! Hash::check($password, $user->password_hash)) {
            throw new RuntimeException('Identifiants invalides.');
        }

        if ($user->is_blocked) {
            throw new RuntimeException('Ce compte utilisateur est suspendu.');
        }

        $token = $this->tokenGenerator->generate();
        $user->update(['access_token' => $token]);

        return [
            'user' => $user,
            'token' => $token,
        ];
    }

    /**
     * Generate a 6-digit OTP code and send it via email.
     *
     * @return array{email: string, expires_at: string}
     */
    public function sendOtp(string $email, string $appName = 'Zenbase'): array
    {
        $normalizedEmail = mb_strtolower(trim($email));

        $user = TenantUser::query()->firstOrCreate(
            ['email' => $normalizedEmail],
            [
                'auth_method' => 'otp',
                'is_blocked' => false,
            ]
        );

        if ($user->is_blocked) {
            throw new RuntimeException('Ce compte utilisateur est suspendu.');
        }

        $otpCode = str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);
        $expiresAt = now()->addMinutes(10);

        $user->update([
            'otp_code' => $otpCode,
            'otp_expires_at' => $expiresAt,
        ]);

        Mail::to($normalizedEmail)->send(new TenantOtpMail($otpCode, $appName));

        return [
            'email' => $normalizedEmail,
            'expires_at' => $expiresAt->toIso8601String(),
        ];
    }

    /**
     * Validate a 6-digit OTP code, consume it, and return an access token.
     *
     * @return array{user: TenantUser, token: string}
     */
    public function verifyOtp(string $email, string $code): array
    {
        $normalizedEmail = mb_strtolower(trim($email));

        $user = TenantUser::query()->where('email', $normalizedEmail)->first();

        if (! $user || ! $user->otp_code || $user->otp_code !== trim($code)) {
            throw new RuntimeException('Code OTP invalide.');
        }

        if (! $user->otp_expires_at || $user->otp_expires_at->isPast()) {
            throw new RuntimeException('Le code OTP a expiré.');
        }

        if ($user->is_blocked) {
            throw new RuntimeException('Ce compte utilisateur est suspendu.');
        }

        $token = $this->tokenGenerator->generate();

        $user->update([
            'otp_code' => null,
            'otp_expires_at' => null,
            'access_token' => $token,
        ]);

        return [
            'user' => $user,
            'token' => $token,
        ];
    }

    /**
     * Resolve a tenant user from a Bearer token.
     */
    public function resolveUserFromToken(?string $token): ?TenantUser
    {
        if (! $token || trim($token) === '') {
            return null;
        }

        $user = TenantUser::query()->where('access_token', trim($token))->first();

        if (! $user || $user->is_blocked) {
            return null;
        }

        return $user;
    }

    /**
     * Update an authenticated tenant user's password after verifying the current password when set.
     */
    public function updatePassword(TenantUser $user, ?string $currentPassword, string $newPassword): TenantUser
    {
        if ($user->password_hash !== null && $user->password_hash !== '') {
            if (! $currentPassword || ! Hash::check($currentPassword, $user->password_hash)) {
                throw new RuntimeException('Le mot de passe actuel est incorrect.');
            }
        }

        $user->update([
            'password_hash' => Hash::make($newPassword),
        ]);

        return $user->fresh() ?? $user;
    }

    /**
     * Revoke the current user's access token.
     */
    public function signOut(TenantUser $user): void
    {
        $user->update(['access_token' => null]);
    }
}
