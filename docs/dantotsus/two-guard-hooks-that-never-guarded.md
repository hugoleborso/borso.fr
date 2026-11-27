---
date: 2026-08-18
introduced-at: implementation
detected-at: local
severity: high
related-pr: '#60'
fix-commits: [195b354e2d, 458e886c4]
eradication-level: 1
eradication-paths: [scripts/hooks/check.core.ts, scripts/hooks/settings-hooks.core.ts, scripts/hooks/check-settings.ts]
time-to-detect: 3 months
tags: [harness, hooks, gates, meta, self-improvement-loop]
zone: scripts/hooks
weak-point: gate-measures-nothing
recurs: [three-green-gates-on-code-that-ran-nowhere]
---

# Two guard hooks that never guarded

## User impact

The operator relies on hooks to refuse dangerous agent commands. While
sweeping PR #60, a command the open-pr hook was written to refuse ran.

| | Seen | Expected |
| --- | --- | --- |
| `echo "<the open-pr trigger> --body short"` | the command ran and printed | the call refused with the hook's three lines |
| The hook run by hand | refusal printed, exit 1 | the same, and the call blocked |

The second hook, `pretool-no-broad-kill.sh`, was the shipped eradication of
[broad-pkill-killed-another-agents-measurement](./broad-pkill-killed-another-agents-measurement.md).
It had been recorded as level 2 since it was written and had never blocked a
call.

## Causal chain

- A command the hook refuses ran anyway.
  - The harness treated the hook's exit code as advisory. A PreToolUse hook blocks on exit 2. Any other non-zero code is shown and the call proceeds.
    - Both hooks ended their refusal with `exit 1`. ← the faulty line
      - Each was written to its own header, which stated the contract:

        ```bash
        #   - exit 1 + stderr message → command is blocked; the message is
        #     surfaced to the agent so it can self-correct.
        ```

        - Commit `92aea42fd` (2026-05-12, an agent adding the open-pr hook) wrote that header from its own prior. No Claude Code hooks reference was in the repository or in its context (inferred: the commit cites none).
          - Commit `cac22f1e9` (2026-08-08, an agent adding the broad-kill hook) copied the header and the `exit 1` from the first hook, its only local example (`git log -S'exit 1 + stderr message'`, this session).

## Root cause of occurrence

*Thought a non-zero exit from a PreToolUse hook blocks the call, actually only
exit 2 blocks and every other code is a non-blocking error.* **Material:** the
first writer had no harness reference in context, and the second writer's
input was the first hook's wrong header, which was the only example to copy.

The corrected header of commit `195b354` states the contract: "Exit 1 does NOT
block: the harness treats any non-zero-but-not-2 code as a non-blocking error,
prints it, and runs the command anyway." Verified on the live harness in both
directions at the time.

## Detection failure causes

- **Typing:** shell, so no type tied the exit code to the harness contract.
- **Linter:** `actionlint` covers workflows, not hooks.
- **Local validation:** the hooks were tested by piping JSON into them by hand. That shows the message and the exit code and proves nothing about what the harness does with them. Both hooks passed that test while inert.
- **CI:** no job exercised the hooks.
- **Review:** the code matched the header. Reading the two together could only confirm they agreed.
- **Monitoring:** a hook that refuses nothing looks the same as one whose condition never arose, and both conditions were rare by design (a short pull request body, a kill by name pattern). This is why it went unseen for three months.

## Countermeasure

Commit `195b354` made both hooks exit 2 on refusal and corrected both
headers. Arming them exposed a second defect: each matched a mention as
readily as an invocation, so heredoc bodies were stripped before matching.

## Eradication

**Type:** structural impossibility (level 1)

**Reference:** [PR #62](https://github.com/hugoleborso/borso.fr/pull/62),
commit [`195b354`](https://github.com/hugoleborso/borso.fr/commit/195b354),
superseded by commit
[`458e886c4`](https://github.com/hugoleborso/borso.fr/commit/458e886c4)
(PR #411, 2026-11-27, which carried "run every hook through one TypeScript entry"). The shell hooks
and `.claude/hooks/strip-heredocs.py` no longer exist.

What holds today, read this session:

- A check returns a `Verdict`. It cannot pick an exit code.
  `scripts/hooks/check.core.ts:58` types the outcome `exitCode: 0 | 2`, and
  `renderRefusals` maps every `refuse` to exit 2 (line 83).
- `scripts/hooks/check-settings.ts` refuses any hook command in
  `.claude/settings.json` other than the one TypeScript entry
  (`selectForeignHookCommands` in `settings-hooks.core.ts`). It runs in
  `.husky/pre-commit` (line 311) and `ci.yml` (line 123), so a new shell hook
  with its own exit code cannot be wired in.

```ts
export interface HookOutcome {
  readonly exitCode: 0 | 2;
```

**Proof it can fail:** a scratch file assigning `exitCode: 1` to a
`HookOutcome`, checked with `tsc --strict` on 2026-11-27:

```
planted.ts(2,39): error TS2322: Type '1' is not assignable to type '0 | 2'.
```

A check that throws is caught by `runSafely` in
`scripts/hooks/hook-runner.adapter.ts` and passes, by design: a broken check
fails open and prints `[hook-error]`.

**Similar instances:** every hook now runs through `scripts/hooks/hook.ts`,
so the two inert hooks were the whole class. The same family is
[a-gate-that-reported-success-while-measuring-nothing](./a-gate-that-reported-success-while-measuring-nothing.md)
and
[an-approval-gate-that-only-existed-in-a-comment](./an-approval-gate-that-only-existed-in-a-comment.md).
