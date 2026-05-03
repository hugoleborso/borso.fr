# A DB-using app's first deploy must be to prod

## Symptom

For a brand-new app whose `PreviewableApp` includes
`database: { migrationsPath: ... }`, opening the first PR triggered
a preview deploy that failed at synth with
`SSM Parameter Store value not found: /borso/<app>/dsql-cluster-arn`.

## Root-cause chain

1. **Why** does `lookupDsqlCluster` fail at synth?
   It calls `StringParameter.valueFromLookup` against
   `/borso/<app>/dsql-cluster-arn`. CDK resolves SSM lookups at synth
   time and writes the resolved value to `cdk.context.json`. If the
   parameter doesn't exist, the synth raises.
2. **Why** doesn't the parameter exist for a brand-new app?
   The parameter is published by `DsqlCluster`, which only runs in
   the **prod** stack of the app
   (`PreviewableApp.buildDatabase` → `if (stage === 'prod') new
   DsqlCluster(...)` → `lookupDsqlCluster(...)` for everything else).
   Until the app's prod stack has deployed once, no SSM param exists
   for any other stage to find.
3. **Why** is the cluster only in the prod stack?
   We deliberately moved DSQL clusters from "one shared cluster
   account-wide" to "one cluster per app, owned by the app's prod
   stack". This isolates blast radius (a runaway preview can't
   affect prod traffic on another app) and makes per-app DPU
   accounting clean.
4. **Why** does the consequence — "first deploy must be prod" —
   surface as a confusing synth error?
   Because the failure is in a CDK lookup buried in
   `lookupDsqlCluster`, which doesn't carry context about why the
   parameter is missing. To a fresh contributor it looks like a
   broken construct, not an ordering constraint.

**Root cause:** the per-app DSQL cluster is a chicken-and-egg
resource — preview/integ stacks depend on it via SSM, but it's only
created by the prod stack of the same app.

## Fix

- **Code:** commit `785cc80` (the per-app refactor itself) +
  documentation — `docs/adding-an-app.md` and
  `docs/adding-a-fullstack-app.md` both call out the constraint
  with a "First-deploy ordering" note.
- **Operator action when introducing a DB-using app:** open the PR
  with the new app as usual, but **don't expect the preview to come
  up green on the first push**. Either:
  - merge to `main` first, approve the prod-environment gate, let
    `deploy.yml` provision the prod stack (which creates the
    cluster + SSM); subsequent PR pushes synth fine; OR
  - deploy prod manually from a local checkout of the new code
    (one-shot `pnpm --filter @borso-app/<slug> run deploy` with
    `STAGE=prod`).
- **Frontend-only apps** (no `database`): not affected. The
  constraint only applies when `PreviewableApp` is given a
  `database` prop.
