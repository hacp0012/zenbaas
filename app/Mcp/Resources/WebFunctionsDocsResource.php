<?php

namespace App\Mcp\Resources;

use Laravel\Mcp\Request;
use Laravel\Mcp\Response;
use Laravel\Mcp\Server\Attributes\Description;
use Laravel\Mcp\Server\Attributes\MimeType;
use Laravel\Mcp\Server\Attributes\Name;
use Laravel\Mcp\Server\Attributes\Uri;
use Laravel\Mcp\Server\Resource;

#[Name('web_functions_docs')]
#[Description('Complete official guide for Zenbase PHP Serverless Web Functions: $event/$context API, custom HTTP responses, sandbox restrictions, limits, and examples.')]
#[Uri('zenbase://docs/web-functions')]
#[MimeType('text/markdown')]
class WebFunctionsDocsResource extends Resource
{
    /**
     * Handle the resource request.
     */
    public function handle(Request $request): Response
    {
        $path = base_path('docs/web-functions.md');

        if (! file_exists($path)) {
            return Response::error('Documentation docs/web-functions.md introuvable.');
        }

        return Response::text((string) file_get_contents($path));
    }
}
