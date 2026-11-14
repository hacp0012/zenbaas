<?php

namespace App\Http\Controllers\Dashboard;

use App\Concerns\AuthorizesAppOwnership;
use App\Http\Controllers\Controller;
use App\Models\App;
use App\Modules\Functions\Models\AppFunction;
use App\Modules\Functions\Services\FunctionRunnerService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use InvalidArgumentException;
use Symfony\Component\HttpFoundation\Response as SymfonyResponse;

class AppFunctionController extends Controller
{
    use AuthorizesAppOwnership;

    public function __construct(public FunctionRunnerService $runner) {}

    /**
     * Create a new serverless PHP Web Function for the application.
     */
    public function store(Request $request, App $app): RedirectResponse
    {
        $this->ensureAppOwnership($request, $app);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:64', 'regex:/^[a-zA-Z0-9_-]+$/'],
            'description' => ['nullable', 'string', 'max:255'],
            'code' => ['required', 'string'],
            'env_variables' => ['nullable', 'array'],
            'redirect_to_editor' => ['nullable', 'boolean'],
        ]);

        try {
            $this->runner->validateCode($validated['code']);
        } catch (InvalidArgumentException $e) {
            return back()->withErrors(['code' => $e->getMessage()]);
        }

        if ($app->functions()->where('name', $validated['name'])->exists()) {
            return back()->withErrors(['name' => 'Une fonction portant ce nom existe déjà dans cette application.']);
        }

        $function = $app->functions()->create([
            'name' => $validated['name'],
            'description' => $validated['description'] ?? null,
            'code' => $validated['code'],
            'env_variables' => $validated['env_variables'] ?? [],
            'logs' => [],
            'is_active' => true,
        ]);

        if ($request->boolean('redirect_to_editor')) {
            return redirect()
                ->route('dashboard.apps.functions.editor', ['app' => $app->id, 'function' => $function->id])
                ->with('success', "Fonction PHP « {$function->name} » créée et ouverte dans l'éditeur.");
        }

        return back()->with('success', "Fonction PHP « {$validated['name']} » créée.");
    }

    /**
     * Update an existing serverless PHP Web Function.
     */
    public function update(Request $request, App $app, AppFunction $function): RedirectResponse
    {
        $this->ensureAppOwnership($request, $app);

        if ($function->app_id !== $app->id) {
            abort(404);
        }

        $validated = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:64', 'regex:/^[a-zA-Z0-9_-]+$/'],
            'description' => ['nullable', 'string', 'max:255'],
            'code' => ['required', 'string'],
            'env_variables' => ['nullable', 'array'],
            'is_active' => ['sometimes', 'boolean'],
        ]);

        if (isset($validated['name']) && $validated['name'] !== $function->name) {
            if ($app->functions()->where('name', $validated['name'])->where('id', '!=', $function->id)->exists()) {
                return back()->withErrors(['name' => 'Une autre fonction porte déjà ce nom.']);
            }
        }

        try {
            $this->runner->validateCode($validated['code']);
        } catch (InvalidArgumentException $e) {
            return back()->withErrors(['code' => $e->getMessage()]);
        }

        $function->update([
            'name' => $validated['name'] ?? $function->name,
            'description' => array_key_exists('description', $validated) ? $validated['description'] : $function->description,
            'code' => $validated['code'],
            'env_variables' => $validated['env_variables'] ?? $function->env_variables,
            'is_active' => $validated['is_active'] ?? $function->is_active,
        ]);

        return back()->with('success', "Fonction « {$function->name} » enregistrée.");
    }

    /**
     * Upload a `.php` file to create or update a serverless PHP Web Function.
     */
    public function upload(Request $request, App $app): RedirectResponse
    {
        $this->ensureAppOwnership($request, $app);

        $validated = $request->validate([
            'file' => ['required', 'file', 'max:1024'],
            'name' => ['nullable', 'string', 'max:64', 'regex:/^[a-zA-Z0-9_-]+$/'],
            'description' => ['nullable', 'string', 'max:255'],
            'function_id' => ['nullable', 'string'],
        ]);

        $uploadedFile = $request->file('file');
        $rawContent = (string) file_get_contents($uploadedFile->getRealPath());
        $cleanCode = preg_replace('/^\s*<\?php\s*/i', '', trim($rawContent)) ?? trim($rawContent);

        try {
            $this->runner->validateCode($cleanCode);
        } catch (InvalidArgumentException $e) {
            return back()
                ->withErrors(['file' => $e->getMessage()])
                ->with('error', "Fichier PHP refusé par le sandbox : {$e->getMessage()}");
        }

        if (! empty($validated['function_id'])) {
            $targetFn = $app->functions()->where('id', $validated['function_id'])->firstOrFail();
            $targetFn->update([
                'code' => $cleanCode,
                'description' => $validated['description'] ?? $targetFn->description,
            ]);

            return redirect()
                ->route('dashboard.apps.functions.editor', ['app' => $app->id, 'function' => $targetFn->id])
                ->with('success', "Le fichier « {$uploadedFile->getClientOriginalName()} » a été chargé dans la fonction « {$targetFn->name} ».");
        }

        $baseName = $validated['name'] ?? null;
        if (! $baseName) {
            $originalFilename = pathinfo($uploadedFile->getClientOriginalName(), PATHINFO_FILENAME);
            $baseName = Str::slug($originalFilename) ?: 'web-function-'.Str::lower(Str::random(4));
        }

        $existing = $app->functions()->where('name', $baseName)->first();
        if ($existing) {
            $existing->update([
                'code' => $cleanCode,
                'description' => $validated['description'] ?? $existing->description,
            ]);

            return redirect()
                ->route('dashboard.apps.functions.editor', ['app' => $app->id, 'function' => $existing->id])
                ->with('success', "La fonction existante « {$existing->name} » a été mise à jour depuis le fichier PHP importé.");
        }

        $created = $app->functions()->create([
            'name' => $baseName,
            'description' => $validated['description'] ?? "Importée depuis {$uploadedFile->getClientOriginalName()}",
            'code' => $cleanCode,
            'env_variables' => [],
            'logs' => [],
            'is_active' => true,
        ]);

        return redirect()
            ->route('dashboard.apps.functions.editor', ['app' => $app->id, 'function' => $created->id])
            ->with('success', "Fonction PHP « {$created->name} » créée à partir du fichier téléversé.");
    }

    /**
     * Download a serverless PHP Web Function as a standalone `.php` file.
     */
    public function download(Request $request, App $app, AppFunction $function): SymfonyResponse
    {
        $this->ensureAppOwnership($request, $app);

        if ($function->app_id !== $app->id) {
            abort(404);
        }

        $code = trim($function->code);
        if (! str_starts_with($code, '<?php')) {
            $header = "<?php\n/**\n * Zenbase Serverless Web Function : {$function->name}\n * Application : {$app->name} ({$app->id})\n */\n\n";
            $code = $header.$code."\n";
        }

        $filename = "{$function->name}.php";

        return response($code, 200, [
            'Content-Type' => 'application/x-httpd-php; charset=UTF-8',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
        ]);
    }

    /**
     * Update global and/or function-specific environment variables from the dedicated Environment Variables sub-page.
     */
    public function updateEnvVariables(Request $request, App $app): RedirectResponse
    {
        $this->ensureAppOwnership($request, $app);

        $validated = $request->validate([
            'scope' => ['required', 'string', 'in:global,function'],
            'function_id' => ['nullable', 'string'],
            'env_variables' => ['present', 'array'],
        ]);

        $sanitizedEnv = [];
        foreach ($validated['env_variables'] as $key => $val) {
            $cleanKey = trim((string) $key);
            if ($cleanKey !== '' && preg_match('/^[a-zA-Z_][a-zA-Z0-9_]*$/', $cleanKey)) {
                $sanitizedEnv[$cleanKey] = (string) ($val ?? '');
            }
        }

        if ($validated['scope'] === 'global') {
            $settings = is_array($app->settings) ? $app->settings : [];
            $settings['env_variables'] = $sanitizedEnv;
            $app->update(['settings' => $settings]);

            return back()->with('success', "Variables d'environnement globales de l'application enregistrées.");
        }

        $function = $app->functions()->where('id', $validated['function_id'])->firstOrFail();
        $function->update([
            'env_variables' => $sanitizedEnv,
        ]);

        return back()->with('success', "Variables d'environnement de la fonction « {$function->name} » enregistrées.");
    }

    /**
     * Test-invoke a serverless PHP Web Function directly from the Dashboard.
     */
    public function invoke(Request $request, App $app, AppFunction $function): RedirectResponse
    {
        $this->ensureAppOwnership($request, $app);

        if ($function->app_id !== $app->id) {
            abort(404);
        }

        $rawPayload = $request->string('payload', '{}')->toString();
        $decodedPayload = json_decode($rawPayload, true);

        if (! is_array($decodedPayload)) {
            $decodedPayload = [];
        }

        $result = $this->runner->execute($app, $function, $decodedPayload, ['X-Zenbase-Dashboard-Test' => '1']);

        return back()
            ->with('functionResult', [
                'function_id' => $function->id,
                'function_name' => $function->name,
                ...$result,
            ])
            ->with(
                $result['error'] ? 'error' : 'success',
                $result['error']
                    ? "Erreur d'exécution : {$result['error']}"
                    : "Fonction « {$function->name} » exécutée en {$result['duration_ms']} ms."
            );
    }

    /**
     * Delete a serverless PHP Web Function.
     */
    public function destroy(Request $request, App $app, AppFunction $function): RedirectResponse
    {
        $this->ensureAppOwnership($request, $app);

        if ($function->app_id !== $app->id) {
            abort(404);
        }

        $function->delete();

        return redirect()
            ->route('dashboard.apps.functions', $app)
            ->with('success', 'Fonction supprimée.');
    }

    /**
     * Download the IDE autocompletion stub file (`zenbase-stubs.php`).
     */
    public function downloadStubs(): SymfonyResponse
    {
        $path = resource_path('stubs/zenbase-stubs.php');

        return response()->download($path, 'zenbase-stubs.php', [
            'Content-Type' => 'application/x-httpd-php',
        ]);
    }
}
