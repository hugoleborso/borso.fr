---
date: 2026-10-12
introduced-at: conception
detected-at: local
severity: low
related-pr: '#157, #163, #164, #166'
fix-commits: [e51cfdd5a, b507ea56df]
eradication-level: 2
eradication-paths: [scripts/hooks/check-settings.ts, scripts/hooks/settings-hooks.core.ts]
time-to-detect: minutes
tags: [hooks, agents, git, harness, claude-code]
zone: .claude/settings.json
recurs: none (the earlier rtk entries are about its installer and its biome rewrite; this is how its rewrite meets the worktree guard)
---

# The rewrite that hid git from the guard

## User impact

Subagents dispatched with worktree isolation could not run `git status`, a loop, a pipe or a glob. Only `/usr/bin/git` worked, and nothing said so. Most of the twelve agents of one weekend logged it, and two feature runs before them (counted from their friction logs by the first version of this entry). Sessions in the main checkout were not affected.

| | Seen | Expected |
| --- | --- | --- |
| A worktree-isolated subagent types `git status` | Refused: "this command runs rtk with the text git status in a plain command, so what it runs cannot be shown not to be git" | `git status` runs in the agent's worktree |

## Causal chain

- Claude Code refused `git status` in a worktree-isolated subagent.
  - Its worktree guard lets git through only when it can see that git targets the agent's worktree. The command it was asked to approve was `rtk git status`, and it refuses a launcher in front of git.
    - The repository's PreToolUse hook had rewritten `git status` into `rtk git status`. It rewrote `grep`, `ls` and others inside loops and pipes too, so those were refused as possibly git.

      ```json
      // .claude/settings.json, from 8e1f847e7 to b507ea56d
      "PreToolUse": [
        { "matcher": "Bash",
          "hooks": [{ "type": "command", "command": ".claude/hooks/rtk-rewrite.sh" }] } // ❌ every command rtk knows, rewritten, in every checkout
      ```

      - Commit `8e1f847e7` (2026-05-01, written by an agent) vendored rtk's hook verbatim and registered it on every Bash command. Exceptions were added only after a command broke, such as `biome` in `6e7775319` the next day.
        - The rewrite was on by default for every command and every consumer of the command text. Worktree isolation and its guard reached this repository's sessions after May (inferred from the dates of the first refusals), so its first meeting with the rewrite was a refusal. (Machine)

## Root cause of occurrence

*Thought a command rewrite changes only the size of what the command prints, actually the rewritten text is what every later judge of the command reads, and Claude Code's worktree guard refuses a launcher in front of git.*

Machine. The hook rewrote by default and carved out by exception. Each new consumer of command text met it by breaking. `b507ea56d` counts four carve-outs: biome, git diff and show, git in a worktree, and lint. This entry is the third, and [`the-reviewer-read-a-hundred-lines-of-each-hunk.md`](./the-reviewer-read-a-hundred-lines-of-each-hunk.md) the next.

## Detection failure causes

- **Typing / linter:** the two hooks belong to different owners and meet only at run time.
- **Local validation:** the main session works in the main checkout, where the guard does not run, so whoever edited the hook never met the refusal.
- **The refusal text:** it names rtk but not the hook that added it, so agents worked around it with `/usr/bin/git` instead of reporting it.

## Countermeasure

Commit `e51cfdd5a` (PR #173) made the hook leave untouched, in a linked worktree, any command that names git or is more than one plain command. Fed its JSON input in a worktree, `git status`, a loop, a pipe and a command substitution came back unchanged while `ls -la` became `rtk ls -la`. A live `git status` in the worktree then ran (recorded by the first version of this entry).

## Eradication

**Type:** DevX check (level 2), on top of the deletion of the rewrite.

**Reference:** commit [`b507ea56d`](https://github.com/hugoleborso/borso.fr/commit/b507ea56df86236aeb5d0652e3bca5630c0dfc54) (PR #245) deleted the rtk rewrite instead of adding a fifth carve-out.

```diff
     "PreToolUse": [
-      {
-        "matcher": "Bash",
-        "hooks": [{ "type": "command", "command": ".claude/hooks/rtk-rewrite.sh" }]
-      },
```

`scripts/hooks/check-settings.ts`, run in `.husky/pre-commit` and CI, refuses any hook command in `.claude/settings.json` other than the one TypeScript entry (`selectForeignHookCommands` in `scripts/hooks/settings-hooks.core.ts`). A vendored rewrite script cannot be registered again.

The level is 2, not 1. A TypeScript check can still return `kind: 'rewrite'` (declared in `scripts/hooks/check.core.ts`) and change the text the guard judges.

**Proposed:** delete `kind: 'rewrite'` from `scripts/hooks/check.core.ts`. Its one user, `noSwallowedPush` in `scripts/hooks/checks/no-swallowed-push.core.ts`, prefixes `set -o pipefail;` to a piped `git push`. It would refuse instead and tell the agent to add `set -o pipefail` itself, as its other branches already do. No hook could then change a command between what the agent typed and what the guard reads.

**Proof it can fail:** inferred, not replayed this session. Adding back the `rtk-rewrite.sh` group makes `node scripts/hooks/check-settings.ts` print `PreToolUse: .claude/hooks/rtk-rewrite.sh is not the one TypeScript entry` and exit 1.

**Similar instances:** `grep -rn "kind: 'rewrite'" scripts/hooks` finds `noSwallowedPush` as the only rewrite left (measured). The guard's own reading of shell text remains: a heredoc or a loop whose text mentions git is still refused. That is Claude Code's, and [`../knowledge/the-worktree-guard-reads-shell-text.md`](../knowledge/the-worktree-guard-reads-shell-text.md) is printed when the refusal appears.
