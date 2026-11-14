#!/usr/bin/env bash
# Fails when a hook in .claude/settings.json names its script by a path
# relative to the repository root.
#
# Claude Code runs a hook from the session's current directory, which moves
# with every `cd`. A relative path then names nothing, the shell exits 127, and
# Claude Code reads that as a non-blocking error: the action goes through
# unchecked. pretool-merge-deploys-prod.sh was off that way for every Bash call
# made from apps/pragma, and the only trace was a notice in the app.
set -euo pipefail

SETTINGS="${1:-.claude/settings.json}"

unanchored="$(jq -r '
  .hooks // {} | to_entries[] | .value[] | .hooks[]
  | select(.type == "command") | .command
  | select(startswith("\"$CLAUDE_PROJECT_DIR\"/") or startswith("$CLAUDE_PROJECT_DIR/") | not)
' "$SETTINGS")"

if [ -n "$unanchored" ]; then
  echo "[hook-commands-are-anchored] these hooks run only from the repository root:" >&2
  printf '  %s\n' "$unanchored" >&2
  echo "[hook-commands-are-anchored] start each with \"\$CLAUDE_PROJECT_DIR\"/ so a cd cannot switch it off." >&2
  exit 1
fi
