---
date: 2026-05-02
introduced-at: conception
detected-at: ci
severity: medium
related-pr: https://github.com/hugoleborso/borso.fr/pull/2
fix-pr: https://github.com/hugoleborso/borso.fr/pull/4
fix-commits: [9e78acb]
eradication-level: 1
time-to-detect: minutes (first preview push of a DB-using app)
tags: [dsql, ssm, cdk, ordering]
---

# A DB-using app's first deploy must be to prod (chicken-and-egg)

## Symptom

For a brand-new app whose `PreviewableApp` includes
`database: { migrationsPath: ... }`, opening the first PR triggered
a preview deploy that failed at synth with:

```
SSM Parameter Store value not found: /borso/<app>/dsql-cluster-arn
```

User impact (developer-facing): a brand-new app can't ship its
first preview. The first contributor hits a confusing synth error
that doesn't explain it's an ordering issue.

## Root-cause chain

1. **Why?** `cdk synth` aborts with SSM parameter not found.
   Because `lookupDsqlCluster` calls
   `StringParameter.valueFromLookup` against
   `/borso/<app>/dsql-cluster-arn`. CDK resolves SSM lookups at
   synth time and writes the resolved value to `cdk.context.json`.
   If the parameter doesn't exist, synth raises.
2. **Why doesn't the parameter exist?**
   It's published by `DsqlCluster`, which only runs in the
   **prod** stack of the app. Until prod has deployed once, no SSM
   param exists.
3. **Why is the cluster only in the prod stack?**
   We deliberately moved DSQL clusters from "one shared cluster
   account-wide" to "one cluster per app, owned by the app's prod
   stack" to isolate blast radius and clean up DPU accounting.
4. **Why does the consequence surface as a confusing synth error
   rather than a clear ordering message?**
   Because the failure is in a CDK SSM lookup deep inside
   `lookupDsqlCluster`, which doesn't carry context about why the
   parameter is missing. To a fresh contributor, "SSM not found"
   reads as a broken construct.
5. **Why didn't we anticipate this when designing the refactor?**
   We thought through the runtime sharing semantics (preview reads
   from prod's cluster) but not the bootstrapping order (prod must
   exist for any other stage to synth).

**Root cause:** we thought "preview/integ stacks share the prod
cluster via SSM" was symmetric. Actually it's strictly ordered: prod
publishes, others consume. A brand-new app must therefore deploy
prod first.

## Detection failure causes

- **Typing:** SSM lookups are runtime, not type-checked.
- **Linter:** no rule.
- **Functional validation locally:** the original developer of the
  refactor tested with an existing app whose prod was already
  deployed; the bootstrap path wasn't on their critical path.
- **CI:** unit tests for `PreviewableApp` synth a stack with a real
  `DsqlCluster` in the same stack (no SSM lookup), so they don't
  exercise the lookup-not-found case.
- **Code review:** the ordering constraint is a property of the
  whole system, not visible in any one diff.

## Countermeasure

- **Code:** commit [`9e78acb`](https://github.com/hugoleborso/borso.fr/commit/9e78acb) —
  the cluster moved out of the prod stage stack into a dedicated
  `DsqlClusterStack`. `PreviewableApp.database` now requires
  `cluster: IDsqlCluster` as a prop, passed in from the cluster
  stack via cross-stack reference. CDK's reference machinery
  orders deploys automatically — `cdk deploy --all` walks the
  cluster stack first, then the stage stack.
- **Operator action when introducing a DB-using app:** none beyond
  the standard handover doc — declare `DsqlClusterStack` and the
  stage stack in `bin/app.ts`, pass `clusterStack.cluster` into
  `PreviewableApp.database`. First preview deploy of a brand-new
  app just works regardless of stage.

## Eradication

**Type:** code diff (level 1 — structural impossibility)

**Reference:** [PR #4](https://github.com/hugoleborso/borso.fr/pull/4) · commit [`9e78acb`](https://github.com/hugoleborso/borso.fr/commit/9e78acb)

**The actual fix:**

```diff
  // infra/cdk/src/constructs/previewable-app.ts
- readonly database?: { readonly migrationsPath: string };
+ readonly database?: {
+   readonly migrationsPath: string;
+   readonly cluster: IDsqlCluster;  // required: passed from DsqlClusterStack
+ };
…
  if (props.database) {
-   this.cluster =
-     props.stage === 'prod'
-       ? new DsqlCluster(this, 'Cluster', { app: props.app, stage: props.stage })
-       : lookupDsqlCluster(this, props.app);
+   this.cluster = props.database.cluster;
    this.database = new DsqlSchema(this, 'Db', {
      …
      cluster: this.cluster,
    });
  }
```

```ts
// New: infra/cdk/src/constructs/dsql-cluster-stack.ts
export class DsqlClusterStack extends Stack {
  public readonly cluster: IDsqlCluster;
  constructor(scope: Construct, id: string, props: DsqlClusterStackProps) {
    super(scope, id, props);
    this.cluster = new DsqlCluster(this, 'Cluster', {
      app: props.app,
      stage: 'prod',
    });
  }
}
```

```ts
// Operator's bin/app.ts now declares:
const clusterStack = new DsqlClusterStack(app, `${APP_SLUG}-cluster`, { env, app: APP_SLUG });
const stageStack = new Stack(app, stageId, { env });
new PreviewableApp(stageStack, 'App', {
  …
  database: { migrationsPath, cluster: clusterStack.cluster },
});
```

The misconception "preview can run before prod for a brand-new
app" is now structurally impossible to express against
`PreviewableApp`'s API. The `cluster: IDsqlCluster` prop is
required when `database` is set; the only way to obtain one is
either `DsqlClusterStack.cluster` (canonical) or
`lookupDsqlCluster` (advanced, decoupled). Either way, the
cluster either exists in the same `cdk.App` invocation (cross-
stack ref → automatic deploy ordering) or has been deployed
previously (SSM resolves at deploy time).

**Sibling defects swept:**
- `PreviewableApp` no longer has a `stage === 'prod' ? new : lookup`
  branch; the conditional is gone.
- `lookupDsqlCluster` kept as a public helper for advanced use
  but no longer emits its synth-time annotation (the chicken-and-
  egg is no longer a thing in the canonical path).
- Tests: `previewable-app.test.ts` rewritten to use the new
  bin/app.ts shape (cluster stack first, stage stack second).
  New `dsql-cluster-stack.test.ts` covers the new construct.

**Earlier eradication (level 4) superseded:** the synth-time
`Annotations.addInfo` previously added in commit `9adfe24` was
removed — it's no longer needed because the chicken-and-egg
itself is gone. See the diff snippet above.
