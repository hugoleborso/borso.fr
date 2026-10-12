---
date: 2026-10-12
introduced-at: implementation
detected-at: local
severity: medium
related-pr: '#118'
fix-pr: '#173'
fix-commits: [self]
eradication-level: 1
eradication-paths: [.husky/pre-push]
time-to-detect: one push
tags: [git, tooling, husky, mutation, pre-push, gates]
zone: .husky/pre-push
recurs: [the-scoped-gate-that-charged-for-all-of-main]
---

# The fetch that undid the narrowing

## Symptom

On PR #118 an agent merged `origin/main` into its branch and pushed. The
pre-push hook announced the range as "this push", not "minus the commits it
merged", and started a mutation run over 81 talos files plus every pure file
main had changed in a hundred commits. None of them were the branch's work.
The push timed out under the load it created.

## Root-cause chain

1. **Why did the hook gate main's files?** It diffed against the remote sha
   of the branch, which predates the merge, so every file main brought in was
   in the range.
2. **Why was the narrowing for that case skipped?** The narrowing diffed
   against `origin/main`'s tip, and only after checking that the tip was an
   ancestor of `HEAD`.
3. **Why was the tip not an ancestor?** The hook runs `git fetch origin main`
   first, on purpose, so that a stale ref does not inflate the range. In a
   session where nine pull requests merged, main moved between the agent's
   merge and its push almost every time, and the fresh tip was a commit the
   branch had never merged.

**Root cause:** the hook's author thought "the main this branch merged" was
`origin/main`, but the hook's own fetch moves `origin/main` past it; the
commit the branch merged is `git merge-base HEAD origin/main`.

## Detection failure causes

- **Functional validation locally:** the narrowing was measured on a push
  where main had not moved since the merge, which is the one case where tip
  and merge base are the same commit.
- **CI:** the hook does not run in CI, and nothing tests its range logic.

## Countermeasure

The hook takes the merge base instead of the tip, and narrows whenever that
merge base is not already an ancestor of the remote sha.

## Eradication (mandatory — code-level)

**Type:** code diff (level 1 — structural impossibility)

**Reference:** [PR #173](https://github.com/hugoleborso/borso.fr/pull/173) · commit `self` (this entry ships with it)

**The actual fix:**

```diff
-main_tip=$(git rev-parse --verify --quiet origin/main 2>/dev/null || true)
-if [ -n "$main_tip" ] &&
-  git merge-base --is-ancestor "$main_tip" HEAD 2>/dev/null &&
-  ! git merge-base --is-ancestor "$main_tip" "$push_base" 2>/dev/null; then
-  push_base="$main_tip"
+main_merged=$(git merge-base HEAD origin/main 2>/dev/null || true)
+if [ -n "$main_merged" ] &&
+  ! git merge-base --is-ancestor "$main_merged" "$push_base" 2>/dev/null; then
+  push_base="$main_merged"
```

Replayed in a throwaway repository: a branch merges three main commits,
commits once more, and main moves once after the merge. The old logic gated
the three main files; the new one gates only the branch's two. An ordinary
push after that still gates only its own file.

**Sibling defects swept:** the conflict check at the end of the hook already
uses `git merge-base HEAD origin/main`.

## See also

- [`the-scoped-gate-that-charged-for-all-of-main.md`](./the-scoped-gate-that-charged-for-all-of-main.md), which introduced the narrowing.
- [`a-stale-ref-priced-a-one-line-push-at-fifty-minutes.md`](./a-stale-ref-priced-a-one-line-push-at-fifty-minutes.md), which added the fetch.
- [`the-gates-that-timed-each-other-out.md`](./the-gates-that-timed-each-other-out.md), what the oversized range did to the machine.
