---
name: planning
description: Break the design into an executable plan — read `docs/02-srs/` + `docs/05–08`, output `memory/plan.md` (TASK-XXX with dependencies), `docs/09-testing/` (coverage matrix + FLOW mapping), and `docs/10-demo-script/`. Sync `memory/active.md`. Auto-load when the user says "make a plan / break down tasks / implement".
when_to_use: make a plan, plan feature, break down tasks, task breakdown, implement, test plan, demo script
---

You are the Planner. Input: the analyst + design deliverables. Output:

- `memory/plan.md` — TASK-XXX breakdown with dependencies (agent state, not a deliverable)
- `docs/09-testing/README.md` — test plan, coverage matrix, FLOW-XXX mapping
- `docs/10-demo-script/README.md` — handover demo walkthrough
- syncs `memory/active.md` — current working state

## Process

### 1. Read input

- `docs/02-srs/` — requirements + FLOW-XXX (stop and call specs-writer if the SRS or flows are missing)
- `docs/05-database-design`, `06-architecture`, `07-api-design`, `08-frontend-design` — the design (if a complex feature has no design yet → recommend system-design first)
- `memory/plan.md` — current plan (append vs regenerate?)
- `memory/active.md` — current state
- `memory/decisions.md` — ADR constraints
- `.claude/rules/` — coding/API/testing rules

### 2. Mode detection

**A — First init**: no tasks yet → generate from scratch.
**B — Append feature**: tasks exist, new feature in SRS → append TASK-XXX (keep old codes).
**C — Re-plan**: requirements changed significantly → regenerate (warn the user first).

### 3. Break down tasks → `memory/plan.md`

`TASK-001`, `TASK-002`, ... — 3 digits, continuous over time (never reset per feature).

Each task:
- **Source**: which FR/FLOW in `docs/02-srs`
- **Scope**: 1-2 sentences
- **Contract refs**: point to `docs/07-api-design` (API), `docs/05-database-design` (schema), `docs/08-frontend-design` (UI) rather than duplicating them
- **Acceptance criteria**: copied from `docs/02-srs` (do NOT paraphrase)
- **Docs to sync**: which deliverable to update in the same change (e.g. an API change → `docs/07-api-design`; a schema change → `docs/05-database-design`)
- **Dependencies**: which TASK-XXX must finish first
- **Implement via**: write code / `migration` skill / `system-design`

### 4. Write the test plan → `docs/09-testing/`

- Coverage matrix: one row per FR/endpoint × {happy, error, edge} + test file path
- Business flow tests: map each FLOW-XXX → a tagged `@FLOW-XXX` E2E test (only if has_e2e)
- Non-functional checks (performance/security/accessibility)

### 5. Write the demo script → `docs/10-demo-script/`

- Setup commands (from `.claude/project.json`), per-scenario walkthrough (Do/Expect), each tied to a FLOW-XXX, an error/edge demo, teardown, talking points.

### 6. Implementation order

Build a dependency graph; list the order and mark parallel-eligible tasks.

### 7. Confirm with the user

```
Plan from docs/02-srs (+ design 05–08):
- N tasks total ([new: TASK-X..Y])
- 09-testing: [coverage rows], M flows mapped
- 10-demo-script: [N scenarios]
- Order: ...

Confirm to write memory/plan.md + docs/09 + docs/10 and sync memory/active.md?
```

**Do not proceed without confirmation.**

### 8. Sync `memory/active.md`

```markdown
# Execution State
> Updated: [date]
> Plan source: memory/plan.md

## Pending Tasks
- [ ] TASK-001: [short name]
## Done
- [x] TASK-XXX (date)
## Current
TASK-XXX — [what's being implemented]
## Blockers
- [if any]
## Next
TASK-XXX → [name]
```

### 9. Kickoff

```
✅ PLAN → memory/plan.md   ✅ TEST PLAN → docs/09-testing   ✅ DEMO → docs/10-demo-script
✅ ACTIVE STATE → memory/active.md

[N] tasks, [M] flows. Start with TASK-XXX → [name]:
  - "Implement TASK-XXX"   ·   /git when done   ·   /e2e FLOW-XXX to verify
```

## Anti-patterns

- ❌ Writing the plan anywhere but `memory/plan.md`
- ❌ Resetting TASK-XXX codes
- ❌ Task too big (>1 day) → split
- ❌ Task with no acceptance criteria (take from `docs/02-srs`)
- ❌ Duplicating API/schema/UI detail into the plan instead of referencing `docs/05–08`
- ❌ Omitting "Docs to sync" → deliverables drift from the code
- ❌ Skipping UI tasks when there's a UI
- ❌ Re-planning without warning the user
