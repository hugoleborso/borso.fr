---
date: 2026-05-02
introduced-at: conception
detected-at: ci
severity: medium
related-pr: https://github.com/hugoleborso/borso.fr/pull/2
fix-pr: https://github.com/hugoleborso/borso.fr/pull/4
fix-commits: [785cc80, 9adfe24]
eradication-rung: 4
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

- **Code:** commit `785cc80` (the per-app refactor itself) —
  acceptance is that the constraint is unavoidable given the
  architecture. The fix is documentation, not code.
- **Operator action when introducing a DB-using app:**
  - Open the PR with the new app as usual.
  - **Don't expect the preview to come up green on the first push.**
  - Either merge to `main` first and approve the prod-environment
    gate (which provisions the cluster + SSM); subsequent PR pushes
    synth fine. OR deploy prod manually from a local checkout once
    (`STAGE=prod pnpm --filter @borso-app/<slug> run deploy`).
  - Frontend-only apps (no `database`) aren't affected.

## Eradication (rung 4 — synth-time annotation)

- **Rung:** 4 (detection). `lookupDsqlCluster` now emits a CDK
  `Annotations.of(scope).addInfo(...)` at synth time, surfacing
  the "first deploy must be prod" constraint with a
  copy-pasteable fix command. Visible in `cdk synth` and `cdk
  diff` output before the operator even attempts a deploy. The
  underlying CFN error (still opaque) becomes the second line
  of defence rather than the first.
- **Why not rung 1 (structural):** the chicken-and-egg is
  intentional in the architecture — DSQL clusters are
  per-app and owned by prod stacks deliberately, to isolate
  blast radius. Eliminating the dependency would either
  (a) move the cluster out of prod (worse blast-radius story)
  or (b) bake the cluster into the CDK app code with conditional
  creation (large refactor of `PreviewableApp`). Rung 4 is the
  pragmatic ceiling without disturbing the architectural call.
- **Why not rung 2 (synth-time hard error):** would require
  shelling out to AWS CLI (`aws ssm get-parameter`) at synth
  time, coupling synth to the operator's environment AND making
  unit tests need to mock `execSync`. The annotation gives
  visible signal at the same surface (synth output) without
  that cost.
- **What changed:** `infra/cdk/src/constructs/dsql-cluster.ts`
  imports `Annotations` and emits an INFO-level annotation
  inside `lookupDsqlCluster`. The handover docs
  (`docs/adding-an-app.md`, `docs/adding-a-fullstack-app.md`)
  call out the ordering constraint.
- **PR:** [#2](https://github.com/hugoleborso/borso.fr/pull/2)
  (per-app refactor) +
  [#4](https://github.com/hugoleborso/borso.fr/pull/4) (synth
  annotation).
- **Commits:**
  [`785cc80`](https://github.com/hugoleborso/borso.fr/commit/785cc80)
  (per-app refactor that creates the constraint),
  [`9adfe24`](https://github.com/hugoleborso/borso.fr/commit/9adfe24)
  (synth-time annotation).
- **Diff snippet (essence of the fix):**
  ```diff
  + Annotations.of(scope).addInfo([
  +   `lookupDsqlCluster reads ${paths.arn} (and .endpoint) from SSM at deploy time.`,
  +   "These params are published by the prod stack's DsqlCluster construct.",
  +   `For a brand-new app, deploy prod FIRST: STAGE=prod pnpm --filter @borso-app/${app} run deploy.`,
  +   'See docs/dantotsus/dsql-first-deploy-must-be-prod.md for the full chain.',
  + ].join(' '));
  ```
- **Sibling defects swept:** there are no other
  "lookup-from-SSM-published-elsewhere" patterns in the repo
  today. If one is added, it should follow the same annotation
  convention.
