# ADR 0004 — Migrate from custom AWS CDK to a managed PaaS

**Status:** proposed
**Date:** 2026-05-14

## Context

The operator perceives the repo's infra as an *usine à gaz* and believes it costs more than a managed PaaS would. Cost Explorer for the last 6 months (Dec 2025 → May 2026) tells a different story:

| Service | Monthly | Note |
|---|---|---|
| AWS WAF | **$5.00** | 1 WebACL on CloudFront, fixed fee |
| Tax | $1.02 | ~20% TVA |
| Route 53 | $0.50 | borso.fr hosted zone |
| S3 | $0.12 | 3 sites + photo bucket |
| Lambda / CloudFront / ACM / DSQL | $0.00 | free-tier or unused |
| **Total** | **~$6.13 / €5.70** | ~€68 / year |

What is actually expensive is the **mental load**: the repo ships a homegrown mini-PaaS (`StaticSite`, `LambdaApi`, `DsqlCluster`, `DsqlSchema`, `PreviewableApp`) over CDK + GitHub Actions + DSQL + WAF + 5 CloudFront distributions. The North Star (CLAUDE.md) reserves the operator's time for *interesting conversations*; any time spent debugging custom CDK is a tax. Three serious managed-PaaS alternatives exist (Vercel, Cloudflare, Netlify), each with auto-previews and Postgres branching, but each comes with a commercial-use clause, a vendor-lock dimension, and a domain-DNS migration. The cost premise that motivated the question is wrong, so the decision is **complexity vs. lock-in**, not money.

## Decision

**Stay on AWS, drop the WAF line, defer migration; revisit only when complexity actually bites.**

The mini-PaaS *is* the asset, not the liability — it produced ADR-0001, three feature pipelines, and a working preview system. Migrating now trades €0/mo savings (already there) for €0–€38/mo of new vendor cost, commercial-use risk, and a one-shot ~2-week rewrite of three apps + DSQL→Postgres adapter swap + domain NS cutover. The options weighed:

- **A. Stay on AWS, simplify** *(chosen)*: drop WAF if not used (-$5/mo → €0.85/mo), keep constructs.
- **B. Vercel Hobby + Neon Free**: €0 but commercial-use TOS risk for borsouvertures.
- **C. Vercel Pro + Neon Launch**: €38/mo + lock-in, 3× more expensive than today.
- **D. Cloudflare Pages + Workers + Neon Free**: €0, no commercial caveat, but full DSQL→Postgres + S3→R2 + CDK→Pages rewrite.
- **E. Netlify + Supabase**: same shape as D, smaller free tier.

Trigger to reconsider: AWS bill > €25/mo for 3 consecutive months, OR ≥ 2 dantotsus rooted in the custom CDK in one quarter.

## Consequences

**Easier:** no migration project; CLAUDE.md, skills, ADR-0001 stay coherent; DSQL multi-region active-active stays available for `last-loop-lepin`; the borso.fr Route53 zone keeps owning DNS.

**Harder:** the *usine à gaz* feeling is unresolved — the operator must accept that the mini-PaaS is intentional, or escalate to a `/dantotsu` whenever it leaks. The custom constructs need to stay well-documented because the LLM workforce has no Vercel-shaped escape hatch.

**Load-bearing:** the WAF deletion is gated on confirming no WebACL rule is actually filtering traffic (read `aws wafv2 get-web-acl` before destroy). A future ADR-0005 can supersede this one if option D becomes cheap to migrate to — re-evaluation is welcome, silent drift is not. Drizzle is already the ORM, so a future move off DSQL is a connection-string swap (`@aws-sdk/dsql-signer` removal), not a schema rewrite — the migration cost is bounded.
