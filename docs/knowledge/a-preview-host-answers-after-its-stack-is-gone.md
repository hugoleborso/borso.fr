# A preview host answers after its stack is gone

_Measured 2026-08-21 against `pragma-pr-83.preview.borso.fr`, after PR #83
merged and the per-PR stack was torn down._

A preview URL returning 200 is not evidence that the preview is alive. The
static site keeps being served for days after the stack that produced it is
deleted, with no API behind it, and the failures that follow look like
authentication problems rather than what they are.

## What each host does once the stack is gone

| Request | Answer |
| --- | --- |
| `GET https://pragma-pr-83.preview.borso.fr/` | 200, the SPA, `server: AmazonS3` |
| `GET …/api/health` | 200 — and the body is `index.html`, not JSON |
| `POST …/api/__test/seed` | 403 CloudFront, *"This distribution is not configured to allow the HTTP request method … supports only cachable requests"* |
| `GET https://pragma-pr-83-api.preview.borso.fr/api/songs` | 404, `x-cache: FunctionGeneratedResponse from cloudfront` |

The bundle's own base URL is the one in the last row: grepping the served
JavaScript for it gives `https://pragma-pr-83-api.preview.borso.fr`, so that is
where the page's own `fetch` goes, and it is answered by the previews CDN's
host-routing function with a 404 rather than by any API.

## Why

The wildcard `*.preview.borso.fr` resolves to the shared previews
distribution, defined at `infra/shared/lib/shared-stack.ts:91`. Its default
behaviour has an S3 origin, a viewer-request function mapping the hostname to a
key prefix, and no `allowedMethods` override — so CloudFront's default of
GET/HEAD applies, and there is no `/api/*` behaviour at all. That distribution
serves objects; it has never been able to serve a write.

While a PR is open, the app's own distribution owns those aliases, and its API
behaviour is `AllowedMethods.ALLOW_ALL` with caching disabled
(`infra/cdk/src/constructs/static-site.ts:137`). When the stack is destroyed the
aliases go with it and the wildcard takes over, while the objects stay: the
bucket's `expire-previews` lifecycle rule deletes them on a delay, not on
teardown.

## What this means when reading a failure

- **A 403 on a preview API call is a routing fallback, not a permission
  problem.** The 403's own text says which — *"supports only cachable
  requests"* is CloudFront refusing the method, and it comes with
  `x-cache: Error from cloudfront`. Read the body before concluding the
  endpoint is guarded, gated behind a password, or disabled by an environment
  variable. On this repository, `ALLOW_TEST_SEED` is set for every non-prod
  stage (`infra/cdk/src/internal/stage-wiring.utils.ts:15`), so the seed route
  *is* mounted on a preview — it simply cannot be reached once the stack that
  routed to it is gone.
- **`server:` and `x-cache:` tell you who answered.** `AmazonS3` means the
  static bucket, whatever the path looked like. `FunctionGeneratedResponse`
  means the routing function, not an origin.
- **Check the PR is still open before treating a preview as a test target.**
  A merged or closed PR's URL still loads, and the front end still renders its
  shell — a screenshot of it proves the bundle, not the system.

## See also

- [`cloudfront-cname-uniqueness.md`](./cloudfront-cname-uniqueness.md) — the
  neighbouring alias question, from the takeover side.
- [`driving-previews-with-agent-browser-and-argent.md`](./driving-previews-with-agent-browser-and-argent.md) —
  the rest of the recipe for driving a preview from a session.
