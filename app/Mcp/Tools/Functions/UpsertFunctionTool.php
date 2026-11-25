<?php

namespace App\Mcp\Tools\Functions;

use App\Mcp\Support\McpAppContext;
use App\Modules\Functions\Models\AppFunction;
use App\Modules\Functions\Services\FunctionRunnerService;
use Illuminate\Contracts\JsonSchema\JsonSchema;
use Illuminate\JsonSchema\Types\Type;
use InvalidArgumentException;
use Laravel\Mcp\Request;
use Laravel\Mcp\Response;
use Laravel\Mcp\Server\Attributes\Description;
use Laravel\Mcp\Server\Attributes\Name;
use Laravel\Mcp\Server\Tool;
use Laravel\Mcp\Server\Tools\Annotations\IsDestructive;

#[Name('upsert_function')]
#[Description('Create or update a serverless PHP Web Function after validating its code against the Zenbase sandbox rules. Read zenbase://docs/function-stubs first for the $context API.')]
#[IsDestructive]
class UpsertFunctionTool extends Tool
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
            'name' => ['required', 'string', 'max:64', 'regex:/^[a-zA-Z0-9_-]+$/'],
            'code' => ['required', 'string'],
            'description' => ['nullable', 'string', 'max:255'],
            'is_active' => ['nullable', 'boolean'],
        ]);

        $cleanCode = preg_replace('/^\s*<\?php\s*/i', '', trim((string) $validated['code'])) ?? trim((string) $validated['code']);

        try {
            $this->runner->validateCode($cleanCode);
        } catch (InvalidArgumentException $e) {
            return Response::error("Validation sandbox échouée : {$e->getMessage()}");
        }

        $app = $this->context->app();
        $name = (string) $validated['name'];
        $existing = $app->functions()->where('name', $name)->first();

        if ($existing instanceof AppFunction) {
            $existing->update([
                'code' => $cleanCode,
                'description' => array_key_exists('description', $validated)
                    ? $validated['description']
                    : $existing->description,
                'is_active' => array_key_exists('is_active', $validated) && $validated['is_active'] !== null
                    ? (bool) $validated['is_active']
                    : $existing->is_active,
            ]);

            $function = $existing->fresh() ?? $existing;
            $status = 'updated';
        } else {
            /** @var AppFunction $function */
            $function = $app->functions()->create([
                'name' => $name,
                'description' => $validated['description'] ?? null,
                'code' => $cleanCode,
                'env_variables' => [],
                'logs' => [],
                'is_active' => array_key_exists('is_active', $validated) && $validated['is_active'] !== null
                    ? (bool) $validated['is_active']
                    : true,
            ]);
            $status = 'created';
        }

        return Response::text(json_encode([
            'status' => $status,
            'function' => [
                'id' => $function->id,
                'name' => $function->name,
                'description' => $function->description,
                'is_active' => $function->is_active,
                'updated_at' => $function->updated_at?->toIso8601String(),
            ],
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
                ->description('Function name (alphanumeric, underscores, hyphens, max 64 chars).')
                ->required(),
            'code' => $schema->string()
                ->description('PHP closure returning function($event, $context) { ... }; conforming to Zenbase sandbox rules.')
                ->required(),
            'description' => $schema->string()
                ->description('Optional short description of what the function does.'),
            'is_active' => $schema->boolean()
                ->description('Whether the function can be invoked (default: true on create, preserved on update).'),
        ];
    }
}
