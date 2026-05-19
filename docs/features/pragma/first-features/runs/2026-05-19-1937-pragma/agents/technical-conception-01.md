---
status: done
summary: |
  Wrote the engineering plan for the pragma first-features at
  docs/features/pragma/first-features/plan/plan.md. Section 1 maps every
  Q.O.D. row, every domain-model entity, every "Files to change" entry,
  every "Out of scope" item, and the four cross-cutting concerns (i18n
  parity test, PWA SW versioning, design-tokens.css single source,
  ADR-0004 backlink) to a code location with a self-check. Section 2
  records 13 risks, each with a detection path (incl. mastery
  sparse-override leak, PWA stale chart, i18n drift, DSQL pool
  exhaustion, offline-write UI bug, 100% coverage slip, oversized
  upload, JSONB schema drift, per-app CDK coverage gate, password leak,
  corrupted transition input, parser misread, design-bundle vendor
  surface). Section 3 reproduces the canonical code-quality checklist
  verbatim. Section 4 lists 11 pre-flight gates (9 automated + 2
  human). Section 5 surfaces 8 open questions (chiefly bar-staleness
  N=60 confirm, initial mastery_default rows, S3 bucket scoping per
  stage vs per resource, PWA icon set, member lifecycle on delete) and
  6 missing technical skills (/vite, /database, /controller, /cdk,
  /pwa-service-worker, /react-i18next). Did not mutate the spec. Plan
  is ready for /technical-validation.
artifacts:
  - docs/features/pragma/first-features/plan/plan.md
next:
  kind: validate
---

## Counts

- Q.O.D. + domain + files-to-change + cross-cutting rows mapped in Section 1: ~54 rows (18 Q.O.D. + 9 domain entities + 22 file/cross-cutting + 8 out-of-scope).
- Risks recorded in Section 2: 13, each with a detection path.
- Open questions in Section 5: 8.
- Missing technical skills flagged: 6.

## Pattern Coherence pass

This is a fresh workspace, no carried-over deps to question. Three observations:

1. **`design-bundle/` is a vendor surface that must NOT be imported by production code.** The spec mandates "re-create them in production code"; the plan codifies this as a knip-excluded archive path and a `grep -rn design-bundle apps/pragma/` self-check. If a future commit silently imports `design-bundle/data.js` to bootstrap fixtures, the Pattern Coherence rule is violated. Flagged as Risk row 13 ("low" — `grep` is the detection).
2. **`react-i18next` is a new vendor surface to the repo.** No other app currently ships i18n (borso-fr and borsouvertures are FR-only static; last-loop-lepin is FR-only). Pragma introduces the pattern; the cost is justified by the *Code language* + *User-facing language* Q.O.D. rows (English code + FR/EN UI for portfolio reviewers). If a future app needs i18n, this is the precedent.
3. **PWA service-worker pattern is also new to the repo.** Hand-written rather than via Workbox to keep the dep tree small and the cache-key logic auditable. Flagged in *Missing technical skills* (`/pwa-service-worker`) so the next app needing offline picks up a documented pattern instead of re-deriving it.

## What is shaky

- **DSQL connection pool sizing under Lambda burst:** the plan asserts "max=1 per Lambda container" as the mitigation, but the real-world burst behaviour is unverified. Risk row marks this `high` with the CloudWatch alarm threshold as detection. The implementation will need a back-e2e burst test (20 concurrent reads), and the first production deploy will need a watching eye on the DSQL connection-error metric.
- **Coverage gate scope for `apps/pragma/cdk/`:** the existing pre-commit hook covers `infra/cdk/**` and `infra/shared/**`, not app-owned CDK stacks. Mirrors last-loop-lepin's pattern (CDK tests in the workspace's vitest config). Flagged as a medium risk; the per-app vitest workspace include catches the gap, but the pre-commit hook does not. A KAIZEN follow-up could extend the hook to `apps/*/cdk/**`.
- **Bar staleness threshold N:** spec says "default 60"; the plan defaults to that constant but flags it as open. If Hugo wants a different N, the plan needs a one-line update before implementation.
- **Member lifecycle on delete:** spec doesn't say. Plan defaults to FK CASCADE on mastery rows. If Hugo wants soft-delete (preserve historical mastery data), this needs to come back as an open-question answer before implementation.
- **PWA icon set:** design bundle ships no icons. Plan defaults to a generated placeholder; production will need real icons before any user-facing install prompt is enabled.
