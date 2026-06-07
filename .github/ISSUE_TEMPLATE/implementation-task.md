---
name: Implementation task
about: Create an issue for implementing a TASK-XXX from memory/plan.md
title: "[Task] "
labels: task
assignees: ""
---

## Task Reference

- Task: `TASK-XXX` (in `memory/plan.md`)
- Flow: `FLOW-XXX` (in `docs/02-srs/`, if applicable)
- Related issue / PR:

---

## Overview

<!-- Summarize the task in 2-5 sentences. -->

## References

- `memory/plan.md` → `TASK-XXX`
- `docs/06-architecture/` → relevant section / ADR
- Other:

---

## Scope

<!-- Adjust these sub-sections to this project's layers. -->

### Frontend

- [ ] Add or update UI as needed
- [ ] Add or update models/services as needed

### Backend

- [ ] Add or update API/controller/service as needed
- [ ] Add or update auth/role checks as needed

### Database

- [ ] Add or update migration/schema as needed

### Documentation

- [ ] Keep the relevant `docs/` deliverable in sync (`05-database-design`, `06-architecture`, `07-api-design`, `08-frontend-design`) if behavior or structure changes

### Tests

- [ ] Add or update relevant tests

---

## Implementation Notes

<!-- Optional notes, assumptions, or constraints. -->

## Completion Conditions

- [ ] Main flow works as described by `TASK-XXX` in `memory/plan.md`
- [ ] The relevant `docs/` deliverables remain consistent
- [ ] Tests or verification are included
