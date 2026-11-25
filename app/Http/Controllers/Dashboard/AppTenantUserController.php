<?php

namespace App\Http\Controllers\Dashboard;

use App\Concerns\AuthorizesAppOwnership;
use App\Http\Controllers\Controller;
use App\Models\App;
use App\Modules\Auth\Actions\AuthManager;
use App\Modules\Auth\Models\TenantUser;
use App\Services\TenantManagerService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use RuntimeException;

class AppTenantUserController extends Controller
{
    use AuthorizesAppOwnership;

    public function __construct(
        public TenantManagerService $tenantManager,
        public AuthManager $authManager,
    ) {}

    /**
     * Manually create an application user inside the tenant SQLite database.
     */
    public function store(Request $request, App $app): RedirectResponse
    {
        $this->ensureAppOwnership($request, $app);

        $validated = $request->validate([
            'name' => ['nullable', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255'],
            'password' => ['required', 'string', 'min:6', 'max:255'],
        ]);

        $this->tenantManager->connect($app);

        try {
            $this->authManager->signUp(
                $validated['email'],
                $validated['password'],
                $validated['name'] ?? null,
            );

            return back()->with('success', 'Utilisateur ajouté dans la base de l\'application.');
        } catch (RuntimeException $e) {
            return back()->withErrors(['email' => $e->getMessage()]);
        }
    }

    /**
     * Update an application user's profile information (name and email).
     */
    public function update(Request $request, App $app, string $tenantUserId): RedirectResponse
    {
        $this->ensureAppOwnership($request, $app);

        $validated = $request->validate([
            'name' => ['nullable', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255'],
        ]);

        $this->tenantManager->connect($app);

        $tenantUser = TenantUser::query()->findOrFail($tenantUserId);
        $normalizedEmail = mb_strtolower(trim($validated['email']));
        $normalizedName = isset($validated['name']) && trim($validated['name']) !== ''
            ? trim($validated['name'])
            : null;

        $emailExists = TenantUser::query()
            ->where('email', $normalizedEmail)
            ->where('id', '!=', $tenantUser->id)
            ->exists();

        if ($emailExists) {
            return back()->withErrors([
                'email' => 'Un utilisateur avec cette adresse e-mail existe déjà dans cette application.',
            ]);
        }

        $tenantUser->update([
            'name' => $normalizedName,
            'email' => $normalizedEmail,
        ]);

        $label = $tenantUser->name ?? $tenantUser->email;

        return back()->with('success', "Profil de « {$label} » mis à jour avec succès.");
    }

    /**
     * Block or unblock an application user.
     */
    public function toggleBlock(Request $request, App $app, string $tenantUserId): RedirectResponse
    {
        $this->ensureAppOwnership($request, $app);

        $this->tenantManager->connect($app);

        $tenantUser = TenantUser::query()->findOrFail($tenantUserId);

        $tenantUser->update([
            'is_blocked' => ! $tenantUser->is_blocked,
            'access_token' => $tenantUser->is_blocked ? $tenantUser->access_token : null,
        ]);

        return back()->with(
            'success',
            $tenantUser->is_blocked
                ? "L'utilisateur {$tenantUser->email} a été bloqué."
                : "L'utilisateur {$tenantUser->email} a été débloqué."
        );
    }

    /**
     * Reset an application user's password manually.
     */
    public function resetPassword(Request $request, App $app, string $tenantUserId): RedirectResponse
    {
        $this->ensureAppOwnership($request, $app);

        $validated = $request->validate([
            'password' => ['required', 'string', 'min:6', 'max:255'],
        ]);

        $this->tenantManager->connect($app);

        $tenantUser = TenantUser::query()->findOrFail($tenantUserId);

        $tenantUser->update([
            'password_hash' => Hash::make($validated['password']),
            'access_token' => null,
        ]);

        return back()->with('success', "Mot de passe réinitialisé pour {$tenantUser->email}.");
    }

    /**
     * Delete an application user from the tenant SQLite database.
     */
    public function destroy(Request $request, App $app, string $tenantUserId): RedirectResponse
    {
        $this->ensureAppOwnership($request, $app);

        $this->tenantManager->connect($app);

        $tenantUser = TenantUser::query()->findOrFail($tenantUserId);
        $tenantUser->delete();

        return back()->with('success', 'Utilisateur supprimé de l\'application.');
    }
}
