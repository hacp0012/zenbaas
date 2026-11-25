<?php

namespace App\Mcp\Tools\Functions;

use App\Mcp\Support\McpAppContext;
use App\Modules\Functions\Models\AppFunction;
use App\Modules\Functions\Services\FunctionRunnerService;
use Illuminate\Contracts\JsonSchema\JsonSchema;
use Illuminate\JsonSchema\Types\Type;
use Laravel\Mcp\Request;
use Laravel\Mcp\Response;
use Laravel\Mcp\Server\Attributes\Description;
use Laravel\Mcp\Server\Attributes\Name;
use Laravel\Mcp\Server\Tool;
use Laravel\Mcp\Server\Tools\Annotations\IsDestructive;

#[Name('invoke_function')]
#[Description('Execute an active serverless PHP Web Function inside the isolated application sandbox with an optional JSON payload.')]
#[IsDestructive]
class InvokeFunctionTool extends Tool
{
    public function __construct(
        public McpAppContext $context,
        public FunctionRunnerService $runner,
    ) {}

    /**
     * Only expose this tool when Web Functions management is explicitly allowed.
     */
    public function shouldRegister(): bool
    {
        return $this->context->canManageFunctions();
    }

    /**
     * Handle the tool request.
     */
    public function handle(Request $request): Response
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:64'],
            'payload' => ['nullable', 'array'],
        ]);

        $app = $this->context->app();
        $function = $app->functions()
            ->where('name', (string) $validated['name'])
            ->first();

        if (! $function instanceof AppFunction) {
            return Response::error("Web Function [{$validated['name']}] introuvable dans cette application.");
        }

        $payload = is_array($validated['payload'] ?? null) ? $validated['payload'] : [];

        $result = $this->runner->execute(
            app: $app,
            function: $function,
            payload: $payload,
            headers: ['X-Zenbase-Mcp-Invoke' => '1'],
        );

        return Response::text(json_encode([
            'function' => $function->name,
            ...$result,
        ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR));
    }

    /**
     * Get the tool's input schema.
     *
     * @return array<string, Type>
     */
    public function schema(JsonSchema $schema): array
    {
        return [
            'name' => $schema->string()
                ->description('Name of the serverless Web Function to execute.')
                ->required(),
            'payload' => $schema->object()
                ->description('Optional JSON payload passed as $event to the Web Function.'),
        ];
    }
}
