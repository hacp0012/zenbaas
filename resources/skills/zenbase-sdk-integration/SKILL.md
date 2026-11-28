---
name: zenbase-sdk-integration
description: >-
  Guides AI agents when integrating the @zenbase/sdk client in JavaScript, TypeScript,
  React, Next.js, Vue, Svelte, or Node.js applications connected to a Zenbase BaaS backend.
  Use when initializing Zenbase, querying NoSQL JSON1 collections, generating TypeScript
  types from Zenbase schemas, implementing tenant authentication (password or 6-digit OTP),
  uploading files to Zenbase Storage or ZenbaseBlob, or invoking PHP Web Functions.
---

# Zenbase SDK Integration (`@zenbase/sdk`)

Use this workflow whenever building or updating an application that consumes a Zenbase backend via `@zenbase/sdk`.

## 1. Security & Client Initialization Rules

- **Browser / frontend / mobile clients**: ALWAYS use the **public key (`zb_pub_...`)** via public env vars (e.g., `VITE_ZENBASE_PUBLIC_KEY`, `NEXT_PUBLIC_ZENBASE_PUBLIC_KEY`). Access is enforced by the app's CORS allowlist.
- **Server-side only (Node.js, API routes, workers, scripts)**: Use the **secret key (`zb_sec_...`)** from server-only env vars (`ZENBASE_SECRET_KEY`). NEVER expose `zb_sec_...` in client bundles, logs, or committed files.
- **Endpoint normalization**: Pass the base URL via an environment variable such as `VITE_ZENBASE_ENDPOINT` or `ZENBASE_ENDPOINT` (e.g., `https://api.example.com`); the SDK appends `/api/v1` automatically.

```typescript
import { Zenbase } from '@zenbase/sdk';

// Client (browser)
export const zb = new Zenbase({
  endpoint: import.meta.env.VITE_ZENBASE_ENDPOINT,
  apiKey: import.meta.env.VITE_ZENBASE_PUBLIC_KEY, // zb_pub_...
});

// Server (Node.js / API route only)
export const zbAdmin = new Zenbase({
  endpoint: process.env.ZENBASE_ENDPOINT!,
  apiKey: process.env.ZENBASE_SECRET_KEY!, // zb_sec_...
  timeoutMs: 10000,
});
```

## 2. Schema-First Typing Workflow (When Zenbase MCP Is Connected)

Before writing collection queries or TypeScript interfaces:
1. Inspect the live app via MCP: call `list_collections` and `get_collection_schema` (or read `zenbase://collections/{collection}/schema` and `zenbase://docs/sdk-js`).
2. Generate TypeScript interfaces matching each collection's real `fields` (`string`, `number`, `boolean`, `object`, `array`, `blob` -> `ZenbaseBlobValue`).
3. Pass the interface as the generic argument to `zb.collection<T>('name')`.

```typescript
import type { ZenbaseDocument } from '@zenbase/sdk';

export interface Product {
  name: string;
  price: number;
  in_stock: boolean;
}

const { data, error } = await zb
  .collection<Product>('products')
  .where('in_stock', '==', true)
  .orderBy('created_at', 'desc')
  .paginate({ page: 1, perPage: 20 });
```

## 3. Standard Error Handling (`{ data, error }`)

Every async SDK method returns `{ data, error, meta? }` instead of throwing on API failures.
- ALWAYS check `if (error)` before reading `data`.
- Note on `.get()` / `.select()`: returns an iterable hybrid `ZenbaseQueryResult<T>` that also exposes `.data` and `.error`. Prefer destructuring `const { data, error } = await zb.collection<T>('items').get()` for explicit error handling.

## 4. Module Cheat Sheet & Pitfalls

### Database (`zb.collection<T>(name)` / `zb.database`)
- Supported `where` operators: `'=='`, `'='`, `'!='`, `'<>'`, `'>'`, `'>='`, `'<'`, `'<='`, `'contains'`, `'like'`, `'in'` (shorthands: `.whereIn(field, values)`, `.whereContains(field, value)`).
- `.limit(n)` is capped at `1000` server-side. Use `.paginate()` for UI lists.
- `.update(id, partial)` merges top-level JSON keys by default. Use `.replace(id, fullDoc)` or `.update(id, fullDoc, true)` only when intentional full replacement is needed.
- Binary fields in documents: use `ZenbaseBlob` (`zb.blob.fromBlob()`, `fromUint8Array()`, `fromBase64()`, `toDataUrl()`, `isBlob()`) for small embedded payloads; prefer `zb.storage` for user files and media.

### Authentication (`zb.auth`)
- Methods: `signUp(email, password)`, `signInWithPassword(email, password)` (alias `signIn`), `sendOtp(email)` -> `verifyOtp(email, code)`, `getUser()`, `updatePassword(current, next)`, `signOut()`.
- After sign-in/sign-up/OTP verification, the SDK automatically attaches the tenant user token (`zb_token_...`) to subsequent requests (including `zb.functions.invoke()`).
- Subscribe to session transitions with `zb.auth.onAuthStateChange((event, session) => ...)` and call the returned unsubscribe function on component unmount.

### Storage (`zb.storage`)
- `upload(path, file, { folder, filename, mimeType })` — handle quota errors (`413`) gracefully.
- Use `list(folder?)`, `getUsage()`, `getPublicUrl(idOrPath)`, `getDownloadUrl(idOrPath)`, `download(idOrPath)`, `delete(idOrPath)`, `deleteMany(ids)`.

### Web Functions (`zb.functions`)
- Invoke with typed response: `const { data, error, meta } = await zb.functions.invoke<MyResponse>('slug', payload, { headers })`.
- Never pass secrets in the client payload; read secrets server-side inside the Web Function via `$context->env`.

## 5. Verification Checklist

Before finishing an integration task:
1. Confirm no `zb_sec_` string appears in frontend source files or client env variables.
2. Confirm every SDK call handles `error !== null`.
3. Confirm TypeScript types compile (`tsc --noEmit` / project typecheck) and match live collection schemas.
4. For browser apps, remind the user to whitelist their frontend origin in the Zenbase Dashboard CORS settings.
