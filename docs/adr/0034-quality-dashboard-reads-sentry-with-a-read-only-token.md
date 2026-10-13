# ADR-0034: The quality dashboard reads Sentry with a read-only token

- **Status:** proposed
- **Date:** 2026-10-13
- **Deciders:** Hugo Borsoni
- **Tags:** quality-dashboard, observability, secrets

## Context

pragma and last-loop-lepin report errors to Sentry, EU region ([ADR-0031](./0031-pragma-reports-errors-and-traces-to-sentry-eu.md)). The quality dashboard counts those errors per environment. The only Sentry secret in the repository, `SENTRY_AUTH_TOKEN`, uploads source maps from the deploy workflows; whether it may read events is invisible from the repository.

## Decision

**A new repository secret `SENTRY_READ_TOKEN`, scopes `event:read` and `project:read` only,** passed to `pages.yml` alone. Reading and release upload stay on separate credentials.

## Consequences

- `+` A leak of the dashboard's token cannot publish a release or a source map.
- `+` Rotating one token does not break the other workflow.
- `-` The operator creates the token in Sentry and adds the secret; until then the Sentry cells read "unavailable".
- `-` One more secret to rotate.
- `~` The collector calls the EU host `de.sentry.io`, the same region ADR-0031 chose.

## Alternatives considered

### Option A — dedicated read token (chosen)

- **Summary:** as above.
- **Strengths:** least privilege, independent rotation.
- **Costs:** one secret, one manual step.
- **Rationale:** the publishing job holds only what it reads.

### Option B — reuse `SENTRY_AUTH_TOKEN` (rejected)

- **Summary:** pass the upload token to `pages.yml`.
- **Strengths:** nothing to create.
- **Costs:** its scopes are unverified from here; it mixes write and read.
- **Rejection rationale:** a claim the repository cannot check, and wider access than needed.

### Option C — no Sentry in v1 (rejected)

- **Summary:** CloudWatch only.
- **Strengths:** no secret.
- **Costs:** front-end errors stay invisible.
- **Rejection rationale:** the operator asked for both sources.

## Evaluation rubric

| Criterion | Weight | Why it matters |
|---|---|---|
| Least privilege | high | Public publishing job |
| Front-end errors visible | high | Asked for in the spec |
| Manual setup | low | One-time |

|             | Option A | Option B | Option C |
|---|---|---|---|
| Least privilege | ✓ read scopes | ✗ upload scopes | ✓ none |
| Front-end errors visible | ✓ | ✓ if scoped | ✗ |
| Manual setup | ✗ one secret | ✓ none | ✓ none |

## Implementation pointers

- Spec: `docs/features/meta/quality-dashboard/spec/spec.md`
- Plan: `docs/features/meta/quality-dashboard/plan/plan.md`
- Commit: stamped on merge
- Files: `scripts/quality/sentry.adapter.ts`, `.github/workflows/pages.yml`
- Related ADRs: ADR-0031, ADR-0033
