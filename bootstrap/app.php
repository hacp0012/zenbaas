<?php

use App\Http\Middleware\AuthenticateMcpApp;
use App\Http\Middleware\DynamicCors;
use App\Http\Middleware\EnsureUserIsAdmin;
use App\Http\Middleware\EnsureUserNotSuspended;
use App\Http\Middleware\HandleAppearance;
use App\Http\Middleware\HandleInertiaRequests;
use App\Http\Middleware\RecordAppActivityLog;
use App\Http\Middleware\VerifyApiKey;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Middleware\AddLinkHeadersForPreloadedAssets;
use Illuminate\Http\Request;
use Illuminate\Routing\Middleware\ThrottleRequests;
use Inertia\Inertia;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->encryptCookies(except: ['appearance', 'sidebar_state']);

        $middleware->web(append: [
            HandleAppearance::class,
            HandleInertiaRequests::class,
            AddLinkHeadersForPreloadedAssets::class,
        ]);

        $middleware->alias([
            'admin' => EnsureUserIsAdmin::class,
            'not_suspended' => EnsureUserNotSuspended::class,
            'zenbase.log' => RecordAppActivityLog::class,
            'zenbase.cors' => DynamicCors::class,
            'zenbase.apikey' => VerifyApiKey::class,
            'zenbase.mcp' => AuthenticateMcpApp::class,
        ]);

        // Ensure tenant app resolution runs before ThrottleRequests so per-app rate limits apply
        $middleware->prependToPriorityList(ThrottleRequests::class, VerifyApiKey::class);
        $middleware->prependToPriorityList(ThrottleRequests::class, AuthenticateMcpApp::class);
        $middleware->prependToPriorityList(VerifyApiKey::class, DynamicCors::class);
        $middleware->prependToPriorityList(DynamicCors::class, RecordAppActivityLog::class);
        $middleware->prependToPriorityList(AuthenticateMcpApp::class, RecordAppActivityLog::class);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*') || $request->is('mcp') || $request->is('mcp/*') || $request->expectsJson(),
        );

        $exceptions->render(function (NotFoundHttpException $exception, Request $request) {
            if ($request->is('api/*') || $request->is('mcp') || $request->is('mcp/*') || $request->expectsJson()) {
                return null;
            }

            return Inertia::render('errors/not-found', [
                'status' => 404,
                'path' => $request->path(),
            ])->toResponse($request)->setStatusCode(404);
        });
    })->create();
