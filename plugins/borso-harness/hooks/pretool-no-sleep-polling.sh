#!/usr/bin/env bash
# PreToolUse hook for a Bash call that waits by sleeping.
#
# Refuses `sleep N` with N of thirty seconds or more, and any loop that sleeps
# between `gh`, `git` or `curl` calls. Agents wrote `sleep 90` loops to wait on
# CI, which holds the turn open and spends a call per round on an answer that
# arrives by itself: a subscribed pull request delivers CI results, reviews and
# merge-state changes as GitHub webhook events, and they wake an idle session.
# A local condition, a dev server or a background job, is what the Monitor tool
# waits on. A short sleep, for a server to bind its port, stays allowed.
#
# Output contract (Claude Code PreToolUse hook):
#   - exit 0 + no stderr → command runs as-is.
#   - exit 2 + stderr message → command is blocked; the message is surfaced to
#     the agent so it can self-correct.

set -euo pipefail

LONGEST_ALLOWED_SLEEP_SECONDS=29

INPUT="$(cat)"

COMMAND="$(jq -r '.tool_input.command // ""' <<<"$INPUT")"
if [[ -z "$COMMAND" ]]; then exit 0; fi

COMMAND_TO_RUN="$(printf '%s' "$COMMAND" |
  python3 "$(dirname "$0")/strip-heredocs.py" |
  python3 "$(dirname "$0")/strip-quoted-strings.py")"

COMMAND_START='(^|[;&|({!`[:space:]])'

block() {
  echo "[no-sleep-polling] $1" >&2
  echo "[no-sleep-polling] CI results, reviews and merge-state changes arrive as GitHub webhook events" >&2
  echo "[no-sleep-polling] on a subscribed pull request, and they wake the session: end the turn to wait." >&2
  echo "[no-sleep-polling] For a local condition (a dev server, a file, a background job), use the Monitor tool." >&2
  "$(dirname "$0")/kaizen-refusal.sh" no-sleep-polling "waited on something by sleeping in a Bash call"
  exit 2
}

seconds_of() {
  local duration="$1"
  local unit="${duration: -1}"
  local amount="$duration"
  local multiplier=1
  case "$unit" in
    s) amount="${duration%s}" ;;
    m) amount="${duration%m}" multiplier=60 ;;
    h) amount="${duration%h}" multiplier=3600 ;;
    d) amount="${duration%d}" multiplier=86400 ;;
  esac
  awk -v amount="$amount" -v multiplier="$multiplier" 'BEGIN { printf "%d", amount * multiplier }'
}

sleeps="$(grep -oE "${COMMAND_START}sleep([[:space:]]+[0-9]+(\.[0-9]+)?[smhd]?)+" <<<"$COMMAND_TO_RUN" || true)"

while IFS= read -r invocation; do
  [[ -n "$invocation" ]] || continue
  total=0
  for duration in $(grep -oE '[0-9]+(\.[0-9]+)?[smhd]?' <<<"${invocation#*sleep}"); do
    total=$((total + $(seconds_of "$duration")))
  done
  if [[ "$total" -gt "$LONGEST_ALLOWED_SLEEP_SECONDS" ]]; then
    block "This call sleeps ${total} s."
  fi
done <<<"$sleeps"

if grep -qE "${COMMAND_START}(while|until|for)[[:space:]]" <<<"$COMMAND_TO_RUN" &&
  grep -qE "${COMMAND_START}sleep[[:space:]]" <<<"$COMMAND_TO_RUN" &&
  grep -qE "${COMMAND_START}(gh|git|curl)[[:space:]]" <<<"$COMMAND_TO_RUN"; then
  block "This loop polls gh, git or curl between sleeps."
fi

exit 0
