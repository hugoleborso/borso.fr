# Architecture

## Topology

One AWS account. Two regions:

- **`eu-west-3` (Paris)** — primary. Everything runs here: Lambda, DSQL, S3, CloudFront, Route 53.
- **`us-east-1` (N. Virginia)** — only for ACM wildcard certificates that CloudFront requires in this region.

```
┌────────────── hugoleborso/borso.fr (private monorepo) ────────────┐
│  apps/<slug>/      one folder per app, standalone-openable        │
│  infra/cdk/        @borso/infra — the four CDK constructs         │
│  infra/shared/     @borso/shared-infra — account-level singletons │
└───────────────────────────────────────────────────────────────────┘
                                │ OIDC
                                ▼
┌────────────────── AWS account (eu-west-3 + us-east-1) ────────────┐
│  Shared singletons (infra/shared)                                 │
│    - GitHub OIDC provider                                         │
│    - Previews S3 + CloudFront + host-routing Function             │
│    - ACM wildcards (us-east-1)                                    │
│    - 3 deploy roles (prod / preview / shared)                     │
│    - Cost budgets ($5/$20/$50)                                    │
│                                                                   │
│  Per-app stacks (one CFN stack per (app, stage))                  │
│    - <app>-prod         dedicated bucket + CDN + R53 alias        │
│                         + DSQL cluster (owned here, per-app)      │
│    - <app>-pr-<n>       writes to shared previews bucket          │
│                         + DSQL schema in the prod cluster (SSM)   │
└───────────────────────────────────────────────────────────────────┘
```

## Constructs (`@borso/infra`)

| Construct | What it makes | Used by |
| --- | --- | --- |
| `StaticSite` | Prod: dedicated S3 bucket + CloudFront + Route 53 alias. Preview/integ: uploads to the shared previews bucket at a key prefix; URL is host-routed to the prefix. | Apex-style apps. |
| `LambdaApi` | One Lambda + one HTTP API. CORS preflight, error alarm, single-handler routing. | API-style apps. |
| `DsqlCluster` | Aurora DSQL cluster, deletion-protected by default. Publishes ARN + endpoint to `/borso/<app>/dsql-cluster-{arn,endpoint}` so other stages can find it. | One per app, owned by the prod stack. |
| `DsqlSchema` | Postgres schema in the app's DSQL cluster (resolved via SSM in preview/integ). Forward-only migrations, advisory-locked, DROP CASCADE on stack delete. | Apps with persistence. |
| `PreviewableApp` | Composes the four above. | Full-stack apps. |

## Stages

`Stage = 'dev' | 'preview' | 'integ' | 'prod'`. The `'dev'` marker is for app code only (chooses local-Postgres connection paths); the constructs and naming helpers reject it via `assertDeployStage`.

Each app gets its own DSQL cluster (created by the prod stack). All stages of an app share that cluster, isolated as separate Postgres schemas:

| Stage | Where | Stack name | DSQL schema (within the app's cluster) |
| --- | --- | --- | --- |
| `dev` | local | n/a — never deployed | local Postgres in Docker (when an app needs it) |
| `preview` | AWS, per PR | `<app>-pr-<n>` | `pr_<n>` |
| `integ` | reserved (not used in this monorepo) | `bp-integ-pr-<n>-<app>` | `integ_<n>` |
| `prod` | AWS | `<app>-prod` | `prod` |

## Cost targets

Idle bill: **€0.50–€2 / month**, dominated by the Route 53 hosted zone (€0.50 fixed). Driven by:

- **Lambda + DSQL + S3 + CloudFront all scale to zero.** No idle compute.
- **No NAT, no VPC, no Fargate, no ALB, no ECS, no EC2, no RDS.**
- **CloudFront PriceClass 100** (NA + EU only).
- **Lambda capped** at `reservedConcurrentExecutions: 10`, ARM64, 512 MB, 7-day log retention.
- **Previews bucket** has a 60-day expiration lifecycle rule as a safety net for orphaned PR uploads.

Cost alarms fire at $5 / $20 / $50 monthly thresholds (80% of each); USD because AWS Budgets only accepts USD as the budget unit. Configured as mandatory in the shared stack — synth fails if `BORSO_BUDGET_EMAIL` isn't set.

## Where this differs from a typical AWS setup

- **No multi-account.** One account; environments are gated by GitHub Environment reviewers, not separate AWS accounts.
- **DSQL not RDS.** Aurora DSQL is Postgres-wire-compatible, scales to zero, has a usable free tier. Trade-off: no FKs, optimistic concurrency, retryable transactions.
- **Single-Lambda-per-API.** Each `LambdaApi` is one Lambda doing its own routing (Hono-style). Simpler ops than fan-out HTTP API → many Lambdas.
- **Preview frontends share one bucket+CDN.** Per-PR CloudFront distributions would be expensive; instead the shared `*.preview.borso.fr` distribution host-routes by Host header to S3 prefixes via a CloudFront Function.

## Standalone-openability invariant

Each `apps/<slug>/` folder is self-contained: `cd apps/<x> && pnpm dev` works on a fresh checkout, the IDE resolves imports, tests run from inside the folder. **No cross-app imports.** Sibling apps don't appear in IntelliSense.

Exceptions live at the repo root by design: `pnpm-workspace.yaml`, `package.json`, `biome.jsonc`, `commitlint.config.js`, husky hooks. Each is the single source of truth for its concern.
