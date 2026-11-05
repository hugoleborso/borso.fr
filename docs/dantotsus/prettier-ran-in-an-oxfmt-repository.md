---
date: 2026-11-03
introduced-at: conception
detected-at: local
severity: low
related-pr: '#252'
fix-pr: '#255'
fix-commits: [self]
eradication-level: 2
eradication-paths: [.claude/hooks/pretool-no-prettier.sh, .claude/settings.json]
time-to-detect: minutes
tags: [tooling, hooks, harness, agents]
zone: .claude/hooks
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
    - Nothing stops a Prettier call, and the root still held
      `.prettierrc.json`, which says Prettier is the formatter.
      - ADR 0045 swapped Prettier for oxfmt and left the old config behind.

## Root cause of occurrence

*Thought removing Prettier from the dependencies retired it, actually the
config file stayed and `npx`/`pnpm dlx` fetch Prettier on demand.*

`scripts/check-coupled-lists.sh` says "Prettier is gone and oxfmt replaced it,
so there is no such command left to guard". The command was still one `npx`
away, and `.prettierrc.json` from commit `314f2482` was still at the root.

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

**Reference:** commit [self] in [PR #255](https://github.com/hugoleborso/borso.fr/pull/255)

```diff
+RUNNER='(npx|bunx|exec|dlx|pnpm|yarn)[[:space:]]+(-[^[:space:]]+[[:space:]]+)*'
+if grep -qE "(^[[:space:]]*|[;&|(][[:space:]]*|$RUNNER)([^[:space:]]*/)?prettier([[:space:]]|\$)" <<<"$COMMAND_TO_RUN"; then
+  echo "[no-prettier] This repository formats with oxfmt, ..." >&2
+  exit 2
+fi
```

**Proof it can fail:** fed with `KAIZEN_LOG_REFUSALS=0`, measured this session.

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
finds nothing else left from a retired tool.
