# ADR-0028: pragma sends errors and traces to Sentry's EU region with personal data collection off

- **Status:** proposed
- **Date:** 2026-10-10
- **Deciders:** Hugo Borsoni
- **Tags:** pragma, observability

## Context

pragma has no error reporting and no tracing. When a render crashes the page, the member sees the crash screen and the error goes to their browser console, where nobody reads it. When the API fails, Hono answers 500 and writes one line to a CloudWatch log group that keeps it for a week and that nobody watches. The band learns about a failure when a member mentions it, and nobody can say whether a slow screen is slow in the browser, in the Lambda or in the database.

Four constraints narrow the choice before any trade-off:

- The repository is run by one person, so the tool must cost nothing at this volume and must not need infrastructure of its own.
- The members live in the EU, so the data should stay in the EU and carry as little personal data as possible.
- The API is a Lambda that esbuild bundles into one ESM file, so bundle size and cold-start work matter, and any instrumentation that patches modules as they load cannot see inside the bundle.
- On previews the site and the API are on different origins, so a trace header is a cross-origin request header that the API's CORS preflight has to allow.

`last-loop-lepin` already depends on `@sentry/react` 8, but it has never been given a DSN, so it reports nothing either.

## Decision

**Sentry, on the free Developer plan, in the EU data region, for both errors and traces, with every data collection category switched off.**

- **Site:** `@sentry/react` 11.6.0. It traces route-named page loads and navigations through `reactRouterBrowserTracingIntegration` and `wrapReactRouterRouting`. It sends `sentry-trace` and `baggage` only to `<api origin>/api/`. That origin is the page's own origin in prod, and the preview's separate `-api` host on a preview.
- **API:** `@sentry/aws-serverless` 11.6.0. A Hono middleware continues the incoming trace and wraps each request in one `http.server` span, named after the matched route rather than the path. `onError` reports every failure that becomes a 500. The middleware then flushes before the Lambda freezes.
- **When it runs:** both sides start only when a DSN is configured and the stage is `preview`, `integ` or `prod`. A deploy made before the project exists runs as it does today.
- **Sampling:** the sample rate is 1.0 everywhere (see the rubric).
- **Source maps:** the site's source maps are uploaded at build time when `SENTRY_AUTH_TOKEN` is present, then deleted from `dist/`. The Lambda gets `NODE_OPTIONS=--enable-source-maps` so its stack traces point at the TypeScript sources.
- **Release:** the commit SHA on both sides.
- **Off:** replay and profiling stay off.

## Consequences

- `+` A failure in the browser and the API calls it led to arrive as one trace, tagged with the stage and the commit, at no cost on the free plan.
- `+` The SDK 11 defaults collect user info, cookies, headers, bodies, query strings and, on Node, local variable values. All of them are switched off explicitly, and the API sends no trace header to Deezer, Spotify, Nominatim or S3.
  - A bundled run against a local receiver confirmed that a session cookie, a request body, a query string and a client IP sent to the Lambda appear nowhere in what leaves it.
  - The SDK source confirms that browser `http.client` spans drop the query string under `urlQueryParams: false`.
- `-` Database spans are not recorded. In SDK 11 the postgres.js integration works by injecting diagnostics channels into the `postgres` module as it loads, so it cannot see the copy esbuild inlined. This was measured: a bundled run produced no `db` span. A second run produced them, keeping `postgres` and `@sentry/server-runtime-injection` outside the bundle and preloading `--import @sentry/server-runtime-injection/import-hook`; those spans carried the sanitized SQL and no row values. Shipping that needs `LambdaApi` to install those two modules into the asset. CDK's `nodeModules` install fails on this repository's `catalog:` specifiers, so the change was left out.
- `-` The API bundle grows from 677.8 KB to 977.7 KB minified, measured with `LambdaApi`'s esbuild options. Every cold start also pays the SDK's start, which was not measured on Lambda. On each cold start the SDK prints one line saying it could not register its diagnostics-channel hooks; capture and tracing are not affected.
- `-` The site's main chunk grows from 956.0 KB to 1,136.5 KB minified, and from 278.5 KB to 340.3 KB gzip, on every visit.
- `-` Every API response waits for the SDK to flush, because a frozen Lambda cannot send afterwards. Sentry's Lambda extension, which sends without that wait, ships only with its layer.
- `-` The free plan allows one user and keeps 30 days of data.
- `~` Every API built on `LambdaApi` now allows the `sentry-trace` and `baggage` request headers in its credentialed CORS preflight. Prod needs no change, because CloudFront forwards every viewer header to `/api/*` with `ALL_VIEWER_EXCEPT_HOST_HEADER`.
- `~` There is one new secret (`SENTRY_AUTH_TOKEN`) and three repository variables. The DSN is a public ingest key and ends up in the bundle by design.
- `~` `@sentry/react` moves into the catalog at 11.6.0. `last-loop-lepin` stays on 8.55.2 through a named `sentry8` catalog.

## Alternatives considered

### Option A: Sentry SaaS, EU region, npm SDKs, errors and traces (chosen)

- **Summary:** The hosted Sentry on the free Developer plan, with the organization created in the EU (Frankfurt) region and the SDKs bundled into the site and the Lambda.
- **Strengths:**
  - Free at this volume, EU hosting is available on the free plan, and there is nothing to run.
  - One trace covers the browser and the Lambda, and the route names come from the routers themselves.
  - This repository already chose this vendor once, through `last-loop-lepin` and `eslint-rules/no-vendor-sdk-outside-adapter.js`.
- **Costs:**
  - +299.9 KB on the API bundle and +61.7 KB gzip on the site, measured.
  - A flush on every API response.
  - No database spans until the bundling change described above.
- **Rationale:** The only option that is free, hosted in the EU, and covers both the browser and the Lambda in one trace.

### Option B: Sentry's Lambda layer instead of the npm package (rejected)

- **Summary:** Attach Sentry's published Lambda layer and preload it with `NODE_OPTIONS=--import @sentry/aws-serverless/awslambda-auto`. This is what Sentry's documentation recommends.
- **Strengths:**
  - The SDK is not in our bundle.
  - The layer's extension sends events without making the response wait.
  - Load-time instrumentation, database spans included, could see the modules the layer loads.
- **Costs:**
  - A layer ARN, pinned per region and per version, in the stack.
  - The wrapper sees the Lambda handler but not Hono's error handler, so the `onError` and middleware code would still be needed.
  - Our own `postgres` would still be inside the bundle, so database spans would still need the same bundling change.
- **Rejection rationale:** It removes neither our code nor the bundling change, and it adds a versioned external artefact. This would flip if the response-time cost of the flush became visible to members.

### Option C: CloudWatch only, with a metric filter on the API log group and an alarm (rejected)

- **Summary:** Keep the logs where they are, add a metric filter on `Internal Server Error`, and email an alarm.
- **Strengths:** No new vendor, no new secret, and the data stays in eu-west-3.
- **Costs:**
  - Sees nothing from the browser, which is where the crash screen appears.
  - No grouping and no traces.
  - Each alarm carries a monthly charge, not priced here.
- **Rejection rationale:** It misses the front end entirely.

### Option D: Self-hosted Sentry or GlitchTip (rejected)

- **Summary:** Run an error and trace collector ourselves.
- **Strengths:** Full control of the data.
- **Costs:** A server, a database and upgrades, for one person to operate.
- **Rejection rationale:** The operating cost is far above the value for a band application.

## Evaluation rubric

| Criterion | Weight | Why it matters |
|---|---|---|
| Cost at this volume | high | A one-person lab, and the operator asked for free. |
| Covers the browser and the API in one trace | high | Most failures members see start in the browser. |
| EU data residency and minimal personal data | high | The members are EU residents, so GDPR applies. |
| Operating effort | medium | Every hour spent running a tool is an hour not spent on the product. |
| Bundle size and per-request cost | medium | Every cold start and every response pays it. |

|             | A: Sentry npm | B: Sentry layer | C: CloudWatch | D: Self-hosted |
|---|---|---|---|---|
| Cost | ✓ free plan | ✓ free plan | ~ per-alarm charge | ✗ a server |
| Browser and API in one trace | ✓ | ✓ | ✗ API logs only | ✓ |
| EU and minimal PII | ✓ EU region, collection off | ✓ same | ✓ | ✓ |
| Operating effort | ✓ none | ~ layer versions | ✓ | ✗ |
| Size and per-request cost | ~ +299.9 KB, flush per response | ✓ no flush wait | ✓ | ~ same SDK |

**Sample rate.** The free plan includes 5M spans a month ([sentry.io/pricing](https://sentry.io/pricing/)). CloudWatch counted 6,830 invocations of `pragma-prod-api` from 2026-09-10 to 2026-10-10, with a peak day of 2,888. Over the same window, the pragma preview APIs that still have metrics counted 1,942. That is fewer than 9,000 API requests a month. Each API request sends one span.

Each browser page load or navigation sends one transaction with its child spans: resources, fetches and paints. Neither the number of page loads nor the spans per page load was measured. As a worked bound, suppose there were one page load per API request, each carrying 100 spans. A month would then total about 0.9M spans, under 5M, so 1.0 keeps every trace.

One reason to lower it later is traffic growing by more than ten times. The other is the stats page in the Sentry project showing the quota being approached. What happens to spans beyond the quota on the free plan was not verified here.

## Implementation pointers

- Spec: none; requested directly by the operator.
- Plan: none.
- Commit: {{SHA, stamped on merge}}
- Files:
  - API: `apps/pragma/api/src/helpers/observability/error-reporting.adapter.ts`, `apps/pragma/api/src/helpers/observability/request-tracing.middleware.ts`, `apps/pragma/api/src/helpers/observability/unhandled-error.middleware.ts`, `apps/pragma/api/src/app.ts`, `apps/pragma/api/src/main.ts`
  - Site: `apps/pragma/site/src/observability/error-reporting.adapter.ts`, `apps/pragma/site/src/observability/error-reporting.core.ts`, `apps/pragma/site/src/App.tsx`, `apps/pragma/vite.config.ts`
  - Infrastructure and CI: `apps/pragma/cdk/lib/stack.ts`, `infra/cdk/src/constructs/lambda-api.ts`, `.github/workflows/{deploy,preview}.yml`
- Related ADRs: ADR-0012 (outbound calls live in `*.adapter.ts`).
