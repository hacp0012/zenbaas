<?php

namespace App\Http\Controllers\Dashboard;

use App\Concerns\AuthorizesAppOwnership;
use App\Http\Controllers\Controller;
use App\Models\App;
use App\Models\AppCors;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class AppCorsController extends Controller
{
    use AuthorizesAppOwnership;

    /**
     * Add an allowed CORS origin to the application.
     */
    public function store(Request $request, App $app): RedirectResponse
    {
        $this->ensureAppOwnership($request, $app);

        $validated = $request->validate([
            'origin' => [
                'required',
                'string',
                'max:255',
                function (string $attribute, mixed $value, \Closure $fail): void {
                    $trimmed = trim((string) $value);
                    if ($trimmed !== '*' && ! filter_var($trimmed, FILTER_VALIDATE_URL)) {
                        $fail('L\'origine doit être une URL valide (ex: https://mon-site.com) ou *.');
                    }
                },
            ],
        ]);

        $origin = rtrim(trim($validated['origin']), '/');
        if ($origin === '') {
            $origin = '*';
        }

        $app->corsOrigins()->firstOrCreate([
            'origin' => $origin,
        ]);

        return back()->with('success', "Origine CORS « {$origin} » ajoutée.");
    }

    /**
     * Remove an allowed CORS origin from the application.
     */
    public function destroy(Request $request, App $app, AppCors $cors): RedirectResponse
    {
        $this->ensureAppOwnership($request, $app);

        if ($cors->app_id !== $app->id) {
            abort(404);
        }

        $cors->delete();

        return back()->with('success', 'Origine CORS supprimée.');
    }
}
