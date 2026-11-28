<?php

namespace App\Http\Middleware;

use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that's loaded on the first page visit.
     *
     * @see https://inertiajs.com/server-side-setup#root-template
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determines the current asset version.
     *
     * @see https://inertiajs.com/asset-versioning
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @see https://inertiajs.com/shared-data
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        $configuredName = (string) config('app.name', 'Zenbase');

        $user = $request->user();

        return [
            ...parent::share($request),
            'name' => $configuredName === 'Laravel' ? 'Zenbase' : $configuredName,
            'appUrl' => rtrim((string) config('app.url'), '/'),
            'auth' => [
                'user' => $user ? [
                    ...$user->toArray(),
                    'max_apps' => (int) ($user->max_apps ?? 1),
                    'max_storage_mb' => $user->max_storage_mb !== null ? (int) $user->max_storage_mb : null,
                    'used_storage_bytes' => $user->is_admin ? 0 : $user->usedStorageBytes(),
                    'expires_at' => $user->expires_at?->toIso8601String(),
                    'created_at' => $user->created_at?->toIso8601String(),
                    'apps_count' => $user->is_admin ? 0 : $user->apps()->count(),
                ] : null,
            ],
            'flash' => function () use ($request): array {
                $success = $request->session()->get('success');
                $error = $request->session()->get('error');
                $warning = $request->session()->get('warning');
                $info = $request->session()->get('info');
                $status = $request->session()->get('status');

                $hasToast = is_string($success) && $success !== ''
                    || is_string($error) && $error !== ''
                    || is_string($warning) && $warning !== ''
                    || is_string($info) && $info !== '';

                return [
                    'id' => $hasToast ? (string) Str::uuid() : null,
                    'success' => $success,
                    'error' => $error,
                    'warning' => $warning,
                    'info' => $info,
                    'status' => $status,
                    'functionResult' => $request->session()->get('functionResult'),
                ];
            },
            'sidebarOpen' => ! $request->hasCookie('sidebar_state') || $request->cookie('sidebar_state') === 'true',
        ];
    }
}
