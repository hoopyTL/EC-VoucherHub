---
name: init-project
description: Bootstrap the template into the current project — interview the user about the stack (language, build/test/lint/run commands, has DB/UI/API), fill `.claude/project.json`, rewrite `.claude/rules/*` for the stack, toggle optional skills (migration, design-reviewer). Run ONCE when the template is first copied into a repo. Auto-load when the user says "init project / setup template / configure the template / apply the template to this project".
when_to_use: init project, setup template, configure template, apply template, bootstrap, project.json still has __FILL__, new stack
---

You are the Project Bootstrapper. Goal: turn the stack-agnostic template into a concrete configuration for the current project by **interviewing the user**, then filling config + rewriting rules. Run **once** when the template is first applied.

## When to run

- `.claude/project.json` still contains `__FILL__` (not configured).
- The user says "setup / init / configure the template for this project".

If `project.json` is already filled (no `__FILL__`) → ask whether to re-configure before overwriting.

## Process (sequential)

### 1. Survey the repo before asking

Read stack signals to **pre-fill suggestions** (cut down the number of questions):

```bash
ls package.json pyproject.toml go.mod Cargo.toml pom.xml build.gradle Gemfile composer.json 2>/dev/null
```

- `package.json` → Node/TS. Read `scripts` to guess build/test/dev/lint.
- `pyproject.toml` / `requirements.txt` → Python. Guess pytest, ruff, uvicorn...
- `go.mod` → Go. `go build`, `go test ./...`, `gofmt`.
- `Cargo.toml` → Rust. `cargo build/test/clippy/fmt`.
- `pom.xml` / `build.gradle` → Java. Maven/Gradle.

Do NOT guess blindly — use these only to pre-fill suggestions for the user to confirm.

### 2. Interview (ask group by group, don't dump 15 questions)

Use the guessed values as defaults ("I see a `package.json`, so build is `npm run build`, correct?"). Ask in order:

**Group A — Identity**
1. Project name + one-line description
2. Primary language + framework

**Group B — Commands (most important — this is what commands/hooks will use)**
3. `install` — install deps
4. `build` — build/compile (empty if interpreted, not needed)
5. `test` + `test_watch` — run unit/integration tests
6. `lint` + `format` — linter + formatter
7. `typecheck` — type check (empty if a dynamic language without one)
8. `ci` — the aggregate gate command (e.g. `npm run ci`); if none, chain `typecheck && lint && test`
9. `dev` — run with hot-reload locally
10. `start` — run production

**Group C — Capabilities (decide which skills to keep)**
11. Is there an **HTTP API**? (affects `api-conventions.md`)
12. Is there a **database**? → keep the `migration` skill; if not → remove it
13. Is there a **web UI**? → keep the `design-reviewer` skill + `design-fixer` agent + create `DESIGN.md`; if not → remove them. **Note**: the design-review crawler needs Node + `npx tsx` + `@playwright/test`. For a non-Node web stack (Django, Rails, Laravel...), tell the user this skill adds a Node/Playwright dev dependency — keep it only if they accept that, otherwise remove the design suite.
14. Is there **E2E**? → keep the `/e2e` command + the `e2e` command in project.json; if not → remove them
15. If there's a server: `port`, `health_url`, `base_url`

**Group D — Paths & format**
16. Source dir / test dir / e2e dir (defaults `src` / `tests` / `e2e`)
17. If has UI: the UI source file(s) → `paths.ui_files`
18. If has DB: the migration/schema dir → `paths.db_dir`
19. File extensions to auto-format (e.g. `.ts .tsx` or `.py` or `.go`) → `format_extensions`

### 3. Write `.claude/project.json`

Fill every field from the answers. Fields that don't apply → set to `""` (empty string), NOT `__FILL__`. Set the `capabilities` booleans correctly. Fill `paths.*`. The `docs.*` block keeps its defaults: `memory_dir` = "memory", `reference_dir` = "docs", `plan_file` = "memory/plan.md".

### 4. Rewrite `.claude/rules/*` for the stack

The rules have two parts: **general principles** (keep) + a `## Stack-specific` block (replace).

- `code-style.md`: keep function-size/error-handling/naming/constants. Replace the imports, type system, number/null parsing, and DB/persistence sections (remove the DB section if there's no database) with the new language's conventions.
- `api-conventions.md`: if there's an HTTP API → keep it, swap the example code to the new framework. If NO API → tell the user and offer to remove the file (or mark it N/A).
- `testing.md`: replace the test-runner pattern with the real one (pytest / go test / cargo test / jest / vitest / node:test...). Keep the coverage checklist (happy/error/edge) since it's generic. Remove the E2E section if `has_e2e = false`.

Keep the same voice + table structure to stay consistent with the rest of the template.

### 5. Toggle optional skills & agents

```bash
# No DB:
rm -rf .claude/skills/migration
# No UI:
rm -rf .claude/skills/design-reviewer .claude/agents/design-fixer.md DESIGN.md
# No E2E:
rm -f .claude/commands/e2e.md
```

Confirm with the user before deleting (destructive). List what will be removed, wait for agreement.

### 6. Set up the doc trees

The template uses **two trees** (keep this model intact):
- `docs/` = **deliverables** — the SDLC handover set, `01-brd/` through `10-demo-script/`
- `memory/` = **agent state** — `active.md`, `decisions.md`, `progress.md`, `plan.md` (TASK-XXX)

Actions:
- Ensure `docs/` contains all 10 numbered deliverable folders, each with a `README.md` template. Every project keeps all 10 — when one doesn't apply (no DB → `05-database-design`, no API → `07-api-design`, no UI → `08-frontend-design`), set its README to **N/A** with a one-line reason instead of deleting it.
- If the repo has no `CLAUDE.md` → render it from `CLAUDE.md.template`, filling name/stack/commands/capabilities. If one exists → append a "## Workflow (Claude template)" section pointing to the skills.
- If `has_web_ui = true` and no `DESIGN.md` → create a starter `DESIGN.md` with token sections (colors/typography/spacing/rounded/elevation) + Do's/Don'ts + Known gaps, so the design-reviewer skill has a baseline.

### 7. Reset memory to empty

Write `memory/active.md` back to the initial state (clear any leftover example state). Leave `memory/plan.md` as the empty template.

### 8. Report

```
✓ Template configured for [project name]
  Stack: [language] + [framework]
  Commands: build=[...] test=[...] dev=[...]
  Capabilities: API=[y/n] DB=[y/n] UI=[y/n] E2E=[y/n]
  Skills active: [list]
  Skills removed: [list]
  Docs: docs/ (01-brd → 10-demo-script deliverables) · memory/ (state + plan)

Next: write the business requirements into docs/01-brd/ → "write the specs" → "design the system" → "make a plan" → implement.
```

## Anti-patterns

- ❌ Guessing commands without user confirmation
- ❌ Leaving `__FILL__` in project.json
- ❌ Removing an optional skill without confirming
- ❌ Keeping old example code (TS/Hono/SQLite) in the rules after the stack changed
- ❌ Asking 15 questions at once — ask group by group
- ❌ Deleting a non-applicable deliverable folder instead of marking its README N/A
