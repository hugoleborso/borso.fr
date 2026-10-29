---
status: done
summary: Slice 2 (OAuth authorization server) shipped. Migration 0020 adds assistant_client, assistant_authorization_code and assistant_grant (no DEFAULT now(), session_epoch, previous_refresh_token_hash, refresh_expires_at, unique indexes on the three token hashes). apps/pragma/api/src/oauth/ serves discovery (both protected-resource forms), registration with the database rate limit (10 per hour per address) and the 30-day sweep, /oauth/authorize redirecting to the site's /oauth/consent, cookie-gated GET/POST /api/oauth/consent, /oauth/token (code with PKCE S256, refresh rotation, replay revokes and reports OAuthTokenReplay), /oauth/revoke, and /api/assistant-grants list and delete. Member deletion deletes grants and codes; the three tables join the preview clone and reader blocklists.
artifacts:
  - apps/pragma/api/src/database/migrations/0020_assistant_grants.sql
  - apps/pragma/api/src/oauth/
  - apps/pragma/api/src/app.ts
  - apps/pragma/api/src/auth/rate-limit.utils.ts
  - apps/pragma/api/src/auth/credentials.service.ts
  - apps/pragma/api/src/database/schema.ts
  - apps/pragma/api/src/members/members.repository.ts
  - apps/pragma/cdk/lib/stack.ts
  - apps/pragma/cdk/test/stack.test.ts
  - apps/pragma/test/database-utils.ts
  - apps/pragma/package.json
  - apps/pragma/VOCABULARY.md
  - docs/adr/0009-pragma-previews-clone-production.md
  - docs/adr/0044-read-only-production-database-access-for-agents.md
next:
  kind: validate
---

Changes from the plan, each decided here:

- Registration bodies are parsed with a pragma zod 3 schema, not the SDK's `OAuthClientMetadataSchema`, and the metadata types are pragma's own (`oauth.types.ts`). The SDK only joins the catalog in slice 3; slice 3 may switch to its schemas.
- The registration limit counts in the existing `auth_attempt` buckets through `consumeAttempt` (now exported from `credentials.service.ts`), not the in-memory `middleware-public-rate-limit` blueprint, so every Lambda instance shares one count.
- The pure rules are split over `oauth.core.ts`, `token.core.ts` and `redirect-uri.core.ts`, and token exchange lives in `token.service.ts`, to stay under the 300-line limit.
- `assistant_grant` also carries `refresh_expires_at` (the 90-day refresh life needs a column) and `access_token_hash` is NOT NULL, since every grant has an access token.
- `createApp` takes `oauth: { clock, reportFailure }`, so the e2e suite can move the clock past a code's life and observe `OAuthTokenReplay` and `OAuthRegistrationRateLimited`.
- `dev:api` sets `OAUTH_ISSUER` and `OAUTH_CONSENT_ORIGIN` to the Vite origin, because the reader refuses to start without them.
- Not in this slice, as the plan's slice table puts them in slice 3: the bearer gate, `last_used_at` writes (D9) and the "/mcp answers 401 after revoke" assertions.

Gates run: ESLint and Prettier on every changed file; `pnpm --filter @borso-app/pragma typecheck`; `test:core` (262 files, coverage gate green); back-e2e (OAuth suite 17 cases, members, migration audit, then the full suite); Stryker on oauth.core.ts, token.core.ts, redirect-uri.core.ts and rate-limit.utils.ts (100%, one equivalent mutant disabled with its reason); knip; blueprint-indexing, convention-drift, architecture-graph and enforcement-ledger `--check`; check-vocabulary-paths.
