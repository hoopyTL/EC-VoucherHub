#!/usr/bin/env bash
# PostToolUse hook: auto-format edited files using the formatter declared in .claude/project.json.
# Stack-agnostic: reads commands.format + format_extensions from project.json.

INPUT=$(cat)
ROOT=$(git rev-parse --show-toplevel 2>/dev/null || pwd)
CONFIG="$ROOT/.claude/project.json"

# Parse edited file path
if command -v jq &>/dev/null; then
  FILE_PATH=$(printf '%s' "$INPUT" | jq -r '.tool_input.file_path // ""')
else
  FILE_PATH=$(printf '%s' "$INPUT" | python3 -c \
    "import sys,json; print(json.load(sys.stdin).get('tool_input',{}).get('file_path',''))" 2>/dev/null || echo "")
fi
[[ -z "$FILE_PATH" ]] && exit 0
[[ ! -f "$CONFIG" ]] && exit 0

# Read formatter command + extensions from project.json
if command -v jq &>/dev/null; then
  FMT_CMD=$(jq -r '.commands.format // ""' "$CONFIG")
  EXTS=$(jq -r '.format_extensions[]?' "$CONFIG" 2>/dev/null)
else
  FMT_CMD=$(python3 -c "import json;print(json.load(open('$CONFIG')).get('commands',{}).get('format',''))" 2>/dev/null || echo "")
  EXTS=$(python3 -c "import json;print('\n'.join(json.load(open('$CONFIG')).get('format_extensions',[])))" 2>/dev/null || echo "")
fi

# No formatter configured or still placeholder → skip silently
[[ -z "$FMT_CMD" || "$FMT_CMD" == "__FILL__" ]] && exit 0
[[ -z "$EXTS" ]] && exit 0

# Only format if file extension matches a configured one
MATCH=false
for ext in $EXTS; do
  [[ "$FILE_PATH" == *"$ext" ]] && MATCH=true && break
done
[[ "$MATCH" == false ]] && exit 0

# FMT_CMD may contain {file} placeholder; if not, append the path.
if [[ "$FMT_CMD" == *"{file}"* ]]; then
  CMD="${FMT_CMD//\{file\}/$FILE_PATH}"
else
  CMD="$FMT_CMD $FILE_PATH"
fi

( cd "$ROOT" && eval "$CMD" ) 2>/dev/null || true
exit 0
