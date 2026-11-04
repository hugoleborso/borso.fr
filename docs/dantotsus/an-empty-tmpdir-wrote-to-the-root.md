---
date: 2026-11-04
introduced-at: implementation
detected-at: local
severity: low
related-pr: '#260'
fix-pr: none (the kaizen pull request is opened after this entry is committed)
fix-commits: [self]
eradication-level: 1
eradication-paths: [plugins/borso-harness/hooks/session-env.sh]
time-to-detect: minutes
tags: [harness, hooks, tooling]
zone: plugins/borso-harness/hooks/session-env.sh
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
      - Nothing in the session start set it. `session-env.sh` exported only
        `CLAUDE_PLUGIN_ROOT`, and the platform sets no `TMPDIR` (measured:
        `echo "TMPDIR=[$TMPDIR]"` printed `TMPDIR=[]`).

## Root cause of occurrence

*Thought every Linux shell has a TMPDIR, actually it is an optional variable.*
The repository's own scripts already guard it as `${TMPDIR:-/tmp}`
(`knowledge-triggers.sh`, `ensure-infra-built.sh`), which shows the gap was
known for scripts but not for an agent's one-off commands.

## Detection failure causes

- **Shell:** an empty variable in a path expands silently.
- **Hooks:** none reads where a redirect writes. The safety check refused only
  the cleanup, after the files existed.

## Countermeasure

None for the eleven files. They live only in the container and go with it.

## Eradication

**Type:** structural impossibility (level 1)

**Reference:** the commit that adds this file.

```diff
+if [ -z "${TMPDIR:-}" ]; then
+  session_tmp="$(mktemp -d /tmp/claude-session.XXXXXX 2>/dev/null)" &&
+    printf 'export TMPDIR=%q\n' "$session_tmp" >> "$CLAUDE_ENV_FILE"
+fi
```

The session start hook now exports a fresh directory as `TMPDIR` whenever the
session has none, before its plugin-mode early exit, so the shell can no longer
expand `$TMPDIR/x` to `/x`. A session that already has a `TMPDIR` keeps it.

**Proof it can fail:** run with `TMPDIR` unset and a scratch `CLAUDE_ENV_FILE`,
the old hook wrote only `export CLAUDE_PLUGIN_ROOT=…`; the new one also wrote
`export TMPDIR=/tmp/claude-session.fRRFhh`. With `TMPDIR=/var/tmp` set, the new
hook wrote nothing.

**Similar instances:** `grep -rn TMPDIR plugins scripts` finds two scripts, both
already guarded with `${TMPDIR:-/tmp}`.
