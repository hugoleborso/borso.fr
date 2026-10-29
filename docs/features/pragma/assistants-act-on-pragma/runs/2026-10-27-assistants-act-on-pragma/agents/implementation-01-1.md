---
status: done
summary: Slice 1 shipped in 9468bac6. StaticSite takes api.pathPatterns (default ['/api/*'], replacing the unused pathPattern) on one shared API origin; PreviewableApp forwards api.extraPathPatterns after '/api/*'; apiPublicOrigin is exported from naming.utils (100% coverage, 100% mutation score). The pragma stack routes /mcp, /oauth/{authorize,token,register,revoke} and /.well-known/oauth-* in production and sets OAUTH_ISSUER and OAUTH_CONSENT_ORIGIN; the Vite dev server proxies the same paths (not /oauth/consent, which is the site's page). borso-shared template snapshot unchanged.
artifacts:
  - infra/cdk/src/constructs/static-site.ts
  - infra/cdk/src/constructs/previewable-app.ts
  - infra/cdk/src/internal/naming.utils.ts
  - infra/cdk/src/index.ts
  - apps/pragma/cdk/lib/stack.ts
  - apps/pragma/vite.config.ts
next:
  kind: validate
---

Gates run: ESLint and Prettier on the changed files; @borso/infra build, typecheck and test:coverage (509 tests, 100%); Stryker on naming.utils.ts (177/177 killed); infra/shared tests (snapshot unchanged); pragma typecheck; pragma cdk stack test (22) and `vitest --changed --project core`; last-loop-lepin cdk test; knip; blueprint-indexing, convention-drift, architecture-graph and enforcement-ledger `--check`; full pre-commit hook. No back-e2e run: the slice changes no API code.
