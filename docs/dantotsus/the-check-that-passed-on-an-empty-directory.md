---
date: 2026-11-14
introduced-at: implementation
detected-at: review
severity: medium
related-pr: '#327'
fix-commits: [self]
eradication-level: 1
eradication-paths: [scripts/check-vocabulary-paths.sh, scripts/check-app-registration.sh, scripts/check-migration-sql-dsql-compat.sh, scripts/check-no-comments-in-styles-and-markup.sh, scripts/check-no-null-bytes.sh]
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

Reproduced this session:

```text
$ cd apps/pragma && ../../scripts/check-vocabulary-paths.sh
[check-vocabulary-paths] no application ships a VOCABULARY.md
exit=0
```

Four more checks behaved the same way from `apps/pragma` (measured). The worst
was `check-app-registration.sh`, which printed a grep error and then
`every app is declared in the workflows and the commit gate`, exit 0.
`check-no-null-bytes.sh` and `check-no-comments-in-styles-and-markup.sh` read
`git ls-files` relative to the subdirectory, so they checked only that app.
`check-migration-sql-dsql-compat.sh` found no migration.

## Causal chain

- A gate said pass on a tree it never read.
  - `for vocabulary in apps/*/VOCABULARY.md` matched nothing from `apps/pragma`.
    - The script read paths relative to the working directory, and nothing set
      it.

## Root cause of occurrence

*Thought every `scripts/*.sh` resolves its own root, actually only some do.*

[`run-repo-tools-from-the-directory-they-expect`](../knowledge/run-repo-tools-from-the-directory-they-expect.md)
said that `scripts/*.sh` run from anywhere because "each one `cd`s to the repo
root itself". Five checks did not.

## Detection failure causes

- **Pre-commit and CI:** both run the checks from the root, where they pass
  honestly.
- **The empty case:** `check-vocabulary-paths.sh` treats "no vocabulary found"
  as a pass, so a wrong directory reads as an empty repository.

## Countermeasure

Each of the five scripts now starts with
`cd "$(dirname "${BASH_SOURCE[0]}")/.."`, as `db-read.sh` resolves its root.
Pre-commit passes paths from the root, so the scripts that take arguments read
the same files as before.

## Eradication

**Type:** structural impossibility (level 1). These checks read the same tree
from any directory.

**Reference:** this kaizen pull request · commit `self`

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

And with the `pragma:` line removed from `.github/path-filters.yml`:

```text
== old
grep: .github/path-filters.yml: No such file or directory
[check-app-registration] every app is declared in the workflows and the commit gate
exit=0
== new
[check-app-registration] pragma has no filter in .github/path-filters.yml.
exit=1
```

**Not covered:** a new `scripts/*.sh` can still omit the line. No gate checks
it. The knowledge entry's table now names the line to copy.
