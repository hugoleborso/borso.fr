---
date: 2026-11-14
introduced-at: implementation
detected-at: local
severity: high
related-pr: '#327'
fix-commits: [self]
eradication-level: 1
eradication-paths: [scripts/mutate-changed.sh, .github/workflows/ci.yml, .github/workflows/full-suite.yml]
time-to-detect: hours
tags: [mutation, stryker, ci, gates, tooling]
zone: scripts/mutate-changed.sh
weak-point: gate-measures-nothing
recurs: [vitest-5-ran-no-test-against-any-mutant]
---

# A fixture changed and Stryker kept the verdict

## User impact

A fix round on PR #327 could not trust a local mutation run:

```text
[revision-fixes] scripts/mutate-changed.sh reuses a stale Stryker incremental file, so a real mutation run needs apps/pragma/reports/mutation/incremental.json deleted by hand first.
```

Reproduced this session with a probe. `isOver(value, limit)` is the mutated
file. Its test loops over cases imported from a separate fixture module, under
one fixed test title.

| Run | Fixture | Seen | Fresh run says |
| --- | --- | --- | --- |
| 1 | `[11, true], [9, false]` | 80, `>=` survives | 80 |
| 2 | adds `[10, false]` | `5 of 5 mutant result(s) are reused`, 80 | 100 |
| 3 | drops `[10, false]` again, after a forced 100 | `5 of 5 mutant result(s) are reused`, 100 | 80 |

Run 2 is the friction the agent hit, a survivor that a fixed test cannot kill.
Run 3 is the dangerous direction, a weaker test that still reads 100. CI's
per-PR cache reuses the file between pushes, so run 3 also passes CI.

## Causal chain

- The run reported a verdict the code no longer earned.
  - Stryker reused every mutant result.
    - `IncrementalDiffer` (`@stryker-mutator/core` 9.6.1,
      `dist/src/mutants/incremental-differ.js`) reuses a result when the
      mutant's code did not change and, for a killed mutant, its killing test
      did not change, or, for a survivor, no test was added.
      - It diffs only the mutated files and the test files. The fixture is
        neither, so its change is invisible.

## Root cause of occurrence

*Thought the incremental file goes stale only when sources or tests move, which
Stryker diffs, actually every module a test imports, and the toolchain, are
inputs Stryker never diffs.* (Machine)

The tool is the condition. Stryker's incremental mode presents one file as a
complete cache, and nothing in its output says which inputs it skipped.

The differ's own header states its reuse rules and names no other input. A test
without a location in the report (Vitest reports none) spans its whole file, so
an edit to the test file itself is safe. CI's cache key already covered the
toolchain after
[`vitest-5-ran-no-test-against-any-mutant`](./vitest-5-ran-no-test-against-any-mutant.md),
but a local run had no key at all.

## Detection failure causes

- **CI:** the cache key carries the toolchain and the PR number, not the
  fixtures, constants or configs a test imports.
- **Local:** one file at a fixed path, reused across branches and toolchains.
- **Review:** a reused verdict prints the same table as a measured one.

## Countermeasure

`mutate-changed.sh` names each run's incremental file after a fingerprint of the
inputs Stryker cannot diff:

- the merge base
- `pnpm-lock.yaml`, `stryker.shared.js`, `stryker-zero-test-guard.js`, `patches/`
  and the run's `stryker.config.js`
- the path and content of every code file the branch changed in that package
  that is neither mutated nor a test

It deletes any other `incremental*.json` in that report folder. CI caches
`incremental-*.json`. A push that moves only gated files and their tests keeps
the cache. A push that moves a fixture or a helper starts that package from an
empty file.

## Eradication

**Type:** structural impossibility (level 1). A verdict can only be reused
against the inputs it was graded on.

**Reference:** this kaizen pull request · commit `self`

```diff
-incremental=(--incremental --incrementalFile reports/mutation/incremental.json)
+incremental_for() {
+  ...fingerprint of merge base, toolchain, run config and changed non-gated code...
+  find "$directory/reports/mutation" -maxdepth 1 -name 'incremental*.json' \
+    ! -name "incremental-$fingerprint.json" -delete
+  echo "--incremental --incrementalFile reports/mutation/incremental-$fingerprint.json"
+}
```

The same probe, run through the script. The old script from `HEAD` was used
first and the new one second:

```text
== old script, fixture lost the boundary case
	Result:		5 of 5 mutant result(s) are reused.
 probe.utils.ts | 100.00 |  100.00 |        5 |         0 |          0 |        0 |        0 |
[mutate-changed] every changed gated file passed mutation (1 run(s))
== new script, same inputs again
	Result:		5 of 5 mutant result(s) are reused.
== new script, fixture lost the boundary case
[Survived] EqualityOperator
 probe.utils.ts |  80.00 |   80.00 |        4 |         0 |          1 |        0 |        0 |
[mutate-changed] mutation failed for: tooling: 1 file(s)
```

**The same blind spot on `main`:** `full-suite.yml` restores its own
`incremental.json` for every app, the tooling and `infra/cdk`. Its cache keys
now carry a second `hashFiles` over the code Stryker neither mutates nor
diffs (every `.ts` file that is not a test, `.core`, `.utils` or `.adapter`,
plus the run's `stryker.config.js`), so a helper change starts that run from
an empty cache too. actionlint passes. The key is unverified until the next
full-suite run.

Related entries:

- [`vitest-5-ran-no-test-against-any-mutant`](./vitest-5-ran-no-test-against-any-mutant.md), the toolchain half of the same blind spot.
- [`how-a-mutation-survivor-hides`](../knowledge/how-a-mutation-survivor-hides.md)
