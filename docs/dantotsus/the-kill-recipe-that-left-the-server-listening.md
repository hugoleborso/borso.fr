---
date: 2026-11-14
introduced-at: implementation
detected-at: local
severity: low
related-pr: '#40'
fix-commits: [b48ce3675, 458e886c4]
eradication-level: 2
eradication-paths: [scripts/dev-server.sh, scripts/hooks/checks/no-broad-kill.core.ts]
time-to-detect: minutes
tags: [agents, hooks, processes, sandbox]
zone: scripts/hooks/checks/no-broad-kill.core.ts
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
  - `kill "$pid"` stopped pnpm and left concurrently and both servers
    running.
    - SIGTERM goes to one PID. pnpm exits on it without forwarding it to the
      tree under it (measured, see above).
  - Under `setsid pnpm dev &`, `$!` named a process that had already exited.
    - The Bash tool's shell runs with job control (`$-` printed `hmBc`), so
      a background job leads its own process group, and `setsid` forks to
      leave it. `$!` is the wrapper that forked (measured: `$!` 20712 gone,
      the servers in group 20718).
  - Both moves came from the hook's refusal message, written in `cac22f1e9`
    on 2026-08-08:

    ```bash
    echo "[no-broad-kill]   pnpm dev & pid=\$!   …   kill \"\$pid\"" >&2
    ```

    - That commit verified which commands the hook refuses. It ran none of
      its advice. Commit `e523fbe2d` later put a measured claim right above
      the line, "On pnpm dev in apps/pragma it freed the site and API ports
      and left no child", which measured `TaskStop`, not this recipe.
      - Stopping a server was left to each agent, assembled from prose in a
        refusal message. No script owned a dev server's lifecycle. (Method)

## Root cause of occurrence

*Thought a dev server is one process, so its PID stops it, actually it is a
process group, and only the group stops it.* (Method)

The process handed the stop to prose that nobody executed, so the belief was
never tested. [`kill(2)`](https://man7.org/linux/man-pages/man2/kill.2.html),
read this session: "If pid is less than -1, then sig is sent to every process
in the process group whose ID is -pid." Had the recipe's author known, it
would have started the server in its own group and killed the group.

## Detection failure causes

- **Local:** a refusal message is prose. No test runs the advice it gives.
- **Review:** the measured `TaskStop` claim sat above the recipe and read as
  evidence for it.

## Countermeasure

This entry's commit replaced the recipe in the refusal with one measured on
four start shapes: start under `setsid` so the server owns a group, then stop
the group that holds your port, with a guard against your own group.

```bash
pgid=$(ps -o pgid= -p "$(lsof -ti tcp:5173 -sTCP:LISTEN | head -1)" | tr -d ' ')
[ -n "$pgid" ] && [ "$pgid" != "$(ps -o pgid= -p $BASHPID | tr -d ' ')" ] && kill -- "-$pgid"
```

The guard is there because a first draft compared against `$$`. Inside a
pipeline the background server joined the pipeline's group, `$$` named the
parent shell, and `kill -- -$pgid` terminated the calling command itself
(measured: exit 143).

## Eradication

**Type:** DevX check (level 2)

**Reference:** the recipe above was still prose. Commit `b48ce3675` (PR #370)
replaced it with one script that owns the lifecycle, `scripts/dev-server.sh`.
`start` runs the server as the leader of its own session and records that id,
and `stop` kills exactly that group:

```bash
setsid bash -c 'echo $$ >"$1"; cd "$2" && exec pnpm dev' _ "$GROUP_FILE" "$REPO_ROOT/apps/$APP" \
# ...
kill -- "-$group"
```

Commit `458e886c4` (PR #411) ported the hook to
`scripts/hooks/checks/no-broad-kill.core.ts`. Its refusal now carries no
recipe and points at the script:

```ts
'A dev server: scripts/dev-server.sh start <app>, then scripts/dev-server.sh stop <app>.',
```

The broad kill is refused, and the stop that works is one command nobody
assembles. An agent can still start `pnpm dev &` by hand, and nothing refuses
that, which is the gap left.

**Similar instances:** `grep -rn 'kill "\$pid"' scripts docs/knowledge`
finds no other copy of the old recipe. `broad-pkill-killed-another-agents-measurement.md`
keeps it as a dated record. `the-dev-server-nobody-could-stop.md` covers the
same lifecycle from the start side.
