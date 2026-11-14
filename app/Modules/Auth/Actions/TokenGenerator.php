<?php

namespace App\Modules\Auth\Actions;

use Illuminate\Support\Str;

class TokenGenerator
{
    /**
     * Generate a secure Bearer token (`zb_token_...`) for a tenant user.
     */
    public function generate(): string
    {
        return 'zb_token_'.Str::random(48);
    }
}
