---
name: debug
description: Root-cause investigation methodology when a test fails / a bug is reported / behavior is wrong — reproduce minimal → evidence → hypothesize → verify → fix. Spawn the @debug subagent for deep investigation. Auto-load when a test fails, or the user says "error / fix bug / it doesn't work".
when_to_use: debug, fix bug, runtime error, test fail, wrong behavior, not working, error
---

You are the Debug methodology owner. Goal: **fix the root cause, not the symptom**.

## Mandatory process (sequential, do NOT skip a step)

### 1. Triage (1-2 min)

Quickly determine:
- **Type**: runtime error / wrong behavior / test fail / performance / security
- **Severity**: CRITICAL (blocking) / HIGH (degraded) / MEDIUM / LOW
- **Reproducible**: 100% / intermittent / one-off

If intermittent → prioritize capturing a log/trace first, don't rush to guess.

### 2. Reproduce minimally

- Create the smallest input/test/command that reproduces the bug
- Strip away irrelevant context
- Document the command so the @debug subagent can re-run it

### 3. Spawn the @debug subagent (for a deep dive)

If the bug is non-trivial (>30 min to investigate) → spawn:

```
Task: investigate bug [short name]

Context:
- Reproduce: [command/input]
- Expected: [correct behavior]
- Actual: [observed behavior]
- Relevant files: [list]
- Logs/trace: [paths]

Requirement: follow the method in agents/debug.md (reproduce → evidence → hypothesize → verify → fix).
**Do not proceed to a fix until the root cause is verified.**

Output: a full bug report + fix proposal + regression test.
```

Trivial bug (typo, missing import) → fix by hand, no spawn needed.

### 4. Verify the root cause before fixing

Hypothesize:
- ≥2 hypotheses ranked by likelihood
- For each: "If true, I'd expect to see X"

Verify with evidence:
- Read the exact code at file:line
- Run a DB query (if data-related)
- Add a log + reproduce
- Inspect a trace/screenshot if the project has E2E tooling (use the tool's trace viewer)

**Confidence < HIGH → keep verifying, don't fix.**

### 5. Minimal fix

- Touch the least code needed to address the root cause
- No refactoring "while we're here"
- No features outside the fix scope

### 6. Mandatory regression test

Before reporting done:
- A new test reproduces the original bug (now passes with the fix)
- Existing tests still green
- CI passes (`commands.ci` in .claude/project.json)

### 7. Document if it's a recurring gotcha

If the bug is a **recurring pattern** (a quirk of the DB/language/framework in use):
→ Append to `memory/decisions.md` under "Gotchas" so future sessions don't trip on it again.

## Bug Report format (when reporting to the user)

```markdown
## Bug: [short name]

### Summary
Severity: CRITICAL/HIGH/MEDIUM/LOW
Reproducible: Yes (100%)

### Root cause
[file:line] — [specific reason]

### Fix
- Changed: [file:line — diff snippet]
- Regression test: [test file:line]

### Verification
- ✅ Original bug reproduced before the fix
- ✅ Test passes after the fix
- ✅ CI green

### Confidence: HIGH

### Pattern (if any)
[Appended to memory/decisions.md]
```

## Anti-patterns

- ❌ Fixing the symptom (try/catch swallow, default value that hides the bug)
- ❌ Guessing without evidence ("maybe a race condition")
- ❌ Refactoring at the same time as the fix
- ❌ Skipping the regression test because "I verified it manually"
- ❌ Fixing multiple bugs at once (one commit each)
- ❌ Reporting done when confidence < HIGH
