# ADR 0004 — Migrate from custom AWS CDK to Vercel + Neon

**Status:** proposed
**Date:** 2026-05-14

## Context

Operator's perception: the AWS CDK setup is an *usine à gaz*. Cost Explorer (Dec 2025 → May 2026) confirms money is **not** the forcing function — actual spend is ~$6.13/mo ($5 WAF + $1 tax + $0.50 Route 53 + $0.12 S3; CloudFront/Lambda/DSQL/ACM all in free tier). The forcing function is mental load + the existence of a homegrown mini-PaaS (`StaticSite`, `LambdaApi`, `DsqlCluster`, `DsqlSchema`, `PreviewableApp`) that duplicates what hosted PaaS providers do natively.

Criteria, **set by the operator before options were weighed** (`/adr`-style):

1. **Charge mentale minimale** — fewer constructs, fewer custom stacks.
2. **Preview auto natif** — `PR → URL` with zero custom wiring.
3. **Compatible workflow IA** — `vercel.json` in git + LLM-known CLI > opaque dashboards or DIY CDK.
4. **Effort budget: one weekend (~1–2 days).**

Explicitly **not** criteria: monthly cost (already negligible), vendor lock-in (acceptable), commercial-use restriction (no commercial usage), apprentissage transférable, mini-PaaS preservation. The operator's first message also pre-decided two directions: *toutes les apps* migrent, et *plus de DSQL — Drizzle Postgres avec schemas + constraints*. The ADR documents this, it does not re-decide it.

Inventory: 3 apps (`borso-fr`, `borsouvertures` = pure Vite static; `last-loop-lepin` = Vite + Hono on Lambda + DSQL + S3 photos + JWT). Registrar is **Gandi**, not AWS — only the DNS zone is in Route 53. Drizzle already abstracts the schema, so DSQL → Postgres is a connection-string swap, not a schema rewrite.

## Decision

**Full migration to Vercel + Neon. All three apps, the DSQL data, and DNS hosting leave AWS in one weekend. Registrar stays at Gandi.**

Hybrid was rejected because two deploy models is *more* charge mentale, not less — and the operator already said "toutes les apps". Half-measures contradict criterion 1.

- **Apps:** `borso-fr`, `borsouvertures`, `last-loop-lepin/site` → 3 Vercel projects (Vite preset, `vercel.json` in git). `last-loop-lepin/api` (Hono) → Vercel Functions via `@hono/vercel`.
- **Database:** Neon project + branch-per-PR; `apps/last-loop-lepin/api/src/database/client.ts` swaps `DsqlSigner` for a plain `postgres` URL.
- **DNS:** Gandi NS → `ns1.vercel-dns.com` / `ns2.vercel-dns.com`. Vercel manages cert + the preview wildcard.
- **Photos bucket:** S3 stays read-only behind a presigned URL until a follow-up ADR picks Vercel Blob or R2.
- **AWS tear-down:** delete CDK stacks, Route 53 zone, ACM certs. WAF goes with the CloudFront distributions.

## Consequences

**Easier:** one deploy model across the repo (`vercel.json`); native PR preview URLs from Vercel with a per-PR Neon branch; `infra/cdk/`, `infra/shared/`, and every app's `cdk/` + `bin/` folder are deletable; CLAUDE.md's *Deployments*, *Hooks (pre-commit CDK coverage)*, *Don'ts* (pragma, CloudFront Function code.js), *preflight-cloudfront-aliases.sh* all retire. `meta` skills (`/specification`, `/technical-conception`, `/implementation`, `/visual-validation`) stay provider-agnostic.

**Harder:** vendor lock-in to Vercel + Neon, accepted explicitly. The `meta` skills that lean on CDK (`PreviewableApp`, `DsqlSchema` migration runner) need re-pointing or deletion. The photos bucket sits in a temporary half-state until the follow-up ADR. Local Postgres for tests stays via `scripts/local-postgres.sh` — Neon is for deployed environments only.

**Load-bearing:** Gandi NS cutover propagates in ~24h with TTL 60s, so rollback is minutes if Vercel breaks. The Drizzle migration files in `apps/last-loop-lepin/api/src/database/migrations/` re-run cleanly on Neon — verify on a Neon branch *before* DNS cutover, not after. A separate dantotsu/knowledge entry will capture the meta-lesson: this ADR went through three drafts because the writer kept projecting unrequested criteria onto the operator's stated direction; the `/adr` decision-support walk (criteria → options → score) is the correct first step, not `/adr-writer`.
