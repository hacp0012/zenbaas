<?php

namespace App\Mcp\Resources;

use Laravel\Mcp\Request;
use Laravel\Mcp\Response;
use Laravel\Mcp\Server\Attributes\Description;
use Laravel\Mcp\Server\Attributes\MimeType;
use Laravel\Mcp\Server\Attributes\Name;
use Laravel\Mcp\Server\Attributes\Uri;
use Laravel\Mcp\Server\Resource;

#[Name('sdk_js_docs')]
#[Description('Official documentation and quickstart guide for the @zenbase/sdk JavaScript/TypeScript client.')]
#[Uri('zenbase://docs/sdk-js')]
#[MimeType('text/markdown')]
class SdkDocsResource extends Resource
{
    /**
     * Handle the resource request.
     */
    public function handle(Request $request): Response
    {
        $path = base_path('sdks/js-ts/README.md');

        if (! file_exists($path)) {
            return Response::error('Documentation @zenbase/sdk introuvable.');
        }

        return Response::text((string) file_get_contents($path));
    }
}
