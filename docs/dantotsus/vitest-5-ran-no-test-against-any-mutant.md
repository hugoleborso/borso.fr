---
date: 2026-10-05
introduced-at: self-validation
detected-at: local
severity: high
related-pr: '#122'
fix-commits: [d4cd29d898, f578e1332c]
eradication-level: 2
eradication-paths: [stryker-zero-test-guard.js, stryker.shared.js, .github/workflows/full-suite.yml]
time-to-detect: hours (one day on main)
tags: [stryker, vitest, mutation-testing, ci, github-actions, cache, dependencies, vendor-quirk]
zone: stryker.shared.js
weak-point: gate-measures-nothing
recurs: [the-mutants-were-judged-by-the-wrong-jury]
---

# Vitest 5 ran no test against any mutant, and the backstop reused last week's verdicts

## User impact

The users are every agent and the operator who rely on the mutation gate to
say whether tests catch a change. After the Vitest 4 to 5 bump, the gate no
longer measured anything, and `full-suite` on `main` stayed green for six of
seven jobs.

| | Seen | Expected |
| --- | --- | --- |
| `apps/borso-fr/site/src/home-menu.core.ts` under Stryker | `Ran 0.00 tests per mutant on average`, score 0.00, all 23 mutants `Survived` | 23 of 23 killed, score 100.00, 1.00 test per mutant, as on Vitest 4.1.11 |

```
Ran 0.00 tests per mutant on average.
All files          |   0.00 |    0.00 |        0 |         0 |         23 |
```

The session that wrote this entry measured both runs.

## Causal chain

- Every covered mutant survived.
  - Its mutant run executed no test, so nothing could fail.
    - `@stryker-mutator/vitest-runner` restricts a mutant run to the tests
      that covered it, by setting `project.config.testNamePattern` to a regex
      built from each test's full name.
      - The runner joins the suite chain with a space (`describe` + `' '` +
        `it`). Vitest 5 matches `testNamePattern` against the chain joined
        with `' > '`, a breaking change in its migration guide.
        `canAnimateIn animates a tab` no longer matches
        `canAnimateIn > animates a tab`.
        - Commit `949662457` ("chore(deps): take every open Dependabot bump in
          one change", 2026-10-04, an agent) moved `vitest ^4.1.11 -> ^5.0.3`.
          Its message lists what it ran: "Every workspace's coverage suite
          passes on the new versions, as do format, typecheck, the ESLint rule
          tests, each workspace's tsc and the full lint." No mutation run.
          - pnpm accepted Vitest 5 without a word. The runner's peer range is
            `vitest >=2.0.0`, and neither 9.6.1 nor 10.0.0 handles the new
            separator. Upstream issue
            [stryker-js#6210](https://github.com/stryker-mutator/stryker-js/issues/6210)
            and fix [stryker-js#6214](https://github.com/stryker-mutator/stryker-js/pull/6214)
            were open and unreleased.

## Root cause of occurrence

*Thought a test-runner bump that keeps every unit and coverage suite green
keeps the mutation gate honest. Actually the mutation gate drives Vitest
through `testNamePattern` and the test-name format behind it, a surface the
unit suites never touch.* (Method, with Material.)

Method: the bump procedure validated a test-runner change only with the suites
the change could not break this way. No document asked for a mutation run
after a test-runner bump (inferred).

Material: the vendor's peer range promised compatibility with every Vitest
from 2 up, and it did not have it.

## Detection failure causes

- **CI on the pull request:** `ci.yml` ran no mutation then. Mutation ran
  pre-push, scoped, and in `full-suite` on `main`.
- **`full-suite` on `main`:** the Stryker incremental file came from an Actions
  cache keyed `stryker-<app>-<sha>`, restored by the prefix `stryker-<app>-`.
  The incremental differ re-tests a mutant only when its source or its tests
  change. It hashes neither `node_modules` nor the lockfile. So every mutant
  kept its old `Killed` verdict, `Mutants: 0 files changed`, score 100.00, in
  five apps, `tooling` and `infra`. Only `borso-fr` went red, because one of
  its test files changed in the same merge. Even then the report read as two
  weak tests, not a broken runner.
- **The score itself:** "Survived with zero tests run" and "Survived because
  the tests are weak" printed the same line.
- **Locally on macOS:** every Stryker run died earlier with *"No tests were
  executed"*, for another reason. `stryker.shared.js` built the sandbox under
  `os.tmpdir()`, `/var/folders/...`, while Vitest resolves the same files to
  `/private/var/folders/...`. `vitest.related` compares the two strings and
  finds no related test. A gate that always fails locally gets skipped with
  `SKIP_MUTATION_GATE=1`.

## Countermeasure

- Vitest back on 4.1.11 (commit `fe902b76`, PR #129). Dependabot ignores the
  Vitest major (`.github/dependabot.yml`) until a runner release reads its
  results. A pnpm patch porting stryker-js#6214 to 9.6.1 was written and
  verified (23 of 23 killed on Vitest 5, every workspace at 100), then dropped
  when `main` chose the pin. On Vitest 4 it changed nothing, and an unexercised
  vendor patch is code nobody tests.
- `stryker.shared.js` resolves the sandbox with `realpathSync(tmpdir())`, so
  the path Stryker hands to Vitest is the one Vitest computes.

## Eradication

**Type:** DevX check (level 2), with detection (level 4) on the backstop.

**Reference:** commits `d4cd29d8` and `f578e133` (PR #130). Both still hold.

`stryker-zero-test-guard.js` is a Stryker reporter that every workspace loads
through `defineStrykerConfig` (`stryker.shared.js:43-44`). It fails the run
when a mutant is `Survived`, has covering tests and completed none of them,
which no healthy runner produces:

```diff
-    plugins: ['@stryker-mutator/vitest-runner'],
-    reporters: ['progress-append-only', 'clear-text'],
+    plugins: ['@stryker-mutator/vitest-runner', ZERO_TEST_GUARD_PLUGIN],
+    reporters: ['progress-append-only', 'clear-text', ZERO_TEST_GUARD_REPORTER],
```

Every Stryker cache key now hashes the toolchain, so a lockfile change starts
the incremental file from empty (`.github/workflows/full-suite.yml:120,147,173`,
and `.github/workflows/ci.yml:436` for the pull-request run added since):

```diff
-          key: stryker-${{ matrix.app }}-${{ github.sha }}
+          key: stryker-${{ matrix.app }}-${{ hashFiles('pnpm-lock.yaml', 'stryker.shared.js', 'stryker-zero-test-guard.js', 'patches/**') }}-${{ github.sha }}
```

**Proof it can fail:** on Vitest 5 without the upstream fix, the guard prints
`ERROR ZeroTestGuardReporter 23 mutant(s) have covering tests but their run
executed none, ...` and exits 1, whatever the threshold says.

The guard catches one failure mode, zero tests run. It does not catch a runner
that runs the wrong tests, or a cache that keeps a verdict. This weak point,
`gate-measures-nothing`, has recurred with a guard against each symptom:
[`a-sed-delimiter-disarmed-the-mutation-gate`](./a-sed-delimiter-disarmed-the-mutation-gate.md),
[`the-mutants-were-judged-by-the-wrong-jury`](./the-mutants-were-judged-by-the-wrong-jury.md),
this entry, and
[`a-fixture-changed-and-stryker-kept-the-verdict`](./a-fixture-changed-and-stryker-kept-the-verdict.md).

**Proposed:** add a positive control to `defineStrykerConfig` in
`stryker.shared.js`. A canary module with one known mutant, and the one test
that kills it, joins every run. A reporter fails the run unless that mutant is
`Killed` in that run. Any runner, cache or test-matching fault that stops tests
from judging mutants would then fail the gate, not just the zero-test case.

**Similar instances:** every workspace's mutation config goes through
`defineStrykerConfig` (`grep -rl defineStrykerConfig --include=stryker.config.js .`),
so the guard and the sandbox path cover all of them. The sandbox and plugin
quirks are in
[`stryker-sandbox-and-plugin-resolution-under-pnpm.md`](../knowledge/stryker-sandbox-and-plugin-resolution-under-pnpm.md).
