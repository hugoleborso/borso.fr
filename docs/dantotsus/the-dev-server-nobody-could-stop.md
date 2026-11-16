---
date: 2026-11-16
introduced-at: implementation
detected-at: local
severity: low
related-pr: '#368'
fix-commits: [self]
eradication-level: 1
eradication-paths: [scripts/dev-server.sh, .claude/hooks/pretool-no-broad-kill.sh, .claude/skills/visual-validation/SKILL.md, CLAUDE.md]
time-to-detect: minutes
tags: [harness, hooks, agents, tooling, visual-validation]
zone: .claude/skills/visual-validation/SKILL.md
recurs: [the-kill-recipe-that-left-the-server-listening, broad-pkill-killed-another-agents-measurement]
---

# The dev server nobody could stop

## User impact

No user of an app saw anything. The operator pays for the detour. After PR #368's visual validation, the session reached for `pkill` to stop the pragma dev server it had started. The guard refused it and the session retyped the command with a port-based group kill.

| | Seen | Expected |
| --- | --- | --- |
| Stopping a dev server one started | a refused command, then a hand-built kill recipe | one command that stops exactly that server |
| `hook:no-broad-kill` lines across the archived friction logs, measured with `grep -rh no-broad-kill docs/features/*/*/kaizen.md \| wc -l` on 2026-11-16 | 86 | 0 |

## Causal chain

- The session ran `pkill -f vite` to stop its own dev server.
  - The server had been started as `(pnpm dev > log &)`, so it shared the caller's process group and had no handle besides its name.
    - The visual-validation skill said "spawn `pnpm dev` in the background" and "stop the dev server" without saying how, and CLAUDE.md said `pnpm dev`. Every agent improvised the start and could only stop it by name.

## Root cause of occurrence

*Thought stopping a server was a one-line kill, actually a server started without its own process group can only be stopped by a name pattern, and the name is shared by every agent.*

The guard's refusal carried a seven-line recipe since [the-kill-recipe-that-left-the-server-listening](./the-kill-recipe-that-left-the-server-listening.md). Agents still hit the refusal four times a day after that, measured by date in the archives (4 on 2026-11-15, 4 on 2026-11-16). The recipe treated the symptom at the moment of the kill. The rock was the start.

## Detection failure causes

- **Hook:** `pretool-no-broad-kill.sh` detects the kill and refuses it, which protects other agents. It cannot help the session that has no other handle on its server.
- **Skill:** `/visual-validation` step 3 and step 7 named no command, so each run started the server differently.

## Countermeasure

`scripts/dev-server.sh start <app>` starts the app as the leader of its own session, records that group, waits until Vite prints its URL, and prints the URL and the seeded sign-in. `stop <app>` kills that group. `--as <label>` tells two agents running the same app apart. CLAUDE.md's *Checking a screen*, the visual-validation skill and the guard's refusal now name it.

Verified on pragma: `start` printed `http://localhost:5174/` and the seeded sign-in, `curl` answered 200, the group held 15 processes, and after `stop` it held 0 and the port refused connections. A second `start` while running reused the server.

## Eradication

**Type:** structural impossibility (level 1). A session that starts its server through the script holds the group id, so it never needs a name to stop it.

**Reference:** the commit adding this file.

```diff
-3. **Probe the dev server** at `http://localhost:5173/` … spawn `pnpm --filter <app_pkg> dev` in the background …
+3. **Start the dev server** with `scripts/dev-server.sh start <app>`. It prints the site URL once the server answers …
-7. **Stop the dev server** if the skill spawned it. Leave it running if the operator started it.
+7. **Stop the dev server** with `scripts/dev-server.sh stop <app>`, with the same `--as` label as the start.
```

**Proof it can fail:** fed `{"tool_input":{"command":"pkill -f vite"}}` with `KAIZEN_LOG_REFUSALS=0`, the guard exits 2 and names `scripts/dev-server.sh`. Fed `scripts/dev-server.sh stop pragma`, it exits 0.

**Similar instances:** `grep -rnE "pnpm (--filter [^ ]+ )?dev\b" .claude/skills .claude/agents CLAUDE.md` finds no other instruction that starts a server. The impeccable skill reuses the operator's server and never stops it.
