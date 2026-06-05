---
status: done
summary: |
  Round-10 follow-ups from Hugo's screenshot tour landed in four commits
  (542c427 HEAD).

  SPA fallback for previews — the shared previews CloudFront has no
  per-PR cache-behavior surface, so the host-routing CloudFront
  Function (cf-host-routing-function.code.js) now carries an explicit
  SPA-app allowlist (pragma, last-loop-lepin). For those apps any URI
  whose last segment carries no "." is rewritten to
  /<app>/pr-<n>/index.html so the React bundle loads and the router
  takes over. Asset paths (any "." in the last segment) keep the
  existing app/pr-<n> prefix and pass through to S3. Multi-page apps
  (borso-fr, borsouvertures) keep the directory-rewrite heuristic
  unchanged.

  Same-origin /api routing — the existing prod wiring in StaticSite +
  PreviewableApp already serves same-origin /api/* via the per-app
  CloudFront. For previews the cheapest fix is to mirror last-loop-
  lepin's pattern in the pragma fetch wrapper: when VITE_API_BASE is
  non-empty, prepend it to every /api/... path (cross-origin to the
  per-PR API hostname pragma-pr-<n>-api.preview.borso.fr). Empty
  VITE_API_BASE in dev (Vite proxy) and prod (StaticSite same-origin
  behaviour) keeps the relative path, no regression for either.

  Cookie SameSite — left untouched at Strict. Both preview hostnames
  (frontend + API) sit under .preview.borso.fr, registrable domain
  borso.fr → same-site; Strict-tagged cookies travel on cross-origin
  fetches with credentials: 'include' within the same site. No
  SameSite=None tightening warranted.

  i18n fix — fr.json noChartHint moved from "pas d'accord" (= I
  disagree) to "pas de partition"; three companion comments in
  ChartKindIcon, chart-kind.utils, and CatalogPage updated to keep
  search-paths intact. i18n parity test still passes.

  Gates: pnpm --filter @borso/infra run test:coverage 100% (17 files,
  182 tests, all files/branches/funcs/lines at 100). pnpm --filter
  @borso-app/pragma test:core 281/281. pnpm exec knip clean (single
  pre-existing config hint on apps/pragma/knip.json unrelated to this
  diff). pnpm --filter @borso-app/pragma run build succeeds. Final SHA
  542c427, 4 new commits on the branch.

  Files touched: infra/cdk/src/internal/cf-host-routing-function.code.js,
  infra/cdk/test/unit/cf-host-routing-function.test.ts (+6 cases),
  apps/pragma/site/src/lib/api-client.ts,
  apps/pragma/site/src/i18n/fr.json,
  apps/pragma/site/src/components/molecules/ChartKindIcon.tsx,
  apps/pragma/site/src/routes/catalog/chart-kind.utils.ts,
  apps/pragma/site/src/routes/catalog/CatalogPage.tsx.

  No deviation. Branch pushed to claude/pragma-erp-specification-k41Mg.
artifacts:
  - infra/cdk/src/internal/cf-host-routing-function.code.js
  - infra/cdk/test/unit/cf-host-routing-function.test.ts
  - apps/pragma/site/src/lib/api-client.ts
  - apps/pragma/site/src/i18n/fr.json
  - apps/pragma/site/src/components/molecules/ChartKindIcon.tsx
  - apps/pragma/site/src/routes/catalog/chart-kind.utils.ts
  - apps/pragma/site/src/routes/catalog/CatalogPage.tsx
partialDeferrals: []
next:
  kind: validate
---
