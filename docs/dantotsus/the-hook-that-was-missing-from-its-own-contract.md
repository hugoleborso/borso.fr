---
date: 2026-10-02
introduced-at: implementation
detected-at: local
severity: low
related-pr: '#107'
fix-commits: [9703c82c8e, 458e886c4]
eradication-level: 2
eradication-paths: [scripts/hooks/checks/no-swallowed-push.core.ts, scripts/hooks/checks/no-swallowed-push.core.test.ts]
time-to-detect: weeks
tags: [hooks, harness, gates, pre-commit]
zone: scripts/hooks/checks/no-swallowed-push.core.ts
recurs: [the-hook-that-refused-the-page-explaining-it]
---

# The hook that was missing from its own contract

## User impact

During the PR #107 kaizen session, `pretool-no-swallowed-push.sh` refused the
same harmless command three times (measured, in that session):

```sh
git commit -q -F msg.txt > commit.log 2>&1; grep -B3 "failed" commit.log | head
```

| | Seen | Expected |
| --- | --- | --- |
| A commit with its output in a file, then a grep | refused three times | the commit runs |
| One of the rewrites | a commit that swept in files staged by an earlier refused attempt | only the intended files |

The commit's status was intact. The pipe belonged to the `grep` after the `;`.

## Causal chain

- The command was refused.
  - The hook's commit pattern matched a pipe that belonged to the next
    command. The line, from `50545c5bc`:

    ```bash
    if grep -qE '(^|[;&|[:space:]])git[[:space:]]+commit([[:space:]][^|]*)?\|' <<<"$COMMAND_TO_RUN"; then
    ```

    `[^|]*` stops only at a pipe, so it ran across `;` to the `| head`.
    - Commit `50545c5bc` (2026-08-20) wrote it over the raw text. Its
      message says the hook was "Modelled on `pretool-no-broad-kill.sh`",
      which matches a word anywhere in the string and has no notion of a
      pipeline.
      - The repository had no shell parser. `git log -S unbash -- package.json`
        finds one only in `458e886c4`, on 2026-11-27. A regex over the text
        was the only tool, and the example in reach. (Machine)

## Root cause of occurrence

*Thought `[^|]*` keeps the match inside the git command, actually it stops
only at a pipe and runs across `;` and `&&` into the next pipeline.* (Machine)

A pipeline is shell structure, and the codebase offered only regexes over
text to read it. Had the author known the pattern crosses separators, the
first version would have split on `;` and `&&` before matching, as
`9703c82` later did.

## Detection failure causes

- **Typing and lint:** a regex in a shell script. Nothing reads its matches.
- **Local:** the commit verified seven cases by hand, listed in
  `a-push-that-failed-and-reported-success.md`. None had a pipe after a `;`.
- **Pre-commit:** `scripts/check-hook-decisions.sh` held hooks to a refuse
  case and an allow case, but only the hooks with a row. This hook had none,
  nor did `gh-pr-create` and `no-discarding-reset`. Nothing required a row.
- **The session itself:** each refusal looked like the agent's own mistake,
  so it rewrote the command instead of questioning the hook.

## Countermeasure

Commit `9703c82` splits the command on `;` and `&&` before matching, so only
a pipe in the git command's own pipeline counts. `||` still counts, because
the status of `a || b` is b's when a fails.

## Eradication

**Type:** DevX check (level 2)

**Reference:** commit `1b060da` made `check-hook-decisions.sh` fail on any
refusing hook without a row. That script was deleted in `c54e32da7`
(PR #224), whose message says "the guard hooks' refuse and allow decisions
are no longer tested". The completeness rule went with it.

What holds today came with commit `458e886c4` (PR #411).
`scripts/hooks/checks/no-swallowed-push.core.ts` splits the stripped command
into pipelines before matching:

```ts
const pipelines = commandToRun.replaceAll(/&&|;/gu, '\n').split('\n');
```

Its test pins this entry's command as a pass:
`'git commit -F msg > log 2>&1; grep x log | head'`. The per-file 100%
coverage of `vitest.config.ts` forces every check to have a test, though not
a mention case.

The same commit subtracted the refusal for this shape. A git push or commit
piped into another command is now rewritten with `set -o pipefail` in front,
not refused, so a pattern that matches too much costs a prefix, not a call.

**Proof it can fail:** the check fed to `tsx` this session (measured).

```text
push "git commit -q -F msg.txt > commit.log 2>&1; grep failed commit.log | head"   pass
push "git push 2>&1 | tail"                                                          rewrite
```

**Similar instances:** `git grep -ln listSimpleCommands -- 'scripts/hooks/checks/*.core.ts'`
lists the checks that read the parsed command. `no-swallowed-push` and
`no-broad-kill` still split or match text with a regex.

**Proposed:** walk the pipelines that `unbash` already parses in
`scripts/hooks/shell-command.core.ts`, and test whether a git push or commit
is a stage of a pipeline with more than one stage. A pipe in another
command's pipeline then cannot count, whatever separates them, and the
regex split goes away.
