#!/usr/bin/env bash
# The commit .husky/pre-push diffs against, and the words it prints for it.
#
#   scripts/pre-push-range.sh [<remote sha>]
#
# prints two lines: the base commit, then the label. An empty remote sha means
# the branch does not exist upstream yet. The caller has already fetched
# origin/main and refused a remote sha this checkout never fetched.
#
# This lived inline in the hook and was fixed four times, each time replayed by
# hand in a throwaway repository and never kept as a test, so each fix could
# undo an earlier one unseen. scripts/pre-push-range.test.ts now holds every
# case those fixes named. See
# docs/dantotsus/the-merge-that-re-gated-the-whole-branch.md.
set -euo pipefail

remote_sha="${1:-}"
main_merged=$(git merge-base HEAD origin/main 2>/dev/null || true)
whole_branch="${main_merged:-HEAD}"

report() {
  printf '%s\n%s\n' "$1" "$2"
  exit 0
}

if [ -z "$remote_sha" ]; then
  report "$whole_branch" "the whole branch since main (no remote ref for this branch yet)"
fi

# A remote sha that HEAD does not descend from means the push rewrites the
# branch. Two rewrites look alike here and need opposite bases.
#
# A rebase replays the branch as last pushed onto a newer main, so HEAD still
# holds all of that work: merging the remote sha into HEAD changes nothing.
# Both of the states it combines were gated, so it takes the same base as a
# push that merges main in, below. Rebasing with --force-with-lease is the
# repository's way to bring main in (CLAUDE.md), and gating the whole branch
# on every rebase would undo what that base saves.
#
# A restart is `git checkout -B <branch> origin/main` after the pull request
# was squash-merged, or a branch abandoned for a new start. Its earlier work is
# either in main already or gone, so it is new work on main and its base is
# main. See docs/dantotsus/a-force-push-re-gated-everything-main-had-merged.md.
combined_label="this push, minus the commits it merged from origin/main"
if ! git merge-base --is-ancestor "$remote_sha" HEAD 2>/dev/null; then
  holds_pushed=$(git merge-tree --write-tree --no-messages "$remote_sha" HEAD 2>/dev/null) || true
  main_holds_pushed=$(git merge-tree --write-tree --no-messages "$remote_sha" "$main_merged" 2>/dev/null) || true
  if [ "${holds_pushed%%$'\n'*}" != "$(git rev-parse 'HEAD^{tree}')" ] ||
    [ "${main_holds_pushed%%$'\n'*}" = "$(git rev-parse "$main_merged^{tree}")" ]; then
    report "$whole_branch" "the whole branch since main (the push rewrites the branch)"
  fi
  combined_label="this push, minus what it replayed from the branch as last pushed and from origin/main"
fi

# An ordinary push: main is already behind what the branch last pushed, so the
# remote sha is the tightest base there is.
if [ -z "$main_merged" ] || git merge-base --is-ancestor "$main_merged" "$remote_sha" 2>/dev/null; then
  report "$remote_sha" "this push"
fi

# This push merges main in. Two states were gated already: the branch as last
# pushed (the remote sha) and main as merged (main_merged, which
# full-suite.yml gated when it landed). The base is their automatic merge, so
# the range is what this push adds on top of combining them: its own new
# commits and any conflict it resolved.
#
# It used to be main_merged alone. That drops main's commits, but it also puts
# back every file the branch changed since it forked, all pushed and gated
# before: on PR #197, a push adding 9 files after merging a one-line main
# commit gated 149 and mutated pragma for eight minutes.
#
# A file both sides changed is the one place the combination is new code that
# neither gate saw, so the base takes it from where the two sides forked, and
# it stays in the range whenever HEAD holds anything but that.
fork=$(git merge-base "$remote_sha" "$main_merged")
merged=$(git merge-tree --write-tree --no-messages "$remote_sha" "$main_merged" 2>/dev/null) || true
merged_tree=${merged%%$'\n'*}
if ! git cat-file -e "$merged_tree^{tree}" 2>/dev/null; then
  report "$main_merged" "$combined_label (git cannot merge without a worktree here, so the branch's earlier work is gated again)"
fi

index=$(mktemp)
trap 'rm -f "$index"' EXIT
GIT_INDEX_FILE="$index" git read-tree "$merged_tree"
comm -12 \
  <(git diff --name-only --no-renames "$fork" "$remote_sha" | sort) \
  <(git diff --name-only --no-renames "$fork" "$main_merged" | sort) |
  while IFS= read -r both_sides; do
    entry=$(git ls-tree "$fork" -- "$both_sides")
    if [ -n "$entry" ]; then
      printf '%s\n' "$entry"
    else
      printf '0 0000000000000000000000000000000000000000\t%s\n' "$both_sides"
    fi
  done | GIT_INDEX_FILE="$index" git update-index --index-info
base_tree=$(GIT_INDEX_FILE="$index" git write-tree)

base=$(
  git -c user.name=pre-push -c user.email=pre-push@localhost \
    commit-tree --no-gpg-sign "$base_tree" -p "$remote_sha" -p "$main_merged" \
    -m "pre-push: the branch as last pushed, combined with the main it merged"
)
report "$base" "$combined_label"
