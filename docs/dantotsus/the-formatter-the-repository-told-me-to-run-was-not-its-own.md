---
date: 2026-08-17
introduced-at: conception
detected-at: local
severity: medium
related-pr: '#2'
fix-commits: [b507ea56d, 9dcf74547]
eradication-level: 1
eradication-paths: [.claude/settings.json, scripts/hooks/checks/no-prettier.core.ts]
time-to-detect: months (wired 2026-05-01, seen 2026-08-17 on PR #49)
tags: [prettier, pnpm, tooling, agent-harness, gates]
zone: .claude/settings.json
recurs: [the-formatter-was-a-detector-with-no-writer]
---

# The formatter the repository told me to run was not the one it pins

## User impact

On PR #49, an agent ran `pnpm exec prettier --write <files>`. It reformatted
at **80 columns**, where `.prettierrc.json` said `printWidth: 100`. It rewrote
**eight files nobody had touched**, and one rewrite unescaped a character
inside `apps/pragma/package.json`, a content change hidden in a formatting
run. Expected: the pinned Prettier, the repository's config, and only the
files named.

## Causal chain

- The files came out at 80 columns, eight of them untouched by the task.
  - The program that ran was Prettier 3.8.1, not the pinned 3.9.6, and it
    fell back to the default `printWidth` of 80 (measured):

    | Invocation | Version |
    | --- | --- |
    | `node_modules/.bin/prettier --version` | 3.9.6 |
    | `pnpm exec prettier --version` | **3.8.1** |
    | `pnpm exec "$P" --version`, with `P=prettier` | 3.9.6 |
    | `pnpm exec sh -c 'prettier --version'` | 3.9.6 |

    - A `PreToolUse(Bash)` hook rewrote the literal command before pnpm saw
      it. `.claude/settings.json` ran `.claude/hooks/rtk-rewrite.sh`, which
      hands every command to `rtk rewrite`. rtk matched
      `pnpm exec prettier` and ran its own resolution. Naming the binary
      through a variable or `sh -c` dodged the match.
      - Commit `8e1f847e7` (PR #2), written by an agent, vendored that hook
        and wired it in the repository's own settings. Its message describes
        rtk as rewriting commands "to their token-saving rtk equivalents ...
        without changing what Claude sees as the command result". The
        vendored header says the same: "rewrites commands to use rtk for
        token savings". Neither says the rewrite can change which program
        runs. **Material:** the vendor's description was the input, and it
        promised output compression only.
    - The agent typed `pnpm exec prettier` because the repository taught it.
      `ci.yml` ran `pnpm exec prettier --check . --cache` and
      `.husky/pre-commit` ran `xargs pnpm exec prettier --check`. A git hook
      and CI are not Bash tool calls, so the rewrite never reached them.

## Root cause of occurrence

*Thought a command rewriter for token savings changes only how output is
shown, actually it replaces the program that runs, so `pnpm exec prettier`
ran rtk's Prettier instead of the pinned one.* Material: rtk's own header
and description, copied into the commit that wired it, said "token savings"
and nothing else.

This entry first called the rewriter "the agent harness ... outside this
repository and outside its lockfile". It was not. The repository vendored
and wired it in commit `8e1f847e7`.

## Detection failure causes

- **Shell diagnostics:** `pnpm exec which prettier` and
  `require('prettier/package.json').version` both answer 3.9.6. They answer
  about pnpm. The substitution happens above pnpm, in a hook no shell command
  can see.
- **Pre-commit:** `prettier --check` runs the correct Prettier, because a git
  hook is not rewritten. It checks only staged files, and the eight rewritten
  files were not staged.
- **Output:** 80 columns is a plausible house style. Nothing in the result
  says "different program".
- **The first write-up:** it asserted a pnpm config mechanism nobody had
  measured. One `--version` per path would have shown it. See
  [lectured without reading the code](./lectured-without-reading-the-code.md).

## Countermeasure

Commit `86f23945a` stopped publishing the shape. `ci.yml` ran
`pnpm run format:check`, and `.husky/pre-commit` ran
`xargs node_modules/.bin/prettier --check`. Both were measured unrewritten.

## Eradication

**Type:** structural impossibility (level 1)

**Reference:** commit [`b507ea56d`](https://github.com/hugoleborso/borso.fr/commit/b507ea56d)
(PR #245) deleted `.claude/hooks/rtk-rewrite.sh` and its entry in
`.claude/settings.json`. Commit
[`9dcf74547`](https://github.com/hugoleborso/borso.fr/commit/9dcf74547)
(PR #197) replaced Prettier with oxfmt, per
[ADR-2026-10-27T2320](../adr/2026-10-27T2320-oxlint-and-oxfmt-replace-eslint-and-prettier.md),
and retired the `pnpm exec prettier` grep in `scripts/check-coupled-lists.sh`.

```diff
-            "command": ".claude/hooks/rtk-rewrite.sh"
```

No hook rewrites a Bash command any more, so the command an agent types is
the command that runs. That removes the class, for every tool, not only
Prettier. On top, `scripts/hooks/checks/no-prettier.core.ts` refuses a
Prettier call in a repository that formats with oxfmt.

**Proof it can fail:** `grep -n rtk .claude/settings.json` prints nothing.
`scripts/hooks/checks/no-prettier.core.test.ts` refuses `pnpm exec prettier`
and passes a command that only mentions it.

**Similar instances:** the rewriter hid `git` from the worktree guard too, by
turning it into `rtk git`. See
[`the-rewrite-that-hid-git-from-the-guard`](./the-rewrite-that-hid-git-from-the-guard.md),
which led to its removal.
