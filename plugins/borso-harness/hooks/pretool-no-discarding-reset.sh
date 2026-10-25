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

GIT_INVOCATION='(^|[;&|[:space:]])git([[:space:]]+-C[[:space:]]+[^[:space:];&|]+)?[[:space:]]+'
DISCARDS_WORKING_TREE="${GIT_INVOCATION}(reset[[:space:]]+(--hard|--merge|--keep)|checkout[[:space:]]+--[[:space:]]|restore[[:space:]])"
if ! grep -qE "$DISCARDS_WORKING_TREE" <<<"$COMMAND_TO_RUN"; then
  exit 0
fi

# `git restore --staged <path>` only unstages: it rewrites the index from HEAD
# and leaves the working tree alone, unless --worktree (or -W) is also given.
# The hook refused exactly that on PR #193, naming another checkout's work.
RESTORE_LINE="$(grep -oE "${GIT_INVOCATION}restore[[:space:]][^;&|]*" <<<"$COMMAND_TO_RUN" | head -n1 || true)"
if [[ -n "$RESTORE_LINE" ]] && ! grep -qE "${GIT_INVOCATION}(reset|checkout)[[:space:]]" <<<"$COMMAND_TO_RUN" \
  && grep -qE '(^|[[:space:]])(--staged|-S)([[:space:]]|$)' <<<"$RESTORE_LINE" \
  && ! grep -qE '(^|[[:space:]])(--worktree|-W)([[:space:]]|$)' <<<"$RESTORE_LINE"; then
  exit 0
fi

# The command acts on the checkout it names, which is not always the one this
# hook runs in: a `git -C <path>` or a leading `cd <path> &&` points it at
# another worktree, and the dirty files that matter are that worktree's. Reading
# the hook's own directory refused a call for work it would never have touched.
TARGET_DIRECTORY="$(grep -oE 'git[[:space:]]+-C[[:space:]]+[^[:space:];&|]+' <<<"$COMMAND_TO_RUN" | head -n1 | sed -E 's/^git[[:space:]]+-C[[:space:]]+//' || true)"
if [[ -z "$TARGET_DIRECTORY" ]]; then
  TARGET_DIRECTORY="$(grep -oE '^[[:space:]]*cd[[:space:]]+[^[:space:];&|]+' <<<"$COMMAND_TO_RUN" | head -n1 | sed -E 's/^[[:space:]]*cd[[:space:]]+//' || true)"
fi
TARGET_DIRECTORY="${TARGET_DIRECTORY:-.}"
TARGET_DIRECTORY="${TARGET_DIRECTORY/#\~/$HOME}"

# Only tracked modifications are at stake. An untracked file survives all three
# commands, and a staged-only change is recoverable from the index.
if ! git -C "$TARGET_DIRECTORY" diff --quiet 2>/dev/null; then
  echo "[no-discarding-reset] this discards tracked changes that are not committed in $TARGET_DIRECTORY:" >&2
  git -C "$TARGET_DIRECTORY" diff --name-only 2>/dev/null | sed 's/^/[no-discarding-reset]     /' >&2
  echo "[no-discarding-reset] Commit them first — a commit is cheap and amendable:" >&2
  echo "[no-discarding-reset]   git add -A && git commit -m 'wip'   …   git reset --soft HEAD~1" >&2
  echo "[no-discarding-reset] Or park them where the command cannot reach:" >&2
  echo "[no-discarding-reset]   git stash push -u -m 'before the probe'" >&2
  "$(dirname "$0")/kaizen-refusal.sh" no-discarding-reset "ran a git command that would discard uncommitted work"
  exit 2
fi

exit 0
