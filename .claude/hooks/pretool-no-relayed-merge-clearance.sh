#!/usr/bin/env bash
# PreToolUse hook for handing a merge clearance to another session.
#
# A message sent with send_message reaches the other session as a peer's, not
# the operator's, and a session may not merge on a peer's word. So a clearance
# relayed that way is refused where it lands, and the operator has to ask again.
# On PR #341 the operator asked for the merge several times, partly because the
# session that owned the pull request refused a clearance another session
# relayed. The session the operator spoke to held the one instruction anybody
# could act on, and it gave it away.
#
# The hook refuses a message that reads as a merge clearance, and names the way
# out: merge the pull request here. The merge hooks check it the same way from
# any session. A message that only reports a merge, or asks a question about
# one, does not match.
#
# See docs/dantotsus/the-merge-clearance-that-travelled-as-a-peer-message.md.
#
# Output contract (Claude Code PreToolUse hook): exit 2 + stderr blocks the
# call and shows the message to the agent; exit 0 lets it run.
set -euo pipefail

command -v jq >/dev/null 2>&1 || exit 0

MESSAGE=$(jq -r '.tool_input.message // ""' | tr '\n' ' ')
[ -n "$MESSAGE" ] || exit 0

CLEARANCE='(operator|hugo|hugoleborso|user|he|they)[^.]{0,40}\b(says?|said|asks?|asked|approves?|approved|cleared|wants?|ok(ay)?s?|green-?lights?)\b[^.]{0,60}\bmerg(e|ing)\b|\b(go ahead and|please|you (may|can|are cleared to)|cleared to|ok(ay)? to)[[:space:]]+merge\b|\bmerge (it|this|the (pull request|pr)|#?[0-9]+)[^.]{0,20}\bnow\b'

grep -qiE "$CLEARANCE" <<<"$MESSAGE" || exit 0

{
  echo "[no-relayed-merge-clearance] refused: this message hands a merge clearance to another session."
  echo "[no-relayed-merge-clearance] It lands there as a peer's message, which that session may not merge on, so the operator has to ask again."
  echo "[no-relayed-merge-clearance] The operator's instruction is yours. Merge the pull request here with mcp__github__merge_pull_request."
  echo "[no-relayed-merge-clearance] The merge hooks check checks, the moved base and the blast radius the same way from any session."
  echo "[no-relayed-merge-clearance] To tell the owning session after the merge, send what happened, not a clearance."
} >&2
"$(dirname "$0")/kaizen-refusal.sh" no-relayed-merge-clearance "relayed the operator's merge clearance to another session instead of merging"
exit 2
