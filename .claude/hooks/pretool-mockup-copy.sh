#!/usr/bin/env bash
# PreToolUse (Artifact) — before a mockup screen is published, count the words
# a person would read on it.
#
# The skull-king mockups went out with a sentence on every card. The operator
# answered "un peu moins de texte, tu as toujours le problème": the same
# correction as earlier mockups. A rule in prose had not stopped it, so this
# measures the screen being published and names each one over the limit.
#
# Advisory: it always exits 0 and answers with additionalContext.
command -v jq >/dev/null 2>&1 || exit 0

INPUT="$(cat)"

ACTION="$(jq -r '.tool_input.action // "publish"' <<<"$INPUT")"
[ "$ACTION" = publish ] || exit 0
jq -e '[.tool_input.file_path // empty, (.tool_input.files // {} | keys[])] | any(endswith(".dc.html"))' \
  <<<"$INPUT" >/dev/null 2>&1 || exit 0

REPO_ROOT="${CLAUDE_PROJECT_DIR:-$(cd "$(dirname "$0")/../.." && pwd)}"
TSX="$REPO_ROOT/node_modules/.bin/tsx"
[ -x "$TSX" ] || exit 0

"$TSX" "$REPO_ROOT/scripts/mockup/mockup-copy.ts" <<<"$INPUT" 2>/dev/null || true
exit 0
