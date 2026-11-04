#!/usr/bin/env bash
# PreToolUse hook for merging a pull request while work sits only in this
# container.
#
# A session ends at merge, and its container is reclaimed with whatever was not
# pushed. PR #249 merged with an energy-bar prototype parked in `git stash` and
# a patch in the scratchpad, both unreachable once the container went. The
# final message said to "treat it as lost unless you want it saved somewhere",
# after the merge, when saving it was no longer the session's to do.
#
# The hook refuses the merge while tracked changes or stash entries exist in
# the checkout, and names the two ways out: push the work to a branch, or drop
# it once the operator has said to. Untracked files are not counted: build
# output and scratch files live there and are meant to go.
#
# See docs/dantotsus/a-prototype-in-the-tree-the-merge-was-using.md.
#
# Output contract (Claude Code PreToolUse hook): exit 2 + stderr blocks the
# call and shows the message to the agent; exit 0 lets it run.
set -euo pipefail

cat >/dev/null

ROOT="$(git rev-parse --show-toplevel 2>/dev/null)" || exit 0

TRACKED="$(git -C "$ROOT" status --porcelain --untracked-files=no)"
STASHED="$(git -C "$ROOT" stash list)"
if [[ -z "$TRACKED" && -z "$STASHED" ]]; then
  exit 0
fi

echo "[merge-strands-no-work] this container holds work no branch has, and it is reclaimed after the merge:" >&2
[[ -n "$TRACKED" ]] && sed 's/^/[merge-strands-no-work]   changed: /' <<<"$TRACKED" >&2
[[ -n "$STASHED" ]] && sed 's/^/[merge-strands-no-work]   stashed: /' <<<"$STASHED" >&2
echo "[merge-strands-no-work] Push it first, for example:" >&2
echo "[merge-strands-no-work]   git stash branch claude/<slug>-wip && git commit -am 'wip' && git push -u origin claude/<slug>-wip" >&2
echo "[merge-strands-no-work] or drop it, with its own confirmation from the operator, then merge." >&2
"$(dirname "$0")/kaizen-refusal.sh" merge-strands-no-work "merged with uncommitted or stashed work in the container"
exit 2
