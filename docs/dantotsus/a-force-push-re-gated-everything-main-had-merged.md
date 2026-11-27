---
date: 2026-10-12
introduced-at: conception
detected-at: local
severity: medium
related-pr: '#174'
fix-commits: [self, 79be245e0]
eradication-level: 4
eradication-paths: [scripts/pre-push-range.sh, scripts/pre-push-range.test.ts]
time-to-detect: minutes
tags: [ci, git, hooks, gates]
zone: .husky/pre-push
recurs: [a-stale-ref-priced-a-one-line-push-at-fifty-minutes]
---

# A force push re-gated everything main had merged

## User impact

A session pushing one new commit waited for the whole of main to be gated again. PR #171 was squash-merged. Its branch, `claude/peaceful-ramanujan-94h5zd`, was then reset onto `origin/main` for the next piece of work, as the session instructions say to do for a merged branch. One commit was added, the vendored impeccable skill, 71 files.

| | Seen | Expected |
| --- | --- | --- |
| Force push of PR #174 | 774 files gated, the tests of four apps and six mutation suites over 79 files, past the ten-minute command timeout before it finished green (measured) | The 71 files the commit added |

## Causal chain

- The force push gated 774 files.
  - The hook diffed the new HEAD against the remote sha `0dd5677`, the old branch tip.
    - The old tip sat on the main of two days before, with the squashed commits on top. The new HEAD sat on today's main. The diff between them held every change main took in between.
      - The merge narrowing did not apply. It narrowed to `origin/main` only when main was an ancestor of HEAD and not of the remote sha. The hook's own fetch had moved `origin/main` past the base HEAD was reset on, so main was an ancestor of neither.
      - The hook used the remote sha as the base for every push whose sha it could resolve:

        ```sh
        if [ -n "$push_base" ] && git cat-file -e "$push_base" 2>/dev/null; then   # ← any resolvable remote sha is the base
          range_label="this push"
        ```

        - An agent wrote this line in 9fc3b9a40, "perf(ci): gate the push, not the branch". Its message says the base is `<remote sha>..HEAD` and that "all four cases were exercised": a new branch, an empty stdin, an unresolvable sha, and the ordinary push. A push that rewrites the branch was not one of them.
          - The four cases were replayed by hand in a throwaway repository and none was kept as a test. The header of `scripts/pre-push-range.sh` records that this logic "was fixed four times, each time replayed by hand ... and never kept as a test, so each fix could undo an earlier one unseen" (Machine).

## Root cause of occurrence

*Thought a push always extends the remote branch, so the remote sha is where it starts. Actually a push can rewrite the branch, and then the remote sha is not an ancestor of HEAD.* (Machine)

The range logic lived inline in `.husky/pre-push`, where no test could run it. So the set of push shapes checked was the set one author could imagine and replay by hand. The force push after a squash merge was outside it.

## Detection failure causes

- **CI:** CI gates the pull request against main and was right. Only the local hook over-gated, and no CI job runs the hook's range logic.
- **Earlier fixes:** the earlier dantotsu on this file fixed the stale `origin/main` and the merge push, both pushes where the remote sha is an ancestor. Each fix was replayed by hand, so none left a case that would have covered a rewrite.

## Countermeasure

The hook used the remote sha only when HEAD descends from it. Otherwise it based the range on `git merge-base HEAD origin/main`, the same base as a branch's first push. Replayed on the PR #174 push, the range dropped from 774 files to the 71 the commit added.

## Eradication

**Type:** detection (level 4)

**Reference:** the commit adding this file, then 79be245e0 (PR #208), which moved the range logic out of the hook into `scripts/pre-push-range.sh` with the suite `scripts/pre-push-range.test.ts`.

```sh
if ! git merge-base --is-ancestor "$remote_sha" HEAD 2>/dev/null; then
  report "$whole_branch" "the whole branch since main (the push rewrites the branch)"
fi
```

The suite builds a real repository for each case. The rewrite case resets the branch onto main, commits one file, and expects only that file in the range:

```ts
it('gates the branch since main when the push rewrites the branch', () => {
  ...
  repository.runGit('checkout', '-q', '-B', 'feature', 'main');
  repository.commitFiles('restart', { 'restart.txt': 'r\n' });
  expect(repository.gatedRange(pushed)).toEqual({ ..., files: ['restart.txt'] });
```

The root `vitest.config.ts` includes `scripts/**/*.test.ts`, so the suite runs with the tooling tests. A change that drops the ancestry check fails this case. A new push shape that no case names can still be mis-gated, which is why the level is detection.

**Proof it can fail:** with the ancestry check replaced by `if false; then` on a scratch copy, the suite failed on the rewrite case and passed the other five (measured, then reverted):

```text
× gates the branch since main when the push rewrites the branch
-   "label": "the whole branch since main (the push rewrites the branch)",
+   "label": "this push",
Tests  1 failed | 5 passed (6)
```

**Similar instances:** the merge push and the stale `origin/main` (`a-stale-ref-priced-a-one-line-push-at-fifty-minutes`, `the-merge-that-re-gated-the-whole-branch`) are the other push shapes. Each now has a case in the same suite. The reset onto `origin/main` that produced this push is the subject of `designated-branch-was-a-merged-pr-head`.
