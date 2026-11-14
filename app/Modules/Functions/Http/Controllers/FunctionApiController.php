<?php

namespace App\Modules\Functions\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\App;
use App\Modules\Auth\Models\TenantUser;
use App\Modules\Functions\Services\FunctionRunnerService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class FunctionApiController extends Controller
{
    public function __construct(public FunctionRunnerService $runner) {}

    /**
     * Invoke a serverless PHP Web Function belonging to the current application.
     */
    public function invoke(Request $request, string $functionName): JsonResponse
    {
        /** @var App $app */
        $app = $request->attributes->get('current_app');

        /** @var TenantUser|null $tenantUser */
        $tenantUser = $request->attributes->get('current_tenant_user');

        $function = $app->functions()->where('name', $functionName)->first();

        if (! $function) {
            return response()->json([
                'data' => null,
                'error' => "Fonction [{$functionName}] introuvable.",
            ], 404);
        }

        $payload = $request->all();

        $result = $this->runner->execute(
            $app,
            $function,
            $payload,
            $request->headers->all(),
            $tenantUser,
        );

        return response()->json([
            'data' => $result['data'],
            'error' => $result['error'],
            'meta' => [
                'duration_ms' => $result['duration_ms'],
                'status' => $result['status'],
            ],
        ], $result['status'] >= 100 && $result['status'] < 600 ? $result['status'] : 200);
    }
}
