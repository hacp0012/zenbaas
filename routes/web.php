<?php

use App\Http\Controllers\Admin\AdminDashboardController;
use App\Http\Controllers\Admin\AdminDiagnosticController;
use App\Http\Controllers\Admin\AdminSettingsController;
use App\Http\Controllers\Admin\AdminUserController;
use App\Http\Controllers\Dashboard\AppCorsController;
use App\Http\Controllers\Dashboard\AppDatabaseController;
use App\Http\Controllers\Dashboard\AppFunctionController;
use App\Http\Controllers\Dashboard\AppLogController;
use App\Http\Controllers\Dashboard\AppMcpController;
use App\Http\Controllers\Dashboard\AppSettingsController;
use App\Http\Controllers\Dashboard\AppStorageController;
use App\Http\Controllers\Dashboard\AppTenantUserController;
use App\Http\Controllers\Dashboard\ClientAppController;
use App\Http\Controllers\DocsController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::inertia('/', 'welcome')->name('home');
Route::get('/docs', [DocsController::class, 'show'])->name('docs');
Route::get('/storage/files/{file}/{filename?}', [AppStorageController::class, 'serve'])->name('storage.files.serve');
Route::get('/storage/tenants/{path}', [AppStorageController::class, 'serveByTenantPath'])->where('path', '.*')->name('storage.tenants.serve');

Route::middleware(['auth'])->get('/account-suspended', function (Request $request) {
    $user = $request->user();

    if (! $user || $user->is_admin || ! $user->isSuspendedOrExpired()) {
        return redirect()->route('dashboard');
    }

    return Inertia::render('auth/account-suspended', [
        'email' => $user->email,
        'name' => $user->name,
        'isExpired' => $user->isExpired(),
        'expiresAt' => $user->expires_at?->toIso8601String(),
    ]);
})->name('account.suspended');

Route::middleware(['auth', 'verified', 'not_suspended'])->group(function (): void {
    Route::get('dashboard', [ClientAppController::class, 'index'])->name('dashboard');

    Route::prefix('dashboard')->name('dashboard.')->group(function (): void {
        Route::get('stubs/zenbase-stubs.php', [AppFunctionController::class, 'downloadStubs'])->name('stubs.download');
        Route::get('skills/zenbase-skills.zip', [AppMcpController::class, 'downloadSkillsBundle'])->name('skills.bundle');
        Route::get('skills/{skill}/SKILL.md', [AppMcpController::class, 'downloadSkill'])->name('skills.download');

        Route::get('apps', [ClientAppController::class, 'index'])->name('apps.index');
        Route::post('apps', [ClientAppController::class, 'store'])->name('apps.store');
        Route::get('apps/{app}', [ClientAppController::class, 'show'])->name('apps.show');
        Route::get('apps/{app}/integrations', [ClientAppController::class, 'integrations'])->name('apps.integrations');
        Route::get('apps/{app}/database', [ClientAppController::class, 'database'])->name('apps.database');
        Route::get('apps/{app}/auth', [ClientAppController::class, 'auth'])->name('apps.auth');
        Route::get('apps/{app}/storage', [ClientAppController::class, 'storage'])->name('apps.storage');
        Route::get('apps/{app}/cors', [ClientAppController::class, 'cors'])->name('apps.cors');
        Route::get('apps/{app}/functions', [ClientAppController::class, 'functions'])->name('apps.functions');
        Route::get('apps/{app}/functions/editor/{function?}', [ClientAppController::class, 'functionEditor'])->name('apps.functions.editor');
        Route::get('apps/{app}/functions/env', [ClientAppController::class, 'functionEnv'])->name('apps.functions.env');
        Route::get('apps/{app}/mcp', [ClientAppController::class, 'mcp'])->name('apps.mcp');
        Route::put('apps/{app}/mcp', [AppMcpController::class, 'update'])->name('apps.mcp.update');
        Route::get('apps/{app}/skills', [ClientAppController::class, 'skills'])->name('apps.skills');
        Route::get('apps/{app}/logs', [ClientAppController::class, 'logs'])->name('apps.logs');
        Route::get('apps/{app}/logs/export', [AppLogController::class, 'export'])->name('apps.logs.export');
        Route::delete('apps/{app}/logs', [AppLogController::class, 'clear'])->name('apps.logs.clear');
        Route::get('apps/{app}/settings/rate-limits', [ClientAppController::class, 'settingsRateLimits'])->name('apps.settings.rate_limits');
        Route::put('apps/{app}/settings/rate-limits', [AppSettingsController::class, 'updateRateLimits'])->name('apps.settings.rate_limits.update');
        Route::get('apps/{app}/settings/advanced', [ClientAppController::class, 'settingsAdvanced'])->name('apps.settings.advanced');
        Route::put('apps/{app}/settings/advanced', [AppSettingsController::class, 'updateAdvanced'])->name('apps.settings.advanced.update');
        Route::post('apps/{app}/regenerate-keys', [ClientAppController::class, 'regenerateKeys'])->name('apps.regenerate_keys');
        Route::delete('apps/{app}', [ClientAppController::class, 'destroy'])->name('apps.destroy');

        Route::post('apps/{app}/collections', [AppDatabaseController::class, 'storeCollection'])->name('apps.collections.store');
        Route::put('apps/{app}/collections/{collection}/schema', [AppDatabaseController::class, 'updateCollectionSchema'])->name('apps.collections.schema');
        Route::delete('apps/{app}/collections/{collection}', [AppDatabaseController::class, 'destroyCollection'])->name('apps.collections.destroy');
        Route::post('apps/{app}/collections/{collection}/records', [AppDatabaseController::class, 'storeRecord'])->name('apps.records.store');
        Route::put('apps/{app}/collections/{collection}/records/{recordId}', [AppDatabaseController::class, 'updateRecord'])->name('apps.records.update');
        Route::delete('apps/{app}/collections/{collection}/records/{recordId}', [AppDatabaseController::class, 'destroyRecord'])->name('apps.records.destroy');

        Route::post('apps/{app}/users', [AppTenantUserController::class, 'store'])->name('apps.users.store');
        Route::put('apps/{app}/users/{tenantUserId}', [AppTenantUserController::class, 'update'])->name('apps.users.update');
        Route::patch('apps/{app}/users/{tenantUserId}/toggle-block', [AppTenantUserController::class, 'toggleBlock'])->name('apps.users.toggle_block');
        Route::patch('apps/{app}/users/{tenantUserId}/reset-password', [AppTenantUserController::class, 'resetPassword'])->name('apps.users.reset_password');
        Route::delete('apps/{app}/users/{tenantUserId}', [AppTenantUserController::class, 'destroy'])->name('apps.users.destroy');

        Route::post('apps/{app}/cors', [AppCorsController::class, 'store'])->name('apps.cors.store');
        Route::delete('apps/{app}/cors/{cors}', [AppCorsController::class, 'destroy'])->name('apps.cors.destroy');

        Route::post('apps/{app}/files', [AppStorageController::class, 'store'])->name('apps.files.store');
        Route::delete('apps/{app}/files-batch', [AppStorageController::class, 'destroyBatch'])->name('apps.files.destroy_batch');
        Route::delete('apps/{app}/files/{file}', [AppStorageController::class, 'destroy'])->name('apps.files.destroy');

        Route::post('apps/{app}/functions', [AppFunctionController::class, 'store'])->name('apps.functions.store');
        Route::post('apps/{app}/functions/upload', [AppFunctionController::class, 'upload'])->name('apps.functions.upload');
        Route::put('apps/{app}/functions-env', [AppFunctionController::class, 'updateEnvVariables'])->name('apps.functions.env.update');
        Route::get('apps/{app}/functions/{function}/download', [AppFunctionController::class, 'download'])->name('apps.functions.download');
        Route::put('apps/{app}/functions/{function}', [AppFunctionController::class, 'update'])->name('apps.functions.update');
        Route::post('apps/{app}/functions/{function}/invoke', [AppFunctionController::class, 'invoke'])->name('apps.functions.invoke');
        Route::delete('apps/{app}/functions/{function}', [AppFunctionController::class, 'destroy'])->name('apps.functions.destroy');
    });

    Route::prefix('admin')->name('admin.')->middleware('admin')->group(function (): void {
        Route::get('dashboard', [AdminDashboardController::class, 'index'])->name('dashboard');
        Route::get('users', [AdminUserController::class, 'index'])->name('users.index');
        Route::post('users', [AdminUserController::class, 'store'])->name('users.store');
        Route::put('users/{user}', [AdminUserController::class, 'update'])->name('users.update');
        Route::patch('users/{user}/quota', [AdminUserController::class, 'updateQuota'])->name('users.update_quota');
        Route::patch('users/{user}/toggle-status', [AdminUserController::class, 'toggleStatus'])->name('users.toggle_status');
        Route::delete('users/{user}', [AdminUserController::class, 'destroy'])->name('users.destroy');

        Route::get('settings/configs', [AdminSettingsController::class, 'configs'])->name('settings.configs');
        Route::put('settings/configs', [AdminSettingsController::class, 'updateConfigs'])->name('settings.configs.update');
        Route::get('settings/storage', [AdminSettingsController::class, 'storage'])->name('settings.storage');
        Route::put('settings/storage', [AdminSettingsController::class, 'updateStorage'])->name('settings.storage.update');

        Route::get('diagnostic/apps', [AdminDiagnosticController::class, 'apps'])->name('diagnostic.apps');
        Route::get('diagnostic/logs', [AdminDiagnosticController::class, 'logs'])->name('diagnostic.logs');
        Route::get('diagnostic/logs/download', [AdminDiagnosticController::class, 'downloadLogs'])->name('diagnostic.logs.download');
        Route::delete('diagnostic/logs', [AdminDiagnosticController::class, 'clearLogs'])->name('diagnostic.logs.clear');
    });
});

require __DIR__.'/settings.php';

Route::fallback(function (Request $request) {
    if ($request->is('api/*') || $request->expectsJson()) {
        return response()->json([
            'data' => null,
            'error' => 'Route API introuvable (404).',
        ], 404);
    }

    return Inertia::render('errors/not-found', [
        'status' => 404,
        'path' => $request->path(),
    ])->toResponse($request)->setStatusCode(404);
});
