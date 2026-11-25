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

#[Name('list_functions')]
#[Description('List all serverless PHP Web Functions belonging to the current application (with active status, env key names only, and latest execution log summary).')]
#[IsReadOnly]
class ListFunctionsTool extends Tool
{
    public function __construct(
        public McpAppContext $context,
    ) {}

    /**
     * Handle the tool request.
     */
    public function handle(Request $request): Response
    {
        $app = $this->context->app();

        $functions = $app->functions()
            ->orderBy('name')
            ->get()
            ->map(function (AppFunction $function): array {
                $envKeys = is_array($function->env_variables)
                    ? array_map('strval', array_keys($function->env_variables))
                    : [];
                $logs = is_array($function->logs) ? $function->logs : [];

                return [
                    'id' => $function->id,
                    'name' => $function->name,
                    'description' => $function->description,
                    'is_active' => $function->is_active,
                    'env_keys' => $envKeys,
                    'last_log' => $logs[0] ?? null,
                    'created_at' => $function->created_at?->toIso8601String(),
                    'updated_at' => $function->updated_at?->toIso8601String(),
                ];
            })
            ->all();

        return Response::text(json_encode([
            'functions' => $functions,
            'total' => count($functions),
        ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR));
    }

    /**
     * Get the tool's input schema.
     *
     * @return array<string, Type>
     */
    public function schema(JsonSchema $schema): array
    {
        return [];
    }
}
