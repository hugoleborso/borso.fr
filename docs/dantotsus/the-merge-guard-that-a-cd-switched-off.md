---
date: 2026-11-14
introduced-at: implementation
detected-at: local
severity: high
related-pr: '#95'
fix-commits: [a5893533d]
eradication-level: 2
eradication-paths: [scripts/check-hook-commands-are-anchored.sh, .husky/pre-commit, .github/workflows/ci.yml, .claude/settings.json]
time-to-detect: 2 months
tags: [hooks, harness, claude-code, gates, meta]
zone: .claude/settings.json
weak-point: gate-measures-nothing
recurs: [the-merge-whose-blast-radius-nobody-printed, two-guard-hooks-that-never-guarded]
---

# The merge guard that a `cd` switched off

## User impact

`pretool-merge-deploys-prod.sh` prints which apps a merge deploys and refuses a merge on red checks or on a base that moved. From 2026-09-14 to 2026-11-14 it ran only while the session's shell sat at the repository root.

| | Seen | Expected |
| --- | --- | --- |
| Any Bash call after `cd apps/pragma`, on PR #339 | The hook exited 127, the call ran, and the app showed a notice the model never read | The hook ran and, on a merge, printed the deploy fan-out or refused |

No merge is known to have slipped through in those two months (inferred, nothing measures it). The guard was off for every session that worked from an app folder.

## Causal chain

- A Bash call ran with no merge guard.
  - Claude Code ran the hook command from the session's current directory, and the shell exited 127.
    - `.claude/settings.json` named the hook `.claude/hooks/pretool-merge-deploys-prod.sh`, relative to the repository root. Commit `5d140956d` (PR #95's gates) wrote the Bash entry that way, and the sweep of PR #199 (`02c715dc5`) copied it for the MCP merge entry.
      - Every other hook in the file already started with `"$CLAUDE_PROJECT_DIR"/`. Nothing compared the two forms.

## Root cause of occurrence

*Thought a hook path resolves from the repository root, actually Claude Code runs the command from wherever the session last `cd`-ed.*

A failing hook that exits with anything but 2 is a non-blocking error to Claude Code, so the tool call goes through. The gate's own header in `scripts/check-hook-commands-are-anchored.sh` records it: "A relative path then names nothing, the shell exits 127, and Claude Code reads that as a non-blocking error: the action goes through unchecked."

## Detection failure causes

- **Local:** a session that starts at the root sees the hook work. Every check of the hook ran there.
- **Review:** the two dantotsus this repeats fixed which tool shapes the hook answers and whether the guards parse their input. Neither asked where the command runs.
- **Harness:** the 127 notice reaches the app, not the model, so the session that hit it saw a normal call.

## Countermeasure

PR #339 prefixed both declarations with `"$CLAUDE_PROJECT_DIR"/` (commit `220e0ff27` on the branch, squashed into `a5893533d`).

## Eradication

**Type:** DevX check (level 2)

**Reference:** [PR #339](https://github.com/hugoleborso/borso.fr/pull/339) · commit `a5893533d`

```diff
-            "command": ".claude/hooks/pretool-merge-deploys-prod.sh",
+            "command": "\"$CLAUDE_PROJECT_DIR\"/.claude/hooks/pretool-merge-deploys-prod.sh",
```

```diff
+run_check hook-commands-are-anchored '^. \.claude/settings\.json$' \
+  scripts/check-hook-commands-are-anchored.sh
```

The same script runs in CI, in `.github/workflows/ci.yml`.

**Proof it can fail:** the sweep of PR #339 made the `no-prettier` hook relative in a scratch copy of `.claude/settings.json` and ran the gate on it.

```
[hook-commands-are-anchored] these hooks run only from the repository root:
  .claude/hooks/pretool-no-prettier.sh
[hook-commands-are-anchored] start each with "$CLAUDE_PROJECT_DIR"/ so a cd cannot switch it off.
exit 1
```

**Similar instances:** `jq -r '.hooks[][].hooks[].command' .claude/settings.json` lists every hook. On `main` after the merge, all start with `$CLAUDE_PROJECT_DIR` (measured). Hooks that call siblings use `"$(dirname "$0")"`, which does not depend on the shell's directory.
