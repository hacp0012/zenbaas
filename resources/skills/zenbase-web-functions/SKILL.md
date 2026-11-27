---
name: zenbase-web-functions
description: >-
  Guides AI agents when authoring, debugging, deploying, or testing Zenbase Serverless PHP
  Web Functions (Edge Functions). Use when creating or editing PHP functions for a Zenbase
  app, using $event or $context (database, storage, auth, env, mail, http), resolving sandbox
  violations or timeouts, or using Zenbase MCP tools (get_function_code, upsert_function,
  invoke_function).
---

# Zenbase Serverless PHP Web Functions

Follow these rules whenever writing, updating, or testing Zenbase Web Functions.

## 1. Mandatory First Steps (When MCP Is Connected)

1. Read the official stubs resource `zenbase://docs/function-stubs` to verify exact `$context` signatures.
2. Call `list_functions` and (if updating) `get_function_code` to inspect existing code, env key names, and recent execution logs.
3. Call `list_collections` / `get_collection_schema` for any collection the function will read or write.

## 2. Strict Syntax Rules (Critical Pitfalls)

Every Web Function MUST follow these exact structural constraints:

- **Start immediately with `return function ($event, $context)`** (an optional leading `<?php` tag is stripped automatically).
- **NO `use` statements, NO `namespace`, and NO PHPDoc block before `return`** — the compiler requires the script to begin directly with `return`.
- **NO native PHP type-hint `\Zenbase\Context` in the closure signature** — `\Zenbase\Context` exists only in local IDE stubs (`zenbase-stubs.php`); the runtime injects `ZenbaseFunctionContext`, so a native type-hint throws a `TypeError`. Put `/** @var \Zenbase\Context $context */` **inside** the closure body instead.
- **Function slug**: unique per app, max 64 chars, matches `^[a-zA-Z0-9_-]+$`.

```php
<?php

return function ($event, $context) {
    /** @var \Zenbase\Context $context */

    if (! $context->auth->check()) {
        return [
            'status' => 401,
            'data' => ['message' => 'Authentication required.'],
        ];
    }

    $name = trim((string) ($event['payload']['name'] ?? ''));
    if ($name === '') {
        return [
            'status' => 422,
            'data' => ['message' => 'The name field is required.'],
        ];
    }

    $record = $context->database->collection('items')->create([
        'name' => $name,
        'owner_id' => $context->auth->id(),
    ]);

    return [
        'status' => 201,
        'data' => ['item' => $record],
    ];
};
```

## 3. Runtime API Reference (`$event` & `$context`)

### `$event`
- `$event['payload']`: incoming JSON body / request params. Always prefer `$event['payload']['key']` over top-level `$event['key']` to avoid collisions with `'payload'` and `'headers'`.
- `$event['headers']`: HTTP headers. Via `/api/v1`, header names are lowercase and values are string arrays (`$event['headers']['x-signature'][0] ?? ''`).

### `$context`
- **`$context->database`**:
  - `$context->database->collection($name)` -> `where($field, $op, $val)`, `orderBy($field, $dir)`, `limit($n)` (max `1000`), `offset($n)`, `get()`, `find($id)`, `create($data)`, `update($id, $partial)`, `delete($id)`, `getSchema()`, `setSchema($schema)`.
  - `$context->database->listCollections()`, `count($collection, $filters)`, `paginate($collection, $page, $perPage)`.
- **`$context->storage`**:
  - `upload($path, $contents, $mimeType = 'text/plain')` (alias `put()`), `list(?$folder = null)`, `delete($fileIdOrPath)`.
- **`$context->auth`**:
  - `check(): bool`, `user(): ?array`, `id(): ?string`, `email(): ?string`.
- **`$context->env`**:
  - Associative array `array<string, string>` merging app-level secrets and function-level overrides (function-level wins). Always check for missing keys gracefully (`$context->env['KEY'] ?? ''`).
- **`$context->mail`** (`\Zenbase\MailManager` — transactional email with validation & rate limiting):
  - `send(array $options): array` (sends immediately) and `queue(array $options): array` (queues asynchronously — recommended for slow SMTP transports to stay well under the 5-second timeout).
  - Required options: `to` (`string|string[]`), `subject` (`string`, max `200` chars), and at least one of `html` or `text` (`string|null`, max `100 KB` each).
  - Optional options: `cc` (`string|string[]`), `bcc` (`string|string[]`), `reply_to` (`string`), `from_name` (`string`, max `80` chars; defaults to app name while keeping the platform `From` address).
  - Returns `['sent' => bool, 'queued' => bool, 'to' => string[], 'cc' => string[], 'bcc' => string[], 'subject' => string]`.
  - Safeguards (default limits, configurable per app in Rate Limits settings): max **5 emails/invocation**, max **10 combined recipients** (`to` + `cc` + `bcc`) per email, **30 emails/minute** per app, and CR/LF header-injection rejection on emails, `subject`, and `from_name`.
- **`$context->http`** (`\Zenbase\HttpClient` — outbound HTTPS client with strict anti-SSRF protection):
  - Fluent immutable modifiers (each returns a cloned instance sharing the invocation request counter): `withHeaders(array $headers)` (`Host` header and CR/LF rejected), `withToken(string $token, string $type = 'Bearer')`, `timeout(int $seconds)` (clamped `1`–`4`s, default `3`s).
  - Request methods: `get($url, $query = [])`, `post($url, $data = [])`, `put($url, $data = [])`, `patch($url, $data = [])`, `delete($url, $data = [])`, `request($method, $url, $options = [])` (`GET`, `POST`, `PUT`, `PATCH`, `DELETE`, `HEAD`). Passing an array `$data` encodes JSON automatically; passing a string sends a raw body; `$options` accepts `query`, `json`, `body`.
  - Returns `['status' => int, 'ok' => bool, 'body' => string, 'json' => mixed, 'headers' => array<string, string[]>]` (response headers lowercased; `body` truncated at **512 KB**).
  - Anti-SSRF rules & quotas: **HTTPS only on port 443** (blocks `http://`, custom ports, and embedded `user:pass@`), blocks local/internal hosts (`localhost`, `*.local`, `*.internal`, `*.home.arpa`, `metadata.google.internal`, etc.) and private/loopback/link-local/CGNAT/reserved IPv4 & IPv6 addresses including DNS resolution, **HTTP redirects disabled** (`withoutRedirecting`), default max **5 requests/invocation** (configurable per app), timeout `1`–`4`s.

```php
<?php

return function ($event, $context) {
    /** @var \Zenbase\Context $context */

    $apiKey = $context->env['EXTERNAL_API_KEY'] ?? '';
    if ($apiKey === '') {
        return ['status' => 500, 'data' => ['message' => 'Missing EXTERNAL_API_KEY secret.']];
    }

    $res = $context->http
        ->withToken($apiKey)
        ->timeout(3)
        ->post('https://api.example.com/v1/notify', [
            'order_id' => $event['payload']['order_id'] ?? null,
        ]);

    if (! $res['ok']) {
        return ['status' => 502, 'data' => ['upstream_status' => $res['status']]];
    }

    $mail = $context->mail->queue([
        'to' => (string) ($event['payload']['email'] ?? ''),
        'subject' => 'Order confirmed',
        'html' => '<p>Your order has been confirmed.</p>',
        'text' => 'Your order has been confirmed.',
    ]);

    return ['status' => 200, 'data' => ['notified' => true, 'mail' => $mail]];
};
```

### Return Value & Logging
- Return `['status' => <100..599>, 'data' => <mixed>]` to control the HTTP status code. Any other return value defaults to HTTP `200` wrapped in `data`.
- `echo` / `print` output is captured via output buffering into the execution log (`output` field, last 50 runs kept) without breaking the JSON response.

## 4. Sandbox Restrictions & Limits

Static lexical analysis (`token_get_all`) blocks deployment and execution if the code contains any of:
- **Backtick operator** (`` `...` ``)
- **Language constructs**: `eval`, `include`, `include_once`, `require`, `require_once`, `exit`, `die`
- **Process / shell**: `exec`, `shell_exec`, `system`, `passthru`, `proc_open`, `popen`, `pcntl_*`, `posix_*`
- **Dynamic evaluation**: `assert`, `create_function`, `dl`
- **Server filesystem**: `file_get_contents`, `file_put_contents`, `fopen`, `fwrite`, `unlink`, `rmdir`, `mkdir`, `chmod`, `chown`, `symlink`, `link`
- **Raw sockets / cURL**: `fsockopen`, `pfsockopen`, `stream_socket_client`, `stream_socket_server`, `curl_exec`, `curl_multi_exec`
- **Server env / config**: `phpinfo`, `getenv`, `putenv`, `ini_set`, `ini_alter`, `apache_setenv`

Always use the sandboxed `$context` APIs instead: `$context->storage` for files, `$context->env` for secrets, `$context->mail` for transactional emails, and `$context->http` for outbound HTTPS API calls.

Hard & default limits: **5-second execution timeout**, **1 MB** max `.php` file size, **1000** documents max per query, **512 KB** max HTTP response body, **100 KB** max email body (`html`/`text`), and per-app configurable rate limits (defaults: **5 HTTP requests/invocation** with **1–4s** timeout, **5 emails/invocation**, **10 recipients/email**, **30 emails/min**).

## 5. Deploy & Verification Workflow

1. Validate inputs, auth checks, and missing env keys inside the function.
2. Deploy with `upsert_function` (requires MCP `read_only: false` and `allow_functions: true`) or save as a local `.php` file for Dashboard import.
3. Ask for user confirmation before invoking functions with side effects, then test using `invoke_function` with a representative payload (plus an invalid-input payload to verify `4xx` handling).
4. Inspect execution output and duration (`meta.duration_ms`) — confirm it finishes well under the 5-second timeout and leaves no unintended test records.
