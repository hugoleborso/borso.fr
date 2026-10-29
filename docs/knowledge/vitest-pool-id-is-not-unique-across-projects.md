---
summary: '`VITEST_POOL_ID` repeats across live workers once a second project group starts, so key per-worker resources on `process.pid`, not on the pool id.'
triggers:
  paths:
    - 'apps/*/test/setup-postgres.ts'
    - 'apps/*/test/worker-database.setup.ts'
  commands:
    - 'VITEST_POOL_ID'
  output:
    - 'VITEST_POOL_ID'
---

# `VITEST_POOL_ID` is not unique across Vitest projects

**Symptom.** pragma's back-e2e suites were made parallel with one database per
worker, named after `VITEST_POOL_ID`. The `back-e2e` project passed. The
`back-e2e-assistants` project, which runs after it in a second
`sequence.groupOrder` group, failed 18 tests with
`503 {"error":"auth-not-bootstrapped"}`. Run on its own, it passed.

**Cause.** Vitest 4.1.11 gave the same pool id to two processes that were alive
at the same time. Logged from a setup file in that run:

```
07:47:10.195Z pid=9827 pool=2 file=api/src/mcp/tool-budget.test.ts
07:47:10.264Z pid=9844 pool=2 file=api/src/takes/takes-tools.controller.test.ts
```

Both processes used the same database, so one file truncated `app_config`
between another file's set-password call and its login. Inside the first group
the ids were unique, which is why the first project looked fine.

**Fix.** Key the resource on `process.pid`, which no two live processes share.
`apps/pragma/test/worker-database.setup.ts` clones the template database into
`<base>_<project>_worker_<pid>` on the first file a process runs, and skips the
clone when `DATABASE_URL` already names that database. The global setup drops
every `<base>_<project>_worker_` database before it starts and again in its
teardown.
