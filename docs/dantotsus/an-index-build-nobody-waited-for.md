---
date: 2026-10-25
introduced-at: conception
detected-at: review
severity: high
related-pr: '#193'
fix-pr: none (opened by the kaizen pull request for #193)
fix-commits: [self]
eradication-level: 4
eradication-paths: [infra/cdk/src/internal/migration-runner/index-build-wait.ts, infra/cdk/src/internal/migration-runner/index-build-jobs.utils.ts, infra/cdk/src/internal/migration-runner/index.ts]
time-to-detect: months
tags: [dsql, cdk, deploy, gates, infra]
zone: infra/cdk/src/internal/migration-runner/index.ts
weak-point: gate-measures-nothing
recurs: none (jsonb-column-passed-local-postgres-failed-dsql is a DDL DSQL refuses at once; this one DSQL accepts and then fails later)
---

# An index build nobody waited for

## Symptom

ADR-0043, written on PR #193, chose a unique index on `song.deezer_track_id`
to hold one catalogue song per Deezer track, and listed as a consequence: "The
guarantee depends on a build nobody waits for. A failed build is silent." The
operator was asked to count duplicate track ids before merging and to read
`sys.jobs` after deploying, by hand, because nothing else would say whether the
index existed. A unique index whose build fails on duplicate rows is left
`INVALID`; the deploy that created it had reported success.

## Root-cause chain

1. **Why would a failed build be silent?** The migration runner sent each
   statement with `sql.unsafe(statement)` and ignored the result. For
   `CREATE INDEX ASYNC`, the result is a row holding a `job_id`; the build runs
   afterwards.
2. **Why was the result ignored?** The runner was written when DSQL rejected
   plain `CREATE INDEX`, and `ASYNC` was added as a rewrite (`asyncifyIndex`) to
   make the statement accepted. Accepted was read as done.
3. **Why does it matter after the statement succeeds?** AWS documents that a
   failed asynchronous build leaves the index `INVALID`, that a unique one
   still enforces uniqueness on new writes, and that the fix is to remove the
   duplicates, `DROP INDEX` and create it again. A retried deploy does not
   repair it either: the runner adds `IF NOT EXISTS`, so the next run skips
   the statement and finds no job to wait on.

**Root cause:** thought a migration succeeded when DSQL accepted its
statements, actually an asynchronous index is only built when its job in
`sys.jobs` says `completed`.

## Detection failure causes

- **CI (tests / build):** the runner's tests run against a SQL double that
  answers every statement with no rows.
- **Local:** local Postgres builds indexes synchronously and has no `sys.jobs`.
- **Staging:** a preview applies the new migration to a clone of production,
  so it would have met the same failure, and ignored it the same way.
- **Production monitoring:** nothing reads `sys.jobs`, which drops finished
  jobs after 30 minutes.

## Countermeasure

- **Code:** `settleIndexBuild` in `index-build-wait.ts` runs after every
  statement that creates an index. It reads the job ids the statement
  returned and polls `SELECT status, details FROM sys.jobs WHERE job_id = $1`
  every 2 s. `completed` continues; `failed` throws with the job's `details`
  and the way out; still running after 240 s throws too, inside the Lambda's
  five minutes. When the statement returned no job (`IF NOT EXISTS` skipped
  it) or `sys.jobs` no longer holds the job, it reads `pg_index.indisvalid`
  for the index and throws on `INVALID` or on a missing index. A throw happens
  before the migration is recorded in `_migrations`, so the next deploy runs it
  again.
- **Verified against:** *Asynchronous indexes in Aurora DSQL* (the `job_id`
  result, the four statuses, the `failed` detail
  `Found duplicate key while validating index for UCVs`, `INVALID` after a
  failure, the `indisvalid` query) and *System tables and commands in Aurora
  DSQL* (the `sys.jobs` columns), both read on 2026-10-25. The same pages name
  a `sys.wait_for_job(job_id)` procedure but show no call of it, so the runner
  polls the documented view instead of guessing the call syntax.

## Eradication (mandatory — code-level)

**Type:** detection (level 4) — the deploy itself now fails on the condition
that used to need an operator.

**Reference:** the commit that adds this file.

**The actual fix:**

```diff
     for (const statement of splitStatements(migration.sql)) {
-      await sql.unsafe(statement);
+      const statementRows = await sql.unsafe(statement);
+      await settleIndexBuild(sql, schemaName, statement, statementRows);
     }
```

The decisions live in `index-build-jobs.utils.ts` (`classifyIndexBuildJob`,
`planIndexBuildStep`, `readCreatedIndexName`, `selectSubmittedJobIds`), at
100% coverage and a 100% mutation score; the handler tests drive a build
through `submitted`, `processing` and `completed`, a failed build, a build
still running at the limit, a job `sys.jobs` no longer holds, an `INVALID`
index skipped by `IF NOT EXISTS`, and a statement that left no index.

**Observable property change:** a deploy that adds an index now takes as long
as the build, and fails where it used to succeed with an unbuilt index.
Migrations already recorded as applied are not re-checked.

**Sibling defects swept:** ADR-0043 gains a revision, its README line and
`dsql-postgres-compat-gaps.md` §11 say the runner waits, and both ADRs from
PR #193 now carry their commit.

## See also

- [`../adr/0043-one-catalogue-song-per-deezer-track-by-unique-index.md`](../adr/0043-one-catalogue-song-per-deezer-track-by-unique-index.md)
- [`../knowledge/dsql-postgres-compat-gaps.md`](../knowledge/dsql-postgres-compat-gaps.md) §11
