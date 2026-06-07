#!/usr/bin/env bash
# Stop hook: notify the user when Claude finishes a turn.
# Title pulled from .claude/project.json (project.name), fallback to repo folder name.

ROOT=$(git rev-parse --show-toplevel 2>/dev/null || pwd)
CONFIG="$ROOT/.claude/project.json"
TITLE="Claude Code"

if [[ -f "$CONFIG" ]]; then
  if command -v jq &>/dev/null; then
    NAME=$(jq -r '.project.name // ""' "$CONFIG")
  else
    NAME=$(python3 -c "import json;print(json.load(open('$CONFIG')).get('project',{}).get('name',''))" 2>/dev/null || echo "")
  fi
  [[ -n "$NAME" && "$NAME" != "__FILL__" ]] && TITLE="$NAME"
fi

# macOS native notification
if command -v osascript &>/dev/null; then
  osascript -e "display notification \"Claude Code finished!\" with title \"$TITLE\" sound name \"Glass\"" \
    2>/dev/null || true
fi

# Fallback: terminal bell
printf '\a'

exit 0
