#!/usr/bin/env bash
# PreToolUse hook for a git command that throws away uncommitted work.
#
# `git reset --hard`, `git checkout -- <path>` and `git restore <path>` all
# delete tracked changes that are not committed, with no confirmation and no
# reflog entry for the working tree. That is fine when the changes are the ones
# you meant to discard, and it is a silent loss when anything else is in flight.
#
# It keeps happening here for one reason: the moment you reach for it is the
# moment you are *verifying* something. Proving an eradication works means
# breaking the code on purpose and then undoing the break — and the undo takes
# the real fix sitting beside it. `docs/knowledge/destructive-git-with-uncommitted-verification-work.md`
# has recorded that since three losses in one session; two more happened after
# it was written, one of them in the sweep that added this hook, which is the
# evidence that a written warning is not a countermeasure.
#
# The hook does not refuse the command. It refuses it *while tracked
# modifications exist*, which is the only state where it destroys something, and
# names the two ways out.
#
# See docs/dantotsus/a-warning-that-had-to-become-a-gate.md.
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

COMMAND_TO_RUN="$(printf '%s' "$COMMAND" \
  | python3 "$(dirname "$0")/strip-heredocs.py" \
  | python3 "$(dirname "$0")/strip-quoted-strings.py")"

DISCARDS_WORKING_TREE='(^|[;&|[:space:]])git[[:space:]]+(reset[[:space:]]+(--hard|--merge|--keep)|checkout[[:space:]]+--[[:space:]]|restore[[:space:]])'
if ! grep -qE "$DISCARDS_WORKING_TREE" <<<"$COMMAND_TO_RUN"; then
  exit 0
fi

# Only tracked modifications are at stake. An untracked file survives all three
# commands, and a staged-only change is recoverable from the index.
if ! git diff --quiet 2>/dev/null; then
  echo "[no-discarding-reset] this discards tracked changes that are not committed:" >&2
  git diff --name-only 2>/dev/null | sed 's/^/[no-discarding-reset]     /' >&2
  echo "[no-discarding-reset] Commit them first — a commit is cheap and amendable:" >&2
  echo "[no-discarding-reset]   git add -A && git commit -m 'wip'   …   git reset --soft HEAD~1" >&2
  echo "[no-discarding-reset] Or park them where the command cannot reach:" >&2
  echo "[no-discarding-reset]   git stash push -u -m 'before the probe'" >&2
  exit 2
fi

exit 0
