---
date: 2026-11-03
introduced-at: conception
detected-at: local
severity: low
related-pr: '#252'
fix-commits: [self, 9b8d380ed]
eradication-level: 2
eradication-paths: [.husky/pre-push]
time-to-detect: minutes
tags: [ci, git, github-actions, hooks, gates]
zone: .husky/pre-push
weak-point: none
recurs: [the-entry-existed-and-i-lost-the-hour-anyway]
---

# The hook knew the branch conflicted, and let the push through anyway

## User impact

PR #252 waited for CI that GitHub would never start. Main moved under it with
PR #251, which also changed `SetlistOrderList.tsx` and its test. A conflicted
pull request gets no workflow run at all, so the pull request sat with no
checks until the session merged `origin/main` in and pushed a second time.

| | Seen | Expected |
| --- | --- | --- |
| The push of `77fa071` | every gate ran, the push landed, then a warning said the branch conflicts | the push refused before any gate, with the merge command |
| CI on PR #252 | none until merge commit `8cc28ea` | a run on the first push of a mergeable branch |

Measured from the merged session's log and PR #252's commit list.

## Causal chain

- PR #252 had no checks after a push.
  - The branch conflicted with `origin/main` on `SetlistOrderList.tsx`.
    - `.husky/pre-push` detected the conflict, but only printed it, at the end,
      after the gates had run, inside the `claude/*` reminder block, with exit
      status 0.
      - PR #71 shipped the check as a warning, the lowest rung that would
        surface `a-conflicted-pull-request-gets-no-checks.md` at push time.
        `the-entry-existed-and-i-lost-the-hour-anyway.md` chose "DevX check
        (level 2, pre-push warning)". (Method)

## Root cause of occurrence

*Thought a warning at push time is enough to make the session merge main,
actually a warning printed after a successful push reads as a footnote to a
success.* (Method)

The process that picked the mechanism counted a warning as a DevX check. A
check that cannot change the exit status detects nothing a session acts on.

## Detection failure causes

- **Pre-push:** the check had the right answer and no power to act on it.
- **Kaizen sweeps:** nothing counted how many pushes landed on a conflicted
  branch after the warning. PR #252 is the first one logged.

## Countermeasure

The conflict check moved to just after the hook fetches `origin/main`, before
the range, the install and the gates, and exits 1. A push of a conflicted
branch now costs one `git fetch` and one `git merge-tree` instead of the full
gate run, and it does not land. Proof on a scratch worktree at `origin/main^`
with a line main's last commit rewrote: the hook printed
`[pre-push] this branch conflicts with origin/main, so GitHub would run no CI on it.`
and exited 1 before any gate started.

## Eradication

**Type:** DevX check (level 2)

**Reference:** the commit adding this file, in PR #255, then
[`9b8d380ed`](https://github.com/hugoleborso/borso.fr/commit/9b8d380ed) (#359).

The refusal shipped here rested on an untested premise: that the local
`git merge-tree` predicts the merge GitHub makes. It grepped the merge output
for `^+<<<<<<<`. The premise was false.
[the-union-merge-only-this-checkout-could-see](./the-union-merge-only-this-checkout-could-see.md)
(2026-11-15) found that a local merge applies the checkout's merge drivers. A
branch still declaring `merge=union` merged clean locally, the guard let
`4c0193b` through, and GitHub ran no CI on PR #351 for 80 minutes.

`9b8d380ed` replaced the grep with the merge GitHub makes. Today's hook reads
attributes from the empty tree, so no driver applies, and reads
`merge-tree --write-tree`'s exit status:

```diff
-  git merge-tree "$merge_base" HEAD origin/main 2>/dev/null | grep -q '^+<<<<<<<'; then
+  empty_tree=$(git hash-object -t tree /dev/null)
+  GIT_ATTR_SOURCE="$empty_tree" git merge-tree --write-tree --name-only HEAD origin/main \
+    >/dev/null 2>&1 || conflict_status=$?
+  if [ "$conflict_status" -eq 1 ]; then
```

The gap, stated: the check is best-effort. A missing `origin/main` or a git
older than 2.40, which ignores `GIT_ATTR_SOURCE`, skips it or falls back to the
worktree's attributes (`.husky/pre-push` comments, read this session).

**Similar instances:** `grep -n 'printf .*WARN\|⚠️' .husky/pre-push` finds the
review-thread reminder and the actionlint skip. Neither knows of a failure it
could refuse on. The reminder is advice, and the actionlint skip already
refuses when a workflow changed.
