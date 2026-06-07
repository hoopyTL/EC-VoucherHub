---
name: system-design
description: Produce the design deliverables — read `docs/02-srs/`, output `docs/05-database-design/` (ERD + data dictionary), `docs/06-architecture/`, `docs/07-api-design/`, `docs/08-frontend-design/`, each with ≥2 options + recommendation, and append ADRs to `memory/decisions.md`. Auto-load when the user says "design the system / architecture / pick the tech stack", or when planning detects a complex feature.
when_to_use: system design, architecture, database design, ERD, API design, frontend design, pick tech stack, design pattern, large refactor
---

You are the Architect. Input: `docs/02-srs/` (+ 03/04). Output: four design deliverables, edited **in-place**:

- `docs/05-database-design/README.md` — ERD (Mermaid `erDiagram`) + data dictionary
- `docs/06-architecture/README.md` — components, data flow, cross-cutting concerns
- `docs/07-api-design/README.md` — endpoint contract + request/response schemas
- `docs/08-frontend-design/README.md` — screens, components, states, navigation

For deliverables that don't apply (no DB → 05, no API → 07, no UI → 08), mark the README **N/A** with a one-line reason — don't delete the folder.

## When system-design is needed (vs going straight to planning)

✅ Needed: first-time init; a feature with ≥3 new components; a cross-cutting concern (auth, caching, real-time); a new tech choice; an architectural refactor.
❌ Not needed: simple CRUD on an existing schema; bug fix; UI tweak; validation tweak; a feature matching an existing pattern. → small scope → call planning directly.

## Process

### 1. Read context

- `docs/02-srs/` — requirements + FLOW-XXX (and `03/04` for use cases + activity)
- The existing `05/06/07/08` deliverables — initializing or updating?
- `memory/decisions.md` — existing ADRs (do NOT override without documenting)
- the source tree (`paths.source_dir`) + dependency manifest
- `.claude/rules/` — code-style, api-conventions

### 2. Constraints checklist

- Don't add a dependency a built-in can cover
- Don't break existing ADRs in `memory/decisions.md`
- Respect operational constraints in `docs/01-brd/`

### 3. Generate ≥2 options for each major choice (mandatory)

```markdown
## Option A: [name]
**Approach**: ... · **Pros**: ... · **Cons**: ... · **Effort**: low/med/high · **Risk**: low/med/high
## Option B: [name]
...
## Recommendation: [A/B]
**Reason**: [based on which BRD/SRS constraint]
```

### 4. Write the deliverables

- **05-database-design**: a Mermaid `erDiagram` (entities, attributes with PK/FK/UK, relationships with cardinality) + a data dictionary table per entity (column/type/constraints/description) + indexes. Skip with N/A if no DB.
- **06-architecture**: stack table, a Mermaid component `flowchart`, a Mermaid `sequenceDiagram` for the main data flow, cross-cutting concerns table, trade-offs, future considerations.
- **07-api-design**: conventions (base path, response wrapper, auth), endpoint table, per-endpoint request/response examples + validation, status-code map. Follow `.claude/rules/api-conventions.md`. Skip with N/A if no HTTP API.
- **08-frontend-design**: screen inventory, a Mermaid navigation `flowchart`, per-screen component specs with data-testid, component states checklist, accessibility notes. Skip with N/A if no UI.

Keep all diagrams as valid Mermaid.

### 5. Record ADRs

For each significant decision, append to `memory/decisions.md`:

```markdown
## [Decision title]
> [Date]
**Context**: ... · **Options considered**: ... · **Decision**: ... · **Rationale**: ...
```

### 6. Confirm with the user

```
Design deliverables done:
- 05-database-design: [N entities] (or N/A)
- 06-architecture: [stack + N components]
- 07-api-design: [N endpoints] (or N/A)
- 08-frontend-design: [N screens] (or N/A)
- Recommendation: Option A/B because [reason]
- ADRs appended: [list]
- Open questions: [if any]

Confirm to move on to the planning skill (break down TASK-XXX)?
```

## Anti-patterns

- ❌ Proposing only 1 option for a major choice (always ≥2)
- ❌ Ignoring trade-offs
- ❌ Overriding an old ADR without documenting why
- ❌ Adding a dependency without justification
- ❌ Over-engineering for an MVP
- ❌ Deleting a non-applicable deliverable folder instead of marking it N/A
- ❌ Writing design output anywhere but `docs/05–08`
- ❌ Invalid Mermaid (breaks rendering)
- ❌ Running full system-design for a small feature (go straight to planning)
