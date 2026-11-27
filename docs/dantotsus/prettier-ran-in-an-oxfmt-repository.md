---
date: 2026-11-03
introduced-at: conception
detected-at: local
severity: low
related-pr: '#252'
fix-commits: [self]
eradication-level: 2
eradication-paths: [scripts/hooks/checks/no-prettier.core.ts, .claude/settings.json]
time-to-detect: minutes
tags: [tooling, hooks, harness, agents]
zone: scripts/hooks/checks/no-prettier.core.ts
weak-point: none
recurs: none (no earlier entry covers a second formatter; the-formatter-reached-outside-the-repository is about where oxfmt runs, not which formatter)
---

# Two sessions on one day formatted with a tool the repository dropped

## User impact

Each session spent a commit cycle putting back files it never meant to change.

| | Seen | Expected |
| --- | --- | --- |
| PR #252, 18:41 | `prettier` on pragma files reformatted three unrelated files | only the edited files change |
| PR #251, 17:45 | `prettier --write` reformatted unrelated files | only the edited files change |
| Archived logs, all tasks | 4 tasks logged a Prettier write that reformatted unrelated files, `weekend-fan-out`, `setlist-density`, `setlist-breaks` and `song-tabs` (measured with `grep -iH prettier docs/features/*/*/kaizen.md`). The last two came after oxfmt replaced Prettier | none |

## Causal chain

- Unrelated files changed in the working tree.
  - The session ran Prettier, which disagrees with oxfmt on some lines.
    - The model reached for Prettier, its default formatter for a TypeScript
      repository.
      - The root still held `.prettierrc.json`, which says Prettier is the
        formatter.
        - Commit `9dcf745479` (PR #197, ADR 2026-10-27T2320) swapped Prettier for
          oxfmt. It removed the dependency and deleted `.prettierignore`, and left
          `.prettierrc.json` at the root.
          - The retirement was done file by file, by hand, with no list of the
            files the old tool owned.

## Root cause of occurrence

*The session thought Prettier formats this repository, actually oxfmt does, and
`npx` or `pnpm dlx` fetch Prettier on demand even though no dependency names it.*
(Man)

The model's default won. The retirement in PR #197 rested on the opposite belief,
that Prettier was gone once its dependency was. `scripts/check-coupled-lists.sh`
then said "Prettier is gone and oxfmt replaced
it, so there is no such command left to guard". The command was one `npx` away,
and `.prettierrc.json` from commit `314f24821` was still at the root, a
misleading material that confirmed the habit.

The habit is the deeper cause, measured after the fix. The archived kaizen logs
hold 27 refusals by `hook:no-prettier` after `.prettierrc.json` was deleted, the
latest on 2026-11-26 (`grep -h 'hook:no-prettier' docs/features/*/*/kaizen.md`,
measured). Deleting the config did not stop the reach. Only the refusal holds it.

## Detection failure causes

- **Pre-commit:** oxfmt checks only staged files, so files Prettier rewrote
  are invisible until the session stages them.
- **Kaizen sweeps:** PR #251's log line was not swept before PR #252 hit it.

## Countermeasure

`.prettierrc.json` is deleted. A PreToolUse hook refuses Prettier as a command
word, bare, by path or behind `npx`, `pnpm`, `exec`, `dlx`, `bunx` or `yarn`,
and names the oxfmt command. It stays silent where `node_modules/.bin/oxfmt`
does not exist, because the plugin can serve a Prettier repository.

A rewrite into oxfmt, as `a-guard-that-refused-what-it-could-repair` did for
pipes, was considered and dropped. Prettier's `--cache`, `--ignore-unknown` and
`--log-level` have no oxfmt spelling.

## Eradication

**Type:** DevX check (level 2)

**Reference:** commit `5ce372fdb4` (PR #255) shipped the hook as
`.claude/hooks/pretool-no-prettier.sh`. Commit `458e886c4` replaced it with
`scripts/hooks/checks/no-prettier.core.ts`, run by `scripts/hooks/hook.ts`
through the `Bash` matcher in `.claude/settings.json`. The shell script below is
the first version. The TypeScript check keeps its behaviour: it splits the
command into simple commands and refuses one whose word, or the target of `npx`,
`bunx`, `exec`, `dlx`, `pnpm` or `yarn`, is `prettier`.

```diff
+RUNNER='(npx|bunx|exec|dlx|pnpm|yarn)[[:space:]]+(-[^[:space:]]+[[:space:]]+)*'
+if grep -qE "(^[[:space:]]*|[;&|(][[:space:]]*|$RUNNER)([^[:space:]]*/)?prettier([[:space:]]|\$)" <<<"$COMMAND_TO_RUN"; then
+  echo "[no-prettier] This repository formats with oxfmt, ..." >&2
+  exit 2
+fi
```

**Proof it can fail:** the first version, fed with `KAIZEN_LOG_REFUSALS=0`, measured when it shipped. `scripts/hooks/checks/no-prettier.core.test.ts` holds the same cases today.

| Command | Exit |
| --- | --- |
| `pnpm exec prettier --write apps/pragma/site/src` | 2 |
| `npx prettier --check x.ts` | 2 |
| `node_modules/.bin/prettier -w a.ts` | 2 |
| `cd apps && prettier -w .` | 2 |
| `pnpm dlx prettier a` | 2 |
| `git commit -m "drop prettier"` | 0 |
| `grep -rn prettier docs` | 0 |
| `pnpm exec oxfmt a.ts` | 0 |

The first draft matched any word `prettier` and refused `grep -rn prettier
docs`. The command-word match replaced it.

**Similar instances:** `ls -a | grep -iE 'eslintrc|biome|prettier'` at the root
finds nothing else left from a retired tool. `format-write.core.ts` runs oxfmt on
every Write and Edit, so the session rarely needs to call a formatter at all.
