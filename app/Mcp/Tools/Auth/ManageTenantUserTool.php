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
use Laravel\Mcp\Server\Tools\Annotations\IsDestructive;

#[Name('manage_tenant_user')]
#[Description('Block, unblock, or permanently delete an end-user from the application\'s isolated Auth table.')]
#[IsDestructive]
class ManageTenantUserTool extends Tool
{
    public function __construct(
        public McpAppContext $context,
        public TenantManagerService $tenantManager,
    ) {}

    /**
     * Only expose this tool when auth management is explicitly allowed.
     */
    public function shouldRegister(): bool
    {
        return $this->context->canManageAuth();
    }

    /**
     * Handle the tool request.
     */
    public function handle(Request $request): Response
    {
        $validated = $request->validate([
            'user_id' => ['required', 'string', 'max:128'],
            'action' => ['required', 'string', 'in:block,unblock,delete'],
        ]);

        $this->tenantManager->connect($this->context->app());

        $user = TenantUser::query()->where('id', (string) $validated['user_id'])->first();

        if (! $user instanceof TenantUser) {
            return Response::error("Utilisateur tenant [{$validated['user_id']}] introuvable.");
        }

        $action = (string) $validated['action'];

        if ($action === 'delete') {
            $email = $user->email;
            $user->delete();

            return Response::text(json_encode([
                'action' => 'delete',
                'user_id' => (string) $validated['user_id'],
                'email' => $email,
                'deleted' => true,
            ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR));
        }

        $isBlocked = $action === 'block';
        $updates = ['is_blocked' => $isBlocked];

        if ($isBlocked) {
            $updates['access_token'] = null;
        }

        $user->update($updates);

        return Response::text(json_encode([
            'action' => $action,
            'user' => [
                'id' => $user->id,
                'email' => $user->email,
                'auth_method' => $user->auth_method,
                'is_blocked' => $user->is_blocked,
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
            'user_id' => $schema->string()
                ->description('UUID of the tenant user to manage.')
                ->required(),
            'action' => $schema->string()
                ->enum(['block', 'unblock', 'delete'])
                ->description('Action to perform: block (also revokes token), unblock, or delete.')
                ->required(),
        ];
    }
}
