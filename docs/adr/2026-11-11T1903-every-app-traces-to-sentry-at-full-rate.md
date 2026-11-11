# ADR-2026-11-11T1903: every app traces to Sentry at sample rate 1.0, and each API's wide event lands on its request span

- **Status:** accepted
- **Date:** 2026-11-11
- **Deciders:** Hugo Borsoni
- **Tags:** sentry-tracing-all-apps, observability

## Context

ADR-2026-10-10T0457 gave pragma end-to-end tracing. Its API wraps each request in one `http.server` span. Its site traces page loads and navigations and sends `sentry-trace` and `baggage` only to its own API. That ADR counted the free plan's span quota for pragma alone.

The other five apps report errors to the same Sentry project and trace nothing. This was read on `main` at 2d59df1 on 2026-11-11:

- last-loop-lepin sets `tracesSampleRate: 0` in its API and its site.
- banana-rush and talos set no rate in their APIs, so the SDK traces nothing.
- None of the borso-fr, borsouvertures, banana-rush or talos sites traces.
- All four prod API Lambdas have `SENTRY_DSN`, and only pragma's has `SENTRY_RELEASE`. This was checked with `aws lambda get-function-configuration`.
- Since PR #290, last-loop-lepin, banana-rush and talos write a wide event per request to stdout only, because they have no request span to carry it.

A slow talos query or a failing borsouvertures page therefore shows an error with no timing around it.

Three constraints close doors before the trade-off:

- The free Developer plan includes 5M spans a month (sentry.io/pricing, read 2026-11-11). Sentry's quota page says events over the quota "will not be accepted".
- Apps never import each other, so each app carries its own copy of the tracing code, as PR #290 did for wide events.
- talos has no previews, and borso-fr and borsouvertures have no API.

**Measured volume** over 2026-10-12 to 2026-11-11:

| Source | Count | How it was measured |
|---|---|---|
| `pragma-prod-api` invocations | 6,585 | CloudWatch `AWS/Lambda Invocations` |
| `talos-prod-api` invocations | 5,104 | same |
| `last-loop-lepin-prod-api` invocations | 14 | same |
| `banana-rush-prod-api` invocations | 2 | same |
| Preview API invocations | no datapoints | same, for the three `-pr-293-api` functions |
| borso.fr CloudFront requests | 43,632 | `AWS/CloudFront Requests`, us-east-1 |
| borsouvertures CloudFront requests | 13,239 | same |
| pragma CloudFront requests | 8,601 | same; this includes `/api/*` |
| talos CloudFront requests | 6,005 | same; this includes `/api/*` |
| last-loop-lepin / banana-rush CloudFront requests | 45 / 33 | same |
| Previews distribution requests | 1,830 | same |

Neither static site has CloudFront access logs, so page loads cannot be counted directly. The spans per page load were measured as follows:

- **borso-fr, one load of `/`:** 17 spans. The built site was served locally and its envelopes were sent to a local receiver.
- **borsouvertures, one load of `/`:** 18 spans, measured the same way.
- **pragma:** 111 browser spans per page load. Sentry holds 14 days of pragma spans (12,090 in total): 4,862 `http.server`, 65 `pageload` and 441 `navigation`. The other 7,228 spans were divided by the 65 page loads. That counts every navigation's spans against the page load before it, so it overstates the figure.

## Criteria

| Criterion | Raised by | Weight | Why it matters | How it is measured |
|---|---|---|---|---|
| Does it change the app for its users | operator | high | A member or visitor sees nothing new. The operator sees where a slow or failing request spent its time in every app. | A trace appears in Sentry for each app's page load and API request. |
| Stays inside the free span quota | operator | high | The operator asked for free tools. Spans over the quota are not accepted. | The worst-case monthly span count below, against 5M. |
| Same shape as pragma | author | medium | One way to read traces across apps, and one blueprint to copy. | The per-app files mirror pragma's, file for file. |
| Personal data stays off | author | high | Visitors are EU residents. | Data collection settings match ADR-2026-10-10T0457. Trace headers go only to the app's own API. |

## Decision

**Copy pragma's tracing into every app at sample rate 1.0, and set each API's wide event on its request span.**

- **APIs (last-loop-lepin, banana-rush, talos):** each API gets pragma's `http.server` span. A Hono middleware continues the incoming trace, names the span after the matched route, and flushes before the Lambda freezes. It runs before the wide-event middleware, so `trace.id` is known and the event's fields become span attributes.
- **Release:** each stack sets `SENTRY_RELEASE` from `GITHUB_SHA`, as pragma's does.
- **Sites with an API:** they use `reactRouterBrowserTracingIntegration` where the site uses `react-router-dom`, and `browserTracingIntegration` otherwise. Trace headers go only to `<api origin>/api/`.
- **borso-fr and borsouvertures:** they use `browserTracingIntegration` and send trace headers nowhere.
- **Sample rate:** 1.0 everywhere, because the worst case below stays under the quota.

**Worst-case monthly spans.** Every CloudFront request is counted as a page load. That is an upper bound, because a cold page load makes 6 same-host requests on borso.fr and borsouvertures, 5 on pragma and 56 on talos (measured with Playwright). It also counts the `/api/*` requests a second time.

| App | Bound on page loads | Spans per page load | Spans |
|---|---|---|---|
| borso-fr | 43,632 | 17 (measured) | 741,744 |
| borsouvertures | 13,239 | 18 (measured) | 238,302 |
| pragma | 8,601 | 111 (measured upper bound) | 954,711 |
| talos | 6,005 | 111 (pragma's figure, assumed) | 666,555 |
| last-loop-lepin + banana-rush | 78 | 111 (assumed) | 8,658 |
| previews | 1,830 | 111 (assumed) | 203,130 |
| API `http.server` spans | 11,705 | 1 | 11,705 |
| **Total** | | | **2,824,805** |

The total is 56% of 5M, so a sample rate of 1.0 keeps every trace even at this bound. pragma's own measured rate is far lower. It is 12,090 spans in 14 days, about 26,000 a month, against a bound of 961,296 (its page loads plus its API spans).

## Consequences

- `+` A slow or failing request in any app arrives as one trace. On a full-stack app the trace links the browser to the Lambda. The trace carries the wide event's fields, so Sentry Explore filters every app's requests by route, status or error.
- `+` The fields of the wide events from PR #290 become queryable in Sentry for last-loop-lepin, banana-rush and talos, not only in CloudWatch.
- `-` At the worst-case bound, the quota margin is less than two times. Traffic growing by 1.8 times at the bound, or the Sentry stats page nearing 5M, is the signal to lower the browser rate on borso-fr and pragma first. They carry the most spans.
- `-` Every API response in the three apps now waits for the flush that ADR-2026-10-10T0457 accepted for pragma. Before, they flushed only on a 500.
- `-` borso-fr's and borsouvertures's lazily loaded Sentry chunk grows from 93.68 kB to 165.56 kB minified, and from 32.24 kB to 56.64 kB gzip (measured with `vite build`). Their main chunks do not change, because Sentry loads after first paint.
- `-` last-loop-lepin's site moves from `@sentry/react` 8.55.2 to the catalog's 11.6.0, and the `sentry8` catalog that ADR-2026-10-10T0457 kept for it goes. Its main chunk grows from 848.31 kB to 901.10 kB minified, and from 257.84 kB to 275.66 kB gzip (measured with `vite build`). In exchange it gets pragma's `dataCollection` block, so query strings leave no span. Its page loads are named by path, because it has no router.
- `~` Only the API spans carry a release. pragma's site gets its release from `@sentry/vite-plugin`, which runs only with `SENTRY_AUTH_TOKEN`, and CI hands that token to pragma alone. The other sites send none.
- `~` talos drops the SDK's `Postgres` and `PostgresJs` integrations, which tracing turns on by default (read in the 11.6.0 source) and which set `db.query.text`. Its `POST /api/agent/sql` would otherwise send the agent's SQL. talos records no outgoing fetch span, because its routine fire URL is a secret. The other APIs keep pragma's settings, where ADR-2026-10-10T0457 measured that the bundled `postgres` yields no database span.
- `~` talos span names carry full API paths, page slugs included. talos has one user, the operator, who is also the only Sentry user, so no third party's data is involved.
- `~` banana-rush keeps `Sentry.wrapHandler` around its handlers. That wrapper already flushes after every invocation (read in the 11.6.0 source), so its request span does not flush a second time. Its WebSocket events get no request span, and their wide events go to stdout only.
- `~` No new dependency, secret or CI variable. `GITHUB_SHA` is set by Actions, and `LambdaApi` already allows `sentry-trace` and `baggage` in its CORS preflight.
- `~` A static site sends no trace header, so its traces end in the browser.

## Alternatives considered

### Option A: full rate everywhere (chosen)

- **Raised by:** author
- **Summary:** Every app traces every request and page load at 1.0, as pragma does.
- **Strengths:**
  - Every trace is kept, so a rare slow request is never sampled away.
  - The worst-case bound is 2.8M, under 5M.
  - It is one constant, the same in every app.
- **Costs:**
  - The quota margin is under two times at the bound.
- **Rationale:** It is the only option that keeps every trace, and the measured bound fits.

### Option B: full rate on APIs, a lower browser rate on the static sites (rejected)

- **Raised by:** author
- **Summary:** Keep 1.0 on the APIs and on the full-stack sites, and set 0.1 on borso-fr and borsouvertures, which carry most of the CloudFront traffic.
- **Strengths:** The worst case drops by about 0.9M spans.
- **Costs:**
  - Two rates to explain.
  - A visitor's slow page load on a static site is kept only one time in ten.
- **Rejection rationale:** It buys margin the measurement shows is not needed yet. It is the first lever if the stats page nears the quota.

### Option C: APIs only, no browser tracing on the static sites (rejected)

- **Raised by:** author
- **Summary:** Trace the three APIs and their sites, and leave borso-fr and borsouvertures untraced.
- **Strengths:** It saves about 1M spans at the bound, and the static sites' lazy Sentry chunk stays smaller.
- **Costs:** The two most-visited sites stay blind to slow page loads.
- **Rejection rationale:** The goal is every app. The bound fits without this cut.

## Scores

|             | A: 1.0 everywhere | B: 0.1 on static sites | C: no static-site tracing |
|---|---|---|---|
| Changes the app for its users | ✓ every app traced | ~ static sites sampled | ✗ two apps untraced |
| Free span quota | ✓ 2.8M at the bound | ✓ about 1.9M at the bound | ✓ about 1.8M at the bound |
| Same shape as pragma | ✓ one constant | ~ two rates | ~ two shapes |
| Personal data off | ✓ | ✓ | ✓ |

## Implementation pointers

- Spec: [`docs/features/meta/sentry-tracing-all-apps/spec/spec.md`](../features/meta/sentry-tracing-all-apps/spec/spec.md), written from the operator's request.
- Plan: none.
- Commit: {{SHA, stamped on merge}}
- Files:
  - APIs: `apps/{last-loop-lepin,banana-rush,talos}/api/src/helpers/observability/` (`error-reporting.adapter.ts`, `request-tracing.middleware.ts`, `wide-event.adapter.ts`, `wide-event.middleware.ts`, which takes the trace-id reader as a parameter so its test needs no module mock), and each `api/src/app.ts`.
  - Sample rate and release: `apps/last-loop-lepin/api/src/helpers/observability/error-reporting.core.ts` and `apps/{banana-rush,talos}/domain/error-reporting.core.ts`.
  - Sites: `apps/*/site/src/observability/error-reporting.{adapter,core}.ts`, and `apps/last-loop-lepin/site/src/observability/sentry.ts`.
  - Stacks: `apps/{last-loop-lepin,banana-rush,talos}/cdk/{bin/cdk.ts,lib/stack.ts}`.
- Related ADRs: builds on ADR-2026-10-10T0457 (pragma's tracing and its quota count) and ADR-2026-11-11T1318 (the wide event).
