# Code Style

> General principles (stack-agnostic) + a Stack-specific block that `/init-project` fills for the real language.

---

## General principles (do not change per stack)

### Function size & complexity
- Function ≤ **30 lines** (single responsibility)
- Cyclomatic complexity ≤ **10**
- No nested ternaries → use if/else
- Prefer async over callbacks/promise-chains where the language supports it

### Constants over magic values
```
// ❌ Bad:  if (priority > 3) ...   return 422
// ✅ Good: const MAX_PRIORITY = 3; const HTTP_UNPROCESSABLE = 422
```

### Error handling
- try/catch (or the language equivalent) only at the **boundary** (route handlers, top-level async, CLI entry)
- No scattered error handling inside logic functions
- Throw/raise only when something is genuinely abnormal — NOT for control flow
- Error messages are short and user-facing — never leak stack traces or internals

### Naming conventions (general)
| Item | Convention | Example |
|------|-----------|---------|
| Task code | `TASK-XXX` (3 digits) | `TASK-001` |
| Flow code | `FLOW-XXX` | `FLOW-001` |
| Branches | `type/description` | `feat/user-auth` |
| Commits | `type(scope): desc [TASK-XXX]` | `feat(auth): add login [TASK-005]` |
| Constants | SCREAMING_SNAKE | `MAX_PRIORITY` |

File / function / variable / type casing → idiomatic to the language (filled in the Stack-specific block).

---

## Stack-specific (filled by `/init-project` — NO placeholders once configured)

<!-- INIT-PROJECT: rewrite the block below for the real language/framework -->

### Imports / modules
- **ESM everywhere in source** (`import`/`export`), no `require`. Root + frontend + shared are `module: ESNext`; backend compiles to CommonJS via `tsc` but you still author ESM syntax.
- `moduleResolution: bundler` (root/frontend) — **no `.js` extension** on relative imports. Backend uses `node` resolution; keep imports extensionless too.
- Cross-package: import from the workspace package name (`@voucher/shared`), never a deep relative path like `../../shared/src`.
- Order: node builtins → third-party → workspace (`@voucher/*`) → local relative. One blank line between groups.
- No circular imports between `backend` / `frontend` / `shared`. `shared` must not import from `backend` or `frontend`.

### Type system
- `strict: true` is on — honor it. Avoid `any`; use `unknown` then narrow with type guards.
- `noUnusedLocals` / `noUnusedParameters` are on — no dead bindings (prefix intentionally-unused params with `_`).
- Mark immutable data `readonly` / `as const`. Prefer `interface` for object shapes, `type` for unions/aliases.
- Share request/response DTOs and enums from `@voucher/shared` — never redeclare a type that already lives there.
- No `// @ts-ignore`; use `// @ts-expect-error` with a one-line reason only when unavoidable.

### Number / parsing / null safety
- Parse explicitly: `Number.parseInt(x, 10)`, `Number.parseFloat(x)`. Guard with `Number.isNaN` / `Number.isFinite`, never global `isNaN`.
- Prefer `??` (nullish coalescing) and `?.` (optional chaining) over `||` for defaults, so `0`/`""`/`false` aren't swallowed.
- Distinguish `null` (explicit absence) from `undefined` (not set) consistently — match Prisma's nullable convention at the DB boundary.
- Validate and coerce all external input (req params/query/body) at the route boundary before use.

### Database / persistence (`has_database = true`)
- **Prisma is the only DB access path.** Use the generated client — never raw string-interpolated SQL. If `$queryRaw` is unavoidable, use the tagged-template form (`$queryRaw\`... ${val}\``) so values are parameterized.
- A **single** `PrismaClient` instance, exported from one module and imported everywhere (no per-request `new PrismaClient()`).
- Migrations via `prisma migrate` only; schema lives in `backend/prisma/schema.prisma`. Migrations are committed and forward-only — never hand-edit an applied migration.
- Wrap multi-write operations that must succeed together in `prisma.$transaction`.

### File & symbol naming (idiomatic)
| Item | Convention | Example |
|------|-----------|---------|
| Files | kebab-case `.ts` (modules), PascalCase `.tsx` (React components) | `voucher-service.ts`, `VoucherCard.tsx` |
| Functions / variables | camelCase | `getVoucherById` |
| Types / Interfaces / Classes / React components | PascalCase | `VoucherDto`, `OrderService` |
| Constants | SCREAMING_SNAKE | `MAX_PRIORITY` |
| DB models / fields (Prisma) | PascalCase model → camelCase fields; mapped to snake_case table/columns via `@@map` / `@map` | `model Voucher { createdAt }` → `vouchers.created_at` |
