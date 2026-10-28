---
date: 2026-10-27
introduced-at: implementation
detected-at: local
severity: medium
related-pr: '#197'
fix-pr: none (the kaizen pull request for PR #197 that adds this file)
fix-commits: [self]
eradication-level: 1
eradication-paths: [scripts/pre-push-range.sh, scripts/pre-push-range.test.ts, .husky/pre-push]
time-to-detect: one push
tags: [git, hooks, pre-push, gates, mutation]
zone: .husky/pre-push
recurs: [the-fetch-that-undid-the-narrowing, the-scoped-gate-that-charged-for-all-of-main, a-force-push-re-gated-everything-main-had-merged, a-stale-ref-priced-a-one-line-push-at-fifty-minutes]
---

# The merge that re-gated the whole branch

## Symptom

On PR #197 the branch merged a one-line commit from `main` and pushed one
more commit on top. The pre-push hook printed

```
[pre-push] gating 149 changed file(s) — range: this push, minus the commits it merged from origin/main
```

and spent eight minutes mutating pragma. The push added 8 files of its own.
The other 141 were the branch's earlier work, every one of them pushed and
gated before.

## Root-cause chain

1. **Why 149 files?** On a push that merges main in, the hook diffed against
   `git merge-base HEAD origin/main`, the newest main commit the branch has
   merged.
2. **Why does that base include the branch's earlier work?** A diff from main
   to `HEAD` is the whole branch. It drops what main brought in, which is what
   the narrowing was written for, and it puts back everything the branch
   changed since it forked, which the remote sha had kept out.
3. **Why was the base chosen that way?** The fix that introduced it
   ([the-scoped-gate-that-charged-for-all-of-main](./the-scoped-gate-that-charged-for-all-of-main.md))
   was measured on a branch whose earlier pushes were small, so "the branch's
   own work" and "this push" gave almost the same number. Its comment said
   the range "cannot under-gate", and that was true; nobody asked whether it
   over-gated.
4. **Why did nothing catch it?** The range logic was fixed four times, each
   time by replaying a scenario by hand in a throwaway repository. None of the
   replays was kept, so each fix was checked against its own case only.

**Root cause:** thought "minus what main merged" was `main..HEAD`; actually it
is what `HEAD` adds on top of combining the two states already gated, the
branch as last pushed and main as merged.

## Detection failure causes

- **Linter / static analysis:** the logic is shell inside a hook, and nothing
  lints what a range contains.
- **Functional validation locally:** each fix was replayed by hand, once, for
  the case it fixed.
- **CI (tests / build):** there was no test. The hook runs only on a real push.
- **Code review:** the comment stated the property the code had ("cannot
  under-gate") and was silent on the one it lacked.

## Countermeasure

- **Code:** the range moves to `scripts/pre-push-range.sh`. On the push that
  merges main in, its base is a commit it builds: the automatic merge of the
  remote sha and the main commit the branch merged, made with
  `git merge-tree --write-tree` and `git commit-tree`. A file both sides
  changed takes its version from where the two forked, so that file stays in
  the range: neither earlier gate saw the two changes together. A conflict
  the push resolved stays in the range too.

Replayed on the real push: `HEAD` `68cc7783`, remote sha `53d00219`, main at
`68cc7783^2`. The old base gated 149 files; the new one gates 8.

Property that changes: a file the branch changed before this push, which
main's merge never touched, is no longer gated again here, even when main
changed a file it imports. CI runs the pull request's merge ref with the
whole change, and `full-suite.yml` runs everything on main, so that pair is
still tested, later.

## Eradication (mandatory — code-level)

**Type:** code diff (level 1 — structural impossibility), with the scenarios
held by a test

**Reference:** commit `self` (this entry ships with it)

**The actual fix:**

```diff
-main_merged=$(git merge-base HEAD origin/main 2>/dev/null || true)
-if [ -n "$main_merged" ] &&
-  ! git merge-base --is-ancestor "$main_merged" "$push_base" 2>/dev/null; then
-  push_base="$main_merged"
-  range_label="this push, minus the commits it merged from origin/main"
-fi
+range=$(scripts/pre-push-range.sh "$push_base")
+push_base=$(printf '%s\n' "$range" | sed -n 1p)
+range_label=$(printf '%s\n' "$range" | sed -n 2p)
```

`scripts/pre-push-range.test.ts` builds a repository per case and asserts the
files gated: a new branch, an ordinary push, a rewritten branch, a push that
merges main while main moves on after the merge, a file both sides changed,
and a resolved conflict. Run against the old base, the merge case fails with
the nine already-pushed files in the range.

**Sibling defects swept:** the four earlier cases of this hook
([a stale ref](./a-stale-ref-priced-a-one-line-push-at-fifty-minutes.md),
[a force push](./a-force-push-re-gated-everything-main-had-merged.md),
[main's commits](./the-scoped-gate-that-charged-for-all-of-main.md),
[the fetch](./the-fetch-that-undid-the-narrowing.md)) each have a test case
now, so a fifth fix cannot undo one of them unseen. The test unsets
`GIT_DIR` and its siblings, which git sets inside a hook run from a worktree.

## See also

- [`the-gates-that-timed-each-other-out.md`](./the-gates-that-timed-each-other-out.md), what an oversized range does to the machine.
- [`git-sets-git-dir-inside-a-hook.md`](../knowledge/git-sets-git-dir-inside-a-hook.md), the reason the test strips the hook's variables.
