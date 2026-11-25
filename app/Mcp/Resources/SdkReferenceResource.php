<?php

namespace App\Mcp\Resources;

use Laravel\Mcp\Request;
use Laravel\Mcp\Response;
use Laravel\Mcp\Server\Attributes\Description;
use Laravel\Mcp\Server\Attributes\MimeType;
use Laravel\Mcp\Server\Attributes\Name;
use Laravel\Mcp\Server\Attributes\Uri;
use Laravel\Mcp\Server\Resource;

#[Name('sdk_reference_docs')]
#[Description('Exhaustive API reference for @zenbase/sdk: all classes, method signatures, filters, Auth, Storage, ZenbaseBlob, Functions, and exported TypeScript types.')]
#[Uri('zenbase://docs/sdk-reference')]
#[MimeType('text/markdown')]
class SdkReferenceResource extends Resource
{
    /**
     * Handle the resource request.
     */
    public function handle(Request $request): Response
    {
        $path = base_path('sdks/js-ts/docs/reference.md');

        if (! file_exists($path)) {
            return Response::error('Référence API @zenbase/sdk introuvable.');
        }

        return Response::text((string) file_get_contents($path));
    }
}
