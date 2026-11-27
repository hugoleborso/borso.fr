---
date: 2026-08-15
introduced-at: conception
detected-at: review
severity: medium
related-pr: '#49'
fix-commits: [bd182d773, 01e8a281d5]
eradication-level: 4
eradication-paths: [scripts/mutate-changed.sh, infra/cdk/stryker.config.js]
time-to-detect: months
tags: [stryker, mutation, coverage, gates, infra, pre-push]
zone: stryker.shared.js
weak-point: gate-measures-nothing
recurs: [a-green-mutation-gate-is-not-a-green-coverage-gate]
---

# The gate that was never pointed at the code, and the number that covered for it

## User impact

`infra/cdk` is the construct library every application deploys through. It
was gated at 100% coverage, and standard 02 said its `.utils.ts` files also
survived Stryker with no surviving mutant. Nothing had ever run Stryker there.
Pointing it at those five files once, on PR #49:

```
All files                     |  75.33 |   76.13 |      287 |         0 |         90 |        4 |        0 |
 statement-rewrites.utils.ts  |  51.69 |   51.69 |       61 |         0 |         57 |        0 |        0 |
```

| | Seen | Expected |
| --- | --- | --- |
| `infra/cdk` `.utils.ts` files | 100% coverage, no mutation run, and a standard that said "zero surviving mutants" | a mutation score, which was 75.33 with 90 survivors |

For ninety changes to lines the tests ran, no assertion would have noticed.

## Causal chain

- Five `infra/cdk` files carried 90 surviving mutants at 100% coverage for months.
  - No run of Stryker ever mutated them.
    - `.husky/pre-push` built its mutation list from changed paths under `apps/` only, and `full-suite.yml` looped over `apps/*`:

```bash
changed_app_slugs=$(echo "$changed" | sed -n 's|^apps/\([^/]*\)/.*|\1|p' | sort -u)
for app in $changed_app_slugs; do   # infra/cdk never matches ^apps/
```

      - Commit `9fc3b9a40` scoped the push gate to changed files and kept that `^apps/` derivation from the version before it. An agent wrote it.
    - Commit `39c7588cd` moved `infra/cdk`'s pure functions into `.utils.ts` files, the suffix the apps' mutation configs grade, including `statement-rewrites.utils.ts`. It gave them coverage tests and created no `stryker.config.js` beside them, while each of the four apps under `apps/` had one (`git ls-tree -r --name-only 39c7588cd | grep stryker`). An agent wrote it.

## Root cause of occurrence

*Thought every workspace a quality gate must cover lives under `apps/`,
actually `infra/cdk` is a gated workspace outside it, matched by
`infra/*` in `pnpm-workspace.yaml` beside `apps/*`.* (Machine)

Every loop the agent could copy in the codebase was phrased over `apps/`, so
the shared library fell outside each new one with no error. The runners
derived their scope from a path prefix instead of from the workspace list,
which is a property of the codebase, not of one writer.

## Detection failure causes

- **The gate's output:** a gate that is not pointed at code prints nothing. It does not report zero, so its absence reads as "not applicable".
- **The coverage gate:** it was pointed at the files and reported 100%. One green number with no red one beside it reads as well tested, which is the inference mutation testing exists to refuse.
- **The standard:** once "survives Stryker" was written in standard 02, nothing ran that could contradict it.
- **Conventions:** every convention in the repository is phrased per application, so `infra/` falls out of each loop written that way.

## Countermeasure

Commit `bd182d773` added `infra/cdk/stryker.config.js` and a mutation run for
`infra/cdk`. PR #49 closed 21 of the 90 survivors with real assertions
(`61d2dad`). Every keyword separator in the DSQL rewrites is `\s+`, and every
test had fed single-space SQL, so the tolerance was untested.

## Eradication

**Type:** detection (level 4)

**Reference:** `scripts/mutate-changed.sh` holds three hand-written scopes
today: the gated files of `apps/*`, the `.core` and `.utils` files of
`scripts/`, and the `.utils` files of `infra/cdk`. `.github/workflows/ci.yml:439`
runs it on every pull request. A changed gated file in those scopes is
mutated, and a survivor fails the pull request.

```bash
infra_files=$(echo "$changed" |
  ...
  sed -n 's|^infra/cdk/||p' |
```

**What no longer holds:** commit `01e8a281d` added
`scripts/check-mutation-covers-gated-files.sh`, which failed any workspace
holding a gated file without a Stryker config that mutates its suffix. Commit
`c54e32da7` (#224) deleted it, by operator decision, with the gates that only
guarded the harness. Since then a gated file in a new workspace outside the
three scopes is mutated by nothing, and nothing says so. Three scopes kept by
hand are not an eradication.

**Proposed:** `scripts/mutate-changed.sh` selects every changed
`.core`, `.utils` and `.adapter` file in the repository first, then routes each
to its scope, and exits 1 on a file that matches none. That restores the
refusal of the deleted check inside the selector CI already runs, with no
second list and no separate gate. It makes a gated file outside every mutation
scope impossible to merge.

**Proof it can fail:** not replanted this session.

**Similar instances:** `git ls-files | grep -E '\.(core|utils|adapter)\.tsx?$' | grep -vE '^(apps/|scripts/|infra/cdk/)'`
finds none today (measured 2026-11-27). The same lesson in its mirror form, a
green mutation gate over a red coverage gate, is
[a green mutation gate is not a green coverage gate](./a-green-mutation-gate-is-not-a-green-coverage-gate.md).
