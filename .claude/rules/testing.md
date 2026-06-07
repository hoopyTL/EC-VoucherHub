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
> e.g. `npm test` / `pytest` / `go test ./...` / `cargo test`. Watch + coverage if available.

`__FILL__`

### Required pattern (boilerplate sample test file)
> Setup/teardown, helper to call the API/CLI, how to assert. Copy-pasteable.

`__FILL__`

### Assertion style
> e.g. (node:test): `assert.equal`, NOT `expect`. (pytest): `assert x == y`. (Go): `if got != want { t.Fatalf }`.

`__FILL__`

### Test config / isolation
> e.g. DB `:memory:`, env `NODE_ENV=test`. File naming: `<feature>.test.ts` / `test_<feature>.py` / `<feature>_test.go`.

`__FILL__`

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
`__FILL__`

### E2E anti-patterns
- ❌ Hard sleeps · ❌ Untagged tests (no `@FLOW-XXX`) · ❌ Bypassing the UI to hit the DB directly · ❌ Order-dependent tests · ❌ CSS-class selectors
