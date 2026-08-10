#!/usr/bin/env bash
# PreToolUse hook for pattern-based process kills.
#
# Refuses `pkill`, `killall`, and `pgrep | xargs kill`. Several agents and
# several long measurements share one machine in this sandbox, and no name
# pattern distinguishes the caller's own process from someone else's: `node`,
# `vite`, `vitest` and `stryker run` all appear in every agent's process list.
# A broad kill aimed at your own dev server takes another agent's twenty-minute
# mutation run with it, and the victim sees only a non-zero exit code.
#
# See docs/dantotsus/broad-pkill-killed-another-agents-measurement.md.
#
# Output contract (Claude Code PreToolUse hook):
#   - exit 0 + no stderr → command runs as-is.
#   - exit 1 + stderr message → command is blocked; the message is surfaced to
#     the agent so it can self-correct.

set -euo pipefail

INPUT="$(cat)"

COMMAND="$(jq -r '.tool_input.command // ""' <<<"$INPUT")"
if [[ -z "$COMMAND" ]]; then exit 0; fi

block() {
  echo "[no-broad-kill] $1" >&2
  echo "[no-broad-kill] This machine is shared with other agents and with long-running measurements." >&2
  echo "[no-broad-kill] Kill a PID you own, not a name pattern:" >&2
  echo "[no-broad-kill]   pnpm dev & pid=\$!   …   kill \"\$pid\"" >&2
  echo "[no-broad-kill] If the PID is lost, find the one holding YOUR port rather than every match:" >&2
  echo "[no-broad-kill]   ss -lptn 'sport = :5173'" >&2
  exit 1
}

if grep -qE '(^|[;&|[:space:]])(pkill|killall|killall5)([[:space:]]|$)' <<<"$COMMAND"; then
  block "pkill / killall matches every process whose command line contains the pattern, including other agents'."
fi

if grep -qE 'pgrep[^|]*\|[[:space:]]*xargs[[:space:]]+(-[^[:space:]]+[[:space:]]+)*kill' <<<"$COMMAND"; then
  block "pgrep piped into xargs kill is pkill spelled differently, with the same blast radius."
fi

exit 0
