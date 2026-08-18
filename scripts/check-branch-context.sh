#!/usr/bin/env bash
# Surface branch-state mismatches at SessionStart.
#
# Failure mode this prevents: an upstream orchestrator routes the
# session to a branch that already shipped (every commit on the
# branch is already in main). The agent follows the prescribed
# branch without cross-checking and ends up adding orphan commits
# to a dead branch while a different open PR silently accumulates
# merge conflicts. First observed on PR #24 — full root-cause at
# docs/dantotsus/designated-branch-was-a-merged-pr-head.md.
#
# Heuristic: if the current branch is "claude/*" AND every commit
# on it is reachable from origin/main, the branch is fully merged.
# That's the exact signal of the original incident — the
# orchestrator handed off a branch whose work had already shipped.
# Main itself, a freshly-branched-from-main branch with no new
# commits, and feature branches with at least one un-merged
# commit are NOT flagged.
#
# The freshly-branched case needs its own test, which is the tip
# comparison below: a branch created from main and not yet
# committed to has zero commits ahead of main, exactly like a
# merged pull-request head, and the count alone cannot separate
# them. What separates them is where the tip sits — a fresh branch
# IS origin/main, while a merged head is an ancestor of it, behind
# the merge commit. Without that test this fired on the first
# commit of every task, and a warning that always fires is one the
# reader learns to skip past.
#
# Non-fatal: prints to stdout and exits 0 in every branch. The
# install-repo-deps.sh caller chains with `|| true` anyway.

set -euo pipefail

if ! git rev-parse --git-dir >/dev/null 2>&1; then
  exit 0
fi

current_branch=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo 'HEAD')

# Only inspect agent-authored branches. Other branches are operator
# territory; the heuristic is calibrated for the "orchestrator
# handed me a stale claude/* branch" failure mode.
case "$current_branch" in
  claude/*) ;;
  *) exit 0 ;;
esac

# Refuse to inspect a detached HEAD (no branch to talk about).
if [[ "$current_branch" == "HEAD" ]]; then
  exit 0
fi

# Need origin/main as the merge reference. Skip cleanly if unavailable
# (fresh clone without the remote, offline mode, etc.).
if ! git rev-parse --verify --quiet origin/main >/dev/null; then
  exit 0
fi

# `git log origin/main..HEAD --oneline` lists commits on this branch
# not yet in main. Zero commits == every commit on this branch is
# already in main == the branch is fully merged.
unmerged_count=$(git rev-list --count origin/main..HEAD 2>/dev/null || echo 0)

# A branch sitting exactly on origin/main is a fresh start, not a
# shipped one: there is no work to be orphaned yet.
if [[ "$(git rev-parse HEAD)" == "$(git rev-parse origin/main)" ]]; then
  exit 0
fi

if [[ "$unmerged_count" -eq 0 ]]; then
  printf '\n⚠️  [branch-context] "%s" is fully merged into origin/main.\n' "$current_branch"
  printf '   Every commit on this branch already shipped, which usually\n'
  printf '   means the orchestrator routed you to a branch whose PR is\n'
  printf '   already closed. Confirm with the user that this is the\n'
  printf '   intended work surface BEFORE committing — otherwise commits\n'
  printf '   land orphaned on a dead branch while the right PR silently\n'
  printf '   accumulates merge conflicts.\n'
  printf '   See docs/dantotsus/designated-branch-was-a-merged-pr-head.md.\n\n'
fi
