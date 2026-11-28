---
name: zenbase-mcp-workflow
description: >-
  Guides AI agents when inspecting or managing a Zenbase application through the
  zenbase-app MCP server (POST /mcp). Use whenever calling Zenbase MCP tools, reading
  zenbase:// resources, managing NoSQL collections, records, tenant users, storage files,
  or Web Functions via MCP. Enforces discovery-first steps, permission awareness, and
  confirmation before destructive actions.
---

# Zenbase MCP Operational Workflow

Follow this runbook whenever interacting with a Zenbase application through its MCP server (`zenbase-app`).

## 1. Always Start With Discovery

Before proposing schema changes, queries, or code generation:
1. Call `get_app_info` (or read `zenbase://app/overview`) to learn the app name, active MCP permissions (`read_only`, `allow_functions`, `allow_auth_management`, `allow_storage_write`), CORS origins, storage usage, and configured `.env` key **names**.
2. Call `list_collections` to see existing collections and document counts.
3. For any target collection, call `get_collection_schema` (or read `zenbase://collections/{collection}/schema`) before inserting or updating records so payloads satisfy validation rules.

## 2. Respect Granular MCP Permissions

The Zenbase MCP server dynamically hides and blocks tools according to the app's `settings.mcp` flags:
- **Read-only (`read_only: true`)**: Only the 9 inspection tools are available (`get_app_info`, `list_collections`, `get_collection_schema`, `query_records`, `get_record`, `list_tenant_users`, `list_storage_files`, `list_functions`, `get_function_code`).
- **Database writes (`read_only: false`)**: Adds `create_collection`, `update_collection_schema`, `delete_collection`, `create_record`, `update_record`, `delete_record`.
- **Auth management (`allow_auth_management: true`)**: Adds `manage_tenant_user`.
- **Storage writes (`allow_storage_write: true`)**: Adds `delete_storage_file`.
- **Functions management (`allow_functions: true`)**: Adds `upsert_function`, `invoke_function`.

If a required write tool is absent from `tools/list`, do NOT attempt workarounds — tell the user which permission toggle to enable in the Zenbase Dashboard (**Serveur MCP (IA)**).

## 3. Safe Querying Practices

- Prefer `query_records` with `count_only: true` or small `limit` / pagination (`page`, `per_page`) when exploring unfamiliar collections.
- Check existing record structure before calling `update_record`. Keep `replace: false` (partial merge) unless the user explicitly wants full document replacement.

## 4. Confirmation Gate Before Destructive Actions

ALWAYS summarize the exact target (collection, record ID, user email/ID, file path/ID, or function name) and obtain explicit user confirmation before invoking:
- `delete_collection` (permanently deletes the collection and ALL its documents)
- `delete_record`
- `manage_tenant_user` (especially `block` or `delete`)
- `delete_storage_file`
- `upsert_function` (overwrites live production function code)
- `invoke_function` (when the function mutates data or triggers external effects)

## 5. Secret Hygiene

- MCP tools intentionally redact `secret_key`, `.env` values, `password_hash`, `otp_code`, and `access_token`.
- NEVER ask the user to paste `zb_sec_...` into committed repository files or frontend code.
- If `POST /mcp` returns `403 Forbidden`, check: (1) `zb_sec_...` is used instead of `zb_pub_...`, (2) MCP is enabled on the target app, (3) owner account is not suspended/expired, and (4) the client's `Origin` header is allowed.

## 6. Leverage Built-In MCP Resources & Prompts

- `zenbase://app/overview` — consolidated snapshot of the app
- `zenbase://collections/{collection}/schema` — single collection schema
- `zenbase://docs/function-stubs` — authoritative PHP stubs before writing Web Functions
- `zenbase://docs/sdk-js` — `@hacp0012/zenbase-sdk` quickstart reference
- Prompt `generate-sdk-types` — generate strict TypeScript types from live collections
- Prompt `build-web-function` — scaffold a sandbox-compliant PHP Web Function
