# Plan: parallel back-e2e suites for pragma

| Spec decision | Where it lands |
| --- | --- |
| 1. Template migrated once per project | `apps/pragma/test/setup-postgres.ts` `setup(project)`: drops leftover `<base>_<project>_worker_*` databases, recreates `<base>_<project>_template`, runs `applyMigrations` on it, and provides `{ administrationUrl, templateName, workerDatabasePrefix }` via `project.provide`. Its teardown drops the worker databases. |
| 1. One database per worker | `apps/pragma/test/worker-database.setup.ts`, a `setupFiles` entry: on a process's first file it runs `CREATE DATABASE <prefix><pid> TEMPLATE <template>` and points `DATABASE_URL` at it, before `getDatabase()` caches a client. Keyed on `process.pid` because Vitest 4.1.11 repeats `VITEST_POOL_ID` across live workers in the second project group (see `docs/knowledge/vitest-pool-id-is-not-unique-across-projects.md`). |
| 1. Parallel files | `apps/pragma/vitest.config.ts`: `maxWorkers: 4`, `fileParallelism` left at its default, and `isolate: false` kept. |
| 2. Helpers scoped per worker | No change to `test/database-utils.ts`: every helper goes through `getDatabase()`, which now names the worker's database. |
| 3. CI | No change to `.github/workflows/ci.yml`: the service's `app` role is a superuser and can `CREATE DATABASE`. |
| 4. dev:db | `test/dev-database.setup.ts` calls the exported `applyMigrations(DATABASE_URL)` instead of `setup()`. |
| 5. Other apps | Not changed. Their serial suites took 5 s, 7 s and 8 s locally on 2026-10-29, and the change would copy about 80 lines of harness into each, since apps do not import from each other. |

## Risks

- Two concurrent `CREATE DATABASE ... TEMPLATE` from the same template. Detected by the full local runs; Postgres only refuses a template with open connections, and the template's migration connection is closed before any worker starts.
- A worker process reused across the two project groups keeps the client of its first database. That database is still its own, so no two live processes share one.

## Gates

Typecheck, oxlint, oxfmt, the full suite three times locally, and three consecutive green CI runs.
