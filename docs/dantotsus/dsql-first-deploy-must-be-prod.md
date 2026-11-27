---
date: 2026-05-02
introduced-at: conception
detected-at: ci
severity: medium
related-pr: '#2'
fix-commits: [9e78acb176]
eradication-level: 1
eradication-paths: [infra/cdk/src/constructs/dsql-cluster-stack.ts, infra/cdk/src/constructs/previewable-app.ts]
time-to-detect: minutes (first preview push of a DB-using app)
tags: [dsql, ssm, cdk, ordering]
zone: infra/cdk/src/constructs/previewable-app.ts
---

# A DB-using app's first deploy must be to prod (chicken-and-egg)

## User impact

A brand-new full-stack app could not get its first preview. The first
pull request's preview deploy failed, and the error did not say that prod
had to deploy first.

| | Seen | Expected |
| --- | --- | --- |
| First preview deploy of a new app with `database:` | `SSM Parameter Store value not found: /borso/<app>/dsql-cluster-arn` | a preview URL |

Apps whose prod had already deployed were not affected.

## Causal chain

- The first preview deploy of a new app failed on a missing SSM parameter.
  - The preview stack read the cluster's ARN from `/borso/<app>/dsql-cluster-arn`, and that parameter did not exist yet.
    - `PreviewableApp` built the cluster only for prod and looked it up for every other stage.

      ```ts
      // previewable-app.ts at 785cc80d6
      this.cluster =
        props.stage === 'prod'
          ? new DsqlCluster(this, 'Cluster', { app: props.app, stage: props.stage })
          : lookupDsqlCluster(this, props.app); // ← reads an SSM parameter only prod publishes
      ```

      - Only prod's `DsqlCluster` published the parameter, so until prod deployed once, no other stage could deploy.
        - Commit 785cc80d6 ("make DSQL clusters per-app instead of one shared", 2026-05-02) wrote it. Its message reasons about the runtime: "Preview/integ stacks of the same app share that cluster via SSM lookup". It says nothing about which stage deploys first.

## Root cause of occurrence

*Thought previews sharing prod's cluster through SSM is a question of
runtime access, actually it orders deploys: prod publishes the parameter
and every other stage needs it, so a new app cannot preview before its
prod exists.*

Tag: **Method**. The refactor was reasoned through the steady state of an
app whose prod already runs. Nothing in the process walked the first
deploy of a new app.

The order bites at deploy, not at synth. `lookupDsqlCluster` used
`StringParameter.valueForStringParameter`, so CloudFormation read the
parameter when it resolved the stack (inferred from the code at
785cc80d6; the original entry said synth).

## Detection failure causes

- **Typing:** an SSM parameter name is a string, so its existence is not typed.
- **Local run:** the refactor was tried on an existing app whose prod had deployed, so the parameter existed.
- **CI:** the `PreviewableApp` unit tests built a real `DsqlCluster` in the same stack, so no test resolved the parameter for a stage without a prod.
- **Review:** the ordering is a property of the whole system, not visible in one diff.

## Countermeasure

Commit 9e78acb176 moved the cluster into its own `DsqlClusterStack`.
`PreviewableApp.database` now requires `cluster: IDsqlCluster`, passed from
that stack. CDK's cross-stack reference makes `cdk deploy` create the
cluster stack before the stage stack, so a new app's first preview deploys
whatever the stage.

## Eradication

**Type:** structural impossibility (level 1).

**Reference:** commit [`9e78acb`](https://github.com/hugoleborso/borso.fr/commit/9e78acb176).

```diff
  // infra/cdk/src/constructs/previewable-app.ts
- readonly database?: { readonly migrationsPath: string };
+ readonly database?: { readonly migrationsPath: string; readonly cluster: IDsqlCluster };
…
-   this.cluster = props.stage === 'prod' ? new DsqlCluster(…) : lookupDsqlCluster(this, props.app);
+   this.cluster = props.database.cluster;
```

`PreviewableApp` has no stage branch any more, and it cannot build a
database without a cluster handed to it
(`infra/cdk/src/constructs/previewable-app.ts:50` and `:72`).

What holds today has one escape. `lookupDsqlCluster` is still exported
from `infra/cdk/src/index.ts:2`, and passing its result as `cluster`
would bring the ordering back. No app calls it (measured, `grep -rn
lookupDsqlCluster apps infra --include=*.ts` finds only its definition, the
export and its own test).

**Proof it can fail:** the type is the check. A `database:` without
`cluster` fails `tsc`. Not rerun for this rewrite.

**Proposed:** delete `lookupDsqlCluster`, its export and its test. It has
no caller. With it gone, the only `IDsqlCluster` an app can obtain is
`DsqlClusterStack.cluster`, and a stage that deploys before its cluster
could not be written at all.

**Similar instances:** the earlier synth-time annotation of 9adfe24 was
removed in 9e78acb, since the canonical path no longer needs it.
