# Parallel back-e2e suites for pragma

## Goal

Make the `back-e2e` and `back-e2e-assistants` projects of `apps/pragma` run their
files in parallel, so the suite is faster locally and in CI.

Baseline, measured 2026-10-29: the CI job `app-tests (pragma-e2e)` takes about
5.5 minutes, and the whole local suite took 7 min 42 s on one run and 491 s on
another. `apps/pragma/vitest.config.ts` set `maxWorkers: 1`,
`fileParallelism: false` and `isolate: false` for both projects.

## Decisions

1. Each Vitest worker gets a Postgres database of its own, cloned with
   `CREATE DATABASE ... TEMPLATE` from a template database migrated once per
   project in `globalSetup`.
2. These stop sharing state between workers, because each runs inside one
   database:
   - `truncateAllTables` between tests;
   - `countLockWaiters`, which counts lock waits in `pg_stat_activity` filtered
     on `current_database()`;
   - `abortCommitsWritingTable`, which creates a sequence, a function and a
     trigger with fixed names.
3. The same change runs in CI, where Postgres is a service container and
   `DATABASE_URL` names a superuser.
4. `pnpm run dev:db` keeps migrating and seeding the dev database as before.
5. `last-loop-lepin`, `banana-rush` and `talos` get the change only if it is
   cheap and worth it.

## Done means

- The suite passes with several workers locally and in CI, and stays green on
  three consecutive CI runs. A flaky lock test is a failure, not something to
  retry.
- Before and after wall-clock times, locally and in CI, are in the pull request.
- No test is skipped or weakened.

## Test strategy

- **Technical validation.** Every decision and every "done means" item is a code
  reviewer's: `/technical-validation` reads the diff and runs the full pragma
  database suite with several workers.
- **Visual validation.** None. Nothing a person sees in the application changes.
- **CI.** Three consecutive green runs of `app-tests (pragma-e2e)` and
  `app-tests (pragma-assistants)` on the pull request, with their durations
  compared against the baseline above.
