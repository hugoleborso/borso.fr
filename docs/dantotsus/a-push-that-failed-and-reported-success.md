---
date: 2026-08-19
introduced-at: implementation
detected-at: local
severity: medium
related-pr: '#55'
fix-commits: [50545c5bc1]
eradication-level: 2
eradication-paths: [scripts/hooks/checks/no-swallowed-push.core.ts]
time-to-detect: hours
tags: [bash, git, hooks, gates, meta]
zone: scripts/hooks/checks
---

# A push rejected by the pre-push gate read as a successful one for two hours

## User impact

A session pushed its branch and worked on for two hours as if the branch were
on the remote. It was not. The pre-push hook had refused every push. No CI ran
in that time, and no preview deployed.

| | Seen | Expected |
| --- | --- | --- |
| `git push -u origin claude/… 2>&1 \| tail -3` | exit 0 and three ordinary lines | a non-zero exit and the gate that refused |
| `origin/<branch>` | not updated | the new commits |

## Causal chain

- The session believed the branch was pushed.
  - The command returned exit 0.
    - The command was `git push -u origin claude/… 2>&1 | tail -3`. Its status
      is `tail`'s, and `tail` succeeded at reading whatever it got.
      - The shell runs with `pipefail` off. Measured then and again this
        session: `set -o | grep pipefail` prints `off`, and
        `(false | tail -1); echo $?` prints `0`.
    - The three lines left were the harmless end of the gate's output. The
      refusal line came earlier and `tail -3` cut it.

## Root cause of occurrence

*Thought `$?` after `git push … | tail -3` is the push's status, actually
without `pipefail` a pipeline returns its last stage's status.* **Machine.**
Every Bash call runs in a shell with `pipefail` off, so a pipe after any command
erases its exit code. The bash manual, *Pipelines*: "The return status of a
pipeline is the exit status of the last command, unless the `pipefail` option is
enabled."

## Detection failure causes

- **Exit code:** success and failure gave the same code and the same shape of
  output. The lines that differed were the ones `tail` cut.
- **`git status`:** it reports the working tree, which was clean. Only
  `git log origin/<branch>` or `git ls-remote` would have disagreed.
- **CI:** a push that never landed starts no run, and no run looks like a slow
  run.
- **`2>&1`:** it folded the refusal into the stream `tail` was cutting.

## Countermeasure

Commit `50545c5` added a PreToolUse hook on Bash that refused `git push` or
`git commit` inside a pipeline, unless the command already set `pipefail`. It
named the two right spellings: a bare push, or `set -o pipefail;` in front.

## Eradication

**Type:** DevX check (level 2). The hook repairs the command before it runs.

**Reference:** commit [`50545c5`](https://github.com/hugoleborso/borso.fr/commit/50545c5bc1)
shipped the refusal. Since PR #250's sweep the hook rewrites the command instead
of refusing it, see
[`a-guard-that-refused-what-it-could-repair`](./a-guard-that-refused-what-it-could-repair.md).
Commit `458e886` (#411) ported the shell hook to
`scripts/hooks/checks/no-swallowed-push.core.ts`.

```ts
if (hasLineMatching(pipelines, GIT_INTO_PIPE)) {
  const updatedInput = { ...input.tool_input, command: `set -o pipefail; ${command}` };
  return { kind: 'rewrite', updatedInput, text: PIPEFAIL_CONTEXT };
}
```

A `git push` or `git commit` piped anywhere now runs with `pipefail` on, so the
pipe reports the git status. The same check refuses `--no-verify`, `HUSKY=0` and
a git error sent to `/dev/null`.

**Proof it can fail:** `scripts/hooks/checks/no-swallowed-push.core.test.ts`
covers the rewrite and each refusal. The original seven cases, fed to the shell
hook as tool-input JSON, are in commit `50545c5`.

**Similar instances:** the check covers git only. A test run piped into `grep`
swallows its status the same way.
[`an-exit-status-read-through-a-pipe-is-the-pipes`](../knowledge/an-exit-status-read-through-a-pipe-is-the-pipes.md)
records a refusal that exited 3 and read as 0 through `| tail`.
[`cdk-destroy-failure-swallowed-by-trailing-or-echo`](./cdk-destroy-failure-swallowed-by-trailing-or-echo.md)
is the same class with `|| echo`.

**Proposed:** write `set -o pipefail` into `CLAUDE_ENV_FILE` from
`scripts/hooks/checks/session-env.core.ts`, which already appends `TMPDIR` to that
file at session start. Every pipeline of the session would then report its real
status, including the test runs the check leaves out, and the git-only rewrite
could be deleted. The cost to weigh: `| head` makes a long writer exit 141, and
`grep` exits 1 on no match. The rewrite already accepts that cost for pushes.
