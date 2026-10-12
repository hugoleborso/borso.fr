---
date: 2026-10-12
introduced-at: conception
detected-at: local
severity: medium
related-pr: '#174'
fix-pr: none (the kaizen pull request that adds this file)
fix-commits: [self]
eradication-level: 1
eradication-paths: [.husky/pre-push]
time-to-detect: minutes
tags: [ci, git, hooks, gates]
zone: .husky/pre-push
recurs: [a-stale-ref-priced-a-one-line-push-at-fifty-minutes]
---

# A force push re-gated everything main had merged

## Symptom

PR #171 was squash-merged. Its branch, `claude/peaceful-ramanujan-94h5zd`, was then reset onto `origin/main` for the next piece of work, as the session instructions say to do for a merged branch, and one commit was added: the vendored impeccable skill, 71 files. The force push gated 774 files, ran the tests of four applications and six mutation suites over 79 files, and outlived the ten-minute command timeout before it finished green.

## Root-cause chain

1. **Why 774 files?** The hook diffed the new HEAD against the remote sha, the old branch tip.
2. **Why is that wrong?** The old tip sat on the main of two days before, with the squashed commits on top. The new HEAD sits on today's main. The diff between them is every change main took in between, plus the new commit.
3. **Why did the narrowing for merges not apply?** It narrows to `origin/main` only when main is an ancestor of HEAD and not of the remote sha. Here the hook's own fetch had moved `origin/main` past the base HEAD was reset on, so main was an ancestor of neither.
4. **Why does the hook trust the remote sha at all?** For an ordinary push the remote sha is an ancestor of HEAD and is the tightest base there is. Nothing checked that it was one.

**Root cause:** thought the remote sha is always where this push starts, actually a push that rewrites the branch starts from somewhere the remote sha is not an ancestor of.

## Detection failure causes

- **CI (tests / build):** CI gates the pull request against main and was right; only the local hook over-gated.
- **Code review:** the earlier dantotsu on this file fixed the stale `origin/main` and the merge push, both pushes where the remote sha is an ancestor.

## Countermeasure

- **Code:** this commit uses the remote sha only when HEAD descends from it, and otherwise bases the range on `git merge-base HEAD origin/main`, the same base as a branch's first push.

## Eradication (mandatory — code-level)

**Type:** code diff (level 1 — structural impossibility)

**Reference:** commit adding this file.

**The actual fix:**

```diff
-if [ -n "$push_base" ] && git cat-file -e "$push_base" 2>/dev/null; then
+if [ -n "$push_base" ] && git cat-file -e "$push_base" 2>/dev/null &&
+  git merge-base --is-ancestor "$push_base" HEAD 2>/dev/null; then
   range_label="this push"
+elif [ -n "$push_base" ] && git cat-file -e "$push_base" 2>/dev/null; then
+  push_base=$(git merge-base HEAD origin/main 2>/dev/null || echo HEAD)
+  range_label="the whole branch since main (the push rewrites the branch)"
 else
```

Replayed on the PR #174 push: the old remote sha `0dd5677` is not an ancestor of `c56ebcc`, the new base is the merge base with main, and the range drops from 774 files to the 71 the commit added.

**Sibling defects swept:** the merge-push narrowing below it still runs after this, and stays correct: it only replaces the base when main is an ancestor of HEAD.

## See also

- [`a-stale-ref-priced-a-one-line-push-at-fifty-minutes.md`](./a-stale-ref-priced-a-one-line-push-at-fifty-minutes.md)
- [`designated-branch-was-a-merged-pr-head.md`](./designated-branch-was-a-merged-pr-head.md)
