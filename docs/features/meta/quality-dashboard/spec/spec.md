# The operator reads the quality of every borso.fr app on one page

## Perspectives confronted

- [x] **Client / business** — the operator wants the Theodo 3S ritual (Security, Stability, Speed) applied to borso.fr, plus the weak point map, as one page to read weekly.
- [x] **Product** — criteria chosen one by one: Dependabot, `pnpm audit` and secret scanning; errors in previews and in production; API p50 and p95; the varicelle map coloured by stage A to E.
- [x] **Tech-lead** — data access settled: a new read-only OIDC role for CloudWatch, a new Sentry read token, and the CI job reads pragma's production `improvement` table.
- [x] **Developer** — every data source probed from this session on 2026-10-13 (below); the stage mapping derived from the existing `detected-at` field.
- [x] **Designer** — one 3S band of three columns, then the varicelle map at full width, stacked at 375 px.

## Why

The operator runs the Theodo 3S ritual on client projects and has nothing equivalent for borso.fr. Quality signals exist but are scattered: CloudWatch holds latency and errors, Sentry holds front-end errors for two apps, GitHub holds security alerts, and `docs/quality/weak-points.html` holds the defect map. Nobody reads four places every week, so nothing is compared week to week.

- **Output metric:** fewer defects reaching stages D and E (production, found by the operator or reported by a user), measured as the weekly D + E count on the varicelle map.
- **Input metrics:** the page regenerates every day without a person; every indicator below shows a value and an eight-week trend for every app it applies to.
- **Gemba:** 185 dantotsus, 19 found in production; pragma production served 765 API calls over the week of 2026-10-06 with p50 90 ms and p95 1 391 ms, a gap no one had looked at.

## Result

A page `docs/quality/dashboard.html`, published by `pages.yml` beside `weak-points.html`.

```
┌ Security ──────────────┬ Stability ─────────────────┬ Speed ─────────────────┐
│ Dependabot open        │ Errors, previews, 7 days   │ API p50, 7 days        │
│   critical/high/other  │   per app + 8-week trend   │   per app + trend      │
│ pnpm audit findings    │ Errors, production, 7 days │ API p95, 7 days        │
│ Secret scanning open   │   per app + 8-week trend   │   per app + trend      │
│                        │ User-reported bugs open    │                        │
└────────────────────────┴────────────────────────────┴────────────────────────┘
┌ Varicelle: product map and factory map, one dot per defect, coloured A→E ────┐
│ engaged weak points with their weekly count (from weak-points.md)             │
└───────────────────────────────────────────────────────────────────────────────┘
```

No thresholds in v1. Each value shows its number and trend only; the operator writes targets into `docs/quality/targets.md` after a week of data, and the page colours a value only once a target exists for it.

## Use cases / edge cases

```mermaid
sequenceDiagram
  participant GH as pages.yml (push to main, daily schedule)
  participant AWS as CloudWatch (QualityReadRole)
  participant S as Sentry API
  participant G as GitHub API
  participant DB as pragma prod DSQL
  participant R as quality-dashboard.ts
  GH->>R: run
  R->>AWS: API Gateway Latency p50/p95, 5xx; Lambda Errors per <app>-<stage>-api
  R->>S: unresolved issues per project and environment, 7 days
  R->>G: Dependabot alerts, secret scanning alerts
  R->>R: pnpm audit --json on the checked-out lockfile
  R->>DB: SELECT improvements WHERE kind = 'bug'
  R->>R: read dantotsus, map detected-at to stage
  R-->>GH: docs/quality/dashboard.html
```

1. A push to `main`, or the daily schedule, runs `pages.yml`.
2. The job assumes `QualityReadRole` and collects every indicator.
3. The page is rendered and published with the other reports.
4. The operator opens it and reads the 3S band, then the map.

Edge cases:

- Preview errors are the sum over every `<app>-preview-api` still deployed when the job runs. An API Gateway API's name carries no pull request number and CloudWatch keys its metrics by API id only, so the errors of a preview torn down during the week cannot be attributed to an application and are not counted.
- An application with no preview deployed shows "no preview deployed", not zero; talos never has one (ADR-0027).
- The page is public, so Security shows counts by severity and never a package or secret name.
- An app with no API (`borso-fr`, `borsouvertures`) shows Security only, and "no API" in Stability and Speed rather than zero.
- An app without Sentry shows CloudWatch errors only, and says that Sentry is not connected.
- A week with no traffic shows "no traffic", never a p95 of zero.
- Stage mapping: A = `typing`, `linter`, `local`, `ci`; B = `review`; C = `qa`, `staging`; D = `production`, `operator-deploy`; E = a pragma `improvement` with `kind = 'bug'`, placed on the `apps/pragma` cell.

Error cases:

- One source fails (expired token, throttling, DSQL unreachable): its cells read "unavailable since <time>", the rest of the page publishes, and the job summary names the failed source. The job does not fail for one source.
- Every source fails: the job fails, so the broken page is not published over the last good one.

## Questions, Options and Decisions

| Question | Options | Decision (2026-10-13) |
| --- | --- | --- |
| Where does the page live? | Pages + daily schedule; Pages on push only; live artifact | Pages + daily schedule. Consistent with ADR-0014 and the Notion ADR 0018. |
| Error source | CloudWatch + Sentry; CloudWatch only; Sentry only | Both. CloudWatch covers the four APIs; Sentry adds front-end errors on pragma and last-loop-lepin. |
| Which CloudWatch error metric? | Lambda `Errors`; API Gateway `5xx` | API Gateway `5xx`. Hono turns a thrown error into a 500 response, so Lambda `Errors` stays at zero (pragma prod: 0 over 765 calls). |
| Latency measure | mean; p50 + p95; mean + p95 | p50 + p95 over 7 days, from API Gateway `Latency`, which is what the caller waits. With two production APIs for one application, the slower one is shown. |
| Unverified from here | | Whether `GITHUB_TOKEN` with `security-events: read` may list Dependabot and secret scanning alerts. A refusal shows as "unavailable" in the banner, and the fix is a token with those scopes. |
| AWS access from CI | new read role; reuse `PreviewDeployRole`; local snapshot | New `QualityReadRole`. Its trust must match the `github-pages` environment subject, since `pages.yml` runs in that environment. |
| Sentry access | new read token; reuse upload token; no Sentry in v1 | New `SENTRY_READ_TOKEN`, scopes `event:read` and `project:read`. |
| Source of stage E | a dantotsu with `detected-at: user-report`; read the `improvement` table; both | Read the `improvement` table, with a new `kind` column (`bug` or `idea`). |
| Zone of an E dot | optional zone column; always `apps/pragma`; only via a dantotsu | Always `apps/pragma`. |
| Targets | baseline first; zero everywhere; dictated now | Baseline first, targets in a committed file. |

Out of scope: user reports outside pragma (WhatsApp messages count only once entered as an `improvement`), web vitals, end-to-end coverage, alerting.

## Architectural choices

| ADR | Decision | What it constrains downstream |
|---|---|---|
| [ADR-0033](../../../../adr/0033-quality-dashboard-reads-cloudwatch-through-its-own-role.md) | `QualityReadRole` in `infra/shared`, `cloudwatch:GetMetricData` and `ListMetrics` only, trusted for `pages.yml` in the `github-pages` environment | `shared-deploy` must be dispatched by the operator before the first run that reads CloudWatch |
| [ADR-0034](../../../../adr/0034-quality-dashboard-reads-sentry-with-a-read-only-token.md) | `SENTRY_READ_TOKEN` repository secret, read scopes only | The operator creates the token in Sentry (EU region) and adds the secret |
| [ADR-0035](../../../../adr/0035-quality-dashboard-reads-pragma-bug-reports-with-a-read-only-database-role.md) | The CI job connects to pragma's production DSQL as `quality_reader`, granted `SELECT` on `prod.improvement` only | `QualityReadRole` also gets `dsql:DbConnect` on the pragma cluster; the operator runs `grant-quality-reader.sql` once, because a role is cluster state and migrations run per schema |

## Changes

### Types / domain model

```ts
type Stage = 'A' | 'B' | 'C' | 'D' | 'E';
type Pillar = 'security' | 'stability' | 'speed';
interface Indicator { id: string; pillar: Pillar; app: string; weeks: WeeklyValue[]; source: SourceStatus }
interface WeeklyValue { isoWeek: string; value: number | null }
type SourceStatus = { kind: 'ok' } | { kind: 'unavailable'; since: string; reason: string } | { kind: 'not-applicable'; reason: string };
```

`Improvement` gains `kind`; `VOCABULARY.md` gains the word *bug report* and its difference from *idea*.

### Database changes

```sql
-- migration, every schema
ALTER TABLE improvement ADD COLUMN kind text NOT NULL DEFAULT 'idea';
-- apps/pragma/scripts/grant-quality-reader.sql, run once on the cluster by the operator
CREATE ROLE quality_reader WITH LOGIN;
AWS IAM GRANT quality_reader TO 'arn:aws:iam::<account>:role/QualityReadRole';
GRANT USAGE ON SCHEMA prod TO quality_reader;
GRANT SELECT ON prod.improvement TO quality_reader;
```

### Files to change

```
scripts/quality/quality-dashboard.ts               // NEW: entry point, collects then renders
scripts/quality/quality-dashboard.core.ts          // NEW: weekly windows, percentile selection, stage mapping
scripts/quality/quality-dashboard-page.core.ts     // NEW: HTML rendering, reuses quality-page.core.ts
scripts/quality/*.adapter.ts                       // NEW: cloudwatch, sentry, github, pnpm-audit, pragma-improvements
scripts/quality/weak-points-page.core.ts           // UPDATE: dot colour by stage, E dots
scripts/reports.sh                                 // UPDATE: build the dashboard in the standards group
.github/workflows/pages.yml                        // UPDATE: daily schedule, assume QualityReadRole, pass secrets
infra/shared/lib/quality-read-role.ts              // NEW, 100% coverage gated
apps/pragma/api/src/improvements/*                 // UPDATE: kind on schema, form, list
apps/pragma/api/src/database/migrations/00NN_*.sql // NEW
docs/quality/targets.md                            // NEW, empty table the operator fills
```

### Test strategy

- Unit tests at 100% coverage and no surviving mutant on every `quality-dashboard*.core.ts`: ISO week bucketing, the stage mapping table, the "no traffic" and "no API" cases, the one-source-failed and all-sources-failed outcomes.
- Adapters tested against recorded responses of each API, captured from this session.
- `infra/shared` snapshot and coverage suites updated for the new role.
- `/visual-validation` opens the generated page at 375 px and 1280 px and asserts: three pillar columns, one row per app, the "no API" and "unavailable" states, and dots in five colours on the map.
- `/technical-validation` on the diff.

## Production strategy

### Analytics

The page is its own analytics. The job summary of each run lists every source with its status and duration.

### Zero-defect strategy

Every run names each unavailable source in a banner at the top of the page and in the job log. The generated page keeps no state between runs, so it cannot count consecutive failures; the banner shows on every run a source fails. No other alerting in v1.
