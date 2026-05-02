# Flows

## Preview deploy flow

Triggered by every PR touching `apps/<slug>/**` or `infra/cdk/**` (the latter redeploys *every* app's preview, since constructs are the contract).

```
PR opened                                                               PR closed
   │                                                                       │
   ▼                                                                       ▼
.github/workflows/preview.yml                              .github/workflows/preview.yml
   │                                                                       │
   1. paths-filter detects changed apps                    1. iterate every app
   2. matrix per app                                       2. cdk destroy <app>-pr-<n>
   3. assume PreviewDeployRole via OIDC                    3. shared previews bucket
   4. cdk deploy <app>-pr-<n> ───────────┐                    has 60-day lifecycle
   5. sticky comment with preview URLs   │                    as a safety net
                                         ▼
                          https://<app>-pr-<n>.preview.borso.fr
                          (host-routed to s3://shared-previews/<app>/pr-<n>)
```

**Trust pattern.** `PreviewDeployRole` trusts `repo:hugoleborso/borso.fr:pull_request` — no environment, no manual approval. Permissions are PowerUserAccess + IAM scoped to `*-pr-*` and `cdk-*` role ARNs + DSQL cluster lifecycle (resource `*` because cluster IDs aren't predictable). Preview stacks themselves only do an SSM lookup of the prod-owned per-app cluster, so an app must have been deployed to prod at least once before its previews can use a database.

**Concurrency.** `concurrency.group: preview-${PR_NUMBER}`, `cancel-in-progress: false`. Never cancel a preview job mid-deploy; cancellation orphans CFN state.

## Production deploy flow

Triggered by every push to `main` touching `apps/<slug>/**` or `infra/cdk/**`.

```
push to main                                       merge fails / rolled back
   │                                                          │
   ▼                                                          ▼
.github/workflows/deploy.yml                                  manual rollback
   │                                                          (revert + push)
   1. paths-filter detects changed apps
   2. matrix per app, max-parallel: 1
   3. **wait for prod environment approval (Hugo)**
   4. assume ProdDeployRole via OIDC
   5. cdk deploy <app>-prod
```

**Trust pattern.** `ProdDeployRole` trusts `repo:hugoleborso/borso.fr:environment:prod`. The GitHub `prod` environment requires Hugo as a reviewer — workflow blocks until manual approval.

**Permissions.** PowerUserAccess + IAM scoped to `*-prod-*` and `cdk-*` + DSQL cluster lifecycle (Create/Delete/Update/Tag/DbConnect/DbConnectAdmin on `*`). No AdministratorAccess; the approval gate is the security layer for power, not the role.

## Shared-infra deploy flow

The shared stack rarely changes. Two paths:

### Path A — Local (first deploy + most subsequent edits)

```
hugo's laptop
   │
   1. aws sso login --profile borso-admin
   2. export CDK_DEFAULT_ACCOUNT BORSO_BUDGET_EMAIL
   3. pnpm --filter @borso/shared-infra deploy
                  └─> CDK uses borso-admin SSO creds
                      to deploy CertsStack (us-east-1) +
                      SharedStack (eu-west-3)
```

This is the bootstrap path used in `aws-setup.md`. Hugo runs it once on a fresh AWS account; he re-runs it whenever the shared stack code changes.

### Path B — CI (when shared changes ride a PR)

Out of scope for Phase 4 — the plan reserves the `prod-shared` GitHub environment for a future workflow that deploys `infra/shared/` via `SharedInfraDeployRole`. Until then, Path A.

## Budget alarm flow

Three CFN-defined budgets, all at 80% of their monthly threshold:

| Budget | Triggers email at | What it usually means |
| --- | --- | --- |
| €5 / month | €4 spent | Higher than usual idle. Open Cost Explorer, group by service. |
| €20 / month | €16 spent | Something is genuinely costing money. Check S3 bytes, CloudFront requests, DSQL DPUs. |
| €50 / month | €40 spent | An app deploy went wrong (e.g. forgot reserved concurrency). Investigate immediately. |

**Subscriber.** Just `BORSO_BUDGET_EMAIL`. No SNS fan-out — one mailbox, easy to act on.

**Why three tiers.** The first email gives you days of warning before the bill becomes painful; the third gives you minutes. Each is a separate AWS Budget so you don't lose the early-warning signal once spend crosses €40.

## Resource lifecycles

| Resource | Created when | Destroyed when | Notes |
| --- | --- | --- | --- |
| CertsStack (ACM wildcards) | First `pnpm shared:deploy` | Manually, never in normal ops | DNS-validated; safe to leave. |
| SharedStack | First `pnpm shared:deploy` | Manually, never in normal ops | OIDC, previews bucket+CDN, deploy roles. |
| Previews bucket | First `pnpm shared:deploy` | Never; `RemovalPolicy.RETAIN` | 60-day lifecycle rule on objects expires orphaned PR uploads. |
| `<app>-prod` stack | First merge to `main` after the app exists | Manually (`cdk destroy`) | The bucket inside has `RemovalPolicy.RETAIN` — its content survives stack delete. Owns the app's DSQL cluster. |
| DSQL cluster (per-app) | First prod deploy of the app | Never (deletion-protected at AWS level) | One per app. Shared by every stage of that app via SSM lookup. |
| `<app>-pr-<n>` stack | PR opened | PR closed | Re-created on each `synchronize` event if changed. Looks up the app's cluster via SSM. |
| DSQL schema (preview) | `<app>-pr-<n>` stack create | `<app>-pr-<n>` stack delete | `DROP SCHEMA … CASCADE` in the migration runner. |
| DSQL schema (prod) | First prod deploy | Manually | Migrations are forward-only. |
| Lambda CloudWatch logs | First Lambda invocation | After 7 days (configured retention) | Per-app and per-stage. |

## Safety nets

- **Preview teardown** runs on PR close, but if it fails silently, the **previews bucket lifecycle rule** still expires uploaded objects after 60 days.
- **`cleanup-orphans.yml`** runs on PR close (right after `preview.yml`'s teardown), nightly via cron, and on-demand. It lists every `<app>-pr-<n>` stack in a terminal state, queries GitHub for the matching PR, and destroys stacks whose PR is `CLOSED` or `MERGED`. The state check is the safety — there's no age threshold, so a teardown failure is caught the same minute the PR closes.
- **DSQL deletion protection** on the cluster prevents accidental deletes via console/CLI.
- **`RemovalPolicy.RETAIN`** on the previews bucket and prod app buckets — `cdk destroy` won't take the data with it.
