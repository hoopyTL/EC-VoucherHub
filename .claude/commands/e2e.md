---
description: E2E test — auto-start server if needed, run by flow code, cleanup. Reads commands from .claude/project.json (stack-agnostic). Only use when capabilities.has_e2e = true.
when_to_use: e2e test, browser test, verify flow, smoke test
argument-hint: "[FLOW-XXX | --headless | --keep-server] — no arg = full"
allowed-tools: Bash, Read, Write, Edit
---

Stack-agnostic E2E runner. All commands + ports are read from `.claude/project.json` (`commands.e2e`, `commands.dev`, `runtime.*`).

> If `capabilities.has_e2e = false` → this command should already have been removed by `/init-project`. If it still exists but is not configured → tell the user to run `/init-project`.

## Phase 0 — Load config
Read `commands.e2e`, `commands.dev`, `runtime.port`, `runtime.health_url`, `runtime.base_url`. Field is `__FILL__`/empty → STOP, require `/init-project`.

## Phase 1 — Parse arguments
- **Empty** (DEFAULT): run all E2E.
- **`FLOW-XXX`**: only tests tagged `@FLOW-XXX`.
- **`--headless`**: CI/headless mode if the tool supports it.
- **`--keep-server`**: do NOT cleanup the server afterward (default: cleanup if we started it).

Flow codes are declared in `docs/02-srs/`. If the user enters a flow that does not exist → list available flows (grep `@FLOW-` in the e2e directory), stop.

## Phase 2 — Server lifecycle (handle automatically)
Check health:
```bash
curl -sf [HEALTH_URL] 2>/dev/null && echo ALREADY-RUNNING || echo NOT-RUNNING
```
- **ALREADY-RUNNING** → use the existing server, `WE_STARTED=false`.
- **NOT-RUNNING** → start in background:
  ```bash
  [DEV_CMD] > /tmp/[PROJECT_NAME]-e2e.log 2>&1 &
  ```
  Wait until healthy (max 15s, poll `curl -sf [HEALTH_URL]`). Not healthy → read the log, notify the user, stop. `WE_STARTED=true`.

If the project has no HTTP server (CLI E2E) → skip lifecycle.

## Phase 3 — Run
All tests:
```bash
[E2E_CMD]
```
By flow (filter tag — syntax depends on the tool, e.g. Playwright/Cypress `--grep`):
```bash
[E2E_CMD] -- --grep @FLOW-XXX
```
Capture the exit code to determine pass/fail. Pass `base_url` via env if the tool needs it.

## Phase 4 — Cleanup
```bash
if [[ "$WE_STARTED" == "true" && -z "$KEEP_SERVER" ]]; then
  PID=$(lsof -ti:[PORT] 2>/dev/null)
  [[ -n "$PID" ]] && kill "$PID" 2>/dev/null && echo "Server stopped (PID $PID)"
fi
```
Do NOT cleanup if: `--keep-server`, or the server was already running beforehand.

## Phase 5 — Analysis
**PASS**: report X/X tests, scope, server (existing / we started+cleaned up), time.
**FAIL**: build a Bug Report for each failing test (test file:line + flow tag, expected vs actual, trace/screenshot path if the tool produces one, severity).

## Phase 6 — Auto-fix (if FAIL)
Trigger the **debug skill**: reproduce command + failing test + expected/actual. Require spawning `@debug` to verify the root cause BEFORE fixing, minimal fix + regression test. Apply → re-run CI → re-run E2E (max 2 rounds, escalate beyond that).

## Anti-patterns
- ❌ Force the user to manually start the server · ❌ Skip the Bug Report on fail · ❌ Auto-fix without verifying root cause · ❌ Re-run > 2 rounds · ❌ Test without `@FLOW-XXX` tag · ❌ Forget to cleanup a server we started · ❌ Cleanup a server the user already had running · ❌ Hard-code commands/ports (read project.json)
