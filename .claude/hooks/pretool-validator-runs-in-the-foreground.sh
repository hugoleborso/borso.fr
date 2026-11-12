#!/usr/bin/env bash
# PreToolUse hook on the Agent tool.
#
# Refuses to dispatch the `technical-validator` or the `visual-validator` agent
# in the background. The Agent tool runs a subagent in the background unless
# the call says `run_in_background: false`, and a validation in the background
# leaves the main session free to move the branch it is reading.
#
# On PR #298 the main session committed four times while round 2 ran. One of
# those commits carried the report file as it stood in the working tree, with a
# placeholder cell, because the validator had written a first version and was
# waiting for midnight to re-run one test. The re-run then ran the test the
# main session had already fixed. The branch had moved under a review on
# PR #238 and PR #278 before that, and both sweeps let it pass. On PR #107 the
# main session was asked to commit screenshots the visual validator was still
# writing.
#
# In the foreground the main session waits for the handback, so the branch
# stands still and the report it reads is the one the validator returned.
#
# See docs/dantotsus/the-report-committed-before-its-author-finished.md.
#
# Output contract (Claude Code PreToolUse hook): exit 2 with stderr blocks the
# call and shows the message to the agent, exit 0 lets it run.
set -euo pipefail

INPUT="$(cat)"

AGENT="$(jq -r '.tool_input.subagent_type // ""' <<<"$INPUT")"
case "$AGENT" in
  technical-validator | visual-validator) ;;
  *) exit 0 ;;
esac

BACKGROUND="$(jq -r '.tool_input.run_in_background | if . == null then "unset" else tostring end' <<<"$INPUT")"
[[ "$BACKGROUND" == "false" ]] && exit 0

echo "[validator-in-the-foreground] this dispatch runs the $AGENT in the background (run_in_background: $BACKGROUND)." >&2
echo "[validator-in-the-foreground] A validation reads the branch at one commit and writes its report as it goes. In the background you would be free to move that commit and to read a report still being written." >&2
echo "[validator-in-the-foreground] Send the same call with run_in_background: false, and commit nothing until it hands back." >&2
"$(dirname "$0")/kaizen-refusal.sh" validator-in-the-foreground "dispatched the $AGENT in the background"
exit 2
