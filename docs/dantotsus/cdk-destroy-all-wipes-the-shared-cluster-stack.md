---
date: 2026-06-05
introduced-at: implementation
detected-at: production
severity: high
related-pr: '#26'
fix-commits: [b35a066dc8, 3a5c9f6e01, self]
eradication-level: 1
eradication-paths: [infra/cdk/src/constructs/dsql-cluster-stack.ts]
time-to-detect: days
tags: [cdk, cloudformation, dsql, deploy, github-actions, last-loop-lepin]
zone: infra/cdk/src/constructs/dsql-cluster-stack.ts
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

**Type:** structural (level 1). CloudFormation refuses the delete.

`DsqlClusterStack` passes `terminationProtection: true` to `Stack`, and its
props type omits the field, so no application can turn it off in code. Every
`<app>-cluster` stack carries it from its next prod deploy. A
`cdk destroy --all`, a hand-typed `delete-stack` or a future script that
wildcards the stacks now fails at CloudFormation before any resource is
touched, whatever app or script issues it.
`infra/cdk/test/unit/dsql-cluster-stack.test.ts` asserts the flag on the
synthesized artifact.

The CDK bootstrap deploy role that every deploy assumes already allows
`cloudformation:UpdateTerminationProtection` (measured on the `CDKToolkit`
template in eu-west-3), so no IAM change is needed.

What it let go:

- The `${PR_NUMBER:?…}` guard and its message in every app's `destroy` script.
  The script still names `<app>-pr-<n>`, because `--all` would now fail on the
  protected cluster and turn every teardown red. An empty `PR_NUMBER` names no
  stack, and the preview stage already refuses to synthesize without one.
Retiring an application is the one time a cluster stack goes. The operator
turns the protection off by hand first, as
[`adding-a-fullstack-app.md`](../adding-a-fullstack-app.md) says.

**Sibling defects swept:** every full-stack app builds its cluster through
`DsqlClusterStack`, so one change covers all of them. `infra/shared` keeps
`cdk destroy --all`, because removing the account singletons is that script's
whole purpose.

## See also

- [`cdk-destroy-failure-swallowed-by-trailing-or-echo.md`](./cdk-destroy-failure-swallowed-by-trailing-or-echo.md) — the teardown's *other* destroy hazard (masking failures), fixed earlier.
- [`docs/knowledge/cfn-update-rollback-recovery.md`](../knowledge/cfn-update-rollback-recovery.md) — recovering a stack stuck in a failed CFN state.
- [`dsql-first-deploy-must-be-prod.md`](./dsql-first-deploy-must-be-prod.md) — why pragma's never-deployed-prod cluster had no repair path.
