---
date: 2026-10-05
introduced-at: self-validation
detected-at: local
severity: high
related-pr: '#122'
fix-pr: '#130'
fix-commits: [d4cd29d898, f578e1332c]
eradication-level: 2
eradication-paths: [stryker-zero-test-guard.js]
time-to-detect: hours (one day on main)
tags: [stryker, vitest, mutation-testing, ci, github-actions, cache, dependencies, vendor-quirk]
zone: stryker.shared.js
weak-point: gate-measures-nothing
recurs: [the-mutants-were-judged-by-the-wrong-jury]
---

# Vitest 5 ran no test against any mutant, and the backstop reused last week's verdicts

## Symptom

After the Vitest 4 to 5 bump, the mutation gate no longer measured anything.
Stryker ran the dry run normally, then executed **zero tests** against every
mutant that had per-test coverage, and reported each one `Survived`:

```
Ran 0.00 tests per mutant on average.
All files          |   0.00 |    0.00 |        0 |         0 |         23 |
```

That is `apps/borso-fr/site/src/home-menu.core.ts`, whose 23 mutants are all
killed on Vitest 4.1.11. The same file scores 100.00 with the fix, at 1.00 test
per mutant.

Meanwhile `full-suite` on `main` stayed green for six of seven jobs, because it
never re-ran the mutants at all.

## Root-cause chain

1. **Why did every covered mutant survive?** Its mutant run executed no test, so
   nothing could fail.
2. **Why no test?** `@stryker-mutator/vitest-runner` restricts a mutant run to
   the tests that covered it, by setting `project.config.testNamePattern` to a
   regex built from each test's full name.
3. **Why did the regex match nothing?** The runner builds that name by joining
   the suite chain with a space (`describe` + `' '` + `it`). Vitest 5 changed
   `testNamePattern` to match the chain joined with `' > '` (a documented
   breaking change in the Vitest 5 migration guide). `canAnimateIn animates a
   tab` no longer matches `canAnimateIn > animates a tab`.
4. **Why did that land?** The bump was taken as "every coverage suite passes",
   which is true and says nothing about Stryker: the vitest-runner's peer range
   is `vitest >=2.0.0`, so pnpm accepted 5 without a word, and neither 9.6.1 nor
   10.0.0 handles the new separator. Upstream issue
   [stryker-js#6210](https://github.com/stryker-mutator/stryker-js/issues/6210)
   and fix [stryker-js#6214](https://github.com/stryker-mutator/stryker-js/pull/6214)
   are open and unreleased.

**Root cause:** we thought a test-runner bump that keeps the unit suites green
keeps the mutation gate honest, but the mutation gate drives Vitest through an
API surface (`testNamePattern` and the name format behind it) that the unit
suites never touch, and the plugin's open peer range promised compatibility it
did not have.

## Detection failure causes

- **CI on the pull request:** `ci.yml` runs no mutation at all; mutation runs
  pre-push (scoped) and in `full-suite` on `main`.
- **`full-suite` on `main`:** the Stryker incremental file is restored from an
  Actions cache whose key was `stryker-<app>-<sha>` with the restore prefix
  `stryker-<app>-`. The incremental differ re-tests a mutant only when its
  source or its tests changed, and it hashes neither `node_modules` nor the
  lockfile. So after the bump every mutant kept its old `Killed` verdict:
  `Mutants: 0 files changed`, score 100.00, in five apps, `tooling` and
  `infra`. Only `borso-fr` went red, because one of its test files changed in
  the same merge, and even then the report read as two weak tests rather than a
  broken runner.
- **The score itself:** "Survived with zero tests run" and "Survived because the
  tests are weak" print the same line. Nothing distinguished the two.
- **Locally on macOS:** every Stryker run died earlier with *"No tests were
  executed"*, for a different reason: `stryker.shared.js` built the sandbox under
  `os.tmpdir()`, which is `/var/folders/...`, while Vitest resolves the same
  files to `/private/var/folders/...`. `vitest.related` compares the two strings,
  finds no test related to the mutated file, and the dry run is empty. A gate
  that always fails locally gets skipped with `SKIP_MUTATION_GATE=1`.

## Countermeasure

- **Vitest back on 4.1.11** (commit `fe902b76`, PR #129), and Dependabot
  ignores the Vitest major until a runner release reads its results. A pnpm
  patch porting stryker-js#6214 to 9.6.1 was written and verified on this
  branch (23 of 23 killed on Vitest 5, every workspace at 100), then dropped
  when `main` chose the pin: on Vitest 4 it changed nothing, and an unexercised
  vendor patch is code nobody tests. Porting it again is the way to take
  Vitest 5 before upstream releases.
- `stryker.shared.js` resolves the sandbox with `realpathSync(tmpdir())`, so
  the path Stryker hands to Vitest is the one Vitest computes.

## Eradication (mandatory — code-level)

**Type:** DevX check (level 2 — the gate refuses to report a score it did not measure)

**Reference:** [PR #130](https://github.com/hugoleborso/borso.fr/pull/130) · commits [`d4cd29d8`](https://github.com/hugoleborso/borso.fr/commit/d4cd29d8), [`f578e133`](https://github.com/hugoleborso/borso.fr/commit/f578e133)

**The actual fix:**

```diff
# stryker.shared.js
-    plugins: ['@stryker-mutator/vitest-runner'],
-    reporters: ['progress-append-only', 'clear-text'],
+    plugins: ['@stryker-mutator/vitest-runner', ZERO_TEST_GUARD_PLUGIN],
+    reporters: ['progress-append-only', 'clear-text', ZERO_TEST_GUARD_REPORTER],
```

`stryker-zero-test-guard.js` is a Stryker reporter that every workspace loads
through the shared config. It fails the run when any mutant is `Survived`, has
covering tests, and completed zero of them, which no healthy runner can
produce. On Vitest 5 without the upstream fix it prints:

```
ERROR ZeroTestGuardReporter 23 mutant(s) have covering tests but their run executed none, ...
```

and exits 1, whatever the threshold says.

**Type:** detection (level 4 — the backstop re-measures after a toolchain change)

```diff
# .github/workflows/full-suite.yml, three caches
-          key: stryker-${{ matrix.app }}-${{ github.sha }}
+          key: stryker-${{ matrix.app }}-${{ hashFiles('pnpm-lock.yaml', 'stryker.shared.js', 'stryker-zero-test-guard.js', 'patches/**') }}-${{ github.sha }}
```

A lockfile change now starts the incremental file from empty, so the next
Vitest or Stryker bump is measured in full on `main` instead of inheriting the
verdicts of the previous toolchain.

**Sibling defects swept:** every workspace's mutation config goes through
`defineStrykerConfig`, so the guard and the sandbox path cover
`borso-fr`, `borsouvertures`, `last-loop-lepin`, `banana-rush`, `pragma`,
`infra/cdk` and the root tooling at once.

## See also

- [`the-backstop-nobody-was-standing-behind.md`](./the-backstop-nobody-was-standing-behind.md)
  — the commit comment that made this run's single red job visible.
- [`a-sed-delimiter-disarmed-the-mutation-gate.md`](./a-sed-delimiter-disarmed-the-mutation-gate.md)
  — the same shape one level up: a gate that passes by running nothing.
- [`../knowledge/stryker-sandbox-and-plugin-resolution-under-pnpm.md`](../knowledge/stryker-sandbox-and-plugin-resolution-under-pnpm.md)
