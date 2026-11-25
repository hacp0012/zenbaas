<?php

namespace App\Mcp\Tools\Functions;

use App\Mcp\Support\McpAppContext;
use App\Modules\Functions\Models\AppFunction;
use Illuminate\Contracts\JsonSchema\JsonSchema;
use Illuminate\JsonSchema\Types\Type;
use Laravel\Mcp\Request;
use Laravel\Mcp\Response;
use Laravel\Mcp\Server\Attributes\Description;
use Laravel\Mcp\Server\Attributes\Name;
use Laravel\Mcp\Server\Tool;
use Laravel\Mcp\Server\Tools\Annotations\IsReadOnly;

#[Name('get_function_code')]
#[Description('Read the PHP source code, declared environment variable key names (never secret values), and recent execution logs of a specific serverless Web Function.')]
#[IsReadOnly]
class GetFunctionCodeTool extends Tool
{
    public function __construct(
        public McpAppContext $context,
    ) {}

    /**
     * Handle the tool request.
     */
    public function handle(Request $request): Response
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:64'],
            'logs_limit' => ['nullable', 'integer', 'min:0', 'max:50'],
        ]);

        $app = $this->context->app();
        $function = $app->functions()
            ->where('name', (string) $validated['name'])
            ->first();

        if (! $function instanceof AppFunction) {
            return Response::error("Web Function [{$validated['name']}] introuvable dans cette application.");
        }

        $logsLimit = isset($validated['logs_limit']) ? (int) $validated['logs_limit'] : 10;
        $logs = is_array($function->logs) ? array_slice($function->logs, 0, $logsLimit) : [];
        $envKeys = is_array($function->env_variables)
            ? array_map('strval', array_keys($function->env_variables))
            : [];

        return Response::text(json_encode([
            'id' => $function->id,
            'name' => $function->name,
            'description' => $function->description,
            'is_active' => $function->is_active,
            'code' => $function->code,
            'env_keys' => $envKeys,
            'recent_logs' => $logs,
            'updated_at' => $function->updated_at?->toIso8601String(),
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
                ->description('Name of the serverless Web Function.')
                ->required(),
            'logs_limit' => $schema->integer()
                ->description('Number of recent execution logs to include (0-50, default: 10).')
                ->min(0)
                ->max(50),
        ];
    }
}
