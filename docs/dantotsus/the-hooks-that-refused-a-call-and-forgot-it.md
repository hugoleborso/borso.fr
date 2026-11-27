---
date: 2026-09-16
introduced-at: conception
detected-at: review
severity: medium
related-pr: '#100'
fix-commits: [948204d50a, 458e886c4]
eradication-level: 1
eradication-paths: [scripts/hooks/hook-runner.adapter.ts, scripts/hooks/check.core.ts, scripts/hooks/settings-hooks.core.ts, scripts/hooks/check-settings.ts]
time-to-detect: days
tags: [meta, hooks, self-improvement-loop, harness, process]
zone: scripts/hooks
---

# The hooks refused five calls and the friction log heard about none of them

## User impact

The operator improves the repository from what `KAIZEN.md` records. After
PR #100, a day of work with two features, a validation round, a merge and an
opened pull request, it held one line (measured, at the end of that task).

| | Seen | Expected |
| --- | --- | --- |
| Friction log after PR #100 | one line, written by the visual validator because its brief said so | one line per refusal at least |
| Hook refusals that day | five, from `no-swallowed-push` twice, `no-broad-kill`, `pr-body` twice | the same five in the log |

The sweep that reads the file had to rebuild the inventory from the
transcript, which works only while the transcript is still in the window.

## Causal chain

- `KAIZEN.md` held none of the five refusals.
  - After each refusal the main session rewrote the call and went on, and
    did not run `scripts/kaizen.sh`.
    - The refusal had told it what to do instead, and the second attempt
      worked. A problem fixed in one retry did not register as friction
      (inferred from the transcript, where no log call follows any of the
      five).
  - Each hook printed its refusal and exited 2, and wrote nothing else. In
    `pretool-no-broad-kill.sh`, for example:

    ```bash
    echo "[no-broad-kill]   ss -lptn 'sport = :5173'" >&2
    exit 2
    ```

    - The friction log was designed as something an agent writes when it
      notices friction. `CLAUDE.md` says to log friction as it happens, and
      the hooks were built as refusals only. (Method)

## Root cause of occurrence

*Thought the friction log is written by an agent when it notices friction,
actually a refusal resolved in one retry does not feel like friction, and the
hook that refused is the one observer that sees every refusal.* (Method)

The process put the recording on the agent's attention. The hooks already ran
at the exact moment of each refusal. Had the design known it, each refusal
would have been logged by the code that made it.

## Detection failure causes

- **Lint and CI:** `KAIZEN.md` is gitignored scratch. No gate reads it.
- **Review:** an empty friction log looks the same as a smooth task. No
  artefact says that five refusals happened.
- **The sweep:** `/after-task-kaizen` treats a thin `KAIZEN.md` as a finding,
  but it runs after the context that would have filled the file is gone.

## Countermeasure

Commit `948204d50` added `.claude/hooks/kaizen-refusal.sh` and called it from
each blocking branch of the five `pretool-*` hooks. It never failed its
caller, so `exit 2` stayed the last word, and it wrote only when `KAIZEN.md`
existed.

## Eradication

**Type:** structural impossibility (level 1)

**Reference:** the countermeasure wired the logger into five hooks one by one,
so every new hook had to remember the call. Commit `458e886c4` (PR #411)
deleted `kaizen-refusal.sh` and replaced the shell hooks with checks run by
one entry, `scripts/hooks/hook.ts`. The runner logs every refusal in one
place, in `scripts/hooks/hook-runner.adapter.ts`:

```ts
for (const { rule, summary } of outcome.refusals) {
  runCommand(join(PROJECT_DIRECTORY, 'scripts/kaizen.sh'), [
    '--from',
    `hook:${rule}`,
```

A check refuses only by returning `refuse(rule, summary, lines)` from
`scripts/hooks/check.core.ts`, so every refusal carries the rule and summary
the log needs. `scripts/hooks/check-settings.ts` refuses any hook command in
`.claude/settings.json` other than that one entry, in pre-commit and in CI. A
hook that refuses without being logged cannot be written.

**Proof it can fail:** a second command planted beside the runner in a scratch
`.claude/settings.json` this session, then restored (measured).

```text
[hooks-are-typescript] .claude/settings.json:
  SessionStart: NODE_COMPILE_CACHE="${TMPDIR:-/tmp}/borso-hook-compile-cache" node "$CLAUDE_PROJECT_DIR"/scripts/hooks/hook.ts; bash .claude/hooks/my-own-refusal.sh is not the one TypeScript entry
exit=1
```

**Similar instances:** `grep '"command"' .claude/settings.json` lists five hook
commands, all the runner (measured). The same blindness hit
`/after-task-kaizen`, which wanted its friction inventory in a PR body that
`scripts/pr/check-pr-body.ts` caps. The skill now writes the inventory to a
committed file and links it.
