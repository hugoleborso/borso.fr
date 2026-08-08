# DSQL prices per DPU, not per cluster (unlike Aurora provisioned)

## The mental model that nearly cost us a refactor

While walking the choice "one cluster per app vs one per stage", I
argued out loud that the second option was prohibitive on cost — "5
clusters × $50/month each = $250/month just to run previews". Hugo
called it out: that's Aurora-provisioned thinking. DSQL doesn't bill
that way.

## What DSQL actually charges

Two meters:

- **DPU (Distributed Processing Unit)** consumed while queries are
  *executing*. Pay per actual compute time, not for the cluster
  sitting idle.
- **Storage per GB-month** of data at rest.

An idle DSQL cluster — no connections, no queries — bills near-zero on
the compute meter. The control plane that hosts the cluster is included
in the per-DPU rate; there is no provisioned-hours fee.

## Implications for our architecture

The shared-cluster-per-app pattern (one cluster, one schema per stage)
is still the right choice for `last-loop-lepin`, but **the reason is
not cost** as I initially wrote it. The actual reasons:

1. **Provisioning latency.** Creating a DSQL cluster takes several
   minutes (control-plane initialisation). Multiplying that by every
   PR push would make preview deploys visibly slower.
2. **Regional quotas.** AWS imposes a modest soft limit on DSQL
   clusters per account/region (10–20 by default). Per-PR clusters
   would chew through that envelope for no operational benefit.
3. **Cross-stack reference simplicity.** `IDsqlCluster` passes
   directly between CDK stacks via CFN intrinsics, so `cdk deploy
   --all` orders the cluster stack before the app stack. Per-stage
   clusters would re-introduce the
   [`dsql-first-deploy-must-be-prod`](../dantotsus/dsql-first-deploy-must-be-prod.md)
   class of bug.
4. **Migration management.** One cluster → one set of `_migrations`
   tables to reconcile per schema. N clusters → N endpoints, N
   token-issuance flows, N migration round-trips at every deploy.

Cost is **not** in this list, and arguments invoking idle-cluster
fees are wrong on DSQL.

## When to revisit

If we ever need:

- Strict physical isolation (compliance, multi-tenant security
  boundary),
- An isolated cluster for chaos testing without risking prod data,

then a per-stage cluster becomes viable — and DSQL's pricing model
means the extra clusters don't change the bill materially. The
trade-off shifts back to "is the deploy-latency cost worth the
isolation gain?".

## See also

- [`dsql-postgres-compat-gaps.md`](./dsql-postgres-compat-gaps.md) —
  what makes per-schema isolation work (search_path).
- AWS DSQL pricing page (current as of December 2024 GA): per-DPU
  compute, per-GB-month storage, no provisioned-hours fee.
