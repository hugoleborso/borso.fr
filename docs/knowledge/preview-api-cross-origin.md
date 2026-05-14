# Preview API access is cross-origin (custom domain per PR)

**Why this exists:** the original plan was "frontend hits `/api/*` same-origin, CloudFront routes to the Lambda". The plan was documented but never wired — neither in the per-app prod distribution (StaticSite) nor in the shared previews distribution. Result: every preview returned the S3 404 fallback (a JPEG) for `/api/*` calls, the Lambda was never invoked, and the dashboard showed _"Le serveur ne répond pas pour l'instant"_. CloudWatch was empty for the API log group.

The wildcard previews distribution is shared across every app and is host-routed to S3 only — there is no per-app behavior surface where we could splice an HTTP API origin in cleanly. So previews are cross-origin: each PR's frontend reaches its API via a dedicated hostname.

## The wiring

Per-PR layout (deterministic from `prNumber` + app slug):

```
last-loop-lepin-pr-12.preview.borso.fr        → shared previews CloudFront → S3 prefix
last-loop-lepin-pr-12-api.preview.borso.fr    → API Gateway v2 custom domain → HTTP API → Lambda
```

Both hostnames are children of `preview.borso.fr`, both covered by the single wildcard cert `*.preview.borso.fr` — but in two regions:

- `us-east-1` cert (existing): CloudFront previews distribution.
- `eu-west-3` cert (added): API Gateway regional custom domain (API Gateway rejects cross-region certs).

Both are issued by `infra/shared/lib/shared-stack.ts`. SSM seeds the per-app stacks via `/borso/shared/cert-preview-borso-fr-regional-arn` (+ `/borso/shared/hosted-zone-id` and `…-name`). The wildcard A/AAAA `*.preview` ALIAS in Route 53 stays; specific `<app>-pr-<n>-api.preview` records that PreviewableApp creates take precedence for the API hostname only.

Frontend reads the URL at build time via `VITE_API_BASE`. CI sets it from `${{ matrix.app }}` + `${{ github.event.pull_request.number }}` in `.github/workflows/preview.yml`, so the env var is computed before `pnpm build`. The fetch wrapper (`apps/<app>/site/src/api/client.ts`) prepends it to every relative `/api/*` path.

## CORS

Cross-origin + credentialed (admin cookies) requires:

- `Access-Control-Allow-Origin: <specific origin>` — not `*`.
- `Access-Control-Allow-Credentials: true`.

`LambdaApi` switches to that combination automatically when `allowedOrigins` is non-empty. `PreviewableApp` computes the matching frontend origin (`https://<previewHostname>`) and passes it through. Wildcard CORS remains the default when no origins are passed.

## Why not "wire `/api/*` on a dedicated per-PR distribution" instead

That would restore same-origin and remove the CORS layer, but it costs:

- A CloudFront distribution per PR (vs. zero today — previews share one), so ~5–10 min extra deploy time per PR.
- Loss of the shared-CDN cost optimisation.
- A new origin/behavior story on the prod distribution too, to stay symmetric.

Cross-origin via custom domains is the smaller change. Same-origin via a dedicated per-PR distribution stays on the table for if/when the CORS surface grows uncomfortable.

## Symptoms if this breaks

- Preview frontend shows _"Le serveur ne répond pas"_ on every endpoint.
- `curl https://<app>-pr-<n>.preview.borso.fr/api/...` returns 404 + Content-Type `image/jpeg` (the shared S3 404 fallback).
- `/aws/lambda/<app>-pr-<n>-api` log group is empty — the Lambda never gets invoked.
- `aws apigatewayv2 get-domain-names --region eu-west-3` is missing the expected `<app>-pr-<n>-api.preview.borso.fr` entry, or the Route 53 record doesn't exist.

## Files

- `infra/shared/lib/shared-stack.ts` — issues the regional `*.preview.borso.fr` cert.
- `infra/cdk/src/internal/naming.ts` — `previewApiHostname()`.
- `infra/cdk/src/constructs/lambda-api.ts` — wires `DomainName` + `ApiMapping` + Route 53 alias when `customDomain` is set; switches CORS to specific origin + credentials when `allowedOrigins` is set.
- `infra/cdk/src/constructs/previewable-app.ts` — pulls cert/zone from SSM, derives hostname, computes allowed origin.
- `.github/workflows/preview.yml` — sets `VITE_API_BASE` in the deploy job env.
- `apps/last-loop-lepin/site/src/api/client.ts` — reads `VITE_API_BASE` and prepends it.
