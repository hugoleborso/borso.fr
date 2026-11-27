---
date: 2026-10-29
introduced-at: implementation
detected-at: review
severity: medium
related-pr: '#234'
fix-commits: [d1be9c429, b507ea56df]
eradication-level: 2
eradication-paths: [scripts/hooks/check-settings.ts, scripts/hooks/settings-hooks.core.ts]
time-to-detect: one task
tags: [harness, hooks, rtk, technical-validation, review]
zone: .claude/settings.json
weak-point: gate-measures-nothing
recurs: [the-rewrite-that-hid-git-from-the-guard]
---

# The reviewer read a hundred lines of each hunk

## User impact

The operator relies on the technical validator to have read every line of a pull request. On PR #234 it had read the first 100 added lines of each hunk. Its report still named each file as read.

| | Seen | Expected |
| --- | --- | --- |
| Validator runs `git diff` on the plan commit of PR #234 | 100 added lines, then `... (255 additions truncated)` | All 356 added lines |

Measured on 2026-10-29 on that commit: `git --no-pager diff` printed 356 added lines, `rtk git diff` printed 100. The second validator logged it:

> git diff output is rewritten by an rtk wrapper that truncates hunks, so a
> validator must know to call rtk git diff --no-compact to read the whole diff

## Causal chain

- The validator read 100 added lines of a 356-line hunk.
  - It ran `git diff`, and the shell ran `rtk git diff`. rtk keeps 100 added lines of a hunk and replaces the rest with one line.
    - The repository's PreToolUse hook rewrote every Bash command rtk knew into its rtk form, `git diff` included.

      ```json
      // .claude/settings.json, from 8e1f847e7 to b507ea56d
      "PreToolUse": [
        { "matcher": "Bash",
          "hooks": [{ "type": "command", "command": ".claude/hooks/rtk-rewrite.sh" }] } // ❌ every command rtk knows, rewritten
      ```

      - Commit `8e1f847e7` (2026-05-01, written by an agent) vendored the hook "verbatim from rtk-ai/rtk@master" and registered it on the `Bash` matcher. Its message says the rewrite works "without changing what Claude sees as the command result".
        - That sentence is rtk's own pitch, carried into the commit. The vendor's material said the rewrite was transparent, and said nothing about which outputs it cut. (Material)

## Root cause of occurrence

*Thought rtk's rewrite saves tokens without changing what a command's output means, actually rtk cuts each diff hunk at 100 added lines, and a diff is only useful whole.*

Material. The agent that wrote `8e1f847e7` worked from rtk's hook and its claim of transparency (quoted above from the commit message). Nothing in that input listed what rtk truncates. A reviewer reads a diff to judge every line, so a summary of it is a different output, not a shorter one.

## Detection failure causes

- **Code review of `8e1f847e7`:** a 101-line vendored script, with a claim from its vendor. The claim was not measured on any command.
- **The hook's own carve-outs:** they were added one at a time after something crashed or was refused (`biome`, git in a worktree). A truncated output does not crash, so nothing forced a carve-out for `git diff`.
- **Knowledge triggers:** `rtk-truncates-command-output.md` fired on `[N more lines]` and `rtk recall` markers. The diff marker reads `additions truncated`, so nothing was printed.

## Countermeasure

Commit `d1be9c429` (PR #240) let `git diff` and `git show` through the hook unrewritten. The hook fed `git diff a b` returned `rtk git diff a b` before, and the command unchanged after (recorded by the first version of this entry).

## Eradication

**Type:** DevX check (level 2), on top of the deletion of the rewrite.

**Reference:** commit [`b507ea56d`](https://github.com/hugoleborso/borso.fr/commit/b507ea56df86236aeb5d0652e3bca5630c0dfc54) (PR #245) removed the rtk rewrite. Its message: "It needed four carve-outs in its hook (biome, git diff and show, git in a worktree, lint) and eleven dantotsu and knowledge entries since 2026-05-01, and its truncation read as content."

```diff
     "PreToolUse": [
-      {
-        "matcher": "Bash",
-        "hooks": [{ "type": "command", "command": ".claude/hooks/rtk-rewrite.sh" }]
-      },
```

`.claude/hooks/` no longer exists. `grep -rln '\brtk\b' --exclude-dir=docs --exclude-dir=node_modules --exclude-dir=.git .` finds nothing (measured).

What keeps a vendored rewrite from coming back is `scripts/hooks/check-settings.ts`, run in `.husky/pre-commit` and CI. Through `selectForeignHookCommands` in `scripts/hooks/settings-hooks.core.ts`, it refuses any hook command in `.claude/settings.json` that is not the one TypeScript entry.

The level is 2, not 1. A check under `scripts/hooks/checks/` can still return `kind: 'rewrite'` and change a command before it runs.

**Proof it can fail:** inferred, not replayed this session. Adding back the `rtk-rewrite.sh` group makes `node scripts/hooks/check-settings.ts` print `PreToolUse: .claude/hooks/rtk-rewrite.sh is not the one TypeScript entry` and exit 1.

**Similar instances:** `grep -rn "kind: 'rewrite'" scripts/hooks` finds one rewrite left, `noSwallowedPush`, which prefixes `set -o pipefail;` to a piped `git push`. It adds a shell option and cuts no output. See [`the-rewrite-that-hid-git-from-the-guard.md`](./the-rewrite-that-hid-git-from-the-guard.md) for the other way the rtk rewrite changed what a command meant to its consumer.
