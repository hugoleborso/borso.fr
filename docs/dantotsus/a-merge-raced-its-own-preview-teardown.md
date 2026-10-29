---
date: 2026-10-29
introduced-at: conception
detected-at: ci
severity: medium
related-pr: '#231'
fix-pr: none (opened by the kaizen pull request for #216 and #231)
fix-commits: [self]
eradication-level: 1
eradication-paths: [infra/cdk/src/internal/migration-runner/concurrency-retry.utils.ts, infra/cdk/src/internal/migration-runner/index.ts]
time-to-detect: minutes
tags: [dsql, cdk, preview, deploy, github-actions]
zone: infra/cdk/src/internal/migration-runner/index.ts
recurs: none (the first DSQL concurrency abort in the schema custom resource; the app code already retried its own)
---

# A merge raced its own preview teardown

## Symptom

Merging PR #231 at 13:14 UTC on 2026-10-29 failed the preview `teardown` job
(job 123469319393):

```text
pragma-pr-231 | DELETE_FAILED | AWS::CloudFormation::CustomResource | App/Db/Schema/Default
Received response status [FAILED] from custom resource. Message returned:
schema has been updated by another transaction (OC001)
```

`aws cloudformation describe-stacks --stack-name pragma-pr-231` still answered
`DELETE_FAILED` an hour later (measured). The nightly `cleanup-orphans` retries
it.

## Root-cause chain

1. **Why did the delete fail?** The schema custom resource ran
   `DROP SCHEMA … CASCADE`, and Aurora DSQL aborted it with OC001.
2. **Why OC001?** DSQL uses optimistic concurrency. A catalog change that loses
   a race is aborted rather than made to wait.
3. **What raced it?** The production deploy of the same merge. `deploy.yml`
   started at 13:14:54 and the teardown at 13:14:58 (run listings, measured).
   Both run DDL on the one `pragma-cluster`.
4. **Why was the abort fatal?** The migration runner had no retry. pragma's API
   retries OC000 in `conflict-abort.core.ts`, but the custom resource never
   adopted the same rule, and every merge of a pragma pull request starts both
   jobs in the same minute.

**Root cause:** thought a schema operation on DSQL either succeeds or is wrong,
actually it can lose a race and must be retried.

## Detection failure causes

- **Functional validation locally:** local Postgres blocks a concurrent DDL
  instead of aborting it.
- **CI (tests / build):** the mocked SQL client never raised a concurrency
  abort.
- **Staging monitoring:** previews are created one at a time, so the race needs
  a merge.

## Countermeasure

- **Operator action:** none needed. `cleanup-orphans` retries the stack nightly.

## Eradication (mandatory — code-level)

**Type:** code diff (level 1 — structural impossibility)

**Reference:** the kaizen pull request for #216 and #231 · this commit

**The actual fix:** the handler runs each request through
`runRetryingConcurrencyConflicts`. `concurrency-retry.utils.ts` reads OC000,
OC001 and 40001, from the code or from the `(OC00x)` DSQL puts in the message,
and retries up to five attempts, 2, 4, 8 then 16 s apart, inside the 300 s
runner timeout. Create, Update and Delete are idempotent, so running one again
whole is safe.

```diff
-    await applyByRequestType[event.RequestType](sql);
+    await runRetryingConcurrencyConflicts(async () => applyByRequestType[event.RequestType](sql));
```

Proved once. With the line reverted, the new handler test failed:

```text
Error: schema has been updated by another transaction
⎯⎯⎯⎯⎯⎯⎯ Failed Tests 1 ⎯⎯⎯⎯⎯⎯⎯
```

With it, the delete drops the schema on the second try and closes the
connection once. The OC001 code on a postgres.js error is inferred from
pragma's OC000 handling; the message match covers the case where it is not.

**Sibling defects swept:** pragma's own `conflict-abort.core.ts` retries OC000
and 40001 only. It runs DML, which cannot meet OC001.

## See also

- [`../knowledge/dsql-postgres-compat-gaps.md`](../knowledge/dsql-postgres-compat-gaps.md)
- [`cdk-destroy-failure-swallowed-by-trailing-or-echo.md`](./cdk-destroy-failure-swallowed-by-trailing-or-echo.md)
