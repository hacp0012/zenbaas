<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Modules\Storage\Services\StorageManagerService;
use App\Services\TenantManagerService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class AdminUserController extends Controller
{
    public function __construct(
        public TenantManagerService $tenantManager,
        public StorageManagerService $storageManager,
    ) {}

    /**
     * Display the list of registered clients/developers on Zenbase.
     */
    public function index(): Response
    {
        $users = User::query()
            ->withCount('apps')
            ->withSum('apps', 'api_calls_count')
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->get()
            ->map(fn (User $user): array => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'is_admin' => $user->is_admin,
                'is_suspended' => $user->isSuspendedOrExpired(),
                'is_expired' => $user->isExpired(),
                'max_apps' => (int) ($user->max_apps ?? 1),
                'expires_at' => $user->expires_at?->toIso8601String(),
                'apps_count' => $user->apps_count,
                'total_api_calls' => (int) ($user->apps_sum_api_calls_count ?? 0),
                'created_at' => $user->created_at?->toIso8601String(),
            ]);

        return Inertia::render('admin/users/index', [
            'users' => $users,
        ]);
    }

    /**
     * Manually create a new client/developer account.
     */
    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255', Rule::unique('users', 'email')],
            'password' => ['required', 'string', 'min:8', 'max:255'],
            'is_admin' => ['sometimes', 'boolean'],
            'max_apps' => ['nullable', 'integer', 'min:1', 'max:1000'],
            'expires_at' => ['nullable', 'date'],
        ]);

        User::query()->create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => $validated['password'],
            'is_admin' => (bool) ($validated['is_admin'] ?? false),
            'is_suspended' => false,
            'max_apps' => (int) ($validated['max_apps'] ?? 1),
            'expires_at' => ! empty($validated['expires_at']) ? $validated['expires_at'] : null,
            'email_verified_at' => now(),
        ]);

        return back()->with('success', 'Compte client créé avec succès.');
    }

    /**
     * Update a client's application quota (`max_apps`) and account expiration date (`expires_at`).
     */
    public function updateQuota(Request $request, User $user): RedirectResponse
    {
        $validated = $request->validate([
            'max_apps' => ['required', 'integer', 'min:1', 'max:1000'],
            'expires_at' => ['nullable', 'date'],
        ]);

        $wasExpired = $user->isExpired();
        $user->max_apps = (int) $validated['max_apps'];
        $user->expires_at = ! empty($validated['expires_at']) ? $validated['expires_at'] : null;

        if ($user->isExpired()) {
            $user->is_suspended = true;
        } elseif ($wasExpired && ! $user->isExpired()) {
            $user->is_suspended = false;
        }

        $user->save();

        return back()->with('success', "Quotas et date d'expiration de « {$user->name} » enregistrés.");
    }

    /**
     * Suspend or reactivate a client account.
     */
    public function toggleStatus(Request $request, User $user): RedirectResponse
    {
        if ($request->user()?->id === $user->id) {
            return back()->with('error', 'Vous ne pouvez pas suspendre votre propre compte administrateur.');
        }

        $currentlySuspended = $user->isSuspendedOrExpired();
        $newSuspendedState = ! $currentlySuspended;

        $updates = [
            'is_suspended' => $newSuspendedState,
        ];

        if (! $newSuspendedState && $user->isExpired()) {
            $updates['expires_at'] = null;
        }

        $user->update($updates);

        $message = $user->is_suspended
            ? "Le compte de {$user->name} a été suspendu."
            : "Le compte de {$user->name} a été réactivé.";

        return back()->with('success', $message);
    }

    /**
     * Delete a client account and clean up all their isolated resources.
     */
    public function destroy(Request $request, User $user): RedirectResponse
    {
        if ($request->user()?->id === $user->id) {
            return back()->with('error', 'Vous ne pouvez pas supprimer votre propre compte administrateur.');
        }

        foreach ($user->apps as $app) {
            $this->tenantManager->deleteDatabase($app);
            $this->storageManager->deleteAllForApp($app);
        }

        $user->delete();

        return back()->with('success', 'Compte client et applications associées supprimés.');
    }
}
