---
date: 2026-11-04
introduced-at: implementation
detected-at: local
severity: low
related-pr: '#260'
fix-commits: [self]
eradication-level: 1
eradication-paths: [scripts/hooks/checks/session-env.core.ts, scripts/hooks/checks/session-env.core.test.ts]
time-to-detect: minutes
tags: [harness, hooks, tooling]
zone: scripts/hooks/checks/session-env.core.ts
recurs: none (the first entry on the session's shell environment, not on a command's shape)
---

# An empty TMPDIR wrote to the root

## User impact

No repository file changed. The sweep of PR #249 left eleven files at the
container's filesystem root, a PR body draft and commit logs among them. It
could not remove them, and the operator was told so.

| | Seen | Expected |
| --- | --- | --- |
| `git commit … > $TMPDIR/c1.log` | the log at `/c1.log` | a log in a temporary directory |
| `rm -f /body.md …` | refused: "Dangerous rm operation detected: '/body.md'" | nothing to remove |

## Causal chain

- Eleven files sat at `/` and could not be removed.
  - Each command wrote to `$TMPDIR/<name>`.
    - `TMPDIR` was empty in the hosted session's shell, so `$TMPDIR/c1.log`
      expanded to `/c1.log` with no error.
      - The hosted platform starts the shell with no `TMPDIR`, and the session
        start hook, `.claude/hooks/session-env.sh`, exported only
        `CLAUDE_PLUGIN_ROOT` (measured: `echo "TMPDIR=[$TMPDIR]"` printed
        `TMPDIR=[]`). The agent wrote `$TMPDIR/<name>` as on a laptop, where
        the variable is set (Machine).

## Root cause of occurrence

*The agent thought every Linux shell has a TMPDIR, actually it is an optional
variable, and the hosted session's shell does not set it.* (Machine)

The work environment differed from the one the habit was formed on. The
repository's own scripts already guarded it as `${TMPDIR:-/tmp}`
(`knowledge-triggers.sh`, `ensure-infra-built.sh` at the time), so the gap was
handled in scripts and not in the shell an agent types one-off commands into.

## Detection failure causes

- **Shell:** an empty variable in a path expands silently.
- **Hooks:** none reads where a redirect writes. The safety check refused only
  the cleanup, after the files existed.

## Countermeasure

None for the eleven files. They live only in the container and go with it.

## Eradication

**Type:** structural impossibility (level 1)

**Reference:** the commit that adds this file shipped it in
`.claude/hooks/session-env.sh`. Commit `458e886c4` (#411) deleted that file and
ported the rule to `scripts/hooks/checks/session-env.core.ts`, which holds it
today:

```ts
    if (!environmentFile || world.readEnvironment('TMPDIR')) return PASS;
    // …
    world.run('tee', ['-a', environmentFile], `export TMPDIR=${quoteForShell(folder)}\n`);
```

The shell version, as first shipped:

```diff
+if [ -z "${TMPDIR:-}" ]; then
+  session_tmp="$(mktemp -d /tmp/claude-session.XXXXXX 2>/dev/null)" &&
+    printf 'export TMPDIR=%q\n' "$session_tmp" >> "$CLAUDE_ENV_FILE"
+fi
```

The session start hook now exports a fresh directory as `TMPDIR` whenever the
session has none, before its plugin-mode early exit, so the shell can no longer
expand `$TMPDIR/x` to `/x`. A session that already has a `TMPDIR` keeps it.

**Proof it can fail:** `scripts/hooks/checks/session-env.core.test.ts` holds
*"makes a session folder and exports it when TMPDIR is empty"*. At the shell
version, run with `TMPDIR` unset and a scratch `CLAUDE_ENV_FILE`,
the old hook wrote only `export CLAUDE_PLUGIN_ROOT=…`; the new one also wrote
`export TMPDIR=/tmp/claude-session.fRRFhh`. With `TMPDIR=/var/tmp` set, the new
hook wrote nothing.

**Similar instances:** `grep -rln TMPDIR scripts --include=*.sh` finds
`scripts/dev-server.sh` and `scripts/ensure-infra-built.sh`, both guarded with
`${TMPDIR:-/tmp}`. A grep of
`.claude/skills`, `.claude/agents` and `CLAUDE.md` finds no instruction that
steers agents to an unguarded `$TMPDIR`.
