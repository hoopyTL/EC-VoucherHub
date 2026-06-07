#!/usr/bin/env bash
# PreToolUse hook: block destructive shell commands before they run.
# Input: JSON on stdin. Output: JSON deny decision (exit 0) or allow (exit 0 no output).

INPUT=$(cat)

if command -v jq &>/dev/null; then
  COMMAND=$(printf '%s' "$INPUT" | jq -r '.tool_input.command // ""')
else
  COMMAND=$(printf '%s' "$INPUT" | python3 -c \
    "import sys,json; d=json.load(sys.stdin); print(d.get('tool_input',{}).get('command',''))" \
    2>/dev/null || echo "")
fi

BLOCKED=(
  "git push --force"
  "git push -f "
  "git reset --hard"
  "git clean -f"
  "git clean -fd"
  "git branch -D"
  "DROP TABLE"
  "DROP DATABASE"
  "rm -rf /"
  "rm -rf ~"
)

for pattern in "${BLOCKED[@]}"; do
  if printf '%s' "$COMMAND" | grep -qiF "$pattern"; then
    jq -n \
      --arg reason "Blocked: \"$pattern\" — ask the user to confirm before running this." \
      '{hookSpecificOutput: {hookEventName: "PreToolUse", permissionDecision: "deny", permissionDecisionReason: $reason}}'
    exit 0
  fi
done

exit 0
