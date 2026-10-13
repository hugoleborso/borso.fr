# ADR-0033: The quality dashboard reads CloudWatch through a role of its own

- **Status:** proposed
- **Date:** 2026-10-13
- **Deciders:** Hugo Borsoni
- **Tags:** quality-dashboard, cdk, observability

## Context

The quality dashboard ([spec](../features/meta/quality-dashboard/spec/spec.md)) shows API latency and 5xx counts for every full-stack application, in previews and in production. Those numbers live in CloudWatch, and the dashboard is built by `pages.yml`, which today holds no AWS role at all. The only roles GitHub Actions can assume are the three deploy roles in `infra/shared/lib/deploy-roles.ts`, each able to create and delete resources. `pages.yml` runs in the `github-pages` environment, so the OIDC subject it presents is `repo:hugoleborso/borso.fr:environment:github-pages`, not a branch ref ([knowledge](../knowledge/github-oidc-sub-claim-per-trigger.md)).

## Decision

**A new `QualityReadRole` in `infra/shared`.** It trusts only the `github-pages` environment subject of this repository and may call `cloudwatch:GetMetricData` and `cloudwatch:ListMetrics`, nothing else. A reporting job never holds a credential that can change the account.

## Consequences

- `+` The job that publishes a public page cannot deploy, delete or read data.
- `+` The trust is pinned to one environment, which only `main` can deploy to.
- `-` The operator must dispatch `shared-deploy` once before the first run; until then the Stability and Speed cells read "unavailable".
- `-` One more role to keep in the `borso-shared` template snapshot.
- `~` `cloudwatch:GetMetricData` does not support resource-level permissions, so the policy resource is `*`; it can read every metric in the account, which holds nothing secret.

## Alternatives considered

### Option A — dedicated read-only role (chosen)

- **Summary:** as above.
- **Strengths:** least privilege; trust limited to one environment.
- **Costs:** one construct, one snapshot change, one manual dispatch.
- **Rationale:** wins on the security criterion, which is weighted highest for a job that publishes publicly.

### Option B — reuse `PreviewDeployRole` (rejected)

- **Summary:** add the `github-pages` subject to the preview role's trust.
- **Strengths:** no new resource.
- **Costs:** the publishing job could create and destroy preview stacks.
- **Rejection rationale:** fails least privilege; no weighting flips it.

### Option C — measure locally and commit a snapshot (rejected)

- **Summary:** a session runs the collector and commits the JSON.
- **Strengths:** no infrastructure.
- **Costs:** the numbers move only when someone runs it.
- **Rejection rationale:** fails the "no manual reading" criterion of the Notion ADR 0018, which is what kills a ritual in three weeks.

## Evaluation rubric

| Criterion | Weight | Why it matters |
|---|---|---|
| Least privilege | high | The job publishes to a public page |
| No manual reading | high | A manual count dies within weeks |
| Infrastructure added | low | One-person lab |

|             | Option A | Option B | Option C |
|---|---|---|---|
| Least privilege | ✓ read metrics only | ✗ can deploy | ✓ no CI credential |
| No manual reading | ✓ daily | ✓ daily | ✗ by hand |
| Infrastructure added | ✗ one role | ✓ none | ✓ none |

## Implementation pointers

- Spec: `docs/features/meta/quality-dashboard/spec/spec.md`
- Plan: `docs/features/meta/quality-dashboard/plan/plan.md`
- Commit: stamped on merge
- Files: `infra/shared/lib/quality-read-role.ts`, `.github/workflows/pages.yml`
- Related ADRs: ADR-0014, ADR-0029, ADR-0034, ADR-0035
