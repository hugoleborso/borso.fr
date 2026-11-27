---
date: 2026-08-14
introduced-at: implementation
detected-at: review
severity: medium
related-pr: '#46'
fix-commits: [28fd613e01]
eradication-level: 2
eradication-paths: [scripts/check-pure-modules-have-callers.sh]
time-to-detect: months
tags: [gates, testing, coverage, mutation, knip, dead-code, process]
zone: apps/pragma/api/src/setlists
weak-point: gate-measures-nothing
recurs: [a-green-mutation-gate-is-not-a-green-coverage-gate]
---

# Three green gates on fifty-eight lines that ran nowhere

## User impact

No pragma user saw a wrong screen. What the users of the codebase saw was a
rule that looked alive. Reading `apps/pragma/api/src/` for the blueprint sweep
of #46, `setlists/energy-curve.core.ts` had no importer in the whole
repository (measured):

```bash
$ git grep -l "energy-curve" 9f462a1 -- apps/pragma | grep -v "energy-curve.core"
$   # nothing
```

| | Seen | Expected |
| --- | --- | --- |
| `energy-curve.core.ts`, 58 lines | 100% coverage, mutation gate passed, knip clean | A gate reporting a module no running code reaches |

A maintainer changing the energy smoothing would have edited this file and
seen its tests pass, while the sparkline users see ran on other code (inferred).

## Causal chain

- `energy-curve.core.ts` ran nowhere for three months.
  - Its only importer was deleted on 2026-05-20, and the module stayed.
    `b884c228d` replaced `site/src/routes/setlists/sparkline.utils.ts` with a
    molecule-owned `EnergySparkline`. The deleted file held the one import:

    ```ts
    // The only non-test importer of the module, deleted by b884c228d.
    import { smoothedSeries } from '@api/setlists/energy-curve.core';
    ```

    The commit says "One sparkline implementation, covered at 100%". The new
    path builder, `energy-sparkline.utils`, does not call `smoothedSeries`.
    - The agent consolidated the sparkline inside the site and left the API
      module untouched. The module lived in `api/src/setlists/`, moved there
      by `d9860d82e` the day before, so it read as owned by the API, with
      callers of its own. Its only caller was the site file being replaced.
      **Machine.**
      - Before ADR 2026-08-13 created `apps/pragma/domain/`, a rule the site
        needed had no home of its own. It sat in the API and the site reached
        it through the `@api` alias, so a folder did not tell who used it.

## Root cause of occurrence

*Thought `energy-curve.core.ts` was an API module with callers of its own,
actually the site file being replaced was its only importer, and its folder
said nothing about who used it.* **Machine.**

Under the agentic 4M rule, the fact that settled it, the module's importer
count, was in no tool's output: `b884c228d` deleted the import line, and
nothing reported that the module had lost its last non-test caller. The
folder layout, a rule for the site stored in the API, is the condition that
made the wrong belief easy.

## Detection failure causes

- **Typing:** an unimported exported module is not a type error.
- **Linter:** `no-unused-vars` is per file. Nothing is unused within the file.
- **Coverage:** it measures a file against the tests that import it, and the
  test imported it, so the file read 100%.
- **Mutation:** every mutant was killed, because the test was thorough. A
  thorough test on dead code gives a perfect score.
- **Dead-code analysis (knip):** `knip.json` lists `*.test.ts` as entry
  points, so anything a test imports is reachable by construction. The
  setting is needed, or knip reports every test file as unused.
- **Review:** the diff of `b884c228d` showed the site file deleted. The
  orphaned module was not in the diff.

## Countermeasure

Commit `28fd613e01` deleted `energy-curve.core.ts` and its test, and moved the
two hand-mirrored pairs found alongside it into `apps/pragma/domain/`.

## Eradication

**Type:** DevX check (level 2)

**Reference:** [PR #46](https://github.com/hugoleborso/borso.fr/pull/46),
commit `28fd613e01`.

`scripts/check-pure-modules-have-callers.sh` asks, for every `*.core.ts` and
`*.utils.ts`, whether an importer exists that is not a test. Matching is on
the module basename, which is alias-agnostic, with an optional `.js` for
`infra/`'s ESM imports. It runs in `.husky/pre-commit` and in
`.github/workflows/ci.yml`, and exits 1.

The `domain/` folder of ADR 2026-08-13 removes the Machine condition for
pragma: a rule both sides read now lives in neither, so its folder says it is
shared.

The gate keeps a hand-kept exception list, `ALLOWED_TEST_ONLY`, which holds
three entries today. Removing a line without fixing the module fails the
commit. A list kept by hand is the weak part of this rung.

**Proof it can fail:** a planted `probe-dead.core.ts` with a passing test made
it exit 1 and name the file. Green on the tree as it stood.

**Proposed:** reuse knip instead of the basename-matching gate and its list.
Mark production entries with knip's `!` suffix in `knip.json` and run `knip
--production`, which ignores test entry points, so a module only a test
imports is reported by the tool built for it. A module meant to be test-only
would be declared once in `knip.json`. It is feasible but not free. A bare
`pnpm exec knip --production --include files` today lists much of
`infra/cdk/src` (measured by the review), so the `!` entries per workspace
are the work.

**Similar instances:** the first run found nine modules. Four
`i18n-parity.core.ts` were test-only by design. `sw/manifest.utils.ts` and
`sw/sw-cache.utils.ts` had a live hand-written copy in `site/public/sw.js`.
`mastery/mastery.core.ts` had a front-end copy. `runner.core.ts` and
`request-position.utils.ts` were never wired. The same PR found
`bars.core.ts` and `lineup.core.ts` with no back-end caller, mirrored by a
live front-end copy. When the same rule exists twice, one copy is often
dead, and the gates do not say which. `grep -n "\[apps/" scripts/check-pure-modules-have-callers.sh`
lists the exceptions left.
