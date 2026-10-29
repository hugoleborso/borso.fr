# Technical validation — assistants act on pragma through MCP and OAuth (second pass)

- Spec: [`../spec/spec.md`](../spec/spec.md)
- Plan: [`../plan/plan.md`](../plan/plan.md)
- Previous pass: [`technical-validation-2026-10-27-1234.md`](./technical-validation-2026-10-27-1234.md) (FAIL on `1f88c0fb`)
- Branch: `claude/pragma-assistants-mcp`
- Base: `origin/main`
- Head: `f057f6f0`
- Run at: 2026-10-27T14:00:19Z
- Touched workspaces: `@borso-app/pragma` (api, site, cdk), `@borso/infra` (infra/cdk)
- Run mode: the `technical-validator` agent procedure, executed inline by the pipeline stage `technical-validation-02`, because a workflow subagent has no `Agent` tool to dispatch it. The stage did not implement the feature and read only the spec, the plan, the diff and the previous report.
- Scope: the whole branch diff against `origin/main` (159 files). Every gate below was re-run on `f057f6f0`. Since `1f88c0fb`, code changed only in `d992239a` and `a6026bbf` (15 files: `oauth/{token.core,token.service,oauth.repository,oauth.schema,oauth.types}.ts`, migration 0020, `site/src/lib/{assistant-install.utils,api.client}.ts`, `AssistantConnections.tsx`, their tests, `test-seed.service.ts`, `VOCABULARY.md`); rows on other files were re-read where cited with new line numbers and otherwise stand on unchanged code.

The spec routes the Account section and the consent page (Allow, Deny, Revoke at 375 px and 1280 px) to `/visual-validation`: 3 use cases, out of scope for this report. The manual smoke with a real Claude Code, Vibe, claude.ai or Le Chat client is a `human:` gate after deploy.

## A. Correctness vs spec

| # | Spec ref | Claim | Code (file:line) | Evidence (quoted) | Verdict |
|---|---|---|---|---|---|
| A01 | Result, install URL | `https://pragma.borso.fr/mcp`, `/oauth/*` and `/.well-known/oauth-*` reach the API in production | apps/pragma/cdk/lib/stack.ts (`ASSISTANT_PATH_PATTERNS`); infra/cdk/src/constructs/static-site.ts | `'/mcp', '/oauth/authorize', '/oauth/token', '/oauth/register', '/oauth/revoke', '/.well-known/oauth-*'` passed as `extraPathPatterns` | PASS |
| A02 | Result, Account page install blocks | The install blocks give an address that reaches the MCP server of the stage the page is served from | apps/pragma/site/src/lib/assistant-install.utils.ts:19-22; AssistantConnections.tsx:45-48; .github/workflows/preview.yml:152 | `const serverOrigin = location.apiBase === '' ? location.pageOrigin : location.apiBase;` fed `{ apiBase: API_BASE, pageOrigin: readPageOrigin() }`; a preview builds with `VITE_API_BASE: https://<app>-pr-<N>-api.preview.borso.fr`, the host `OAUTH_ISSUER` names; production leaves it empty, so `https://pragma.borso.fr/mcp` | PASS |
| A03 | Q "Where does the MCP server run" / ADR-0041 | Stateless Streamable HTTP at `/mcp`, JSON responses, no session | apps/pragma/api/src/mcp/mcp-server.adapter.ts:62-75 | `new StreamableHTTPTransport({ sessionIdGenerator: undefined, enableJsonResponse: true })`; GET and DELETE answer 405 (mcp.controller.ts:66-72) | PASS |
| A04 | Q "Tools from routes or services" | Each tool is the route's Zod schema plus one service call, as the member | apps/pragma/api/src/songs/songs-tools.controller.ts:58-98 | `inputSchema: songIdParamSchema, run: async ({ id }) => { const song = await findSongById(id); …` | PASS |
| A05 | Result, tool list | Every tool the spec names exists | `grep name: '<tool>'` over `*-tools.controller.ts` | 30 of 31 named tools found; `get_take` has no route (`GET /api/takes/:id` is not mounted, takes.controller.ts:35-107), and the spec makes the router list final | PASS |
| A06 | Result, "a route without a tool fails a test" | Two-way route and tool comparison | apps/pragma/api/src/mcp/tool-coverage.test.ts:27-37 | `expect(readCoverage().routesWithoutTool).toEqual([])`, `toolsWithoutRoute`, `staleExclusions` | PASS |
| A07 | Q "How are notifications triggered" | Existing fan-out, no notify tool, actor skipped | apps/pragma/api/src/setlists/setlists-tools.controller.ts:97-98 | `run: async (input, actor) => { const outcome = await createSetlist(input, actor);` — no tool calls `notifyBand` (grep) | PASS |
| A08 | Edge: acts as the member | Attribution from the grant, never from input | apps/pragma/api/src/mcp/mcp.controller.ts:59-62; oauth/bearer-session.middleware.ts:21 | `actor: { memberId: readMemberId(context), now: clock() }`; `rememberMemberId(context, verdict.memberId)` | PASS |
| A09 | Edge: redirect URIs | https, or loopback http on any port | apps/pragma/api/src/oauth/redirect-uri.core.ts:15-39 | `return url.protocol === HTTPS_PROTOCOL \|\| isLoopbackHttp(url);` and same host, path and query on any port | PASS |
| A10 | Edge: PKCE S256 only | `plain` refused | apps/pragma/api/src/oauth/oauth.core.ts:125-130 | `query.code_challenge_method === PKCE_METHOD && S256_CHALLENGE_PATTERN.test(challenge)` | PASS |
| A11 | Edge: rotation | A refresh token is rotated on every use | apps/pragma/api/src/oauth/oauth.repository.ts:181-198; token.service.ts:150-158 | `UPDATE … SET refresh_token_hash = new … WHERE id = … AND refresh_token_hash = presented RETURNING`; the new token is `composeRefreshToken(refreshFamily, mintOpaqueToken())` | PASS |
| A12 | Edge: replay | "Replaying an old one revokes the whole grant" | apps/pragma/api/src/oauth/token.core.ts:137, 147-148; token.service.ts:118-138; oauth.repository.ts:129-146 | the grant is found by `refresh_family_hash` (the `<family>` part of `<family>.<secret>`, kept across rotations), then `if (grant.refreshTokenHash !== presented.refreshTokenHash) return 'replayed';` → `deleteGrant` under `retryingConflictAborts`, so any older token of the grant revokes it | PASS |
| A13 | Edge: revoke on Account page | Deletes the grant; next call is 401 | apps/pragma/api/src/oauth/oauth.repository.ts:223-229 | `.delete(assistantGrantTable).where(and(eq(…id, grantId), eq(…memberId, memberId)))` | PASS |
| A14 | Edge: credential change | A password reset ends every grant | apps/pragma/api/src/oauth/token.core.ts:112-119, 181-188 | `if (credential.sessionEpoch !== grant.sessionEpoch) return 'stale-epoch';` checked on every bearer call and refresh | PASS |
| A15 | Edge: take from the terminal | `request_take_upload` then `create_take` | apps/pragma/api/src/takes/takes-tools.controller.ts:48-71 | `route: 'POST /api/takes/sign'` and `route: 'POST /api/takes'` | PASS |
| A16 | Edge: member deleted | Grants go with the member | apps/pragma/api/src/members/members.repository.ts (diff); oauth.repository.ts:255-263 | `await deleteAssistantStateOfDeletedMember(transaction, id);` deletes grants and codes in the member-deletion transaction | PASS |
| A17 | Edge: previews | Per-stage issuer; grants never cloned | apps/pragma/cdk/lib/stack.ts:26-29, 170 | `'assistant_authorization_code', 'assistant_client', 'assistant_grant'` in `SECRET_TABLES_BLOCKED_ON_PREVIEW` → `tableBlocklist`; `OAUTH_ISSUER: apiPublicOrigin(…)` | PASS |
| A18 | Error: unknown tool, schema error | MCP error naming the field, never a 500 | SDK validation, exercised in mcp.controller.test.ts:225-238 | `expect(String(refusal.body)).toContain('title')`, `toContain('add_song')` | PASS |
| A19 | Error: service refusal | Same code as the route | apps/pragma/api/src/songs/songs-tools.controller.ts:65 vs songs.controller.ts:43 | tool `{ error: 'not-found' }`, route `context.json({ error: 'not-found' }, 404)` | PASS |
| A20 | Error: DCR rate limit | 10 per hour per address → 429 | apps/pragma/api/src/oauth/oauth.service.ts:78-89; oauth.controller.ts:107 | `consumeAttempt(ASSISTANT_REGISTRATION_BUDGET, …)`; `context.json({ error: 'rate-limited' }, 429)` | PASS |
| A21 | Q "Token lifetimes" | Access 1 h, refresh 90 days, SHA-256 hashes | apps/pragma/api/src/oauth/token.core.ts:21-22, 35 | `ACCESS_TOKEN_LIFETIME_SECONDS = MINUTES_PER_HOUR * SECONDS_PER_MINUTE`, `REFRESH_TOKEN_LIFETIME_DAYS = 90`, `createHash('sha256')` | PASS |
| A22 | ADR-0042, discovery | RFC 9728 and RFC 8414 metadata, path-suffixed form | apps/pragma/api/src/oauth/oauth.controller.ts:76-85 | `.get('/oauth-authorization-server'…)`, `.get('/oauth-protected-resource'…)`, `.get('/oauth-protected-resource/mcp'…)` | PASS |
| A23 | Mermaid, 401 | `WWW-Authenticate` names the resource metadata | apps/pragma/api/src/oauth/token.core.ts:170-172; bearer-session.middleware.ts:16-19 | `` `Bearer resource_metadata="${selectProtectedResourceMetadataUrl(issuer)}"` `` | PASS |
| A24 | Edge: sign in first | The consent query survives sign-in | apps/pragma/site/src/components/organisms/RequireSession.tsx (diff) | `state={{ from: `${location.pathname}${location.search}` }}` | PASS |
| A25 | Database changes | Three tables, hashes only, no `DEFAULT now()` | apps/pragma/api/src/database/migrations/0020_assistant_grants.sql:11-56 | three `CREATE TABLE`; `refresh_family_hash text NOT NULL` replaces `previous_refresh_token_hash` (plan D5 revised); unique indexes on the three hash columns, rewritten to `ASYNC` on DSQL by the runner. 0020 was edited in place: `git ls-remote origin` shows the branch at `4d1b564b` (spec only), so no stage has applied it | PASS |
| A26 | Types / domain model | New nouns in `VOCABULARY.md` | apps/pragma/VOCABULARY.md (diff) | `scripts/check-vocabulary-paths.sh` → exit 0 | PASS |
| A27 | Analytics inputs | Four product events | oauth.service.ts:94, token.service.ts:106, 140, 186; mcp-server.adapter.ts:31-35 | `recordProductEvent({ event: 'assistant_client_registered' })`, `…'assistant_grant_created'`, `…'assistant_grant_revoked'`, `TOOL_CALLED_EVENT` | PASS |
| A28 | Zero-defect | `OAuthTokenReplay`, `McpToolFailed`, `OAuthRegistrationRateLimited` reported | token.service.ts:136-139; mcp-server.adapter.ts:39-42; oauth.service.ts:87 | `exchange.reportFailure({ name: TOKEN_REPLAY_FAILURE, …})` etc. | PASS |
| A29 | Out of scope | Tools only, no resources, prompts or streaming | apps/pragma/api/src/mcp/mcp-server.adapter.ts:49-58 | only `server.registerTool(…)`; e2e `expect(Object.keys(first.getServerCapabilities() ?? {})).toEqual(['tools'])` | PASS |

## B. Code cleanliness

| # | Rule | Check | Evidence | Verdict |
|---|---|---|---|---|
| B01 | ESLint clean | `pnpm exec eslint --no-warn-ignored --max-warnings 0 <131 changed .ts/.tsx/.js files>` | exit 0 (with `NODE_OPTIONS=--max-old-space-size=8192`; the default heap aborted with SIGABRT) | PASS |
| B02 | Prettier clean | `pnpm exec prettier --check --ignore-unknown <every changed file>` | exit 0, "All matched files use Prettier code style!" (markdown excluded by `.prettierignore`; `.sql`, `.sh`, `.jsonl` have no parser) | PASS |
| B03 | Typecheck | `pnpm --filter @borso-app/pragma run typecheck` (cdk and app tsconfigs) | exit 0 | PASS |
| B04 | knip | `pnpm exec knip` | exit 0, configuration hints only | PASS |
| B05 | Type assertions only `as const` / `as unknown` | grep `\bas (?!const\|unknown)` over changed files | only prose in test names and tool descriptions; `as const` in ConsentPage.tsx:89 | PASS |
| B06 | No `any` | grep `: any\|<any>\|as any` | none | PASS |
| B07 | No comments in code | added `//` and `/*` lines in changed `.ts/.tsx` | only `@FollowsBlueprint`, `@Feature`, `@DependsOnExternal`, `@vitest-environment` and one `Stryker disable next-line … : <reason>` (oauth.core.ts:139) | PASS |
| B08 | Names carry intent, named constants | sampled oauth/, mcp/, tools controllers | `ACCESS_TOKEN_LIFETIME_MS`, `LAST_USE_WRITE_INTERVAL_MS`, `BEARER_PREFIX`, `METHOD_NOT_ALLOWED_STATUS`; no one-letter locals | PASS |
| B09 | Controllers are dispatchers | grep `.filter(\|.map(\|.reduce(\|.find(` in `*-tools.controller.ts` | none; each tool maps one service outcome to an answer | PASS |
| B10 | Layer suffixes and blueprints | `blueprint-indexing.ts --check`, `convention-drift.ts --check` | "Annotations are complete"; "No question gained a new answer" | PASS |
| B11 | `useEffect` is a smell | grep `useEffect(` in changed `.tsx` | none | PASS |
| B12 | `site/` never imports `@api/*` beyond the router type | ESLint `borso/no-api-import-in-site` | covered by B01 | PASS |

## C. Tests pass

| # | Workspace | Command | Exit | Verdict |
|---|---|---|---|---|
| C01 | @borso-app/pragma (core) | `pnpm run test:core` (inside `test:coverage`) | 0 — 270 files, 2746 tests, 100% statements (4402), branches (2069), functions (1255), lines (3767) | PASS |
| C02 | @borso-app/pragma (back-e2e) | `pnpm run test` on the local Postgres | 0 — 48 files, 378 tests | PASS |
| C03 | @borso/infra | `pnpm --filter @borso/infra run test:coverage` | 0 — 30 files, 509 tests, 100% on all four measures | PASS |
| C04 | Mutation, changed pure modules | `pnpm exec stryker run --mutate <11 changed pragma *.core.ts, *.utils.ts, *.adapter.ts, comma-separated>`; infra/cdk `--mutate src/internal/naming.utils.ts` | 0 — pragma 573 killed, 0 survived; infra 177 killed, 0 survived; score 100 both | PASS |
| C05 | `*.utils.ts` have a sibling test | `assistant-install.utils.ts`, `formatters.utils.ts`, `rate-limit.utils.ts`, `naming.utils.ts` | each has its `*.utils.test.ts`, run in C01/C03 | PASS |

## D. Test coverage of spec

Use cases routed to `/visual-validation` (Account section install blocks and Revoke, consent Allow and Deny, at 375 px and 1280 px): 3; out of scope for this report.

| # | Use case | Covering test | Verdict |
|---|---|---|---|
| D01 | Happy 1–2: register, authorize, sign in, allow, tokens | `runs the whole flow: consent, code, tokens, and the code cannot be spent twice` at api/src/oauth/oauth.controller.test.ts:412 — `expect(grants[0]?.memberId).toBe(member.memberId)` | PASS |
| D02 | Happy 3: tools listed, calls succeed | `lists every served tool, advertises tools only, …` at api/src/mcp/mcp.controller.test.ts:195 — `expect(tools.map((tool) => tool.name)).toEqual(SERVED_TOOLS)` | PASS |
| D03 | Happy 4: other members pushed, actor not | `pushes each setlist change to the other members only` at api/src/setlists/setlists-tools.controller.test.ts:362 (also sessions:133, takes:308, songs:120, transitions:41) | PASS |
| D04 | Edge: attribution to the granting member | `comments on a take as the granting member, …` at api/src/takes/takes-tools.controller.test.ts:177 | PASS |
| D05 | Edge: redirect URI https or loopback any port | `accepts a loopback address on any port against the same host, path and query` at api/src/oauth/redirect-uri.core.test.ts:41; e2e `registers the clients Claude Code and Vibe describe, and refuses any other redirect address` at oauth.controller.test.ts:293 — `expect(offLoopback.status).toBe(400)` | PASS |
| D06 | Edge: PKCE S256, `plain` refused | `refuses another verifier, a challenge of another length, and the plain method` at api/src/oauth/token.core.test.ts:66; e2e oauth.controller.test.ts:359 — `` expect(plain.headers.get('location')).toBe(`…?error=invalid_request&state=…`) `` | PASS |
| D07 | Edge: refresh rotated on every use | `rotates the refresh token, …` at oauth.controller.test.ts:511 — `expect(rotated.refresh_token).not.toBe(first.refresh_token)` | PASS |
| D08 | Edge: replaying an old refresh token revokes the grant | `revokes the grant when a token two rotations old is replayed after a thief refreshed twice` at api/src/oauth/oauth.controller.test.ts:532 — `expect(await countGrants()).toBe(0)` and the thief's R3 answers `invalid_grant`; one-rotation replay at :511; unit `flags any other token of the family as a replay, however many rotations old` at token.core.test.ts:185 | PASS |
| D09 | Edge: revoke on Account page → next call 401 | `stops answering once the member revokes the grant on the Account page` at api/src/mcp/mcp.controller.test.ts:240 — `expect(afterRevoke.status).toBe(401)` | PASS |
| D10 | Edge: password reset loses every grant | `stops answering once the member resets their password` at mcp.controller.test.ts:262; `ends every grant of a member who changes password` at oauth.controller.test.ts:631 | PASS |
| D11 | Edge: take from the terminal | `signs an upload, then records the take as the granting member` at api/src/takes/takes-tools.controller.test.ts:142 | PASS |
| D12 | Edge: deleting a member deletes their grants | `deletes the grants and pending codes of a deleted member` at oauth.controller.test.ts:709 — `expect(await countGrants()).toBe(0)` | PASS |
| D13 | Edge: previews keep grants out of the clone | `clones prod into a preview with its passwords, but no passkey, …` at apps/pragma/cdk/test/stack.test.ts:178, and the reader blocklist at :145 | PASS |
| D14 | Error: unknown tool or schema error → MCP error naming the field | `answers an argument the schema refuses with an error naming the field, never a 500` at mcp.controller.test.ts:225 | PASS |
| D15 | Error: service refusal → same code as the route | `answers the refusal codes the routes answer` at songs-tools.controller.test.ts:63 (and sessions:105, setlists:255, takes:226) | PASS |
| D16 | Error: 11th registration in an hour → 429 | `refuses the eleventh registration in an hour from one address and reports it` at oauth.controller.test.ts:317 — `expect(refused.status).toBe(429)` | PASS |
| D17 | Test strategy: route and tool lists match | api/src/mcp/tool-coverage.test.ts:27-37 | PASS |

## E. Scale

| # | Write path or state | Question | Failing case, or the key or test that holds it | Verdict |
|---|---|---|---|---|
| E01 | `exchangeAuthorizationCode` → `claimAuthorizationCode` (api/src/oauth/token.service.ts:88-89; oauth.repository.ts:87-101) | Check-then-write and concurrent proof | Held by `DELETE … WHERE code_hash = … RETURNING` on the primary key; on DSQL the loser's serialization failure is caught by `claimingOrLosing(…, null)` (token.service.ts:68-78) and answered `invalid_grant`. Concurrent test `spends a code once when two exchanges race, with no server error` at oauth.controller.test.ts:552 — `toEqual([200, 400])`, `countGrants()` 1; the DSQL abort is simulated with `abortCommitsWritingTable('assistant_authorization_code', 1)` at :567 → 400 `invalid_grant`, 0 grants | PASS |
| E02 | `exchangeRefreshToken` → `hasRotatedGrant` (token.service.ts:150-158; oauth.repository.ts:181-198) | Check-then-write and concurrent proof | Held by the conditional `UPDATE … WHERE refresh_token_hash = presented RETURNING`; a conflict abort is caught by `claimingOrLosing(…, false)` → `invalid_grant`. Concurrent test `rotates a refresh token once when two refreshes race, with no server error` at oauth.controller.test.ts:587 — `toEqual([200, 400])`; simulated DSQL abort at :601 → 400 `invalid_grant`, grant kept | PASS |
| E02b | Replay and expiry → `deleteGrant` (token.service.ts:133-147) | Concurrent write | Delete by primary key, idempotent, wrapped in `retryingConflictAborts`; a lost delete race leaves no row either way | PASS |
| E03 | `recordGrantUse` → `updateGrantLastUse` (token.service.ts:192-200) | Concurrent write | Throttled to once every 5 minutes and a conflict abort is caught and logged (`if (!isConflictAbort(error)) throw error;`); two clients calling at once in mcp.controller.test.ts:204-212 both succeed | PASS |
| E04 | `registerAssistantClient` → rate-limit bucket (oauth.service.ts:81-89) | Check-then-write | Held by the existing atomic `INSERT … ON CONFLICT DO UPDATE … RETURNING` counter (auth/auth.repository.ts:67-90, blueprint `repository-atomic-counter`), whose concurrent test is auth.controller.test.ts:107 | PASS |
| E05 | `insertAssistantClient`, `insertAuthorizationCode`, `insertAssistantGrant` | Check-then-write | No decision read first: keys are `randomUUID()` or the hash of 32 random bytes | PASS |
| E06 | Per-process state | grep `^(let\|const) x = new (Map\|Set)\|^let ` in changed api files | none; the MCP server and transport are built per request (mcp-server.adapter.ts:62-75) | PASS |
| E07 | Tool write paths | New write logic in services | The tools call the existing service functions the routes call; the diff's service changes are re-exports of `defineTool` and one `saveOwnContactDetails` return shape (me.service.ts) | PASS |

## Notes

- **Previous blockers, all closed.** TV-PREVIEW-INSTALL-URL (A02) by `d992239a`; TV-REPLAY-OLDER-TOKEN (A12, D08) and TV-DSQL-CLAIM-CONFLICT (E01, E02) by `a6026bbf`, each with the test that failed before the fix.
- **Gates also green:** `pnpm --filter @borso-app/pragma run typecheck` exit 0; `pnpm exec knip` exit 0; `blueprint-indexing.ts --check` "Annotations are complete"; `convention-drift.ts --check` "No question gained a new answer"; `scripts/check-vocabulary-paths.sh` exit 0.
- **Question, a legitimate double refresh now revokes.** With the family design, if two refreshes of the same current token arrive and the second reads the grant after the first commits, the second sees a hash that is no longer current and deletes the grant (token.core.ts:137), so a client that retries a refresh whose answer it lost is signed out. That is what the spec's "replaying an old one revokes the whole grant" says and what OAuth 2.1 recommends, and the race test at oauth.controller.test.ts:587 accepts both outcomes because it asserts statuses only. Is a forced re-authentication on a lost refresh answer acceptable to the operator? No change is asked of the code.
- **Question, spec inconsistency on song creation (carried over).** Input metric (3) and plan gate 14 (plan.md:162) say a song created through the MCP notifies the other members, but `createSong` (songs.service.ts:93-103) sends no push in the app either, and the Product decision is "exactly like one made in the app". The code follows the decision. Should the metric and gate 14 name a setlist or lineup change instead, or should song creation start notifying in the app too?
- **`get_take`.** Listed by the spec, but no route reads one take and the spec makes the router list final; graded PASS on that rule (A05), as in the previous pass.
- **Question, consent page framing (carried over).** No `frame-ancestors` or `X-Frame-Options` is set in `apps/pragma` or `infra/cdk/src` (grep). Does the site's CloudFront response policy deny framing elsewhere, so a page cannot overlay the Allow button?

## Verdict: PASS
