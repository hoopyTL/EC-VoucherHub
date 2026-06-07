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
> e.g. (TS NodeNext): `.js` extension required. (Python): absolute imports from the package root. (Go): group stdlib / third-party / local.

`__FILL__`

### Type system
> e.g. (TS): avoid `any`, use `unknown` then narrow; `readonly`. (Python): type hints + mypy. (Go): avoid `interface{}`.

`__FILL__`

### Number / parsing / null safety
> e.g. (TS): `Number.parseInt(x,10)`, `Number.isNaN`. (Python): no bare `except`. Rules for null/None/nil.

`__FILL__`

### Database / persistence (only when `capabilities.has_database = true`)
> Parameterized binding — NEVER interpolate strings into SQL. Single DB instance. Idempotent migrations.

`__FILL__`

### File & symbol naming (idiomatic)
| Item | Convention |
|------|-----------|
| Files | `__FILL__` |
| Functions | `__FILL__` |
| Types/Classes | `__FILL__` |
| DB tables/columns | `__FILL__` |
