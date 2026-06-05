---
date: 2026-06-05
introduced-at: implementation
detected-at: production
severity: high
related-pr: "#26"
fix-pr: "#27"
fix-commits: [<kaizen-destroy-scope-pragma>, <kaizen-destroy-scope-lastloop>]
eradication-level: 2
time-to-detect: days
tags: [cdk, cloudformation, dsql, deploy, github-actions, last-loop-lepin]
---

# `cdk destroy --all` aimed at a per-PR stack also fired at the shared DSQL cluster

## Symptom

PR #26 merged. The preview teardown ran, then the operator's prod
deploy failed. `pragma-cluster` sat in `DELETE_FAILED`:

```
Cluster3DA9CCBA  DELETE_FAILED
Can't delete cluster: Deletion protection is enabled. To proceed,
disable deletion protection and try again. (Service: Dsql, Status Code: 400)
```

The per-PR app stack `pragma-pr-26` was *supposed* to be the only
thing torn down on PR close. Instead the teardown tried to delete the
long-lived, shared DSQL cluster that holds all of the app's database
state.

## Root-cause chain

1. **Why did the cluster stack get a delete request?** The preview
   teardown job runs `pnpm --filter @borso-app/<app> run destroy` per
   app. Pragma's `destroy` script was `cdk destroy --all --force`.
2. **Why does `--all` touch the cluster?** The pragma CDK app
   (`apps/pragma/cdk/bin/cdk.ts`) synthesizes **two** stacks:
   `pragma-pr-<N>` (the per-stage app) *and* `pragma-cluster` (the
   long-lived DSQL owner, shared across every preview and prod).
   `--all` means "every stack this app synthesizes" — including the
   cluster.
3. **Why didn't anyone notice at write time?** The same `--all`
   destroy script was copied from `last-loop-lepin`, where it had been
   silently mis-firing for weeks — its cluster's deletion protection
   refused the delete every time, and a prod deploy soon after each
   teardown brought the cluster stack back to `UPDATE_COMPLETE`, so
   the `DELETE_FAILED` window was never observed.
4. **Why did pragma get stuck where last-loop-lepin didn't?** Pragma
   had never had a successful prod deploy before this merge, so
   nothing came along to repair the `DELETE_FAILED` cluster stack —
   it stayed broken and blocked the very prod deploy the operator was
   trying to run.

**Root cause:** thought `cdk destroy --all` scoped to "this PR's
resources", actually it scopes to "every stack in the CDK app", which
includes the shared, stateful, cross-stage DSQL cluster.

## Detection failure causes

- **Typing / linter:** a package.json script string is opaque to both;
  `--all` reads as innocuous.
- **Functional validation locally:** nobody runs `destroy` locally;
  it only executes in the close-triggered teardown job.
- **CI (tests / build):** teardown isn't exercised by CI — it only
  fires on a real PR-close event against real AWS.
- **Code review:** the script was copied verbatim from an existing app
  whose teardown "worked" (the failure was masked by deletion
  protection + a following prod deploy), so it carried an implicit
  seal of approval.
- **Production monitoring:** the `DELETE_FAILED` state was only
  surfaced because the operator's *next* action (prod deploy) failed
  against it — there is no alarm on cluster-stack delete attempts.

## Countermeasure

- **Code:** scope the destroy to the per-PR app stack via an explicit
  `PR_NUMBER` env var; fail-fast with a named message when it's absent
  so a local `destroy` can never wildcard the cluster.
- **Operator action:** unstick the already-broken `pragma-cluster`
  stack by deleting it while *retaining* the DSQL resource —
  `aws cloudformation delete-stack --stack-name pragma-cluster
  --retain-resources Cluster3DA9CCBA` — then re-run the prod deploy so
  CDK recreates a fresh cluster stack. The retained cluster lives on as
  an orphan; clean up post-incident via
  `aws dsql update-cluster --no-deletion-protection-enabled` then
  `delete-cluster`.

## Eradication (mandatory — code-level)

**Type:** DevX check (level 2 — scoped command + fail-fast guard)

**Reference:** [PR #27](https://github.com/hugoleborso/borso.fr/pull/27) · commits on the kaizen branch (`fix(pragma)`, `fix(last-loop-lepin)`)

**The actual fix:**

```diff
- "destroy": "pnpm --filter @borso/infra run build && pnpm build && cdk destroy --all --force"
+ "destroy": "pnpm --filter @borso/infra run build && pnpm build && cdk destroy \"pragma-pr-${PR_NUMBER:?PR_NUMBER env var required — pragma destroy targets the per-PR app stack only, never the shared pragma-cluster stack}\" --force"
```

The `${PR_NUMBER:?message}` form makes the per-PR scope mandatory: a
destroy with no `PR_NUMBER` aborts before CDK runs, with the message
explaining why. The preview teardown already exports `PR_NUMBER`; a
local operator must pass it deliberately. The cluster stack name
(`pragma-cluster`) is never expressible by this script, so the teardown
can never target it again.

Why level 2 and not level 1: a true structural impossibility would
move the cluster stack into a separate CDK app (so a per-PR `destroy`
literally cannot see it) **or** set CloudFormation
`terminationProtection: true` on the cluster stack. Both are larger
`@borso/infra` changes under a 100%-coverage gate; the scoped-destroy
guard removes the live hazard now, and the structural split is the
documented next step.

**Sibling defects swept:** `apps/last-loop-lepin/package.json` carried
the identical `cdk destroy --all --force` and had mis-fired three times
(2026-05-25 20:55Z, 23:34Z; 2026-06-05 17:20Z), saved each time only by
deletion protection + a following prod deploy. Same scoped-destroy fix
applied in the same kaizen PR.

## See also

- [`cdk-destroy-failure-swallowed-by-trailing-or-echo.md`](./cdk-destroy-failure-swallowed-by-trailing-or-echo.md) — the teardown's *other* destroy hazard (masking failures), fixed earlier.
- [`docs/knowledge/cfn-update-rollback-recovery.md`](../knowledge/cfn-update-rollback-recovery.md) — recovering a stack stuck in a failed CFN state.
- [`dsql-first-deploy-must-be-prod.md`](./dsql-first-deploy-must-be-prod.md) — why pragma's never-deployed-prod cluster had no repair path.
