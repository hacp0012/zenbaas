<?php

namespace App\Http\Controllers\Dashboard;

use App\Concerns\AuthorizesAppOwnership;
use App\Http\Controllers\Controller;
use App\Models\App;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class AppSettingsController extends Controller
{
    use AuthorizesAppOwnership;

    /**
     * Update the per-application Rate Limiting thresholds and scope.
     */
    public function updateRateLimits(Request $request, App $app): RedirectResponse
    {
        $this->ensureAppOwnership($request, $app);

        $validated = $request->validate([
            'enabled' => ['required', 'boolean'],
            'key_by' => ['required', 'string', 'in:app,ip'],
            'api_per_minute' => ['required', 'integer', 'min:10', 'max:10000'],
            'auth_per_minute' => ['required', 'integer', 'min:5', 'max:2000'],
            'functions_per_minute' => ['required', 'integer', 'min:5', 'max:5000'],
            'storage_per_minute' => ['required', 'integer', 'min:5', 'max:2000'],
            'mcp_per_minute' => ['required', 'integer', 'min:10', 'max:5000'],
            'function_mail_per_minute' => ['sometimes', 'integer', 'min:1', 'max:500'],
            'function_mail_per_invocation' => ['sometimes', 'integer', 'min:1', 'max:25'],
            'function_mail_max_recipients' => ['sometimes', 'integer', 'min:1', 'max:50'],
            'function_http_per_invocation' => ['sometimes', 'integer', 'min:1', 'max:25'],
            'function_http_timeout_seconds' => ['sometimes', 'integer', 'min:1', 'max:4'],
        ]);

        $current = $app->rateLimitSettings();

        $settings = is_array($app->settings) ? $app->settings : [];
        $settings['rate_limit'] = (int) $validated['api_per_minute'];
        $settings['rate_limits'] = [
            'enabled' => (bool) $validated['enabled'],
            'key_by' => $validated['key_by'] === 'ip' ? 'ip' : 'app',
            'api_per_minute' => (int) $validated['api_per_minute'],
            'auth_per_minute' => (int) $validated['auth_per_minute'],
            'functions_per_minute' => (int) $validated['functions_per_minute'],
            'storage_per_minute' => (int) $validated['storage_per_minute'],
            'mcp_per_minute' => (int) $validated['mcp_per_minute'],
            'function_mail_per_minute' => (int) ($validated['function_mail_per_minute'] ?? $current['function_mail_per_minute']),
            'function_mail_per_invocation' => (int) ($validated['function_mail_per_invocation'] ?? $current['function_mail_per_invocation']),
            'function_mail_max_recipients' => (int) ($validated['function_mail_max_recipients'] ?? $current['function_mail_max_recipients']),
            'function_http_per_invocation' => (int) ($validated['function_http_per_invocation'] ?? $current['function_http_per_invocation']),
            'function_http_timeout_seconds' => (int) ($validated['function_http_timeout_seconds'] ?? $current['function_http_timeout_seconds']),
        ];

        $app->update(['settings' => $settings]);

        $message = $settings['rate_limits']['enabled']
            ? "Limites de débit enregistrées ({$settings['rate_limits']['api_per_minute']} req/min sur l'API)."
            : 'Limitation de débit désactivée pour cette application.';

        return back()->with('success', $message);
    }

    /**
     * Update basic application metadata (name and description) from the Advanced settings page.
     */
    public function updateAdvanced(Request $request, App $app): RedirectResponse
    {
        $this->ensureAppOwnership($request, $app);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'description' => ['nullable', 'string', 'max:500'],
        ]);

        $app->update([
            'name' => trim($validated['name']),
            'description' => isset($validated['description']) && trim($validated['description']) !== ''
                ? trim($validated['description'])
                : null,
        ]);

        return back()->with('success', "Paramètres de l'application « {$app->name} » mis à jour.");
    }
}
