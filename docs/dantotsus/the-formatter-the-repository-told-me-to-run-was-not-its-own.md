---
date: 2026-08-17
introduced-at: conception
detected-at: local
severity: medium
related-pr: https://github.com/hugoleborso/borso.fr/pull/49
fix-pr: https://github.com/hugoleborso/borso.fr/pull/59
fix-commits: []
eradication-level: 2
time-to-detect: hours
tags: [prettier, pnpm, tooling, agent-harness, gates]
---

# The formatter the repository told me to run was not the one it pins

## Symptom

`pnpm exec prettier --write <files>` reformatted at **80 columns**, where
`.prettierrc.json` says `printWidth: 100`. It rewrote **eight files nobody had
touched**, and one of those rewrites unescaped a character inside
`apps/pragma/package.json` — a content change hiding in a formatting run.

## Root-cause chain

The first explanation was wrong, and the way it was wrong is the useful part.

**What it looked like:** `pnpm exec` resolving a different *config*. That is a
plausible pnpm behaviour, it explains 80 versus 100, and it was written down as
fact in a knowledge entry without being tested.

**What it is.** Same command name, two different programs:

| Invocation | Version |
| --- | --- |
| `node_modules/.bin/prettier --version` | 3.9.6 |
| `pnpm exec prettier --version` | **3.8.1** |
| `pnpm exec "$P" --version`, with `P=prettier` | 3.9.6 |
| `pnpm exec sh -c 'prettier --version'` | 3.9.6 |

1. `package.json` pins prettier 3.9.6, and `node_modules/.bin/prettier` is a
   shim whose `NODE_PATH` names `prettier@3.9.6` explicitly.
2. `pnpm exec which prettier` answers `./node_modules/.bin/prettier`, and
   `pnpm exec node -e "require('prettier/package.json').version"` answers 3.9.6.
   By every question pnpm is asked, pnpm is doing the right thing.
3. **The agent harness rewrites the command before pnpm ever sees it.** rtk, the
   `PreToolUse(Bash)` rewriter, matches the literal shape and substitutes its
   own build — 3.8.1. Naming the same binary through a shell variable or a
   `sh -c` dodges the match and returns 3.9.6.
4. 3.8.1 does not read this repository's config the way 3.9.6 does, so it falls
   back to prettier's default `printWidth` of 80.
5. `--write` then rewrites every file it is handed, and the cache means it hands
   itself more than was asked for.

The two lower rungs of the ladder were never reached: the version pin is right,
the config is right, the shim is right.

## Detection failure causes

- **The command was copied from the repository.** `ci.yml` ran
  `pnpm exec prettier --check . --cache` and `.husky/pre-commit` ran
  `xargs pnpm exec prettier --check`. Both are correct where they run — CI and
  git hooks are subprocesses the rewriter does not reach — so the repository
  taught a shape that is only broken in the one context that reads it most.
- **Every diagnostic agreed with the wrong answer.** `which`, `require.resolve`
  and the shim all point at 3.9.6, because they are answering about pnpm. The
  substitution happens above them.
- **80 columns is a plausible house style.** Nothing about the output says
  "different program"; it says "different opinion".
- **The first write-up asserted a mechanism nobody had measured.** One
  `--version` on each path would have shown it. See
  [lectured without reading the code](./lectured-without-reading-the-code.md).

## Countermeasure

Stop publishing the shape. The repository cannot change the harness, and it does
not have to: it can stop being the place the broken invocation is learned.

| Was | Now |
| --- | --- |
| `ci.yml`: `pnpm exec prettier --check . --cache` | `pnpm run format:check` |
| `.husky/pre-commit`: `xargs pnpm exec prettier --check …` | `xargs node_modules/.bin/prettier --check …` |

Both replacements were measured to be unrewritten. `pnpm run format:check` runs
the repository's own script, which resolves the pinned binary.

## Eradication

**DevX check, level 2.** `scripts/check-coupled-lists.sh` fails on any
`pnpm exec prettier` under `.husky/`, `.github/` or `scripts/`, so the shape
cannot return. Verified by putting the old `ci.yml` line back: the check fails
and names the file and line. It excludes itself by filename, because a rule
against a string necessarily contains it.

**Why not level 1.** Structural impossibility would mean the wrong program being
unreachable, and it lives in the agent harness, outside this repository and
outside its lockfile. What is inside the repository is which invocation a reader
copies, and that is now one answer instead of two.

**What still bites and is worth knowing:** the substitution applies to a command
an agent types, not to CI and not to git hooks. So the gate that would catch the
damage — `prettier --check` in `pre-commit` — runs the *correct* prettier and
does catch it, but only for files that are staged. The eight rewritten files
were not staged, which is why nothing fired.

## The general shape

When a tool misbehaves, ask **which program actually ran** before asking what it
was configured with. `--version` on each path you can reach is one command and
it separates "wrong settings" from "wrong binary" immediately. In an agent
session there is a layer beneath the shell that no shell-level diagnostic can
see, and every one of those diagnostics will confidently agree with each other
while being irrelevant.
