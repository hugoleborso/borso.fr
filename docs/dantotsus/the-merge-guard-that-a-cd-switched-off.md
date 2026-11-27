---
date: 2026-11-14
introduced-at: implementation
detected-at: local
severity: high
related-pr: '#95'
fix-commits: [a5893533d, 458e886c4]
eradication-level: 2
eradication-paths: [scripts/hooks/check-settings.ts, scripts/hooks/settings-hooks.core.ts, .husky/pre-commit, .github/workflows/ci.yml, .claude/settings.json]
time-to-detect: 2 months
tags: [hooks, harness, claude-code, gates, meta]
zone: .claude/settings.json
weak-point: gate-measures-nothing
recurs: [the-merge-whose-blast-radius-nobody-printed, two-guard-hooks-that-never-guarded]
---

# The merge guard that a `cd` switched off

## User impact

`pretool-merge-deploys-prod.sh` printed which apps a merge deploys and refused a merge on red checks or on a base that moved. From 2026-09-14 to 2026-11-14 it ran only while the session's shell sat at the repository root.

| | Seen | Expected |
| --- | --- | --- |
| Any Bash call after `cd apps/pragma`, on PR #339 | The hook exited 127, the call ran, and the app showed a notice the model never read | The hook ran and, on a merge, printed the deploy fan-out or refused |

No merge is known to have slipped through in those two months (inferred, nothing measures it). The guard was off for every session that worked from an app folder.

## Causal chain

- A Bash call ran with no merge guard.
  - Claude Code ran the hook command from the session's current directory, and the shell exited 127.
    - `.claude/settings.json` named the hook relative to the repository root:

      ```json
      "command": ".claude/hooks/pretool-merge-deploys-prod.sh",
      ```

      - Commit `5d140956d` (PR #95's gates) wrote it that way for the `mcp__github__merge_pull_request` matcher. The sweep of PR #199 (`02c715dc5`, PR #202) copied the same line for the Bash matcher.
        - At `5d140956d^`, nine hook commands in `.claude/settings.json` were relative and one was anchored on `$CLAUDE_PROJECT_DIR` (measured, `git show 5d140956d^:.claude/settings.json | grep -c '"command": ".claude'`). The relative form was the file's own example. At `02c715dc5^`, the line copied was the merge hook's existing entry.

## Root cause of occurrence

*Thought a hook path resolves from the repository root, actually Claude Code runs the command from wherever the session last `cd`-ed.*

**M: Machine.** The settings file held one hand-written command per hook, and the form most of them used was the wrong one. Each new entry was a fresh chance to copy it.

A failing hook that exits with anything but 2 is a non-blocking error to Claude Code, so the tool call goes through. The deleted anchoring gate's header recorded it: "A relative path then names nothing, the shell exits 127, and Claude Code reads that as a non-blocking error: the action goes through unchecked."

## Detection failure causes

- **Local:** a session that starts at the root sees the hook work. Every check of the hook ran there.
- **Review:** the two dantotsus this repeats fixed which tool shapes the hook answers and whether the guards parse their input. Neither asked where the command runs. Nothing compared the relative entries with the anchored ones.
- **Harness:** the 127 notice reaches the app, not the model, so the session that hit it saw a normal call.

## Countermeasure

PR #339 prefixed both declarations with `"$CLAUDE_PROJECT_DIR"/` (commit `220e0ff27` on the branch, squashed into `a5893533d`).

## Eradication

**Type:** DevX check (level 2)

**Reference:** PR #339 (`a5893533d`) added `scripts/check-hook-commands-are-anchored.sh`. Commit `458e886c4` (PR #411) deleted it and the shell hooks. It replaced them with something stronger. Every hook in `.claude/settings.json` is now the one command `HOOK_COMMAND` in `scripts/hooks/settings-hooks.core.ts`, and `scripts/hooks/check-settings.ts` refuses any other. It runs in `.husky/pre-commit` (`hooks-are-typescript`) and in `.github/workflows/ci.yml`.

```ts
export const HOOK_COMMAND =
  'NODE_COMPILE_CACHE="${TMPDIR:-/tmp}/borso-hook-compile-cache" node "$CLAUDE_PROJECT_DIR"/scripts/hooks/hook.ts';

export function selectForeignHookCommands(settings: unknown): SettingsHookCommand[] {
  return listSettingsHookCommands(settings).filter(({ command }) => command !== HOOK_COMMAND);
}
```

There is no per-hook path left to write. A new check is a TypeScript file registered in `scripts/hooks/hook-events.ts`, and it inherits the one anchored command.

**Proof it can fail:** `selectForeignHookCommands` on a settings object whose Bash matcher names `.claude/hooks/pretool-merge-deploys-prod.sh`, measured on 2026-11-27:

```
[ { event: 'PreToolUse', matcher: 'Bash', command: '.claude/hooks/pretool-merge-deploys-prod.sh' } ]
```

`check-settings.ts` prints each such entry as "is not the one TypeScript entry" and exits 1.

**Similar instances:** `grep -n '"command"' .claude/settings.json` lists every hook command. All five are `HOOK_COMMAND` (measured on 2026-11-27).
