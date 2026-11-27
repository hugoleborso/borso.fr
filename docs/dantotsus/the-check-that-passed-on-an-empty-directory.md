---
date: 2026-11-14
introduced-at: implementation
detected-at: review
severity: medium
related-pr: '#327'
fix-commits: [self]
eradication-level: 5
eradication-paths: [docs/knowledge/run-repo-tools-from-the-directory-they-expect.md, scripts/check-vocabulary-paths.sh, scripts/check-app-registration.sh, scripts/check-migration-sql-dsql-compat.sh, scripts/check-no-comments-in-styles-and-markup.sh, scripts/check-no-null-bytes.sh]
time-to-detect: minutes
tags: [gates, shell, tooling, agents]
zone: scripts/check-vocabulary-paths.sh
weak-point: gate-measures-nothing
recurs: none (the first gate that passed because of where it was run)
---

# The check that passed on an empty directory

## User impact

The technical validator of PR #327 ran a gate from the app it was reviewing:

```text
[technical-validator] scripts/check-vocabulary-paths.sh run from apps/pragma prints 'no application ships a VOCABULARY.md' and exits 0, so a wrong working directory reads as a pass
```

| | Seen | Expected |
| --- | --- | --- |
| `cd apps/pragma && ../../scripts/check-vocabulary-paths.sh` | `no application ships a VOCABULARY.md`, exit 0 | the same verdict as from the root |

Four more checks behaved the same way from `apps/pragma` (measured on
2026-11-14). `check-app-registration.sh` printed a grep error, then
`every app is declared in the workflows and the commit gate`, exit 0.
`check-no-null-bytes.sh` and `check-no-comments-in-styles-and-markup.sh` read
`git ls-files` relative to the subdirectory, so they checked only that app.
`check-migration-sql-dsql-compat.sh` found no migration. Pre-commit and CI run
them from the root, so only a person or an agent running one by hand was
misled.

## Causal chain

- A gate said pass on a tree it never read.
  - `for vocabulary in apps/*/VOCABULARY.md` matched nothing from
    `apps/pragma`, and the script treats "none found" as a pass.
    - The script read paths relative to the caller's directory, because it
      never moved to the repository root:
      ```bash
      set -euo pipefail
                                 # ← no `cd "$(dirname "${BASH_SOURCE[0]}")/.."` here
      for vocabulary in apps/*/VOCABULARY.md; do
      ```
      - `001bb1d2b` (2026-08-15) wrote the script without the root line. At
        its parent, 13 of the 23 `scripts/*.sh` carried
        `cd "$(dirname "${BASH_SOURCE[0]}")/.."` and 10 did not (measured,
        `git grep -l 'cd "$(dirname' 001bb1d2b^ -- 'scripts/*.sh'`). The
        examples beside it showed both shapes. (Machine)
      - Ten hours earlier, `67bf3a3d6` had written in
        `run-repo-tools-from-the-directory-they-expect.md` that `scripts/*.sh`
        run from anywhere because "each one `cd`s to the repo root itself".
        The document told its reader the property came for free. (Material)

## Root cause of occurrence

*Thought every script under `scripts/` reads the tree from the repository
root, actually each script sets that itself with one copied line, and nearly
half did not.* (Machine)

The root is set by a line each script must copy by hand. Nothing shared sets
it, and a script without it looks the same as one with it until it is run from
elsewhere. The class is still open. Measured this session, eight
`scripts/*.sh` resolve no root, among them
`scripts/check-viewport-follows-keyboard.sh`, added on 2026-11-15 by
`fd4332550`, the day after this entry. Run from `apps/pragma`, it exits 1 with
`found no viewport meta under apps/, so it checked nothing.` It fails instead of
passing only because it refuses an empty input.

## Detection failure causes

- **Pre-commit and CI:** both run the checks from the root, where they pass
  honestly. No gate runs a script from another directory.
- **The empty case:** `check-vocabulary-paths.sh` treated "no vocabulary
  found" as a pass, so a wrong directory read as an empty repository.

## Countermeasure

Each of the five scripts now starts with
`cd "$(dirname "${BASH_SOURCE[0]}")/.."`, as `db-read.sh` resolves its root.
Pre-commit passes paths from the root, so the scripts that take arguments read
the same files as before.

## Eradication

**Type:** knowledge (level 5). The five scripts are fixed. The class is held
only by the knowledge entry's table, which names the line to copy.

**Reference:** the commit adding this file, in the kaizen pull request for
PR #327.

```diff
 set -euo pipefail
+
+cd "$(dirname "${BASH_SOURCE[0]}")/.."
```

Refusal proof, in a scratch worktree with one broken `Lives in:` line, run from
`apps/pragma`:

```text
== old
[check-vocabulary-paths] no application ships a VOCABULARY.md
exit=0
== new
  apps/pragma/VOCABULARY.md points at api/src/no-such-slice/, which is not in apps/pragma
exit=1
```

The gap, stated: a new `scripts/*.sh` can still omit the line, and eight do.
The knowledge entry's triggers fire on vitest and pnpm output, never on writing
a script. Worse, the row that taught the false belief is still live.
`docs/knowledge/run-repo-tools-from-the-directory-they-expect.md:21` on
`origin/main` `79814b4c8` reads "`scripts/*.sh` | anywhere | each check `cd`s
to the repo root itself". This entry's own level-5 eradication path teaches
the belief that wrote the defect.

**Proposed:** three steps, subtraction first. First, correct that row to say
`scripts/*.sh` run from the repository root unless the script `cd`s there
itself, and that a new script copies
`cd "$(dirname "${BASH_SOURCE[0]}")/.."`. The document then stops promising a
property the tree does not have. Second, every gate refuses an
empty input set, as `check-viewport-follows-keyboard.sh` already does. That
turns a wrong directory into a refusal instead of a pass, whatever the cause.
Third, a pre-commit check scoped to added or changed `scripts/*.sh` refuses a
script that neither carries the root `cd` line nor sources a shared root
resolver. Together they make a gate that passes on a tree it never read
impossible to commit.

**Similar instances:** a loop over `scripts/*.sh` that greps for
`cd "$(dirname`, `root=`, `ROOT=` or `rev-parse --show-toplevel` lists the
scripts without a root, eight on 2026-11-27. Not every one reads relative
paths, so the number of affected gates is unknown.
