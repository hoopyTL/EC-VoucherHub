---
description: Local deploy — build → start → smoke check. Reads commands from .claude/project.json (stack-agnostic).
when_to_use: deploy, run local, build production, start server, deploy local
allowed-tools: Bash
---

Local deploy workflow — build → start → verify. All commands are read from `.claude/project.json` (`commands.*`, `runtime.*`).

## Phase 0 — Load config
Read `.claude/project.json`:
- `commands.ci`, `commands.build`, `commands.start`
- `runtime.port`, `runtime.health_url`
Empty/`__FILL__` field → skip the corresponding phase + notify the user (not configured). If `project.json` still has many `__FILL__` → suggest running `/init-project` first.

## Phase 1 — Pre-flight
!`git status --porcelain | head -10`
- Uncommitted changes → warn (deploying an uncommitted build is a dangerous pattern)
- Branch is not main → confirm before continuing

## Phase 2 — CI gate
Run `commands.ci` (fallback `commands.test`). Fail → **STOP**, do not deploy untested code.

## Phase 3 — Build
Run `commands.build`. Empty (interpreted language) → skip. Fail → read the error, notify the user, do not proceed.

## Phase 4 — Stop existing instance
If `runtime.port` is set:
```bash
lsof -ti:[PORT] | head -5
```
A process is occupying it → ask the user to kill it or change the port. Do NOT kill automatically.

## Phase 5 — Start (background + log)
```bash
[START_CMD] > /tmp/[PROJECT_NAME]-deploy.log 2>&1 &
```
`[START_CMD]` = `commands.start` (with env/port if needed). Always background, do not block the conversation. Wait ~2s to be ready.

## Phase 6 — Smoke check
If `runtime.health_url` is set:
```bash
curl -sf [HEALTH_URL]
```
- OK → ✅ deployed
- Error → read the log file, notify the user
No health endpoint (CLI/library) → skip, confirm the process is still alive (`ps`/exit code).

## Phase 7 — Report
```
✅ DEPLOYED LOCAL
URL/Entrypoint: [base_url or run command]
Health: [health_url if set]
Logs: tail -f /tmp/[PROJECT_NAME]-deploy.log
PID: [process id]
```

## Anti-patterns
- ❌ Deploy with CI failing · ❌ Deploy uncommitted without warning · ❌ Auto-kill a port process without asking · ❌ Skip the smoke check · ❌ Run foreground and block the conversation · ❌ Hard-code npm/port (always read project.json)
