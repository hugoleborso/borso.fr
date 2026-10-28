---
date: 2026-10-25
introduced-at: implementation
detected-at: local
severity: low
related-pr: '#193'
fix-pr: none (opened by the kaizen pull request for #193)
fix-commits: [self]
eradication-level: 2
eradication-paths: [plugins/borso-harness/hooks/pretool-no-discarding-reset.sh, plugins/borso-harness/scripts/check-hook-decisions.sh]
time-to-detect: weeks
tags: [hooks, harness, git, gates]
zone: plugins/borso-harness/hooks/pretool-no-discarding-reset.sh
recurs: [the-hook-that-was-missing-from-its-own-contract]
---

# The reset guard read the wrong checkout

## Symptom

On PR #193 an agent working in a second worktree ran `git restore --staged
<file>` there, to unstage one file. The no-discarding-reset hook refused it and
listed the uncommitted files of the main checkout as the work that would be
lost: work in another directory, which the command could not touch, protected
from a command that discards nothing.

## Root-cause chain

1. **Why did it name the main checkout's files?** The hook ran `git diff` in
   its own working directory, which is the session's project, not the
   directory the command acts on (`git -C <path>` or `cd <path> && …`).
2. **Why did it refuse at all?** Its pattern matched any `git restore`, and
   `git restore --staged` without `--worktree` only rewrites the index from
   `HEAD`; the working tree is untouched.
3. **Why did the decision table not catch either?** The hook was declared
   *state-dependent* there, because a refusal depends on a dirty tree the table
   could not set up, so only its "let a mention through" half was ever
   exercised.

**Root cause:** thought the checkout at risk is the one the hook runs in, and
any `restore` discards, actually the command names its own checkout, and
`restore --staged` discards nothing.

## Detection failure causes

- **Linter / pre-commit:** `check-hook-decisions.sh` had no block row and no
  repository of its own to make one.

## Countermeasure

- **Code:** the hook reads the target directory from `git -C <path>` or a
  leading `cd <path>`, runs `git -C <target> diff` there, and lets
  `git restore --staged` through unless `--worktree` (or `-W`) is also given.

## Eradication (mandatory — code-level)

**Type:** DevX check (level 2).

**Reference:** the commit that adds this file.

**The actual fix:** the decision table builds a clean and a dirty repository in
a temporary folder and holds the hook to six new rows, so it is no longer
state-dependent:

```diff
-# state-dependent: pretool-no-discarding-reset.sh
+run_case pretool-no-discarding-reset.sh block command "git -C $RESET_CASES/dirty restore tracked.txt"
+run_case pretool-no-discarding-reset.sh block command "cd $RESET_CASES/dirty && git reset --hard"
+run_case pretool-no-discarding-reset.sh block command "git -C $RESET_CASES/dirty restore --staged --worktree tracked.txt"
+run_case pretool-no-discarding-reset.sh allow command "git -C $RESET_CASES/clean restore tracked.txt"
+run_case pretool-no-discarding-reset.sh allow command "cd $RESET_CASES/clean && git reset --hard"
+run_case pretool-no-discarding-reset.sh allow command "git -C $RESET_CASES/dirty restore --staged tracked.txt"
```

**Sibling defects swept:** the second `no-discarding-reset` refusal of the
session (15:50) left no detail to check it against.

## See also

- [`a-warning-that-had-to-become-a-gate.md`](./a-warning-that-had-to-become-a-gate.md) — why the hook exists.
- [`the-hook-that-was-missing-from-its-own-contract.md`](./the-hook-that-was-missing-from-its-own-contract.md)
