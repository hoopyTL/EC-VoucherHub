# Testing Rules

> Coverage checklist + anti-patterns (stack-agnostic) + a Stack-specific block (real test runner) filled by `/init-project`.

---

## General principles (do not change per stack)

### Coverage checklist (per feature/resource)

**Happy paths**: create → success code; list → ok; read one → ok; update → ok; delete → ok.

**Error paths**: missing required → validation error; invalid enum/format → error; malformed body → error; not-found id → 404-equivalent; invalid id format → error; update non-existent → not-found; empty update → error.

**Filters** (if any): each param alone works; multiple params combine as AND; no match → empty; invalid param → error.

**Edge cases**: whitespace-only string → reject; boundary numbers (0, negative, MAX); nullable set to null vs undefined; side-effects (updated_at / audit) are correct.

### Test rules (general)
- 1 test = 1 logical assertion (don't bundle multiple behaviors in one test)
- Each test is **independent**, never order-dependent
- Reset state in setup (`beforeEach` or equivalent) — no leak between tests
- Cleanup in teardown — no leaked connection/process
- Test through the **real boundary** (HTTP/CLI), not internal helpers unit by unit unless the logic is complex and isolated

### Anti-patterns (general)
- ❌ Mocking the thing that catches real bugs (DB, filesystem) when a real lightweight option (in-memory) exists
- ❌ Skipping teardown → leak
- ❌ Skipping reset → order-dependent tests
- ❌ Hard sleep/timeout to "wait" → flaky
- ❌ Re-running with repeat to "pass on the last try" → masks flakiness

---

## Stack-specific (filled by `/init-project`)

<!-- INIT-PROJECT: replace with the real test runner (pytest / go test / cargo test / jest / vitest / node:test ...) -->

### Test runner & commands
**Vitest** is the unit/integration runner.
- Run all: `npm test` (delegates `npm run test --workspaces --if-present`)
- One workspace: `npm test --workspace=backend`
- Watch: `npx vitest --watch`
- Coverage: `npx vitest run --coverage` (v8 provider)
- Single file/test: `npx vitest run path/to/x.test.ts -t "name"`

### Required pattern (boilerplate sample test file)
Integration test through the real HTTP boundary with `supertest` against the Express app, using a real (test) Prisma DB — reset state in `beforeEach`.

```ts
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { app } from "../src/app";
import { prisma } from "../src/db";

describe("vouchers", () => {
  beforeEach(async () => {
    await prisma.voucher.deleteMany(); // reset — no leak between tests
  });
  afterAll(async () => {
    await prisma.$disconnect(); // teardown — no leaked connection
  });

  it("creates a voucher → 201 + wrapper", async () => {
    const res = await request(app)
      .post("/vouchers")
      .send({ title: "10% off", price: 100 });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.title).toBe("10% off");
  });

  it("rejects missing title → 400", async () => {
    const res = await request(app).post("/vouchers").send({ price: 100 });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});
```

### Assertion style
- Vitest `expect`: `expect(x).toBe(y)`, `toEqual` (deep), `toMatchObject`, `rejects.toThrow`.
- One logical assertion per test. Assert the **status code AND the `success` flag** on every API test (the wrapper is mandatory — see api-conventions).
- Import test globals (`describe`/`it`/`expect`) explicitly, or enable `globals: true` in vitest config — be consistent across the workspace.

### Test config / isolation
- File naming: `<feature>.test.ts` (co-locate under the workspace `src`, or a `__tests__` folder).
- `NODE_ENV=test`; point Prisma at a **dedicated test database** via `DATABASE_URL` (a separate schema/file, never the dev DB). Reset with `deleteMany` / a truncate helper in `beforeEach`.
- Each test independent and order-independent — no shared mutable module state, no relying on a previous test's rows.
- Never mock Prisma in integration tests — use the real test DB so migrations/constraints are exercised (mock only true externals like payment gateways).

---

## E2E (only when `capabilities.has_e2e = true` — `/init-project` keeps this block, otherwise deletes it)

<!-- INIT-PROJECT: if has_e2e=false, delete the entire E2E section. If true, fill per tool (Playwright/Cypress/...) -->

### Mandatory flow tagging
Tag each test with its business flow code (defined in `docs/02-srs/`):
```
describe('@FLOW-001 <flow name>', () => { it('happy path', ...) })
```
Run a single flow: `<e2e cmd> --grep @FLOW-001`.

### Selectors (priority order, stack-agnostic)
1. `data-testid` (preferred) · 2. Role + accessible name · 3. Text (static label) · 4. CSS (last resort)
Avoid id/class-based selectors (fragile).

### Wait & assertion
- Auto-retrying assertions (preferred), NO hard sleeps
- Conditional network/element waits, never `waitForTimeout(N)`

### E2E tool-specific
**Playwright** — config at `e2e/playwright.config.ts`, run with `npm run test:e2e`.
- Single flow: `npm run test:e2e -- --grep @FLOW-001`.
- Selectors: `page.getByTestId("...")` → `getByRole(role, { name })` → `getByText(...)`. Add `data-testid` to React components rather than reaching for CSS.
- Waits: rely on Playwright's auto-retrying web-first assertions (`await expect(locator).toBeVisible()`); use `page.waitForResponse` / `waitForURL` for network or navigation. Never `page.waitForTimeout(N)`.
- Use `webServer` in the config to boot the app (`npm run dev`) before the suite; isolate auth/state with fixtures, reset the test DB between runs.

### E2E anti-patterns
- ❌ Hard sleeps · ❌ Untagged tests (no `@FLOW-XXX`) · ❌ Bypassing the UI to hit the DB directly · ❌ Order-dependent tests · ❌ CSS-class selectors
