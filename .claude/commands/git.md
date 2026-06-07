---
description: Git workflow — conventional commits, security scan, PR creation. Auto-commit after code changes.
when_to_use: commit, git, push, PR, conventional commits, branch
argument-hint: "[pr | scan | branch] — no arg = auto-commit"
allowed-tools: Bash(git:*), Bash(gh:*), Read
---

Git workflow following Conventional Commits + security scan + test gate.

## Behavior

### Auto-commit (default — no arg)

When the user says "commit this change", "save progress", or after completing a task:

1. **Test gate**: if commit type is `feat` / `fix` / `refactor` → run the CI command (read `.claude/project.json` → `commands.ci`, fallback `commands.test`) first. CI fail = no commit.
2. **Scan secrets**: scan staged files for API keys, .env, credentials. If found → STOP, notify the user, do not commit.
3. **Stage selectively**: use specific `git add <file>`, never `git add .` or `git add -A`.
4. **Split if mixed**: if changes span multiple types/scopes → commit each one separately.
5. **Commit message** following Conventional Commits (see section below).
6. **Output structured result** — do not ask for permission.

### `/git pr` — Create PR

1. Verify branch is not main/master
2. Verify all tests pass + integration tests pass (PR-level required)
3. Push branch to remote (`git push -u origin HEAD`)
4. Create PR with template:
   ```
   ## Summary
   [1-3 bullets — what changed and why]
   
   ## Test plan
   - [ ] CI pass (`commands.ci` in project.json)
   - [ ] E2E covered (FLOW-XXX)
   - [ ] Manual smoke test
   ```
5. A PR is a **deliberate decision** — never auto-create.

### `/git scan` — Security scan

Scan all tracked files:
- Content patterns: `API_KEY`, `SECRET`, `password`, `BEGIN PRIVATE KEY`, `.env`, `aws_access_key`, `ghp_`, `sk-`
- File patterns to block: read `secret_file_globs` from `.claude/project.json` (default `.env`, `*.pem`, `id_rsa`, `credentials.json`, `*.p12`, `*.key`)

Output: list file:line if matched. If clean → ✅.

### `/git branch` — Branch ops

- List branches (local + remote)
- Identify stale (merged > 30 days)
- Suggest delete (do NOT auto-delete — confirm with the user)

## Conventional Commits

Format: `type(scope): description`

**Types** (priority order):
- `feat`: new feature (user-facing)
- `fix`: bug fix
- `refactor`: code change with no behavior change, no test change
- `perf`: performance improvement
- `test`: add/fix tests only
- `docs`: documentation only
- `chore`: build/deps/config
- `ci`: CI config

**Rules:**
- Subject ≤ 72 chars, lowercase, imperative present tense
- Body explains **why**, not what
- One logical change per commit (split if mixed)
- **No AI attribution** in commit message
- **Reference task code** if applicable: `feat(auth): add password reset [TASK-005]`

## Test enforcement (auto-commit)

| Type | Unit test | Integration test |
|------|-----------|------------------|
| feat | **Required** — write tests WITH the code | per PR |
| fix | **Required** — test reproduces the bug | per PR |
| refactor | **Required** — existing tests pass, do NOT modify tests | per PR |
| perf | **Required** | per PR |
| docs / chore / ci / style | Not required | Not required |
| `/git pr` | All pass | **Required** before PR |

**Anti-rationalizations** (REJECT):
- "I'll add tests later" → No. `feat` without tests = blocked.
- "Small change" → Small breaks things. Test it.
- "Refactor needs test changes" → If you modify tests, it's not a refactor — it's a behavior change.

## Output format

### Auto-commit success
```
✓ feat(auth): add password reset [TASK-005]
  3 files (+47/-12)
  tests: 22 passed
```

### Blocked by secret
```
✗ BLOCKED: secret detected in <source_dir>/config.<ext>:42
  Pattern: API_KEY = "sk-..."
  Action: unstaged. Add to .gitignore and rotate the secret.
```

### Blocked by tests
```
✗ BLOCKED: <commands.ci> fails
  - 2 tests failing in <test_dir>/auth.<ext>
  Action: fix tests before committing.
```

### PR created
```
✓ PR created: https://github.com/<owner>/<repo>/pull/<n>
  Branch: feat/auth-password-reset → main
  Tests: integration ✅ + unit ✅
```

## Anti-patterns

| Don't | Do |
|-------|----|
| Ask the user "should I commit?" | Auto-commit when the code is done |
| `git add .` blindly | `git add <file>` specific |
| `"fix stuff"` | `fix(auth): resolve token expiry redirect [TASK-012]` |
| Force push to main | Never |
| Giant commit (30+ files) | Split by type/scope |
| Commit secrets | Scan → STOP → .gitignore → rotate |
| `--no-verify` | Fix the hook issue |
| Auto-create PR | PR is an explicit `/git pr` |
| AI attribution in message | Never |
