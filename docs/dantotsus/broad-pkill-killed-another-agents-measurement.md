---
date: 2026-08-08
introduced-at: agent-behaviour
detected-at: victim-side-exit-code
severity: medium
related-pr: https://github.com/hugoleborso/borso.fr/pull/40
fix-pr: https://github.com/hugoleborso/borso.fr/pull/40
fix-commits: []
eradication-level: 2
time-to-detect: minutes
tags: [agents, sandbox, processes, hooks, tooling]
---

# A broad `pkill` killed another agent's twenty-minute measurement

## Symptom

A `last-loop-lepin` mutation baseline running in the background died at 79%,
1533 of 2200 mutants tested, nineteen minutes in. The task notification said
only:

```
Background command "Run last-loop-lepin mutation baseline" failed with exit code 144
```

The log's last line was an ordinary progress line. No Stryker error, no stack,
no out-of-memory notice — the process simply stopped mid-count. From the
victim's side there was nothing to diagnose: a signal death looks identical to
whatever the reader assumes it is, and the first assumption was a crash in the
tool.

The cause was in another agent's transcript, not in any log the victim could
read. It had run `pkill -f "stryker run"` to stop its own run, and the pattern
matched all three Stryker processes on the machine.

## Root-cause chain

1. **Several agents share one 4-core sandbox.** Four were running: three
   subagents on separate applications plus the parent session's own
   measurements. Nothing in the environment separates their processes.
2. **No name pattern distinguishes one agent's process from another's.**
   `node`, `vite`, `vitest` and `stryker run` appear identically in every
   agent's process list, because they are all running the same monorepo's
   tooling. `pkill -f "stryker run"` is precise about *what kind* of process to
   kill and says nothing about *whose*.
3. **The pattern kill is the obvious idiom for stopping a background job.** An
   agent that started something with `cmd &` and did not keep `$!` has no PID
   to work with, and `pkill -f` is what everyone reaches for. The safe form —
   capture the PID at launch, or find the process holding your own port — takes
   deliberate thought at the moment you start the job, not the moment you want
   to stop it.
4. **The blast radius is invisible to the person causing it.** `pkill` prints
   nothing about how many processes it matched. The agent that ran it saw a
   clean exit and moved on.

## Detection failure causes

- **The victim gets an exit code and no cause.** 144 is `128 + 16`, a signal
  death, but the number alone does not say who sent it or why. Reading the log
  tail suggests the tool crashed, which is the wrong investigation.
- **The evidence lives in a transcript the victim cannot read.** The only
  reason this was diagnosed at all is that the agent responsible wrote the
  incident into `KAIZEN.md` itself. Without that honesty it would have been
  filed as a flaky Stryker run and the same kill would have happened again.
- **A single-machine assumption that used to be true.** Every earlier session
  on this repository ran one thing at a time, so a broad kill was safe for as
  long as anybody had been writing them.

## Countermeasure

A `PreToolUse(Bash)` hook, `.claude/hooks/pretool-no-broad-kill.sh`, refuses
`pkill`, `killall`, `killall5`, and `pgrep … | xargs kill`. The rejection
message names the two safe alternatives rather than only stating the ban:

```
kill a PID you own:          pnpm dev & pid=$!   …   kill "$pid"
or the one holding YOUR port: ss -lptn 'sport = :5173'
```

Naming the port form matters. The case the hook has to survive is an agent
that has genuinely lost the PID of its own dev server — told only "do not use
pkill", it has no next move and will either give up or work around the hook.

## Eradication

**Level 2 — DevX check.** The command cannot run. Verified against the three
dangerous forms and five benign ones:

```
exit=1  pkill -f "stryker run"
exit=1  killall node
exit=1  pgrep -f vite | xargs kill -9
exit=0  kill "$pid"
exit=0  kill -9 12345
exit=0  pnpm dev
exit=0  git log --oneline | head
exit=0  echo "the pkillers are coming"
```

The last case is the one that decides the regex: matching `pkill` as a bare
word rather than a substring keeps `pkillers` from tripping it. A command whose
*prose* contains the word `pkill` will still be blocked, which is a false
positive worth accepting at this frequency.

Level 1 was considered and rejected: making the syscall unreachable would mean
sandboxing each agent's process namespace, which is not ours to change from
inside the repository.

## What to check next time

Before stopping a background job, ask whose it is. On a shared machine the
question "which processes match this pattern" is never the same as "which
processes did I start", and only the second one is safe to act on.

More generally: when a long-running background task dies with a bare non-zero
exit and a log that ends mid-progress, suspect a signal before suspecting the
tool. `128 + n` exit codes are somebody else's decision, not a crash.
