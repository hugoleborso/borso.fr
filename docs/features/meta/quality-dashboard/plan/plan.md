# Plan: the 3S quality dashboard

Spec: [`spec.md`](../spec/spec.md). ADRs: [0033](../../../../adr/0033-quality-dashboard-reads-cloudwatch-through-its-own-role.md), [0034](../../../../adr/0034-quality-dashboard-reads-sentry-with-a-read-only-token.md), [0035](../../../../adr/0035-quality-dashboard-reads-pragma-bug-reports-with-a-read-only-database-role.md).

## Where each decision lands

| Spec decision | Lands in |
| --- | --- |
| Stage A to E from `detected-at` | `selectStage` in `scripts/quality/weak-points.core.ts`; dots carry `stage` and `link` |
| Dots coloured by stage, engaged weak point ringed | `renderDot` and `renderVaricelle` in `scripts/quality/weak-points-page.core.ts`; colours in `quality-page.core.ts` |
| Weekly windows, API mapping, metric queries, aggregation, targets | `scripts/quality/quality-dashboard.core.ts` |
| 3S band, trend bars, banner, defect map | `scripts/quality/quality-dashboard-page.core.ts` |
| Every outbound call, each failing on its own | `scripts/quality/quality-sources.adapter.ts`, one `attempt` per source |
| Page written, all-sources-failed exits 1 | `scripts/quality/quality-dashboard.ts` |
| Daily schedule, role, secrets, publish | `.github/workflows/pages.yml` |
| `QualityReadRole` | `infra/shared/lib/quality-read-role.ts`, wired in `shared-stack.ts`; `deploy-roles.ts` lets `SharedInfraDeployRole` manage it |
| `kind` on Improvement, the one-off grant | `apps/pragma/api/src/improvements/`, a new migration, the form and list, `apps/pragma/scripts/grant-quality-reader.sql` |
| Targets | `docs/quality/targets.md`, empty |

## Risks

| Risk | Detection | Mitigation |
| --- | --- | --- |
| `GITHUB_TOKEN` cannot read Dependabot or secret scanning alerts | Banner on the first scheduled run | Swap in a token with those scopes |
| The Sentry Discover endpoint answers another shape | `readSentryCounts` throws, banner shows Sentry | Adjust the schema; no other source is affected |
| DSQL refuses the non-admin role | psql exits non-zero, banner shows pragma bug reports | Re-run `grant-quality-reader.sql`; the rest of the page publishes |
| The role does not exist before `shared-deploy` | The assume step fails with `continue-on-error` | Dispatch `shared-deploy` |

## Gates before push

- `vitest run scripts/quality --coverage`: 100% on every `scripts/quality/*.core.ts`.
- Stryker scoped to the changed `*.core.ts` files.
- `eslint`, `tsc --noEmit`, `knip`, `actionlint`.
- `infra/shared` coverage and template snapshot.
- pragma typecheck, lint and tests.
- The generator run once from a session with read access, and the page opened at 375 px and 1280 px.
