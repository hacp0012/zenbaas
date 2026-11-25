---
name: zenbase-platform-conventions
description: >-
  Internal architecture rules, multi-tenancy invariants, security boundaries, and local
  verification workflows for developing the Zenbase BaaS platform itself (Laravel 13,
  SQLite JSON1 tenants, Inertia v3 + React 19, Wayfinder, MCP server). Activate whenever
  modifying backend modules, tenant services, dashboard controllers, API v1 routes, MCP
  tools, or documentation discovery in this repository.
---

# Zenbase Platform Conventions (Internal)

Apply these codebase-specific invariants whenever developing Zenbase itself.

## 1. Strict Multi-Tenant Isolation (Central vs. Tenant DB)

Zenbase separates platform metadata from per-app tenant data:
- **Central SQLite DB (`database/database.sqlite`)**: `users`, `apps`, `app_files`, `app_functions`, `function_logs`, etc.
- **Tenant SQLite DB (`storage/app/tenants/app_{id}.sqlite`)**: `collections`, `records`, `auth_users`.

**Invariants:**
- ALWAYS call `TenantManagerService::connect($app)` before touching the `tenant` database connection (`NoSqlDatabaseEngine`, `TenantUser`, `AuthManager`).
- NEVER mix Eloquent models across connections without verifying `$connection = 'tenant'` vs. default connection.
- File storage is isolated per app under `tenants/{app_id}/` via `StorageManagerService` and must enforce the owner's storage quota (`StorageQuotaExceededException` -> HTTP `413`).

## 2. Security & Authorization Boundaries

- **Dashboard app ownership**: Every controller under `app/Http/Controllers/Dashboard/` MUST use `App\Concerns\AuthorizesAppOwnership` and call `$this->ensureAppOwnership($request, $app)`.
  - Note: `ensureAppOwnership()` intentionally aborts with **`404`** (NOT `403`) to avoid leaking the existence of other users' app UUIDs. Write tests with `assertNotFound()`.
- **API v1 Gateway (`routes/api.php`)**:
  - Uses middleware `zenbase.cors` (`DynamicCors`) + `zenbase.apikey` (`VerifyApiKey`) + `throttle:zenbase-api`.
  - Attaches `current_app`, `api_key_role` (`'public'` | `'secret'`), and optional `current_tenant_user` to `$request->attributes`.
  - Standard JSON envelope: `['data' => ..., 'error' => null|string, 'meta' => ...]`.
- **MCP Server (`routes/ai.php`, `app/Mcp/`)**:
  - Uses `zenbase.mcp` (`AuthenticateMcpApp`) + `throttle:zenbase-mcp` and request-scoped `McpAppContext`.
  - MUST reject `zb_pub_...` keys (`403`), disabled MCP (`403`), and suspended/expired owners (`403`).
  - Gate write/destructive tools with `shouldRegister()` using `McpAppContext` helpers so disabled tools are hidden from `tools/list` AND blocked on `tools/call`.
  - NEVER return `secret_key`, `.env` values (only key names), `password_hash`, `otp_code`, or `access_token` in MCP responses.
  - Use `Response::text(json_encode(..., JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR))` (avoid `@internal` `Response::json()` for PHPStan Level 7).
- **Web Functions Sandbox (`app/Modules/Functions/Services/FunctionRunnerService.php`)**:
  - Any code save, import, or execution MUST pass `FunctionRunnerService::validateCode()` before execution.

## 3. Module & Frontend Layout

- Domain modules live under `app/Modules/{Auth,Database,Functions,Storage}/`.
- Shared core services live under `app/Services/` and are registered in `app/Providers/ZenbaseServiceProvider.php`.
- `DocsController` auto-discovers ALL `.md` files under `docs/` (excluding `docs/sdks/`) and `sdks/<slug>/docs/` for `/docs`. Do NOT place non-documentation Markdown (such as `SKILL.md` templates) inside `docs/`; place distributable assets under `resources/` (e.g., `resources/stubs/`, `resources/skills/`).
- Dashboard Inertia pages live in `resources/js/pages/{admin,client,docs,settings}/` and use Wayfinder actions from `@/actions/` and `@/routes/`.

## 4. Required Verification Commands

After modifying code, run the relevant checks:
1. **Wayfinder (whenever routes or controller signatures change)**:
   ALWAYS pass `--with-form` (matches `wayfinder({ formVariants: true })` in `vite.config.ts`):
   ```bash
   php artisan wayfinder:generate --with-form --no-interaction
   ```
2. **PHP formatting (after any PHP edit)**:
   ```bash
   vendor/bin/pint --dirty --format agent
   ```
3. **PHP static analysis (Larastan Level 7 — `phpstan.neon`)**:
   ```bash
   vendor/bin/phpstan analyse <modified-paths>
   ```
4. **Tests (Pest v5 — run the narrowest relevant test file first)**:
   ```bash
   php artisan test --compact tests/Feature/<RelevantTest>.php
   ```
5. **Frontend typecheck, lint, and Vite manifest build (whenever TS/TSX or new pages change)**:
   ```bash
   npm run types:check
   npx vp check --fix <modified-files>
   npm run build
   ```
   > If Pest renders a newly added Inertia page, run `npm run build` first so the Vite manifest contains the page entry.
