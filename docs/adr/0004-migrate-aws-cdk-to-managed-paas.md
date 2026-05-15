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

**Harder:** vendor lock-in to Vercel + Neon, accepted explicitly. The `meta` skills that lean on CDK (`PreviewableApp`, `DsqlSchema` migration runner) need re-pointing or deletion. The photos bucket sits in a temporary half-state until the follow-up ADR. Local Postgres for tests stays via `scripts/local-postgres.sh` — Neon is for deployed environments only. **The `claude-readonly` IAM user affordance is lost**: AWS IAM allowed a true read-only credential for Claude Code on the web (`docs/aws-setup.md#12`); Vercel Hobby and Neon Free tokens are full-scope and cannot be reduced to read-only — the AI session loses direct prod introspection, falling back on GitHub MCP + `agent-browser` for ~90% of needs, with logs/env vars becoming human-only actions via dashboards.

**Load-bearing:** Gandi NS cutover propagates in ~24h with TTL 60s (parent `.fr` TTL = 6h at AFNIC, all A records already at 60s), so rollback is minutes if Vercel breaks. The Drizzle migration files in `apps/last-loop-lepin/api/src/database/migrations/` re-run cleanly on Neon — verify on a Neon branch *before* DNS cutover, not after. A separate dantotsu/knowledge entry will capture the meta-lesson: this ADR went through three drafts because the writer kept projecting unrequested criteria onto the operator's stated direction; the `/adr` decision-support walk (criteria → options → score) is the correct first step, not `/adr-writer`.

**Free-tier caps the team must remember.** The migration buys ergonomics in exchange for accepting these hard ceilings on the chosen plans (Vercel Hobby + Neon Free, verified at sources `vercel.com/docs/limits` and `neon.com/docs/introduction/plans` on 2026-05-14):

| Cap | Limit on Free | Trigger to upgrade |
|---|---|---|
| Neon DB storage / project | **0.5 GB** | Neon Launch ($19/mo, $0.35/GB-mo beyond) |
| Neon public egress / mo | **5 GB** | Neon Launch (100 GB included, then $0.10/GB) |
| Neon PITR / history window | **6 h** | Neon Launch (up to 7 days, $0.20/GB-mo) |
| Neon branches / project | **10** | Neon Launch extra at $1.50/branch-mo |
| Neon scale-to-zero idle | **5 min, non-disableable** | Launch lets it be disabled |
| Vercel runtime log retention | **1 HOUR** (not 1 day) | Sentry (stay Free) OR Vercel Pro ($20/user/mo) |
| Vercel concurrent builds | **1, team-wide** | Pro: 12 |
| Vercel Fast Data Transfer (egress) | 100 GB / mo | Pro: 1 TB |
| Vercel Function invocations | 1,000,000 / mo | Pro overage at $0.60/1M |
| Vercel build minutes | 6,000 / mo | Pro overage |
| Vercel deployments / day | 100 | Pro: 6,000 |
| Vercel Function max duration | 60 s | Pro: 300 s |
| Vercel projects per Git repo | 10 | Pro: 150 |
| Vercel Git Organizations | **not supported** | Pro |
| Vercel WebSocket-as-server | **not supported, any plan** | third-party (Pusher, Ably, …) |

**Impact on the current three apps.** `borso-fr` and `borsouvertures` are static Vite — only Vercel build minutes and bandwidth apply; zero Neon exposure, zero risk of hitting any cap with hobby traffic. `last-loop-lepin` carries every Neon cap; the **6-hour PITR** is the riskiest (a data-corruption bug discovered the next day is unrecoverable from Neon's history) — mitigated by Drizzle migrations being deterministic and replayable, and by keeping S3 photos out of Neon. The **1-hour Vercel log retention** is the other sharp edge — mitigated by extending the existing `@sentry/react` setup with `@sentry/node` on the API (30-day Sentry Free retention covers post-mortems). Neon's **5-min scale-to-zero** adds a ~1–3 s cold start for the first request after idle on `last-loop-lepin`'s API; acceptable for the use case, not for a live-event sub-second target (would need Launch tier).

**Impact on future apps on this stack.** The shape of what is feasible without paying:
- **Comfortable**: any new static site (limited only by the 200-projects Vercel cap and 100 deploys/day), any new CRUD with < 0.5 GB DB and modest egress, any side-project with hobby traffic. Adding sites is mostly free.
- **Marginal — plan to upgrade**: anything growth-prone (e-commerce, analytics dashboard, user-generated content stored *in* the DB rather than blob storage), anything > 10 concurrent open feature branches per app (cap is per Neon project, not per account).
- **Out of scope on Free**: WebSocket servers (chat, live collaboration — not supported on any Vercel plan, regardless of tier), apps requiring IP-allowlist on the DB (Neon Launch+), apps needing > 1 h prod log retention without Sentry instrumentation, apps with > 100 GB/mo end-user egress.

The **1-build-concurrent slot is team-wide on Hobby**, so adding more apps does **not** multiply build slots — pushes queue together. Becomes a real friction once 4+ active apps push concurrently; that's a structural trigger for Vercel Pro independent of any per-app limit.
