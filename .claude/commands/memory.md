---
description: Update memory bank at end of session — active.md (always), decisions.md (if new ADR), progress.md (if a task is finalized).
when_to_use: update memory, end of session, save progress, update memory bank
disable-model-invocation: true
allowed-tools: Read, Edit
---

Update the memory bank based on the session just completed.

**Rule:** read the current file first, edit in place — do not rewrite the whole thing.

## 1. `memory/active.md` (always update)

- **Pending Tasks**: tick `[ ]` → `[x]` for completed tasks
- **Done in this session**: list concrete items, with TASK-XXX if applicable
- **Next step**: 1-2 specific upcoming tasks
- **Watch out for**: newly discovered gotchas, unusual context

## 2. `memory/decisions.md` (only if there is a new ADR)

Append if this session finalized a new architectural decision (e.g., "chose cursor pagination", "dropped tech X").

Format:
```markdown
## [Decision title]
> [Date]
**Context**: [why the decision was needed]
**Options considered**: [briefly]
**Decision**: [what was chosen]
**Rationale**: [why]
```

## 3. `memory/progress.md` (only when a feature is finalized)

- Move feature from "In progress" → "Done" with a date
- Add a new feature to "In progress" if started

## Output

```
✅ Memory updated
- active.md: tick TASK-XXX, next = TASK-YYY
- decisions.md: + 1 ADR ([title])
- progress.md: [feature] → done

Session summary: [1 sentence]
```

## Anti-patterns

- ❌ Rewrite the whole file (lose old context)
- ❌ Update a file with nothing new (noise commit)
- ❌ Forget active.md (the most important file)
- ❌ Append to decisions.md for every tweak (real ADRs only)
