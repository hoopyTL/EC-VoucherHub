# API Conventions

> Applies ONLY when `capabilities.has_http_api = true`. REST design + HTTP semantics (stack-agnostic) + a framework-specific example block filled by `/init-project`.
> If the project has NO HTTP API → `/init-project` tells the user and may delete this file.

---

## Resource naming
- Plural lowercase: `/todos` ✅ · `/todo` ❌ · `/getTodos` ❌
- No verbs in the path — use the HTTP method
- Nested: `/users/:id/todos` instead of `/usertodos`
- Kebab-case for multi-word: `/auth-tokens`

## HTTP semantics
| Code | When to use |
|------|-------------|
| 200 | Read succeeded, has body |
| 201 | Create succeeded, returns the new resource |
| 204 | Succeeded, no body (typically DELETE) |
| 400 | Validation error (bad format, missing required, parse failure) |
| 401 | Authentication missing/invalid |
| 403 | Authenticated but lacks permission |
| 404 | Resource does not exist |
| 409 | Conflict (duplicate, version mismatch) |
| 415 | Unsupported Content-Type |
| 422 | Semantically invalid (correct format but business rule fails) |
| 429 | Rate limit (with `Retry-After`) |
| 500 | Server error |
| 502/503 | Upstream/downstream failure |

## Method semantics
| Method | Idempotent | Body | Use case |
|--------|-----------|------|----------|
| GET | Yes | No | Read |
| POST | No | Yes | Create / non-idempotent action |
| PUT | Yes | Yes | Replace entirely |
| PATCH | No | Yes | Partial update |
| DELETE | Yes | No | Delete |

## Response wrapper (general)
Every endpoint returns a consistent shape:
```
{ "success": true,  "data": <T> }
{ "success": false, "error": "<message>" }
```
NEVER return a naked object. The client always checks `success` before reading `data`.

Multi-field errors:
```json
{ "success": false, "error": "validation failed",
  "details": [ { "field": "title", "message": "required" } ] }
```

## Validation flow
```
Request → validate (boundary) → error if invalid → logic/persistence → response
```
- Validate BEFORE touching the DB/logic
- Required fields, enum whitelist, numeric IDs, length/range
- Short user-facing messages — never leak stack/internals

## Pagination
- **Cursor** for large/mutable sets: `?cursor=X&limit=N` (+ `next_cursor`)
- **Offset** (`?page=N&size=N`) only for small/immutable lists
- Default limit 20-50, hard cap 100-500

## Filter & Bulk
- Filters in the query string, NOT in the body
- AND by default; OR must be explicit (`?priority=high,medium`)
- Bulk → dedicated endpoint `/<resource>/bulk` (POST)

## Date / Headers / CORS / Rate limit
- Date: ISO 8601 UTC (`2026-05-03T14:30:00Z`); the server stores UTC
- Auth: `Authorization: Bearer` or `X-API-Key` — NEVER a token in the query string
- Response: `X-Request-Id` for tracing; `Cache-Control: no-store` for sensitive data; `Retry-After` for 429/503
- CORS: whitelist specific origins, NEVER `*` when cookies/auth are involved
- Rate limit: `429` + `Retry-After` + `X-RateLimit-*`

## Breaking changes (require a version bump)
Removing a response field · changing a field type · switching 2xx↔4xx · switching required↔optional · changing enum values · changing URL structure.
Non-breaking: adding an optional field, adding an endpoint, adding an enum value (clients default-handle it).

---

## Stack-specific — Route handler pattern (filled by `/init-project`)

<!-- INIT-PROJECT: replace the example with the real framework (Hono/Express/FastAPI/Gin/Axum/Spring...) -->

> Three-step pattern: (1) parse + validate → return errors early; (2) logic/persistence; (3) normalize + return the wrapper.

`__FILL__`
