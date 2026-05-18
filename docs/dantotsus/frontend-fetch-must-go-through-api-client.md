---
date: 2026-05-15
introduced-at: implementation
detected-at: operator-deploy
severity: high
related-pr: 23
fix-pr: this PR (branch `claude/lessons-from-pr-23`)
fix-commits: [<pending — pushed in this kaizen PR>]
prior-fix-commits: [3415a37]
eradication-level: 1
time-to-detect: minutes
tags: [react, cloudfront, frontend, api]
---

# A relative `fetch('/api/...')` hit the static-site CloudFront and got 403'd

## Symptom

Live retransmission on the preview, operator tapping their own chip
to self-punch: every attempt produced *« Tu n'es pas inscrit comme
coureur dans cette édition. »* in the modal. The runner is, of course,
inscrit. A direct curl against the API host (`*-api.preview.borso.fr`)
returned 201 with a valid punch — so the back was correct.

## Root-cause chain

1. **Why did the modal show that specific message?** Because the
   `SelfPunchModal` FSM has a fallback branch that maps an
   unparseable error envelope to `'runner-not-in-race'`. The
   intermediate display read of `errorField` returned `undefined`,
   `parseBusinessReason(undefined)` returned `null`, and the
   fallback fired.
2. **Why was the error envelope unparseable?** The fetch resolved
   with `response.ok === false` and a body that wasn't a JSON
   `{ error: '<reason>' }` envelope — it was an HTML page returned
   by something other than the API.
3. **Why did the fetch return an HTML page?** The fetch URL was
   `'/api/self-punches'` — a *relative path*. The page lives on
   `last-loop-lepin-pr-23.preview.borso.fr`, so the browser resolved
   the URL to that origin. That origin is the static-site CloudFront
   distribution, which serves only the SPA bundle and has no
   behaviour for `/api/*`. CloudFront returned **403** with a stock
   HTML error page.
4. **Why was the path written as relative in the first place?** The
   author treated `SelfPunchModal` as a one-off that didn't need
   the apiClient machinery (no Zod schema, custom error shape) and
   inlined the fetch. Every other call site in the codebase goes
   through `apiClient` → `fetchUnknown` → `resolveUrl` which
   prepends the build-time `VITE_API_BASE` (the API custom domain).

**Root cause:** *thought `/api/*` was same-origin in every environment
because dev uses Vite's proxy and prod could in theory route via the
same CloudFront; actually preview and prod split front and API onto
distinct hostnames, so the front MUST be told the API origin via
`VITE_API_BASE`, and any fetch that bypasses `resolveUrl` lands on
the wrong host.*

## Detection failure causes

- **Typing:** No type-level distinction between a "same-origin
  relative path" and "any string"; `fetch()` accepts both.
- **Linter / static analysis:** Biome doesn't ship a rule for
  call-site URL conventions. The repo had no custom rule for it.
- **Functional validation locally:** `pnpm dev` proxies `/api/*` to
  the local Hono server via Vite's `server.proxy` config — so the
  relative path *works* locally. The failure is preview/prod-only.
- **CI:** No integration test exercises the preview-origin split.
  The /visual-validation skill could in theory have caught it, but
  the operator approved the PR after a successful manual test on
  preview that didn't exercise the self-punch flow (the geofence
  blocked it at the time).
- **Code review:** The new file `SelfPunchModal.tsx` was reviewed in
  the context of the FSM correctness; the bare `fetch` didn't draw
  attention because the codebase has other bare fetches (the photo
  upload PUT in `RunnerAdminPanel.tsx` is one, but that uses a
  presigned absolute URL from the API).
- **Staging / production monitoring:** The 403 is silent — no Sentry
  hookup yet, no alert.

## Countermeasure

Routed the `SelfPunchModal` POST through `resolveUrl('/api/...')`,
which prepends `VITE_API_BASE`. Exported `resolveUrl` from
`apps/last-loop-lepin/site/src/api/client.ts` so other one-off
fetches that can't use the typed apiClient can still get the right
host. The modal stays decoupled from the apiClient's Zod-parsed
envelope shape (its error handling is custom).

- **Code:** commit `3415a37` in PR #23.

## Eradication (mandatory — code-level)

**Type:** code diff (level 1 — structural impossibility) + DevX check (Biome Grit plugin) as defence-in-depth.

**Reference:** this kaizen PR.

**The actual fix:** two layers.

*Layer 1 — every front-side fetch now goes through Hono's `hc`
client.* The site's `api/client.ts` was rewritten on top of
`hc<AppType>` (the back's chained-router type, exported from
`apps/.../api/src/app.ts`). Each `apiClient.<method>` dispatches to
the typed `client.api.<path>.$<method>(...)` and unwraps via
`r.ok` narrowing. There is no `fetch('/api/...')` literal anywhere
in the source — the only direct fetch left is the photo PUT against
a *presigned absolute URL* returned by the API, which is by
definition not a `/api/...` path. End-to-end typing of every front
call comes from the back's Hono types ; no hand-rolled Zod schema
on the read side. See the companion knowledge entry
[`rolled-our-own-data-fetching-instead-of-tanstack-query.md`](../knowledge/rolled-our-own-data-fetching-instead-of-tanstack-query.md).

*Layer 2 — anyone reintroducing a bare `fetch('/api/...')` in site/
code gets a lint error.* The Biome Grit plugin
[`no-direct-api-fetch-in-site.grit`](../../biome-plugins/no-direct-api-fetch-in-site.grit)
fires on any string-literal `/api/...` URL passed as the first
argument to `fetch`. Registered in `apps/last-loop-lepin/biome.jsonc`.
Dynamic URLs (variables, absolute URLs returned by the API) are
intentionally not caught — those are the legitimate non-apiClient
cases.

## See also

- [`docs/dantotsus/static-site-cloudfront-default-root-only-handles-apex.md`](./static-site-cloudfront-default-root-only-handles-apex.md) — neighbour entry: another way the static-site CloudFront silently 403s when asked to do something outside its scope.
- [`docs/knowledge/cloudfront-cname-uniqueness.md`](../knowledge/cloudfront-cname-uniqueness.md) — the broader split-host topology between front and API in this repo.
