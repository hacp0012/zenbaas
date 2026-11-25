<?php

namespace App\Mcp\Resources;

use App\Mcp\Support\McpAppContext;
use Laravel\Mcp\Request;
use Laravel\Mcp\Response;
use Laravel\Mcp\Server\Attributes\Description;
use Laravel\Mcp\Server\Attributes\MimeType;
use Laravel\Mcp\Server\Attributes\Name;
use Laravel\Mcp\Server\Contracts\HasUriTemplate;
use Laravel\Mcp\Server\Resource;
use Laravel\Mcp\Support\UriTemplate;

#[Name('function_code')]
#[Description('PHP source code of a specific Serverless Web Function in the current Zenbase application (read-only).')]
#[MimeType('text/x-php')]
class FunctionCodeResource extends Resource implements HasUriTemplate
{
    public function __construct(
        public McpAppContext $context,
    ) {}

    /**
     * Get the URI pattern for the resource template.
     */
    public function uriTemplate(): UriTemplate
    {
        return new UriTemplate('zenbase://functions/{function}/code');
    }

    /**
     * Handle the resource request.
     */
    public function handle(Request $request): Response
    {
        $functionName = trim((string) $request->get('function', ''));

        if ($functionName === '') {
            return Response::error('Paramètre {function} manquant dans l\'URI.');
        }

        $function = $this->context->app()
            ->functions()
            ->where('name', $functionName)
            ->first();

        if (! $function) {
            return Response::error("Web Function « {$functionName} » introuvable dans cette application.");
        }

        $code = trim((string) $function->code);
        if (! str_starts_with($code, '<?php')) {
            $code = "<?php\n\n{$code}\n";
        }

        return Response::text($code);
    }
}
