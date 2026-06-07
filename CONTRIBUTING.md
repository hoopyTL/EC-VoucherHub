# Contributing Guidelines

## Information Model (two trees)

This project keeps deliverables and agent-state in two separate trees. Keep them consistent:

- `docs/` = **DELIVERABLES** — the SDLC handover set, numbered `01-brd/` through `10-demo-script/` (requirements, design, testing, demo). The single source of truth for what to build and how it's designed.
- `memory/` = **STATE** — `active.md` (current task), `decisions.md` (ADRs), `progress.md`, `plan.md` (`TASK-XXX` breakdown).

The code is the reality; if a deliverable disagrees with the code, fix the deliverable in the same PR.

Work is tracked with `TASK-XXX` codes (in `memory/plan.md`) and business flows `FLOW-XXX` (in `docs/02-srs/`).

## Skill-driven Flow

The intended end-to-end flow uses the project skills in order:

`specs-writer` → [`system-design`] → `planning` → implement → `code-review` → `/git` → `/deploy` → [`/e2e`] → `/memory`

- `specs-writer` turns `docs/01-brd/` into `docs/02-srs/` + `03-use-cases/` + `04-activity-diagrams/`.
- `system-design` (when needed) produces `docs/05-database-design/`, `06-architecture/`, `07-api-design/`, `08-frontend-design/`, with ADRs in `memory/decisions.md`.
- `planning` breaks work into `TASK-XXX` in `memory/plan.md`, writes `docs/09-testing/` + `docs/10-demo-script/`, and syncs `memory/active.md`.
- implement the tasks, then `code-review` before committing.
- `/git` commits/PRs, `/deploy` builds + smoke checks, `/e2e` runs flow tests when present.
- `/memory` updates the STATE tree (`memory/`) after the work lands.

## Development Workflow

1. **Find or open an issue** — use the templates in `.github/ISSUE_TEMPLATE/`. An implementation issue should reference a `TASK-XXX` in `memory/plan.md`.
2. **Create a branch**: `<category>/#<issue#>-<kebab-slug>`
   - e.g. `feat/#12-add-login`, `fix/#34-deposit-rounding`, `chore/#7-ci-setup`
3. **Make changes**: implement the `TASK-XXX`, keeping the affected `docs/` deliverable (05/06/07/08) in sync.
4. **Commit**: `type(scope): subject [TASK-XXX]` (Conventional Commits).
5. **Push** and **open a PR** filling `.github/pull_request_template.md`.
6. **CI must pass** (lint → build → test → coverage) → request review → merge.

No direct pushes to `main`.

## Commit Message Convention

```
type(scope): subject [TASK-XXX]

feat:     add new feature
fix:      fix bug
docs:     documentation only
style:    formatting, no code change
refactor: code change that neither fixes a bug nor adds a feature
perf:     performance improvement
test:     add or fix tests
chore:    build process, tooling, deps
```

Reference the `TASK-XXX` (from `memory/plan.md`) in the subject when the commit implements a planned task.

## Code Style

- Follow the language/framework style guide for the stack (see CLAUDE.md and `.claude/rules/`).
- Lint must pass before pushing.
- Add tests for new behavior; keep coverage above the project target.

## Pull Request Process

1. Update the affected `docs/` deliverable (`05-database-design`, `06-architecture`, `07-api-design`, `08-frontend-design`) if behavior/routes/schema/setup changed, and confirm `docs/02-srs/` still reflects what was built.
2. Add or update tests.
3. Run lint, build, and tests locally using the commands in `.claude/project.json`.
4. Fill the PR template, including the Source Of Truth Check.
5. Request review; address feedback.
