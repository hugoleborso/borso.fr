---
date: 2026-10-25
introduced-at: conception
detected-at: review
severity: high
related-pr: '#193'
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

## User impact

No member saw it. The review of PR #193 caught it before the merge.

ADR-2026-10-24T0932 chose a unique index on `song.deezer_track_id` to hold one
catalogue song per Deezer track. Its consequences said: "The guarantee depends
on a build nobody waits for. A failed build is silent." The operator was asked
to count duplicate track ids before merging and to read `sys.jobs` after
deploying, by hand.

| | Seen | Expected |
| --- | --- | --- |
| A deploy creates a unique index over rows that hold a duplicate | The deploy reports success. The index is left `INVALID` and pragma can still hold two songs for one track | The deploy fails and names the duplicate |

## Causal chain

- A deploy would report success while its unique index failed to build.
  - The migration runner sent each statement and dropped its result.

    ```ts
    for (const statement of splitStatements(migration.sql)) {
      await sql.unsafe(statement); // ❌ the CREATE INDEX ASYNC answer, a job_id row, is discarded
    }
    ```

    - DSQL answers `CREATE INDEX ASYNC` with a `job_id` and builds the index afterwards. A failed build leaves it `INVALID`.
      - Commit `44f54617e` (2026-05-21, written by an agent) made every `CREATE INDEX` asynchronous through `asyncifyIndex`, so that DSQL would accept it. Its message says the builds are "tracked via `sys.jobs`".
        - It shaped `asyncifyIndex` as a string-to-string rewrite inside `splitStatements`, "mirroring the shape of the existing `makeIdempotent` and `stripUsingClause` helpers". A rewritten string has no place for what must happen after the statement runs, so the wait had nowhere to live. (Machine)

## Root cause of occurrence

*Thought a migration was applied once DSQL accepted its statements, actually an asynchronous index is built only when its job in `sys.jobs` says `completed`.*

Machine. The agent knew the build was asynchronous, since its own commit
message says so. The codebase offered one place to change a statement, a pure
string rewrite, and every helper there ends when the string is returned. The
pattern it copied could express "make DSQL accept this" and could not express
"then wait for it".

*Asynchronous indexes in Aurora DSQL*, read on 2026-10-25, documents the
`job_id` result, the four job statuses, and that a failed build leaves the
index `INVALID` while a unique one still enforces uniqueness on new writes. A
retried deploy does not repair it. The runner adds `IF NOT EXISTS`, so the next
run skips the statement and finds no job to wait on.

## Detection failure causes

- **CI (tests):** the runner's tests run against a SQL double that answers every statement with no rows, so no test could see a job id.
- **Local:** local Postgres builds indexes synchronously and has no `sys.jobs`.
- **Preview:** a preview applies the new migration to a clone of production. It would have met the same failure and dropped it the same way.
- **Production monitoring:** nothing reads `sys.jobs`, which drops finished jobs after 30 minutes.

## Countermeasure

`settleIndexBuild` in `index-build-wait.ts` runs after every statement that
creates an index. It reads the job ids the statement returned and polls
`SELECT status, details FROM sys.jobs WHERE job_id = $1` every 2 s.
`completed` continues. `failed` throws with the job's `details` and the way
out. A build still running at the deadline throws too, inside the Lambda's
five minutes. When the statement returned no job, because `IF NOT EXISTS`
skipped it, or `sys.jobs` no longer holds the job, it reads
`pg_index.indisvalid` and throws on an `INVALID` or missing index. A throw
happens before the migration is recorded in `_migrations`, so the next deploy
runs it again.

Verified against *Asynchronous indexes in Aurora DSQL* and *System tables and
commands in Aurora DSQL*, both read on 2026-10-25. The same pages name a
`sys.wait_for_job(job_id)` procedure but show no call of it, so the runner
polls the documented view instead of guessing the syntax.

## Eradication

**Type:** detection (level 4). The deploy itself now fails on the condition
that used to need an operator.

**Reference:** the commit adding this file.

```diff
     for (const statement of splitStatements(migration.sql)) {
-      await sql.unsafe(statement);
+      const statementRows = await sql.unsafe(statement);
+      await settleIndexBuild(sql, schemaName, statement, statementRows, indexBuildDeadline);
     }
```

The decisions live in `index-build-jobs.utils.ts` (`classifyIndexBuildJob`,
`planIndexBuildStep`, `readCreatedIndexName`, `selectSubmittedJobIds`), at 100%
coverage and a 100% mutation score. The handler tests drive a build through
`submitted`, `processing` and `completed`, a failed build, a build still
running at the limit, a job `sys.jobs` no longer holds, an `INVALID` index
skipped by `IF NOT EXISTS`, and a statement that left no index.

Cost. A deploy that adds an index now takes as long as the build, and fails
where it used to succeed with an unbuilt index. Migrations already recorded as
applied are not re-checked.

**Proposed:** `asyncifyIndex` in `statement-rewrites.utils.ts` returns
`{ statement, settle }` instead of a string, and the runner executes the pair.
The rewrite that adds `ASYNC` then carries its own wait, so no caller can send
an asynchronous index without waiting for it. `settleIndexBuild` would stop
re-parsing the statement with `readCreatedIndexName` to learn which index it
created.

**Proof it can fail:** the handler test with a `failed` job throws with the
job's `details`, and the one with an `INVALID` index throws on it.

**Similar instances:** `grep -n "unsafe(statement)" infra/cdk/src/internal/migration-runner/index.ts`
finds the migration loop, now followed by `settleIndexBuild`, and the role
grant loop, which creates no index. ADR-2026-10-24T0932 gained a revision, and
[`dsql-postgres-compat-gaps.md`](../knowledge/dsql-postgres-compat-gaps.md) §11
says the runner waits.
