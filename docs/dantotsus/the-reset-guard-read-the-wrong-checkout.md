---
date: 2026-10-25
introduced-at: implementation
detected-at: local
severity: low
related-pr: '#193'
fix-commits: [self]
eradication-level: 2
eradication-paths: [scripts/hooks/checks/no-discarding-reset.core.ts, scripts/hooks/checks/no-discarding-reset.core.test.ts]
time-to-detect: weeks
tags: [hooks, harness, git, gates]
zone: scripts/hooks/checks/no-discarding-reset.core.ts
recurs: [the-hook-that-was-missing-from-its-own-contract]
---

# The reset guard read the wrong checkout

## User impact

On PR #193 an agent working in a second worktree ran
`git restore --staged <file>` there, to unstage one file (measured in the
session).

| | Seen | Expected |
| --- | --- | --- |
| `git restore --staged <file>` in a second worktree | Refused, with the main checkout's uncommitted files listed as the work at risk | Let through, since it rewrites only the index and touches no other checkout |

Any agent working outside the session's project folder could be blocked this
way. A command run in the project folder itself was judged correctly.

## Causal chain

- The hook refused a command that discards nothing, and named files it could
  not touch.
  - It named the main checkout's files.
    - The hook ran `git diff` in its own working directory, the session's
      project, not the directory the command acts on (`git -C <path>` or
      `cd <path> && …`). The faulty lines, in
      `.claude/hooks/pretool-no-discarding-reset.sh` as of `d6dd5ba5a`:

      ```bash
      # runs in $CLAUDE_PROJECT_DIR, whatever checkout the command names
      if ! git diff --quiet 2>/dev/null; then
        git diff --name-only 2>/dev/null | sed 's/^/[no-discarding-reset]     /' >&2
      ```

      - Commit `d6dd5ba5a` wrote the hook to stop a `reset --hard` that had
        just deleted work in the project folder, the only checkout that sweep
        used.
        - A hook runs with `$CLAUDE_PROJECT_DIR` as its directory and receives
          the command as text, so the target checkout is whatever the hook
          parses out of it (Machine).
  - It refused at all.
    - Its pattern matched any `git restore`, and `git restore --staged`
      without `--worktree` rewrites only the index from `HEAD`.

      ```bash
      DISCARDS_WORKING_TREE='…git[[:space:]]+(reset…|checkout[[:space:]]+--[[:space:]]|restore[[:space:]])'
      ```

## Root cause of occurrence

*Thought the checkout at risk is the one the hook runs in, actually the
command names its own checkout, and the hook runner gives every hook the
project folder whatever the command targets.* (Machine)

The hook environment hands each hook one directory. Each check must parse
`git -C` and `cd` itself to know which checkout a command touches. The author
of `d6dd5ba5a` had one checkout in view, so the hook's directory and the
command's were the same on every run they saw (inferred from the commit
message, which describes losses in one tree).

A second belief rode along. *Thought every `git restore` discards working-tree
changes, actually `restore --staged` without `--worktree` changes only the
index* ([git-restore](https://git-scm.com/docs/git-restore): "If neither
option is specified, by default the working tree is restored. Specifying
`--staged` will only restore the index."). The manual was not in the writer's
context (Material, inferred).

## Detection failure causes

- **Decision table:** the hook was declared *state-dependent* in
  `check-hook-decisions.sh`, because a refusal needs a dirty tree the table
  could not set up. Only its "let a mention through" half was ever exercised.
- **Hook runner:** other checks that read git share the same default, so
  nothing outside this hook would have shown a wrong checkout. The same cause
  produced
  [the-pull-request-hooks-read-the-checkout](./the-pull-request-hooks-read-the-checkout.md)
  four days later.

## Countermeasure

The hook reads the target directory from `git -C <path>` or a leading
`cd <path>`, runs `git -C <target> diff` there, and lets
`git restore --staged` through unless `--worktree` (or `-W`) is also given.

## Eradication

**Type:** DevX check (level 2)

**Reference:** the commit adding this file. The shell hook and
`check-hook-decisions.sh` were replaced in `458e886c4` by
`scripts/hooks/checks/no-discarding-reset.core.ts` and its vitest suite. The
check now walks every `cd`, `pushd` and `git -C` in the command and refuses an
unreadable target (lines 112 to 121).

The original decision-table rows, which the suite now holds as cases such as
`cd /w && git reset --hard`, `git -C /w reset --keep` and a staged-only
restore:

```diff
-# state-dependent: pretool-no-discarding-reset.sh
+run_case pretool-no-discarding-reset.sh block command "git -C $RESET_CASES/dirty restore tracked.txt"
+run_case pretool-no-discarding-reset.sh block command "cd $RESET_CASES/dirty && git reset --hard"
+run_case pretool-no-discarding-reset.sh block command "git -C $RESET_CASES/dirty restore --staged --worktree tracked.txt"
+run_case pretool-no-discarding-reset.sh allow command "git -C $RESET_CASES/clean restore tracked.txt"
+run_case pretool-no-discarding-reset.sh allow command "cd $RESET_CASES/clean && git reset --hard"
+run_case pretool-no-discarding-reset.sh allow command "git -C $RESET_CASES/dirty restore --staged tracked.txt"
```

**Proof it can fail:** the suite asserts the exact `git -C <target>` calls,
so a check that read the project folder instead fails it (read this session,
not planted). The original entry recorded no planted run.

**Similar instances:** `grep -n "HEAD\|'-C'" scripts/hooks/checks/*.core.ts`
lists the checks that read git. Only `no-discarding-reset` and
`no-shared-checkout-switch` resolve the command's own directory. The level
holds for this hook, not for the class.

**Proposed:** resolve the target directory once in
`scripts/hooks/hook-runner.adapter.ts`, from `git -C`, a leading `cd` or
`input.cwd`, and hand it to every check through `HookWorld`. A check could
then not read a checkout the command does not touch, and the six rows above
would test one resolver for every check instead of one hook.
