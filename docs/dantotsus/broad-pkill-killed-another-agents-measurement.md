---
date: 2026-08-08
introduced-at: implementation
detected-at: local
severity: medium
related-pr: '#40'
fix-commits: [cac22f1e9b, 458e886c4]
eradication-level: 2
eradication-paths: [scripts/hooks/checks/no-broad-kill.core.ts, scripts/hooks/hook-events.ts, scripts/dev-server.sh]
time-to-detect: minutes
tags: [agents, sandbox, processes, hooks, tooling]
zone: scripts/hooks
---

# A broad `pkill` killed another agent's twenty-minute measurement

## User impact

A `last-loop-lepin` mutation baseline running in the background died at 79%,
1533 of 2200 mutants tested, nineteen minutes in (from its log). The operator
lost the measurement and the session lost the time to rerun it. The task
notification said only:

```
Background command "Run last-loop-lepin mutation baseline" failed with exit code 144
```

| | Seen | Expected |
| --- | --- | --- |
| A background Stryker run while other agents work on the same machine | It stops mid-count, no error in its log | It runs to 2200 of 2200 and writes its score |

## Causal chain

- The mutation baseline stopped at 1533 of 2200 mutants with exit code 144.
  - It received a signal (144 is 128 + 16), and its log ended on an ordinary progress line.
    - Another agent, stopping its own Stryker run, matched every Stryker process on the machine by name.

      ```sh
      pkill -f "stryker run"   # ❌ matched all three Stryker runs, two of them other agents'
      ```

      - That agent held no handle to the job it had started, so a name was its only way to reach it. Four agents shared one 4-core sandbox and ran the same monorepo's tooling, so a name pattern said what kind of process to kill and nothing about whose. (Machine)

## Root cause of occurrence

*Thought `pkill -f "stryker run"` stopped the Stryker run it had started, actually it matched every process whose command line held the pattern, on a machine three other agents shared.*

Machine. The harness gave an agent no way to name its own background job. Every
process looked the same in the process list, and the obvious idiom for
stopping a job without its PID is a pattern kill. `pkill` prints nothing about
how many processes it matched, so the agent saw a clean exit.

## Detection failure causes

- **The victim's notification:** an exit code and no cause. 144 says a signal arrived, not who sent it, and the log tail suggests the tool crashed.
- **The evidence:** it lived in the other agent's transcript, which the victim could not read. It surfaced only because that agent wrote the incident into its friction log.
- **Earlier sessions:** they ran one thing at a time, so a pattern kill had always been safe.

## Countermeasure

Commit `cac22f1` added a `PreToolUse(Bash)` hook,
`.claude/hooks/pretool-no-broad-kill.sh`, that refused `pkill`, `killall`,
`killall5` and `pgrep … | xargs kill`, and named the safe alternatives in its
refusal.

## Eradication

**Type:** DevX check (level 2), with the cause itself subtracted.

**Reference:** commit `862d7c1bb` (2026-10-05) moved the harness into a plugin
and deleted `.claude/hooks/`. The check holds today in
`scripts/hooks/checks/no-broad-kill.core.ts`, registered in
`scripts/hooks/hook-events.ts` since commit `458e886c4`. It refuses
`pkill`, `killall`, `killall5`, `pgrep … | xargs kill` and
`agent-browser close --all`.

The deeper cause is gone too. An agent now has a handle to what it starts.
The main session stops a `run_in_background` job with `TaskStop` and its task
id. A dev server starts with `scripts/dev-server.sh start <app>`, which owns
its process group, and `scripts/dev-server.sh stop <app>` stops exactly that
group. The refusal names both.

**Proof it can fail:** the check run on three commands (measured on
2026-11-27, with a probe calling `noBroadKill.run`):

```
"pkill -f \"stryker run\""          {"kind":"refuse","rule":"no-broad-kill",…}
"pgrep -f vite | xargs kill"        {"kind":"refuse","rule":"no-broad-kill",…}
"kill $(pgrep -f \"stryker run\")"  {"kind":"pass"}
```

The last command has the same blast radius as `pkill` and passes.

**Proposed:** `no-broad-kill.core.ts` refuses any `pgrep` whose output feeds
`kill`, through a pipe or a command substitution. With `TaskStop` and
`dev-server.sh stop` in place, no legitimate stop needs a name, so the check
can refuse the whole family rather than chase its spellings.

**Similar instances:** `agent-browser close --all` closed every agent's
browser session, the same mistake on another shared resource. The check
refuses it too.
