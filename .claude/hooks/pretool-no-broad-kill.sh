#!/usr/bin/env bash
# PreToolUse hook for pattern-based process kills.
#
# Refuses `pkill`, `killall`, `pgrep | xargs kill` and `agent-browser close --all`. Several agents and
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
  echo "[no-broad-kill] Main session, started it with run_in_background? Stop it with TaskStop and its task id." >&2
  echo "[no-broad-kill] Otherwise start the server as 'setsid pnpm dev > log 2>&1 &', so it owns a process group," >&2
  echo "[no-broad-kill] and stop the group that holds YOUR port, not a name pattern:" >&2
  echo "[no-broad-kill]   pgid=\$(ps -o pgid= -p \"\$(lsof -ti tcp:5173 -sTCP:LISTEN | head -1)\" | tr -d ' ')" >&2
  echo "[no-broad-kill]   [ -n \"\$pgid\" ] && [ \"\$pgid\" != \"\$(ps -o pgid= -p \$BASHPID | tr -d ' ')\" ] && kill -- \"-\$pgid\"" >&2
  echo "[no-broad-kill] It stops pnpm, concurrently and every server they started. The guard skips a group that" >&2
  echo "[no-broad-kill] holds your own shell, as a server started without setsid inside a pipeline does." >&2
  echo "[no-broad-kill] kill \"\$pid\" alone stops pnpm and leaves its servers listening, and under setsid" >&2
  echo "[no-broad-kill] \$! is a wrapper that has already exited." >&2
  "$(dirname "$0")/kaizen-refusal.sh" no-broad-kill "reached for pkill or killall on a machine other agents share"
  exit 2
}

if grep -qE '(^|[;&|[:space:]])(pkill|killall|killall5)([[:space:]]|$)' <<<"$COMMAND_TO_RUN"; then
  block "pkill / killall matches every process whose command line contains the pattern, including other agents'."
fi

if grep -qE 'pgrep[^|]*\|[[:space:]]*xargs[[:space:]]+(-[^[:space:]]+[[:space:]]+)*kill' <<<"$COMMAND_TO_RUN"; then
  block "pgrep piped into xargs kill is pkill spelled differently, with the same blast radius."
fi

# `agent-browser close --all` is the same broad kill aimed at browsers: it ends
# every agent's session, and a parallel validator came back on about:blank with
# a fresh profile in the middle of its check (PR #321, `implementation-04b`).
if grep -qE '(^|[;&|[:space:]])agent-browser([[:space:]]+[^;&|]*)?[[:space:]]close[[:space:]]+([^;&|]*[[:space:]])?--all([[:space:]]|$)' <<<"$COMMAND_TO_RUN"; then
  echo "[no-broad-kill] agent-browser close --all closes every agent's browser session, not only yours." >&2
  echo "[no-broad-kill] Close the session you opened: agent-browser --session <name> close, or agent-browser close for the default one." >&2
  "$(dirname "$0")/kaizen-refusal.sh" no-broad-kill "reached for agent-browser close --all on a machine other agents share"
  exit 2
fi

exit 0
