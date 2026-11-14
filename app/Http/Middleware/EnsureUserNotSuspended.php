<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureUserNotSuspended
{
    /**
     * Ensure the authenticated user account has not been suspended by an administrator.
     *
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if ($user && ! $user->is_admin && $user->isSuspendedOrExpired()) {
            if ($user->isExpired() && ! $user->is_suspended) {
                $user->forceFill(['is_suspended' => true])->save();
            }

            if ($request->expectsJson() && ! $request->header('X-Inertia')) {
                return response()->json([
                    'message' => 'Votre compte a été suspendu car le délai d\'expiration autorisé à utiliser la plateforme a expiré ou par décision de l\'administrateur.',
                ], 403);
            }

            return redirect()->route('account.suspended');
        }

        return $next($request);
    }
}
