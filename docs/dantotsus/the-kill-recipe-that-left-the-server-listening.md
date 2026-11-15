---
date: 2026-11-14
introduced-at: implementation
detected-at: local
severity: low
related-pr: '#40'
fix-commits: [self]
eradication-level: 2
eradication-paths: [.claude/hooks/pretool-no-broad-kill.sh]
time-to-detect: minutes
tags: [agents, hooks, processes, sandbox]
zone: .claude/hooks/pretool-no-broad-kill.sh
weak-point: prose-stands-in-for-a-check
recurs: none (broad-pkill-killed-another-agents-measurement is the broad kill this hook refuses; this is the advice it gives after refusing)
---

# The kill recipe that left the server listening

## User impact

Agents stopping their own dev server were refused, followed the hook's advice,
and found the server still running.

| | Seen | Expected |
| --- | --- | --- |
| PR #327, main session at 22:04 and 23:19 | `hook:no-broad-kill reached for pkill or killall` twice in `kaizen.md` | one stop that works |
| PR #327, `visual-fixes` | "killing the recorded PID left the dev server running", after starting it under `setsid` | the ports free |
| This sweep, a `pnpm dev` tree (pnpm, concurrently, two node servers) | `kill "$pid"`: both ports still listening 15 s later | both ports free |

The third row was measured on a scratch package whose `dev` script runs
`concurrently -k` over two `node` HTTP servers, the shape of
`apps/pragma`'s `dev` script.

## Causal chain

- The agent reached for `pkill` after its own stop did not work.
  - `kill "$pid"` stopped pnpm and left concurrently and both servers running.
    - SIGTERM goes to one PID. pnpm exits on it without forwarding it to the
      process tree under it (measured, see above).
  - Under `setsid pnpm dev &`, `$!` named a process that had already exited.
    - The Bash tool's shell runs with job control (`$-` printed `hmBc`), so
      a background job leads its own process group, and `setsid` forks to
      leave it. `$!` is the wrapper that forked (measured: `$!` 20712 gone,
      the servers in group 20718).
      - The hook's refusal taught exactly these two moves:

```bash
echo "[no-broad-kill]   On pnpm dev in apps/pragma it freed the site and API ports and left no child." >&2
echo "[no-broad-kill]   pnpm dev & pid=\$!   …   kill \"\$pid\"" >&2
```

## Root cause of occurrence

*Thought a dev server is one process, so its PID stops it, actually it is a
process group, and only the group stops it.*

[`kill(2)`](https://man7.org/linux/man-pages/man2/kill.2.html), read this
session: "If pid is less than -1, then sig is sent to every process in the
process group whose ID is -pid."

## Detection failure causes

- **Local:** the recipe was written as measured, and nothing re-measured it.
  A refusal message is prose no test runs.
- **Review:** the claim named the measurement, which reads as evidence.

## Countermeasure

The refusal now gives a recipe measured this session on four start shapes:
start under `setsid` so the server owns a group, then stop the group that
holds your port, with a guard against your own group.

```bash
pgid=$(ps -o pgid= -p "$(lsof -ti tcp:5173 -sTCP:LISTEN | head -1)" | tr -d ' ')
[ -n "$pgid" ] && [ "$pgid" != "$(ps -o pgid= -p $BASHPID | tr -d ' ')" ] && kill -- "-$pgid"
```

| Start | Stop | Ports after |
| --- | --- | --- |
| `pnpm dev &`, top level | the recipe | free within 1 s, group empty |
| `setsid pnpm dev &`, top level | the recipe | free within 1 s, group empty |
| `setsid pnpm dev &`, then a pipeline in a later call | the recipe | free, group empty |
| `pnpm dev &` inside a `{ … } \| cat` pipeline | the recipe | guard refuses, nothing killed |

The guard is there because a first draft compared against `$$`. Inside a
pipeline the background server joined the pipeline's group, `$$` named the
parent shell, and `kill -- -$pgid` terminated the calling command itself
(measured: exit 143).

## Eradication

**Type:** DevX check (level 2). `pretool-no-broad-kill.sh` already refuses
the broad kill, and its refusal now carries the stop that works, at the moment
the agent needs it.

**Reference:** this commit.

```diff
-  echo "[no-broad-kill]   pnpm dev & pid=\$!   …   kill \"\$pid\"" >&2
+  echo "[no-broad-kill] Otherwise start the server as 'setsid pnpm dev > log 2>&1 &', so it owns a process group," >&2
+  echo "[no-broad-kill]   pgid=\$(ps -o pgid= -p \"\$(lsof -ti tcp:5173 -sTCP:LISTEN | head -1)\" | tr -d ' ')" >&2
+  echo "[no-broad-kill]   [ -n \"\$pgid\" ] && [ \"\$pgid\" != \"\$(ps -o pgid= -p \$BASHPID | tr -d ' ')\" ] && kill -- \"-\$pgid\"" >&2
```

**Proof it can fail:** fed `{"tool_input":{"command":"killall node"}}` with
`KAIZEN_LOG_REFUSALS=0`, the hook exits 2 and prints the recipe. Fed the
recipe itself, it exits 0, so the advice does not trip the hook it comes from.

**Similar instances:** `grep -rn 'kill "\$pid"' .claude docs/knowledge docs/dantotsus`
finds the old recipe outside the hook only in
[`broad-pkill-killed-another-agents-measurement.md`](./broad-pkill-killed-another-agents-measurement.md),
a dated record left as written. No hook or skill repeats it.
