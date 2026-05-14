# ADR 0004 — Migrate from custom AWS CDK to a managed PaaS

**Status:** proposed
**Date:** 2026-05-14

## Context

The operator perceives the repo's infra as an *usine à gaz*. Cost Explorer (Dec 2025 → May 2026) shows actual AWS spend is **~$6.13/mo** ($5 WAF fixed fee, $1 tax, $0.50 Route 53, $0.12 S3; CloudFront/Lambda/DSQL/ACM all in free tier). So money is *not* the forcing function — mental load is.

Criteria, **set by the operator before options were weighed**:

1. **Charge mentale minimale** — fewer constructs / fewer custom stacks to hold in head.
2. **Preview auto natif** — `PR → URL` with zero custom wiring.
3. **Compatible workflow IA** — the infra layer must stay readable and repairable by the repo's LLM skills.
4. **Effort budget: one weekend (~1–2 days).** Full rewrite of three apps + DSQL→Postgres + DNS cutover is ~1 week and falls outside the budget.

Explicitly **not** criteria: monthly cost (already negligible), vendor lock-in (acceptable), commercial-use restriction (no commercial usage planned). The mini-PaaS (`StaticSite`, `LambdaApi`, `DsqlCluster`, `DsqlSchema`, `PreviewableApp`) is *neutral* — keep or drop, decide on the criteria above.

Inventory: `apps/borso-fr` and `apps/borsouvertures` are pure Vite static sites (`vite build` → `dist/`), trivially portable. `apps/last-loop-lepin` is the only stack that actually exercises the full mini-PaaS (Hono on Lambda + DSQL + S3 photos + JWT).

## Decision

**Hybrid migration in one weekend: move the two static apps to Vercel Hobby; keep `last-loop-lepin` on AWS as-is.**

The two static sites are where the mini-PaaS ceremony is *over-engineered for the use case* — a CDK stack, a CloudFront distribution, an ACM cert, a Route 53 record, and a preview subdomain for what is `vite build && rsync`. Vercel collapses that to a `vercel.json` + a GitHub connection, with native per-PR preview URLs. `last-loop-lepin` is the one stack where the mini-PaaS earns its weight (multi-region DSQL, Hono Lambda, custom JWT, S3 photos with presigned URLs) — moving it costs a week and gains little on the criteria above.

- borso-fr, borsouvertures → Vercel Hobby projects, free, native PR previews.
- last-loop-lepin → unchanged, stays on CDK + DSQL + Lambda.
- Route 53 stays authoritative; A/AAAA records repointed for the two static apps.
- WAF stays (only `last-loop-lepin` keeps a CloudFront distribution).

## Consequences

**Easier:** two CDK stacks deleted (`borso-fr-prod`, `borsouvertures-prod`) + their preview siblings; the `*.preview.borso.fr` CloudFront distribution can probably be retired (last-loop-lepin keeps its own); `PreviewableApp` and `StaticSite` constructs drop from 3 to 1 consumer — candidate for deletion if `last-loop-lepin` inlines them. PR previews on the static apps become a Vercel URL in the PR comment, no `cdk deploy` step in CI. Repo's mental footprint shrinks on the two apps the operator touches most.

**Harder:** the repo now has *two* deployment models (Vercel for static, CDK for full-stack). The `meta` skills (`/specification`, `/technical-conception`, `/implementation`, `/visual-validation`) need a small per-app dispatch — already partly the case (`docs slug` ≠ workspace). Domain DNS is split-brain: Route 53 holds the zone, Vercel owns the apex `A` record's destination.

**Load-bearing:** the path filters in `.github/path-filters.yml` and the prod deploy workflow must drop the two static apps before tear-down; DNS cutover is reversible (TTL 60s) so it can be rolled back in minutes; the WAF deletion is **not** included here — that's a separate change, gated on confirming no rule is filtering real traffic. A future ADR can promote `last-loop-lepin` to a managed PaaS too, but only if the criteria shift (e.g. DSQL gets retired upstream).
