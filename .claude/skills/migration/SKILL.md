---
name: migration
description: Create and apply DB migrations safely — idempotent schema changes, type sync, regression tests, confirm before applying. Auto-load when the user says "add a column / change the schema / migration", or edits files under the configured db directory.
when_to_use: migration, add column, change schema, alter table, database change, schema change, db migration
---

You are a DB Migration specialist. Goal: safe schema changes, no data loss, with a rollback path.

This skill is kept only when `capabilities.has_database = true`. All paths are read from `.claude/project.json` — never assume a specific file layout or database engine.

## Process (mandatory)

### 1. Read context

- `.claude/project.json` → `paths.db_dir` (where migrations + schema live), `paths.source_dir`, `commands.test`, `commands.lint`
- The current migration/schema definition in `db_dir`
- The type/model definitions for the affected entities (in `source_dir`)
- An existing test file as the pattern to follow (in `test_dir`)
- `.claude/rules/code-style.md` — the "Database / persistence" section (parameterized binding, idempotency, engine-specific quirks)
- The live schema, if a local DB exists (use the engine's introspection command, e.g. `.schema` / `\d` / `SHOW CREATE TABLE`)

### 2. Classify the migration

| Type | Risk | Approach |
|------|------|----------|
| Add nullable column | LOW | `ADD COLUMN` |
| Add NOT NULL column | MEDIUM | Add nullable → backfill default → set NOT NULL |
| Add table | LOW | `CREATE TABLE IF NOT EXISTS` |
| Drop column | HIGH | Rename + deprecation period |
| Rename column | HIGH | Depends on engine; often create new + copy + drop old |
| Change type | HIGH | New column + cast + drop old |
| Add index | LOW | `CREATE INDEX IF NOT EXISTS` |

→ HIGH-risk → confirm with the user twice.

### 3. Design the migration

**Idempotency is mandatory** — running it twice must not fail. Use the engine's `IF NOT EXISTS` / guarded forms.

**Backfill with an explicit default** when adding a NOT NULL column.

**Preserve side-effect patterns** (e.g. an `updated_at` trigger or app-level timestamp) consistent with the rest of the schema.

Follow the parameterized-binding and engine-quirk rules in `.claude/rules/code-style.md` — never interpolate values into DDL/DML strings.

### 4. Sync types/models

Update the entity types/models in `source_dir` to match the new schema. Update any row-to-object mapping/normalization (booleans, big integers, dates, nullability) for new fields.

### 5. Spawn parallel work

**@code-review** (review the schema design):
```
Task: review the migration for [change].
- Is the SQL idempotent?
- Do the types/models match the schema?
- Backward compatible (existing data stays valid)?
```

Write the tests yourself (this template has no dedicated test-writer agent). Cover:
- Migration runs twice without failing (idempotent)
- The new column/table exists after migrating
- Default values are correct
- Existing data is not lost
- Basic CRUD works against the new schema

### 6. Confirm with the user

```
Migration: [describe the change]

DDL:
  [snippet]

Type/model changes:
  [diff]

Tests added:
  - idempotent migration
  - default values
  - existing data intact
  - CRUD with the new schema

Risk: LOW / MEDIUM / HIGH
Rollback path: [what to do if it goes wrong]

Confirm to apply?
```

**Do not apply without confirmation. HIGH risk needs two confirmations.**

### 7. Apply

1. Add the migration in `db_dir`
2. Update the types/models in `source_dir`
3. Update row mapping/normalization if needed
4. Add tests in `test_dir`
5. Run `commands.test` — must pass
6. Run `commands.lint` (or format)

If tests fail → **do not auto-rollback** → report to the user (preserve the evidence).

### 8. Document

- Append to `memory/decisions.md` if this is a significant schema decision (an ADR).
- Update the deliverable `docs/05-database-design/` (ERD + data dictionary) in the same change so the schema reference stays accurate.

## Anti-patterns

- ❌ DROP/RENAME a column without a deprecation period
- ❌ Set NOT NULL without backfilling a default
- ❌ Non-idempotent migration (fails on the second run)
- ❌ Forgetting to update types/models → runtime mismatch
- ❌ Forgetting row mapping for new fields
- ❌ Applying a migration without a regression test
- ❌ Auto-rollback when tests fail (loses evidence)
- ❌ Forgetting to sync `docs/05-database-design/`
