---
date: 2026-10-12
introduced-at: implementation
detected-at: local
severity: medium
related-pr: '#74'
fix-commits: [e51cfdd5a, 79be245e0]
eradication-level: 4
eradication-paths: [scripts/pre-push-range.sh, scripts/pre-push-range.test.ts, .husky/pre-push]
time-to-detect: weeks (lived from 2026-08-20 until PR #118)
tags: [git, tooling, husky, mutation, pre-push, gates]
zone: .husky/pre-push
recurs: [the-scoped-gate-that-charged-for-all-of-main]
---

# The fetch that undid the narrowing

## User impact

On PR #118 an agent merged `origin/main` into its branch and pushed. The
pre-push hook announced its range as "this push", not "minus the commits it
merged". It started a mutation run over 81 talos files plus every pure file
main had changed in a hundred commits. None were the branch's work. The push
timed out under the load. Expected: a range holding only the branch's own
commits, as the narrowing promised.

## Causal chain

- The push gated main's files and timed out.
  - The hook diffed against the branch's remote sha, which predates the
    merge, so every file main brought in was in the range.
    - The narrowing for that case was skipped. It required `origin/main`'s
      tip to be an ancestor of `HEAD`:

      ```sh
      main_tip=$(git rev-parse --verify --quiet origin/main 2>/dev/null || true)
      if [ -n "$main_tip" ] &&
        git merge-base --is-ancestor "$main_tip" HEAD 2>/dev/null &&  # ← ❌ false once main moved after the merge
      ```

      - The tip was not an ancestor. The hook runs `git fetch origin main`
        first. In a session where nine pull requests merged, main moved
        between the agent's merge and its push almost every time, so the
        fresh tip was a commit the branch never merged.
        - Commit `239b78b6d` (PR #74), written by an agent, added that fetch
          on 2026-08-20. Its message names the narrowing it would feed: "Both
          bases read that ref, the merge-base fallback and PR #71's
          `main_tip` narrowing". The narrowing logic was in front of the
          writer, and the belief that a fresher ref helps every reader won.
          **Man.**
          - The writer checked the change by replaying pushes by hand in a
            throwaway repository, then discarded the repository. The range
            logic lived inline in `.husky/pre-push` with no test, so no case
            kept from the narrowing's own commit (`cb69f2524`) ran against
            the fetch. **Machine.**

## Root cause of occurrence

*Thought refreshing `origin/main` improves every base that reads it,
actually the narrowing needs the main this branch merged, and the fetch moves
`origin/main` past it. That commit is `git merge-base HEAD origin/main`.* Man:
the narrowing was named in the writer's own commit message, so the
information was present and the prior won. The condition that let it through
is Machine: inline shell logic with no kept test.

## Detection failure causes

- **Local validation:** the narrowing was measured on a push where main had
  not moved since the merge, the one case where tip and merge base are the
  same commit.
- **CI:** the hook does not run in CI, and nothing tested its range logic.

## Countermeasure

Commit `e51cfdd5a` (PR #173) took the merge base instead of the tip, and
narrowed whenever that merge base was not already an ancestor of the remote
sha.

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

It was replayed in a throwaway repository and, like the fix before it, not
kept.

## Eradication

**Type:** detection (level 4)

**Reference:** commit [`79be245e0`](https://github.com/hugoleborso/borso.fr/commit/79be245e0)
(PR #208) moved the range logic out of `.husky/pre-push` into
`scripts/pre-push-range.sh` and kept every case as a test in
`scripts/pre-push-range.test.ts`. The script's header says why: the logic
"was fixed four times, each time replayed by hand in a throwaway repository
and never kept as a test, so each fix could undo an earlier one unseen".

This entry first claimed level 1 for the one-line fix above. That fix held
nothing against the next change. The kept test does.

The case this entry found is a test today:

```ts
repository.commitFiles('main moves after the merge', { 'later.txt': 'l\n' });
repository.publishMain();
...
expect(repository.gatedRange(pushed)).toEqual({
  label: 'this push, minus the commits it merged from origin/main',
  files: ['extra.txt'],
});
```

**Proof it can fail:** the case "gates neither main nor the work already
pushed when the push merges main in" publishes a main commit made after the
merge, the exact state the `main_tip` ancestor check failed on. That check
would skip the narrowing and keep the merged `main.txt` in the range, and the
assertion names only `extra.txt`.

**Similar instances:** the conflict check at the end of `.husky/pre-push`
already used `git merge-base HEAD origin/main`. See
[`the-merge-that-re-gated-the-whole-branch`](./the-merge-that-re-gated-the-whole-branch.md)
for the regression that led to the kept test.
