---
name: code-review
description: Code review against the rules in .claude/rules/ — spawn @sec-review + @code-review subagents in parallel, merge findings, give an APPROVE / REQUEST CHANGES verdict. Auto-load before a commit, when the user says "review code", or when the git diff has large changes.
when_to_use: code review, review code, review changes, review before commit, code quality, security review
---

You are the Code Review orchestrator. Spawn 2 subagents in parallel (security + quality/API), merge their findings, give a verdict.

## Process

### 1. Determine scope

Default: changed files per `git diff HEAD`.

Expand if the user asks:
- `--full` or "audit everything" → the whole codebase
- `--branch` → diff against the main branch (all commits of the branch)

```bash
# Default
git diff HEAD --name-only

# Full audit (use paths.source_dir + paths.test_dir from project.json)
find <source_dir> <test_dir> -type f

# Branch diff
git diff main...HEAD --name-only
```

### 2. CI baseline before reviewing

```bash
# CI command read from .claude/project.json → commands.ci (fallback commands.test)
<commands.ci>  2>&1 | tail -10
```

If CI fails → fix CI before reviewing (reviewing on a broken state wastes time).

### 3. Spawn 2 subagents SIMULTANEOUSLY

Send both in **one turn** (parallel, not sequential):

**@sec-review**
```
Task: security review for [scope] files.

Files to read: [list]
Rules: read .claude/rules/api-conventions.md (security/auth/headers) + .claude/rules/code-style.md (persistence / parameterized-binding section).

Focus: injection (SQL/NoSQL/command), input validation, sensitive data exposure, auth/permission, error message leaking.

Output per the format in agents/sec-review.md.
```

**@code-review**
```
Task: code quality + API design review for [scope] files.

Files to read: [list]
Rules: read .claude/rules/code-style.md + .claude/rules/api-conventions.md + .claude/rules/testing.md (coverage section).

Focus: type safety / language idioms, error handling, test coverage, dead code, REST naming, HTTP semantics, response-wrapper consistency, breaking changes.

Output per the format in agents/code-review.md.
```

### 4. Merge findings

After both subagents return, consolidate:

```markdown
# Code Review Report
> Scope: [diff HEAD / full / branch]
> Files reviewed: N
> Date: [date]

## Critical Issues (block merge)
[from @sec-review CRITICAL + @code-review BREAKING]
- [file:line] ...

## High Priority (fix before merge)
[from @sec-review HIGH + @code-review HIGH]

## Medium / Low (can defer, open an issue)
- ...

## Coverage Gaps
[from @code-review]

## Verdict
**APPROVE** / **REQUEST CHANGES**

Reason: [if REQUEST CHANGES — name the main blocker]

## Score
- Security: x/10
- Code Quality: x/10
- API Design: x/10
```

### 5. Action items

If **APPROVE**:
```
✅ Review passed. Ready to commit.
Tip: use /git to commit with Conventional Commits.
```

If **REQUEST CHANGES**:
```
⚠️ N blockers to fix before commit:
1. [Critical issue 1]
2. ...

After fixing → review again.
```

## Anti-patterns

- ❌ Spawning the 2 subagents sequentially (takes 2x as long)
- ❌ Reviewing on a broken CI state
- ❌ APPROVE verdict despite a CRITICAL/BREAKING finding
- ❌ Sloppy merge (just pasting raw output)
- ❌ Not citing specific file:line
- ❌ Inconsistent severity ratings across reviews
