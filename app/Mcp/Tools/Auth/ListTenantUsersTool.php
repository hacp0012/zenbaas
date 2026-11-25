<?php

namespace App\Mcp\Tools\Auth;

use App\Mcp\Support\McpAppContext;
use App\Modules\Auth\Models\TenantUser;
use App\Services\TenantManagerService;
use Illuminate\Contracts\JsonSchema\JsonSchema;
use Illuminate\JsonSchema\Types\Type;
use Laravel\Mcp\Request;
use Laravel\Mcp\Response;
use Laravel\Mcp\Server\Attributes\Description;
use Laravel\Mcp\Server\Attributes\Name;
use Laravel\Mcp\Server\Tool;
use Laravel\Mcp\Server\Tools\Annotations\IsReadOnly;

#[Name('list_tenant_users')]
#[Description('List end-users registered in the application\'s isolated Auth table (never exposes password hashes, OTP codes, or access tokens).')]
#[IsReadOnly]
class ListTenantUsersTool extends Tool
{
    public function __construct(
        public McpAppContext $context,
        public TenantManagerService $tenantManager,
    ) {}

    /**
     * Handle the tool request.
     */
    public function handle(Request $request): Response
    {
        $validated = $request->validate([
            'search' => ['nullable', 'string', 'max:200'],
            'is_blocked' => ['nullable', 'boolean'],
            'limit' => ['nullable', 'integer', 'min:1', 'max:200'],
        ]);

        $this->tenantManager->connect($this->context->app());

        $query = TenantUser::query()->orderByDesc('created_at')->orderByDesc('id');

        if (isset($validated['search']) && trim((string) $validated['search']) !== '') {
            $query->where('email', 'like', '%'.trim((string) $validated['search']).'%');
        }

        if (array_key_exists('is_blocked', $validated) && $validated['is_blocked'] !== null) {
            $query->where('is_blocked', (bool) $validated['is_blocked']);
        }

        $total = (int) (clone $query)->count();
        $limit = isset($validated['limit']) ? (int) $validated['limit'] : 50;

        $users = $query->limit($limit)->get()->map(fn (TenantUser $user): array => [
            'id' => $user->id,
            'email' => $user->email,
            'auth_method' => $user->auth_method,
            'is_blocked' => $user->is_blocked,
            'created_at' => $user->created_at?->toIso8601String(),
        ])->all();

        return Response::text(json_encode([
            'users' => $users,
            'returned' => count($users),
            'total' => $total,
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
            'search' => $schema->string()
                ->description('Optional case-insensitive substring filter on user email.'),
            'is_blocked' => $schema->boolean()
                ->description('Optional filter by blocked status.'),
            'limit' => $schema->integer()
                ->description('Maximum number of users to return (1-200, default: 50).')
                ->min(1)
                ->max(200),
        ];
    }
}
