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

GIT_INVOCATION='(^|[;&|({[:space:]])git([[:space:]]+-C[[:space:]]+[^[:space:];&|]+)?[[:space:]]+'
DISCARDS_WORKING_TREE="${GIT_INVOCATION}(reset[[:space:]]+(--hard|--merge|--keep)|checkout[[:space:]]+--[[:space:]]|restore[[:space:]])"
if ! grep -qE "$DISCARDS_WORKING_TREE" <<<"$COMMAND_TO_RUN"; then
  exit 0
fi

UNREADABLE_DIRECTORY='unreadable'

refuse_unreadable_checkout() {
  echo "[no-discarding-reset] cannot tell whether this discards uncommitted work: $1." >&2
  echo "[no-discarding-reset] The hook reads the command before the shell expands it, so a variable," >&2
  echo "[no-discarding-reset] a quoted path or a directory that does not exist names no checkout it can read." >&2
  echo "[no-discarding-reset] Name the checkout with a literal path:" >&2
  echo "[no-discarding-reset]   git -C /absolute/path/to/worktree reset --hard" >&2
  "$(dirname "$0")/kaizen-refusal.sh" no-discarding-reset "ran a discarding git command on a checkout the hook could not read"
  exit 2
}

trap 'refuse_unreadable_checkout "the hook itself failed while reading the checkout"' ERR

resolve_directory() {
  local base="$1"
  local path="$2"
  if [[ "$base" == "$UNREADABLE_DIRECTORY" || -z "$path" || "$path" == "-" || "$path" =~ [\$\`\"\'*?] ]]; then
    echo "$UNREADABLE_DIRECTORY"
    return
  fi
  path="${path/#\~/$HOME}"
  if [[ "$path" == /* ]]; then
    echo "$path"
  else
    echo "$base/$path"
  fi
}

# `git restore --staged <path>` only unstages: it rewrites the index from HEAD
# and leaves the working tree alone, unless --worktree (or -W) is also given.
is_staged_only_restore() {
  grep -qE "${GIT_INVOCATION}restore[[:space:]]" <<<"$1" \
    && grep -qE '(^|[[:space:]])(--staged|-S)([[:space:]]|$)' <<<"$1" \
    && ! grep -qE '(^|[[:space:]])(--worktree|-W)([[:space:]]|$)' <<<"$1"
}

# The command acts on the checkout it names, which is not always the one this
# hook runs in: a `git -C <path>` or an earlier `cd <path>` points it at another
# worktree, and the dirty files that matter are that worktree's. Each command
# in the chain is judged against the directory it would run in.
CURRENT_DIRECTORY='.'
while IFS= read -r segment; do
  segment="$(sed -E 's/^[[:space:](){}!]+//' <<<"$segment")"

  if [[ "$segment" =~ ^(cd|pushd)([[:space:]]+([^[:space:]]+))?[[:space:]]*$ ]]; then
    CURRENT_DIRECTORY="$(resolve_directory "$CURRENT_DIRECTORY" "${BASH_REMATCH[3]:-$HOME}")"
    continue
  fi
  if [[ "$segment" =~ ^(cd|pushd|popd)([[:space:]]|$) ]]; then
    CURRENT_DIRECTORY="$UNREADABLE_DIRECTORY"
    continue
  fi

  grep -qE "$DISCARDS_WORKING_TREE" <<<"$segment" || continue
  is_staged_only_restore "$segment" && continue

  TARGET_DIRECTORY="$CURRENT_DIRECTORY"
  if [[ "$segment" =~ git[[:space:]]+-C[[:space:]]+([^[:space:]]+) ]]; then
    TARGET_DIRECTORY="$(resolve_directory "$CURRENT_DIRECTORY" "${BASH_REMATCH[1]}")"
  fi
  if [[ "$TARGET_DIRECTORY" == "$UNREADABLE_DIRECTORY" ]]; then
    refuse_unreadable_checkout "\`$segment\` names its checkout through something only the shell can expand"
  fi
  if ! git -C "$TARGET_DIRECTORY" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    refuse_unreadable_checkout "$TARGET_DIRECTORY is not a git checkout the hook can read"
  fi

  # Only tracked modifications are at stake. An untracked file survives all
  # three commands, and a staged-only change is recoverable from the index.
  # `|| DIFF_STATUS=$?` keeps exit 1, the answer "there are changes", away
  # from the ERR trap. `set +e` did not: the trap fires on any failing simple
  # command, so every dirty tree read as an unreadable checkout.
  DIFF_STATUS=0
  git -C "$TARGET_DIRECTORY" diff --quiet 2>/dev/null || DIFF_STATUS=$?
  if [[ "$DIFF_STATUS" -eq 0 ]]; then
    continue
  fi
  if [[ "$DIFF_STATUS" -ne 1 ]]; then
    refuse_unreadable_checkout "git diff failed in $TARGET_DIRECTORY"
  fi

  echo "[no-discarding-reset] \`$segment\` discards tracked changes that are not committed in $TARGET_DIRECTORY:" >&2
  git -C "$TARGET_DIRECTORY" diff --name-only | sed 's/^/[no-discarding-reset]     /' >&2
  echo "[no-discarding-reset] Commit them first — a commit is cheap and amendable:" >&2
  echo "[no-discarding-reset]   git add <those paths> && git commit -m 'wip'   …   git reset --soft HEAD~1" >&2
  echo "[no-discarding-reset] Or park them where the command cannot reach:" >&2
  echo "[no-discarding-reset]   git stash push -u -m 'before the probe'" >&2
  "$(dirname "$0")/kaizen-refusal.sh" no-discarding-reset "ran a git command that would discard uncommitted work"
  exit 2
done < <(tr ';&|' '\n\n\n' <<<"$COMMAND_TO_RUN")

exit 0
