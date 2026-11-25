<?php

namespace App\Mcp\Resources;

use Laravel\Mcp\Request;
use Laravel\Mcp\Response;
use Laravel\Mcp\Server\Attributes\Description;
use Laravel\Mcp\Server\Attributes\MimeType;
use Laravel\Mcp\Server\Attributes\Name;
use Laravel\Mcp\Server\Attributes\Uri;
use Laravel\Mcp\Server\Resource;

#[Name('function_stubs')]
#[Description('Official PHP IDE stubs (zenbase-stubs.php) documenting the $event and $context APIs available inside Zenbase Serverless Web Functions.')]
#[Uri('zenbase://docs/function-stubs')]
#[MimeType('text/x-php')]
class FunctionStubsResource extends Resource
{
    /**
     * Handle the resource request.
     */
    public function handle(Request $request): Response
    {
        $path = resource_path('stubs/zenbase-stubs.php');

        if (! file_exists($path)) {
            return Response::error('Fichier zenbase-stubs.php introuvable.');
        }

        return Response::text((string) file_get_contents($path));
    }
}
