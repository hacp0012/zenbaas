<?php

namespace App\Modules\Auth\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\App;
use App\Modules\Auth\Actions\AuthManager;
use App\Modules\Auth\Models\TenantUser;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use RuntimeException;

class AuthApiController extends Controller
{
    public function __construct(public AuthManager $authManager) {}

    /**
     * Register a new user in the application's isolated SQLite database.
     */
    public function signUp(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'email' => ['required', 'email', 'max:255'],
            'password' => ['required', 'string', 'min:6', 'max:255'],
        ]);

        try {
            $result = $this->authManager->signUp($validated['email'], $validated['password']);

            return response()->json([
                'data' => [
                    'user' => $result['user'],
                    'token' => $result['token'],
                ],
                'error' => null,
            ], 201);
        } catch (RuntimeException $e) {
            return response()->json([
                'data' => null,
                'error' => $e->getMessage(),
            ], 422);
        }
    }

    /**
     * Authenticate an existing user with email and password.
     */
    public function signIn(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'email' => ['required', 'email', 'max:255'],
            'password' => ['required', 'string'],
        ]);

        try {
            $result = $this->authManager->signInWithPassword($validated['email'], $validated['password']);

            return response()->json([
                'data' => [
                    'user' => $result['user'],
                    'token' => $result['token'],
                ],
                'error' => null,
            ]);
        } catch (RuntimeException $e) {
            return response()->json([
                'data' => null,
                'error' => $e->getMessage(),
            ], 401);
        }
    }

    /**
     * Send a 6-digit OTP code to the user's email address.
     */
    public function sendOtp(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'email' => ['required', 'email', 'max:255'],
        ]);

        /** @var App|null $app */
        $app = $request->attributes->get('current_app');

        try {
            $result = $this->authManager->sendOtp($validated['email'], $app?->name ?? 'Zenbase');

            return response()->json([
                'data' => $result,
                'error' => null,
            ]);
        } catch (RuntimeException $e) {
            return response()->json([
                'data' => null,
                'error' => $e->getMessage(),
            ], 422);
        }
    }

    /**
     * Verify a 6-digit OTP code and return a session token.
     */
    public function verifyOtp(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'email' => ['required', 'email', 'max:255'],
            'code' => ['required', 'string', 'size:6'],
        ]);

        try {
            $result = $this->authManager->verifyOtp($validated['email'], $validated['code']);

            return response()->json([
                'data' => [
                    'user' => $result['user'],
                    'token' => $result['token'],
                ],
                'error' => null,
            ]);
        } catch (RuntimeException $e) {
            return response()->json([
                'data' => null,
                'error' => $e->getMessage(),
            ], 401);
        }
    }

    /**
     * Return the currently authenticated tenant user.
     */
    public function me(Request $request): JsonResponse
    {
        /** @var TenantUser|null $tenantUser */
        $tenantUser = $request->attributes->get('current_tenant_user');

        if (! $tenantUser) {
            return response()->json([
                'data' => null,
                'error' => 'Utilisateur non authentifié.',
            ], 401);
        }

        return response()->json([
            'data' => ['user' => $tenantUser],
            'error' => null,
        ]);
    }

    /**
     * Update the currently authenticated tenant user's password.
     */
    public function updatePassword(Request $request): JsonResponse
    {
        /** @var TenantUser|null $tenantUser */
        $tenantUser = $request->attributes->get('current_tenant_user');

        if (! $tenantUser) {
            return response()->json([
                'data' => null,
                'error' => 'Utilisateur non authentifié.',
            ], 401);
        }

        $validated = $request->validate([
            'current_password' => ['nullable', 'string'],
            'new_password' => ['required', 'string', 'min:6', 'max:255'],
        ]);

        try {
            $updatedUser = $this->authManager->updatePassword(
                $tenantUser,
                $validated['current_password'] ?? null,
                $validated['new_password'],
            );

            return response()->json([
                'data' => [
                    'updated' => true,
                    'user' => $updatedUser,
                ],
                'error' => null,
            ]);
        } catch (RuntimeException $e) {
            return response()->json([
                'data' => null,
                'error' => $e->getMessage(),
            ], 422);
        }
    }

    /**
     * Sign out the currently authenticated tenant user.
     */
    public function signOut(Request $request): JsonResponse
    {
        /** @var TenantUser|null $tenantUser */
        $tenantUser = $request->attributes->get('current_tenant_user');

        if (! $tenantUser) {
            return response()->json([
                'data' => null,
                'error' => 'Utilisateur non authentifié.',
            ], 401);
        }

        $this->authManager->signOut($tenantUser);

        return response()->json([
            'data' => ['signed_out' => true],
            'error' => null,
        ]);
    }
}
