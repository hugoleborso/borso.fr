# vitest-runner 9.6.1: match Vitest 5's test name separator

Applied through `pnpm.patchedDependencies` in the root `package.json`.

Vitest 5 matches `testNamePattern` against the suite chain joined with `' > '`.
The runner joins it with a space, so the per-test filter of a mutant run matches
nothing, the run executes no test, and every covered mutant is reported
`Survived`. The patch picks the separator from the running Vitest version and
uses it both for the test ids recorded during the dry run and for the filter.

Upstream: issue [stryker-js#6210](https://github.com/stryker-mutator/stryker-js/issues/6210),
fix [stryker-js#6214](https://github.com/stryker-mutator/stryker-js/pull/6214).
Both are already open, so there is no pull request to send. Delete this patch
when a released `@stryker-mutator/vitest-runner` carries the fix: bump the
catalog entry, remove the `patchedDependencies` line, and check that
`home-menu.core.ts` in `apps/borso-fr` still reports about one test per mutant.

Root-cause analysis:
[`docs/dantotsus/vitest-5-ran-no-test-against-any-mutant.md`](../../docs/dantotsus/vitest-5-ran-no-test-against-any-mutant.md).
