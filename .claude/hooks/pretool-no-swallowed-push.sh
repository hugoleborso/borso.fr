#!/usr/bin/env bash
# PreToolUse hook for a git push or commit whose exit status is thrown away.
#
# `pipefail` is off in this shell, so a pipeline reports the last stage's
# status. `git push | tail -5` therefore exits 0 whether the push succeeded or
# the pre-push hook rejected it, and the hook's own output goes to stderr, which
# is not piped and scrolls past above whatever `tail` printed. The failure looks
# exactly like the success.
#
# That is not hypothetical: a push rejected by the pre-push gate read as a
# successful one for two hours on the branch that added this file, because the
# command was written `git push … | tail -3` to keep the output short.
#
# The same shape swallows a commit: `git commit | tail` hides a hook rejection
# and leaves the tree looking committed when nothing was.
#
# See docs/dantotsus/a-push-that-failed-and-reported-success.md.
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

# Match an invocation, not a mention. A commit message or a documentation entry
# quoting the shape is text being written rather than a push being made, and the
# commit that armed this hook was refused by it for saying so in prose. Heredoc
# bodies go first and quoted arguments second, because both carry prose and only
# the first had a stripper: `echo "never write git push | tail"` reached the
# grep intact until the second one existed.
COMMAND_TO_RUN="$(printf '%s' "$COMMAND" \
  | python3 "$(dirname "$0")/strip-heredocs.py" \
  | python3 "$(dirname "$0")/strip-quoted-strings.py")"

# A pipeline already made safe by an explicit `pipefail` keeps the real status.
if grep -qE 'set -[a-zA-Z]*o[[:space:]]+pipefail|set -o pipefail' <<<"$COMMAND_TO_RUN"; then
  exit 0
fi

block() {
  echo "[no-swallowed-push] $1" >&2
  echo "[no-swallowed-push] pipefail is off here, so the pipeline reports the last stage's status," >&2
  echo "[no-swallowed-push] and the gate's own message goes to stderr, which is not piped." >&2
  echo "[no-swallowed-push] Run it bare and read the tail afterwards:" >&2
  echo "[no-swallowed-push]   git push -u origin <branch>" >&2
  echo "[no-swallowed-push] or keep the status if the output is genuinely too long:" >&2
  echo "[no-swallowed-push]   set -o pipefail; git push -u origin <branch> 2>&1 | tail -20" >&2
  exit 2
}

if grep -qE '(^|[;&|[:space:]])git[[:space:]]+push([[:space:]][^|]*)?\|' <<<"$COMMAND_TO_RUN"; then
  block "git push piped into another command throws away the push's exit status."
fi

if grep -qE '(^|[;&|[:space:]])git[[:space:]]+commit([[:space:]][^|]*)?\|' <<<"$COMMAND_TO_RUN"; then
  block "git commit piped into another command throws away the commit hook's exit status."
fi

exit 0
