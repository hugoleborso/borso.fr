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
#   - exit 2 + stderr message → command is blocked; the message is surfaced to
#     the agent so it can self-correct. Exit 1 does NOT block: the harness
#     treats any non-zero-but-not-2 code as a non-blocking error, prints it,
#     and runs the command anyway.

set -euo pipefail

INPUT="$(cat)"

COMMAND="$(jq -r '.tool_input.command // ""' <<<"$INPUT")"
if [[ -z "$COMMAND" ]]; then exit 0; fi

# Match an invocation, not a mention. Heredoc bodies are dropped first,
# because a commit message or a documentation entry naming the command is
# text being written rather than a process being killed: the commit that
# armed this hook was refused by it for saying the word in prose.
#
# Quoted bodies go the same way, and were the half this hook missed. A word
# inside a string literal cannot be the command word of the shell that quotes
# it, so an `echo` label, a log line or a search pattern naming the command is
# a mention however loudly it says the word. On 2026-08-20 this hook refused
# two calls in one session on that shape alone, including the one that was
# opening the entry explaining the rule. `strip-quoted-strings.py` was written
# for the swallowed-push hook and applies here unchanged.
COMMAND_TO_RUN="$(printf '%s' "$COMMAND" |
  python3 "$(dirname "$0")/strip-heredocs.py" |
  python3 "$(dirname "$0")/strip-quoted-strings.py")"

block() {
  echo "[no-broad-kill] $1" >&2
  echo "[no-broad-kill] This machine is shared with other agents and with long-running measurements." >&2
  echo "[no-broad-kill] Kill a PID you own, not a name pattern:" >&2
  echo "[no-broad-kill]   pnpm dev & pid=\$!   …   kill \"\$pid\"" >&2
  echo "[no-broad-kill] If the PID is lost, find the one holding YOUR port rather than every match:" >&2
  echo "[no-broad-kill]   ss -lptn 'sport = :5173'" >&2
  exit 2
}

if grep -qE '(^|[;&|[:space:]])(pkill|killall|killall5)([[:space:]]|$)' <<<"$COMMAND_TO_RUN"; then
  block "pkill / killall matches every process whose command line contains the pattern, including other agents'."
fi

if grep -qE 'pgrep[^|]*\|[[:space:]]*xargs[[:space:]]+(-[^[:space:]]+[[:space:]]+)*kill' <<<"$COMMAND_TO_RUN"; then
  block "pgrep piped into xargs kill is pkill spelled differently, with the same blast radius."
fi

exit 0
