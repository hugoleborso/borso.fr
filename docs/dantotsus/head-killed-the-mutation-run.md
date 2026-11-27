---
date: 2026-10-25
introduced-at: self-validation
detected-at: local
severity: medium
related-pr: '#193'
fix-commits: [self, 458e886c4]
eradication-level: 2
eradication-paths: [scripts/hooks/checks/no-swallowed-push.core.ts, scripts/hooks/checks/no-swallowed-push.core.test.ts]
time-to-detect: minutes
tags: [hooks, harness, stryker, mutation, gates]
zone: scripts/hooks/checks/no-swallowed-push.core.ts
recurs: [a-push-that-failed-and-reported-success]
---

# head killed the mutation run

## User impact

On PR #193 a fix agent reported a finished mutation gate. The operator relies on that gate to know the tests kill mutants.

| | Seen | Expected |
| --- | --- | --- |
| The agent's report of the Stryker run | A finished gate, read from the first lines of output | A mutation score, or a failure that says the run did not finish |
| The run itself | Killed part way, with no error and no score | Run to the end |

## Causal chain

- The agent read a killed Stryker run as a finished mutation gate.
  - The run printed no score and the pipeline reported no failure.
    - Without `pipefail` the pipeline reports `head`'s status, 0. With it, the status is the killed run's, which is still not a score.
  - The run stopped part way.
    - `head` exits once it has printed its lines. Stryker's next write to the closed pipe ends it on a broken pipe.
      - The agent piped `stryker run` into `head` to keep a long output out of its context.
        - `test:mutation` is `stryker run` (`apps/pragma/package.json`), which writes its whole progress and report to the terminal (inferred), so the caller shortened it.

## Root cause of occurrence

*Thought `| head` shortens a long run's output, actually it ends the run once it has its lines.* (Man)

The pressure came from the worker's state, a fix agent keeping its context short. The agent's prior, that `head` is a harmless filter, won over the pipe's semantics. Under the agentic 4M the fix is a gate that holds when the prior wins, not a document. `pretool-no-swallowed-push.sh` already refused the same shape for `git push` and `git commit`, and had no rule for a mutation run.

## Detection failure causes

- **Hooks:** the swallowed-status guard covered git only, because its first incident was a push whose status was lost. A mutation run loses its output, not only its status.

## Countermeasure

The hook refuses `stryker run …` or `… test:mutation …` piped into `head`, with or without `pipefail`, and prints the form that keeps the run: write the log to a file, then `tail` it.

## Eradication

**Type:** DevX check (level 2), for mutation runs

**Reference:** the commit adding this file. The bash hook `.claude/hooks/pretool-no-swallowed-push.sh` and its decision table were ported to TypeScript by commit `458e886c4` (PR #411). The rule holds today in `scripts/hooks/checks/no-swallowed-push.core.ts`:

```ts
const MUTATION_INTO_HEAD = /(stryker\s+run|test:mutation)(\s[^|]*)?\|\s*head(\s|$)/u;
```

Its sibling `.core.test.ts` holds the case "refuses a mutation run piped into head, because head kills it before the score".

The class is wider than the rule. The same broken pipe ends any long command piped into `head`, such as `vitest run`, `tsc` or `pnpm test:e2e`, and the regular expression matches only `stryker run` and `test:mutation`.

**Proposed:** subtract the need first. Make the gate scripts write their full log to a file and print a short verdict themselves, so no caller has a long output to shorten. Then widen the refusal to `| head` after any `pnpm`, `vitest`, `tsc` or `stryker` command in `no-swallowed-push.core.ts`, with the log-and-`tail` form as the message.

**Similar instances:** the git half of the hook fired 15 times in the same session. Those refusals were the guard working. Their cause, commits that ran past two minutes and so got piped into `tail`, was the subject of PR #197. The earlier entry of this class is [a-push-that-failed-and-reported-success](a-push-that-failed-and-reported-success.md).
