---
date: 2026-10-29
introduced-at: conception
detected-at: ci
severity: medium
related-pr: '#231'
fix-commits: [self]
eradication-level: 4
eradication-paths: [infra/cdk/src/internal/migration-runner/concurrency-retry.utils.ts, infra/cdk/src/internal/migration-runner/concurrency-retry.utils.test.ts, infra/cdk/src/internal/migration-runner/concurrency-retry.ts, infra/cdk/src/internal/migration-runner/index.ts, infra/cdk/test/unit/migration-runner.test.ts]
time-to-detect: minutes
tags: [dsql, cdk, preview, deploy, github-actions]
zone: infra/cdk/src/internal/migration-runner/index.ts
recurs: none (the first DSQL concurrency abort in the schema custom resource; the app code already retried its own)
---

# A merge raced its own preview teardown

## User impact

Merging PR #231 at 13:14 UTC on 2026-10-29 failed the preview `teardown` job
(job 123469319393), and the preview stack stayed behind.

```text
pragma-pr-231 | DELETE_FAILED | AWS::CloudFormation::CustomResource | App/Db/Schema/Default
Received response status [FAILED] from custom resource. Message returned:
schema has been updated by another transaction (OC001)
```

| | Seen | Expected |
| --- | --- | --- |
| `pragma-pr-231` after the merge | `DELETE_FAILED` an hour later (`aws cloudformation describe-stacks`, measured) | deleted |

## Causal chain

- The preview stack's delete failed.
  - The schema custom resource ran `DROP SCHEMA … CASCADE`, and Aurora DSQL aborted it with OC001.
    - DSQL uses optimistic concurrency. A catalog change that loses a race is aborted rather than made to wait.
      - The production deploy of the same merge ran DDL on the same `pragma-cluster`. `deploy.yml` started at 13:14:54 and the teardown at 13:14:58 (run listings, measured).
    - The runner made one attempt and reported the abort as a failure.

      ```ts
      await applyByRequestType[event.RequestType](sql); // ❌ one attempt, a lost race is fatal
      ```

      - Commit `1aa979e74` (2026-05-01, an agent) ported the runner "verbatim from upstream" `borso-platform`. The upstream header already named the risk as a caveat: "Untested against real DSQL", with the caveats "(no FKs, optimistic concurrency, retryable transactions)". The port carried that caveat over as a comment, and no step turned it into work. (Method)

## Root cause of occurrence

*Thought a schema operation on DSQL either succeeds or is wrong, actually it
can lose a race to another stack on the same cluster and must be retried.*

Method. The answer was in the agent's context: the header it copied names
"optimistic concurrency, retryable transactions". The port was phase 1 of the
monorepo plan and copied the constructs "verbatim from upstream", so a caveat
stayed a comment, and no step of the port turned a written caveat into code or
a test. Every stack of an app shares one cluster (`<app>-cluster` since
`785cc80d6`, one cluster for all apps before it), so the race was reachable
from the first merge that deployed and tore down at once. Nothing in the
repository held the conflict rule at that time: pragma's
`conflict-abort.core.ts` arrived on 2026-10-25 (`d117a320b`). The rest of that
class is closed: `grep -rni 'untested\|caveat' infra/cdk/src` finds nothing
today.

## Detection failure causes

- **Local:** local Postgres blocks a concurrent DDL instead of aborting it.
- **CI tests:** the mocked SQL client never raised a concurrency abort.
- **Staging:** previews are created one at a time, so the race needs a merge, which starts the prod deploy and the teardown in the same minute.

## Countermeasure

None for the stack. The nightly `cleanup-orphans` retries it.

## Eradication

**Type:** detection (level 4). Every runner request goes through the retry,
and a handler test fails when it does not.

**Reference:** the commit adding this file (`fix-commits: [self]`).

The handler runs each request through `runRetryingConcurrencyConflicts`.
`concurrency-retry.utils.ts` reads OC000, OC001 and 40001, from the code or
from the `(OC00x)` DSQL puts in the message, and retries up to five attempts,
2, 4, 8 then 16 s apart, inside the 300 s runner timeout. Create, Update and
Delete are idempotent, so running one again whole is safe.

```diff
-    await applyByRequestType[event.RequestType](sql);
+    await runRetryingConcurrencyConflicts(async () => applyByRequestType[event.RequestType](sql));
```

The gap, measured on 2026-11-27 with `grep -rln 'OC00' --include=*.ts apps infra`.
The conflict rule exists as three copies: pragma's and skull-king's
`conflict-abort.core.ts` and the runner's `concurrency-retry.utils.ts`. They
already differ: pragma's reads the code on an error's `cause`, the runner's does
not. This entry's own first sweep misjudged pragma's copy because of such a
difference (see below).

**Proposed:** one conflict classifier in a new workspace package under
`infra/`, imported by the runner and by every app's persistence helper, with
the three copies deleted. A new runtime package is an ADR decision. It would
make the copies impossible to drift apart, which is the cause behind this
entry and `the-read-every-deploy-could-break`.

**Proof it can fail:** with the line reverted, the new handler test failed:

```text
Error: schema has been updated by another transaction
⎯⎯⎯⎯⎯⎯⎯ Failed Tests 1 ⎯⎯⎯⎯⎯⎯⎯
```

With it, the delete drops the schema on the second try and closes the
connection once. The OC001 code on a postgres.js error is inferred from
pragma's OC000 handling. The message match covers the case where it is not.

**Similar instances:** this entry first judged that pragma's DML could not meet
OC001. That was wrong: any statement can, and pragma's reads did on every
deploy, as [`the-read-every-deploy-could-break.md`](./the-read-every-deploy-could-break.md)
records. skull-king's copy came later, with `ba0557404`.
