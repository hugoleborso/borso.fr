---
date: 2026-05-14
introduced-at: implementation
detected-at: review
severity: medium
related-pr: '#14'
fix-commits: [6b16fa535f, 3d7adaa06, 9dcf74547]
eradication-level: 1
eradication-paths: [scripts/lint-repository.sh, .github/workflows/ci.yml, .husky/pre-commit]
time-to-detect: weeks (3 PRs in)
tags: [biome, ci, hooks, pre-commit]
zone: .husky/pre-commit
weak-point: gate-measures-nothing
---

# `biome lint` at root scope was gated by no one, and 47 errors sat on `main` in plain sight

## User impact

The operator's CI reported a green lint on every pull request while `main`
held 47 lint errors. They were found by chance, running `pnpm exec biome lint`
from the root while resolving a merge conflict on PR #14 (measured then):

```
docs/features/borso-fr/12-travaux/spec/design-export/project/direction-c.jsx:148:9 lint/a11y/useButtonType
  × Provide an explicit type prop for the button element.
…
Found 47 errors.
```

| | Seen | Expected |
| --- | --- | --- |
| A pull request adds a file with lint errors outside any workspace | CI is green and the errors merge | CI fails and names them |

## Causal chain

- 47 lint errors sat on `main` for two PR cycles.
  - PR #11 merged design-export JSX fixtures under `docs/features/borso-fr/12-travaux/spec/design-export/` with those errors, and every gate passed.
    - CI linted through the workspaces only.

      ```yaml
      - run: pnpm -r lint   # ❌ each workspace lints its own includes glob, nothing lints the rest
      ```

      - `pnpm -r lint` ran each workspace's `biome lint`, and each workspace's `biome.jsonc` scanned only `"files.includes": ["bin/**", "site/**"]`. `docs/`, `scripts/` and `biome-plugins/` belonged to no workspace.
        - The scaffolding commit `11d98b276` (2026-05-01, written by an agent) put the lint gate in a per-workspace `lint` script. Each ported workspace copied it with its own include glob, and no command ran Biome from the root. A green run was valid for the apps and vacuous for every other file, and nothing in its output said which. (Machine)

## Root cause of occurrence

*Thought a green `pnpm -r lint` meant Biome had checked the repository, actually it checked only the files inside each workspace's include glob.*

Machine. The gate was assembled from per-workspace scripts. Its coverage was
the union of their globs, which nobody wrote down and no output showed, so a
file outside them was silently out of scope.

## Detection failure causes

- **Pre-commit:** it ran coverage for `infra/cdk` and `infra/shared` and no Biome at any scope.
- **Pre-push:** it ran `knip`, `actionlint` and a script-shadow check, no Biome.
- **CI:** `pnpm -r lint` was partly there, which made it feel complete. A green check reads as "Biome is fine".
- **Review:** reviewers do not run the linter by hand. It is meant to be the automation.

## Countermeasure

PR #15 (commits `6b16fa5` and `3eb11c2`) ran `pnpm exec biome lint` from the
root in `.husky/pre-commit` and in CI, beside `pnpm -r lint`. The root
`biome.jsonc` excluded `docs/**`, because design-export fixtures document
intent and are not source. That exclusion made the 47 errors moot.

## Eradication

**Type:** structural impossibility (level 1). One command lints the whole
repository, so no file can sit outside the gate's scope by accident.

**Reference:** commit `314f24821` (2026-08-08) replaced Biome with ESLint, and
commit `9dcf74547` (2026-10-27) replaced ESLint with oxlint. Commit
`3d7adaa06` (2026-10-02) moved CI to `scripts/lint-repository.sh`, and
`pnpm -r lint` is no longer in `ci.yml`. Since `9dcf74547` the script runs one
process from the root:

```sh
node_modules/.bin/oxlint --type-aware "$@" .
```

What it skips is written in one place, `ignorePatterns` in `.oxlintrc.json`,
which keeps `docs/**` out on purpose. Pre-commit lints the staged files and
pre-push the changed files, both with the same configuration.

**Proof it can fail:** a planted `debugger;` in `scripts/zz-probe.ts`, a folder
in no workspace, linted from the root (measured on 2026-11-27):

```
$ node_modules/.bin/oxlint .
scripts/zz-probe.ts:2:3: error eslint(no-debugger): `debugger` statement is not allowed
```

**Similar instances:** `cat pnpm-workspace.yaml` lists `apps/*` and `infra/*`
as the workspaces. `scripts/`, `eslint-rules/` and `.claude/skills/` are in
none, and the root run covers them. Each workspace still has a `lint` script for
linting one workspace, and all of them call `scripts/lint-workspace.sh`.
