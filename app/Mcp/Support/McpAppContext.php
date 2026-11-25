<?php

namespace App\Mcp\Support;

use App\Models\App;
use RuntimeException;

class McpAppContext
{
    private ?App $app = null;

    /**
     * Bind the authenticated Zenbase application to the current MCP request lifecycle.
     */
    public function setApp(App $app): void
    {
        $this->app = $app;
    }

    /**
     * Reset the bound application context.
     */
    public function clear(): void
    {
        $this->app = null;
    }

    /**
     * Determine whether an application has been bound to the MCP context.
     */
    public function hasApp(): bool
    {
        return $this->app instanceof App;
    }

    /**
     * Return the bound application or throw when accessed outside an authenticated MCP context.
     */
    public function app(): App
    {
        if (! $this->app instanceof App) {
            throw new RuntimeException('Aucune application Zenbase n\'est associée au contexte MCP courant.');
        }

        return $this->app;
    }

    /**
     * Return the normalized MCP settings for the bound application.
     *
     * @return array{
     *     enabled: bool,
     *     read_only: bool,
     *     allow_functions: bool,
     *     allow_auth_management: bool,
     *     allow_storage_write: bool
     * }
     */
    public function settings(): array
    {
        if (! $this->app instanceof App) {
            return App::defaultMcpSettings();
        }

        return $this->app->mcpSettings();
    }

    /**
     * Determine whether the MCP server is restricted to read-only operations for the current app.
     */
    public function isReadOnly(): bool
    {
        return $this->settings()['read_only'];
    }

    /**
     * Determine whether database write/destructive tools are enabled for the current app.
     */
    public function canWriteDatabase(): bool
    {
        return $this->hasApp() && ! $this->isReadOnly();
    }

    /**
     * Determine whether Web Functions write and invocation tools are enabled for the current app.
     */
    public function canManageFunctions(): bool
    {
        $settings = $this->settings();

        return $this->hasApp() && ! $settings['read_only'] && $settings['allow_functions'];
    }

    /**
     * Determine whether tenant user management tools are enabled for the current app.
     */
    public function canManageAuth(): bool
    {
        $settings = $this->settings();

        return $this->hasApp() && ! $settings['read_only'] && $settings['allow_auth_management'];
    }

    /**
     * Determine whether storage deletion tools are enabled for the current app.
     */
    public function canWriteStorage(): bool
    {
        $settings = $this->settings();

        return $this->hasApp() && ! $settings['read_only'] && $settings['allow_storage_write'];
    }
}
