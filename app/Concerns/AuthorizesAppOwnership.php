<?php

namespace App\Concerns;

use App\Models\App;
use Illuminate\Http\Request;

trait AuthorizesAppOwnership
{
    /**
     * Ensure that the authenticated user owns the application (or is a platform administrator).
     */
    protected function ensureAppOwnership(Request $request, App $app): void
    {
        $user = $request->user();

        if (! $user || ($app->user_id !== $user->id && ! $user->is_admin)) {
            abort(404);
        }
    }
}
