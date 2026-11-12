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
# the checkout, and names the ways out: push the work to the pull request's
# branch or to one of its own, or drop it once the operator has said to.
# Untracked files are not counted: build output and scratch files live there
# and are meant to go.
#
# A hosted session is told to push to one branch only. On PR #293 that made the
# `-wip` push look forbidden, so the session moved its stash to a patch in the
# scratchpad, which is the loss this hook exists to stop and which it cannot
# see. The message now says the push is asked for.
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
echo "[merge-strands-no-work] If it belongs to this pull request, commit it and push it to the pull request's branch." >&2
echo "[merge-strands-no-work] If it is for later, push it to a branch of its own, for example:" >&2
echo "[merge-strands-no-work]   git stash branch claude/<slug>-wip && git commit -am 'wip' && git push -u origin claude/<slug>-wip" >&2
echo "[merge-strands-no-work] The operator asks for that push here, so a session told to push to one branch only makes it too." >&2
echo "[merge-strands-no-work] A patch file in the scratchpad is not a way out: it is reclaimed with the container." >&2
echo "[merge-strands-no-work] Or drop it, with its own confirmation from the operator, then merge." >&2
"$(dirname "$0")/kaizen-refusal.sh" merge-strands-no-work "merged with uncommitted or stashed work in the container"
exit 2
