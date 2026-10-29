---
status: done
summary: Slice 7 (consent page and Account section) shipped in 84a0fb80. RequireSession keeps pathname plus search through sign-in; routes/oauth/ConsentPage.tsx with consent.core.ts (readAuthorizationQuery, selectConsentView) posts Allow or Deny and leaves for redirectTo in the mutation's onSuccess; AccountSettings gains AssistantConnections (InstallCommandBlock and AssistantGrantRow molecules) with install snippets built from the page origin by assistant-install.utils.ts; assistant-grants.queries.ts holds the grants list, a pessimistic revoke, the consent read and the consent decision; en/fr strings; the test seed seeds one grant for Hugo and returns its client id.
artifacts:
  - apps/pragma/site/src/components/organisms/RequireSession.tsx
  - apps/pragma/site/src/routes/login.core.test.ts
  - apps/pragma/site/src/routes/oauth/ConsentPage.tsx
  - apps/pragma/site/src/routes/oauth/consent.core.ts
  - apps/pragma/site/src/routes/oauth/consent.core.test.ts
  - apps/pragma/site/src/App.tsx
  - apps/pragma/site/src/components/organisms/AssistantConnections.tsx
  - apps/pragma/site/src/components/organisms/AccountSettings.tsx
  - apps/pragma/site/src/components/molecules/InstallCommandBlock.tsx
  - apps/pragma/site/src/components/molecules/AssistantGrantRow.tsx
  - apps/pragma/site/src/lib/queries/assistant-grants.queries.ts
  - apps/pragma/site/src/lib/queries/assistant-grants.queries.test.tsx
  - apps/pragma/site/src/lib/assistant-install.utils.ts
  - apps/pragma/site/src/lib/assistant-install.utils.test.ts
  - apps/pragma/site/src/lib/formatters.utils.ts
  - apps/pragma/site/src/lib/formatters.utils.test.ts
  - apps/pragma/site/src/lib/page-location.adapter.ts
  - apps/pragma/site/src/lib/page-location.adapter.test.ts
  - apps/pragma/site/src/i18n/en.json
  - apps/pragma/site/src/i18n/fr.json
  - apps/pragma/site/src/i18n/i18n-parity.core.test.ts
  - apps/pragma/api/src/__test/test-seed-assistant-grant.core.ts
  - apps/pragma/api/src/__test/test-seed-assistant-grant.core.test.ts
  - apps/pragma/api/src/__test/test-seed.service.ts
  - apps/pragma/api/src/__test/test-seed.repository.ts
  - apps/pragma/api/src/__test/test-seed.controller.test.ts
  - scripts/architecture/manifests/pragma.manifest.ts
next:
  kind: validate
---

Changes from the plan, each decided here:

- Revoke is pessimistic as planned, but settles from the DELETE response by dropping the row from the grants cache instead of invalidating the key. An immediate re-read can reach a DSQL connection that still sees the grant (docs/dantotsus/optimistic-reorder-reverted-by-stale-dsql-read.md), and the response already confirms the deletion.
- The consent read and decision hooks (`useConsentDescription`, `useDecideConsent`) live in `assistant-grants.queries.ts`, beside the grants, since all four call the oauth slice.
- `window.location.origin` and `window.location.assign` go through a new `lib/page-location.adapter.ts`, declared as the `browser-location` external system in the pragma architecture manifest. The clipboard manifest entry now also names the install commands.
- "last used 2 min ago" needs a relative time, so `formatTimeAgo(iso, nowEpochMs, locale)` joins `formatters.utils.ts` (Intl.RelativeTimeFormat). The organism reads `now` from `clock.store.ts` through `useSyncExternalStore`.
- Install snippets wrap inside their box (`whitespace-pre-wrap break-all`) rather than scrolling, so the whole Claude Code command is readable at 375 px and 1280 px.
- The test seed's `deleteAllDomainRows` did not clear `assistant_grant`, `assistant_authorization_code` or `assistant_client`; it does now. The seeded client and grant sit in their own `test-seed-assistant-grant.core.ts` because the fixture file would otherwise exceed `max-lines`.
- The three product-name labels (Claude Code, Mistral Vibe, claude.ai and Le Chat) are listed as identical by design in the i18n parity test.

Gates run: ESLint (`--no-warn-ignored --max-warnings 0`) and Prettier `--check` on every changed file; `pnpm --filter @borso-app/pragma typecheck`; the full core project with coverage (270 files, 2738 tests, 100% statements, branches, functions and lines); Stryker `--mutate` on consent.core.ts, assistant-install.utils.ts, formatters.utils.ts and test-seed-assistant-grant.core.ts (102 mutants, 100% score); back-e2e `api/src/__test` on the local Postgres (10 tests); knip; blueprint-indexing, convention-drift and architecture-graph `--check`; check-vocabulary-paths; check-pure-modules-have-callers; the full pre-commit hook.

Self-check in the browser (scripts/browser.sh against `pnpm dev`, fixture seeded): a signed-out visit to the consent address went to /login and came back to the same address with its query after sign-in; at 375 px and 1280 px the consent page reads "Claude Code wants to act on pragma as Hugo."; Allow landed on `http://127.0.0.1:4555/callback?code=…&state=opaque-state` and Deny on `…?error=access_denied&state=opaque-state` (a local listener held the port); an unknown client showed the invalid-request alert; the Account section showed the three blocks with the dev origin's `/mcp`, Copy reported "Copied.", the seeded grant read "since Oct 27 · last used 3 minutes ago", Revoke removed it and a reload showed "No assistant connected yet."; no horizontal scroll at 375 px; no broken image.
