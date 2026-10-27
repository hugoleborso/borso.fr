# Technical validation — assistants act on pragma through MCP and OAuth (third pass)

- Spec: [`../spec/spec.md`](../spec/spec.md)
- Plan: [`../plan/plan.md`](../plan/plan.md)
- Previous passes: [`technical-validation-2026-10-27-1234.md`](./technical-validation-2026-10-27-1234.md) (FAIL on `1f88c0fb`), [`technical-validation-2026-10-27-1400.md`](./technical-validation-2026-10-27-1400.md) (PASS on `f057f6f0`)
- Branch: `claude/pragma-assistants-mcp`
- Base: `origin/main` (`4e13a331`; merge base `972c4eea`, the two commits `main` gained touch none of the branch's files)
- Head: `fc97e95b`
- Run at: 2026-10-27T15:19:45Z
- Touched workspaces: `@borso-app/pragma` (api, site, cdk), `@borso/infra` (infra/cdk)
- Run mode: the `technical-validator` agent procedure, run inline by the pipeline stage `technical-validation-01` (second run under that label), because a workflow subagent has no `Agent` tool to dispatch it. The stage did not implement the feature and read only the spec, the plan, the diff and the earlier reports.
- Scope: the whole branch diff against `origin/main` (167 files, 140 of them not markdown or images). Every gate below was re-run on `fc97e95b`. Since the second pass, code changed only in `b23c3708` (the visual-validation fix): `oauth/oauth.repository.ts` (`listGrantsOfMember` joins the member credential), `oauth/oauth.controller.test.ts` (one new e2e case), `__test/test-seed.service.ts` (the seeded grant takes the member's real epoch).

The spec routes the Account section and the consent page (Allow, Deny, Revoke at 375 px and 1280 px) to `/visual-validation`: 3 use cases, out of scope for this report. The manual smoke with a real Claude Code, Vibe, claude.ai or Le Chat client is a `human:` gate after deploy.

## A. Correctness vs spec

| # | Spec ref | Claim | Code (file:line) | Evidence (quoted) | Verdict |
|---|---|---|---|---|---|
| A01 | Result, install URL | `https://pragma.borso.fr/mcp`, `/oauth/*` and `/.well-known/oauth-*` reach the API in production | apps/pragma/cdk/lib/stack.ts (`ASSISTANT_PATH_PATTERNS`); infra/cdk/src/constructs/static-site.ts | `'/mcp', '/oauth/authorize', '/oauth/token', '/oauth/register', '/oauth/revoke', '/.well-known/oauth-*'` passed as `extraPathPatterns` | PASS |
| A02 | Result, Account page install blocks | The install blocks give the address of the stage the page is served from | apps/pragma/site/src/lib/assistant-install.utils.ts:18-21 | `const serverOrigin = location.apiBase === '' ? location.pageOrigin : location.apiBase;` | PASS |
| A03 | Q "Where does the MCP server run" / ADR-0041 | Stateless Streamable HTTP at `/mcp`, JSON responses, no session | apps/pragma/api/src/mcp/mcp-server.adapter.ts:62-75 (transport at :64); mcp.controller.ts:58-72 | `new StreamableHTTPTransport({ sessionIdGenerator: undefined, enableJsonResponse: true })`; `.on(STATELESS_METHODS_REFUSED, '/', …)` answers 405 | PASS |
| A04 | Q "Tools from routes or services" | Each tool is the route's Zod schema plus one service call | apps/pragma/api/src/songs/songs-tools.controller.ts:58-67 | `inputSchema: songIdParamSchema, run: async ({ id }) => { const song = await findSongById(id);` | PASS |
| A05 | Result, tool list | Every tool the spec names exists | grep `name: '<tool>'` over `*-tools.controller.ts` (87 tools) | 30 of the 31 named tools found; `get_take` has no route (`GET /api/takes/:id` is not mounted, takes.controller.ts:35-107) and the spec makes the router list final | PASS |
| A06 | Result, "a route without a tool fails a test" | Two-way route and tool comparison | apps/pragma/api/src/mcp/tool-coverage.core.ts:70-90; tool-coverage.test.ts | `routesWithoutTool`, `toolsWithoutRoute`, `staleExclusions`, each asserted empty | PASS |
| A07 | Q "How are notifications triggered" | Existing fan-out, no notify tool, actor passed | apps/pragma/api/src/setlists/setlists-tools.controller.ts:98; sessions-tools.controller.ts:44 | `await createSetlist(input, actor)`, `await createSession(session, actor)`; no tool calls `notifyBand` (grep) | PASS |
| A08 | Edge: acts as the member | Attribution from the grant, never from input | apps/pragma/api/src/mcp/mcp.controller.ts:62; oauth/bearer-session.middleware.ts:21 | `actor: { memberId: readMemberId(context), now: clock() }`; `rememberMemberId(context, verdict.memberId)` | PASS |
| A09 | Edge: redirect URIs | https, or loopback http on any port | apps/pragma/api/src/oauth/redirect-uri.core.ts:15-39 | `return url.protocol === HTTPS_PROTOCOL \|\| isLoopbackHttp(url);`; loopback matched on host, path and query, any port | PASS |
| A10 | Edge: PKCE S256 only | `plain` refused | apps/pragma/api/src/oauth/oauth.core.ts:125-130 | `query.code_challenge_method === PKCE_METHOD && S256_CHALLENGE_PATTERN.test(challenge)` | PASS |
| A11 | Edge: rotation | A refresh token is rotated on every use | apps/pragma/api/src/oauth/oauth.repository.ts:182-199; token.service.ts:150-158 | `UPDATE … WHERE id = … AND refresh_token_hash = presented RETURNING`; new token `composeRefreshToken(refreshFamily, mintOpaqueToken())` | PASS |
| A12 | Edge: replay | Replaying an old token revokes the whole grant | apps/pragma/api/src/oauth/token.core.ts:137; token.service.ts:118-142 | grant found by `refresh_family_hash`; `if (grant.refreshTokenHash !== presented.refreshTokenHash) return 'replayed';` then `deleteGrant(grant.id)` | PASS |
| A13 | Edge: revoke on Account page | Deletes the grant; the next call is 401 | apps/pragma/api/src/oauth/oauth.repository.ts:218-224 | `.delete(assistantGrantTable).where(and(eq(…id, grantId), eq(…memberId, memberId)))` | PASS |
| A14 | Edge: credential change | A password reset ends every grant | apps/pragma/api/src/oauth/token.core.ts:114-121, 191-198; oauth.repository.ts:236-242 | `if (credential.sessionEpoch !== grant.sessionEpoch) return 'stale-epoch';` on every bearer call and refresh; since `b23c3708` the Account list also keeps only grants whose `session_epoch` equals the credential's | PASS |
| A15 | Edge: take from the terminal | `request_take_upload` then `create_take` | apps/pragma/api/src/takes/takes-tools.controller.ts:48-74 | `route: 'POST /api/takes/sign'`, `route: 'POST /api/takes'`, `await createTake(input, actor)` | PASS |
| A16 | Edge: member deleted | Grants go with the member | apps/pragma/api/src/oauth/oauth.repository.ts:256-265; members.repository.ts (diff) | grants and codes deleted through the member-deletion transaction's executor | PASS |
| A17 | Edge: previews | Per-stage issuer; grants never cloned | apps/pragma/cdk/lib/stack.ts (`SECRET_TABLES_BLOCKED_ON_PREVIEW`, `OAUTH_ISSUER`) | `'assistant_authorization_code', 'assistant_client', 'assistant_grant'` blocklisted; `OAUTH_ISSUER: apiPublicOrigin(…)` | PASS |
| A18 | Error: unknown tool, schema error | MCP error naming the field, never a 500 | SDK validation, exercised at api/src/mcp/mcp.controller.test.ts:225 | asserts the message contains `title` and the unknown tool name | PASS |
| A19 | Error: service refusal | Same code as the route | songs-tools.controller.ts:65 vs songs.controller.ts | tool `{ error: 'not-found' }`, route `context.json({ error: 'not-found' }, 404)` | PASS |
| A20 | Error: DCR rate limit | 10 per hour per address → 429 | apps/pragma/api/src/oauth/oauth.service.ts:81-89; oauth.controller.ts:82 | `consumeAttempt(ASSISTANT_REGISTRATION_BUDGET, …)`; `context.json({ error: 'rate-limited' }, 429)` | PASS |
| A21 | Q "Token lifetimes" | Access 1 h, refresh 90 days, SHA-256 hashes | apps/pragma/api/src/oauth/token.core.ts:21-22, 34-36 | `ACCESS_TOKEN_LIFETIME_SECONDS = MINUTES_PER_HOUR * SECONDS_PER_MINUTE`, `REFRESH_TOKEN_LIFETIME_DAYS = 90`, `createHash('sha256')` | PASS |
| A22 | ADR-0042, discovery | RFC 9728 and RFC 8414 metadata, path-suffixed form | apps/pragma/api/src/oauth/oauth.controller.ts:51-60 | `.get('/oauth-authorization-server'…)`, `.get('/oauth-protected-resource'…)`, `.get('/oauth-protected-resource/mcp'…)` | PASS |
| A23 | Mermaid, 401 | `WWW-Authenticate` names the resource metadata | apps/pragma/api/src/oauth/token.core.ts:180-182; bearer-session.middleware.ts:16-19 | `` `Bearer resource_metadata="${selectProtectedResourceMetadataUrl(issuer)}"` `` | PASS |
| A24 | Edge: sign in first | The consent query survives sign-in | apps/pragma/site/src/components/organisms/RequireSession.tsx (diff) | `from: `${location.pathname}${location.search}`` | PASS |
| A25 | Database changes | Three tables, hashes only, no `DEFAULT now()` | apps/pragma/api/src/database/migrations/0020_assistant_grants.sql | three `CREATE TABLE`; `refresh_family_hash` per plan D5; unique indexes on the hash columns | PASS |
| A26 | Types / domain model | New nouns in `VOCABULARY.md` | apps/pragma/VOCABULARY.md (diff) | `scripts/check-vocabulary-paths.sh` → exit 0 | PASS |
| A27 | Analytics inputs | Four product events | oauth.service.ts:94; token.service.ts:106, 140, 186; mcp-server.adapter.ts:32-36, 44 | `assistant_client_registered`, `assistant_grant_created`, `assistant_grant_revoked`, `mcp_tool_called` | PASS |
| A28 | Zero-defect | `OAuthTokenReplay`, `McpToolFailed`, `OAuthRegistrationRateLimited` reported | token.service.ts:136-139; mcp-server.adapter.ts:40-43; oauth.service.ts:87 | `exchange.reportFailure({ name: TOKEN_REPLAY_FAILURE, …})` and the two others | PASS |
| A29 | Out of scope | Tools only, no resources, prompts or streaming | apps/pragma/api/src/mcp/mcp-server.adapter.ts:50-60 | only `server.registerTool(…)`; e2e asserts capabilities `['tools']` | PASS |

## B. Code cleanliness

| # | Rule | Check | Evidence | Verdict |
|---|---|---|---|---|
| B01 | ESLint clean | `NODE_OPTIONS=--max-old-space-size=8192 pnpm exec eslint --no-warn-ignored --max-warnings 0 <131 changed .ts/.tsx/.js files>` | exit 0. Without the larger heap the run aborts with "JavaScript heap out of memory" (exit 1, no lint verdict) | PASS |
| B02 | Prettier clean | `pnpm exec prettier --check --ignore-unknown <140 changed non-markdown files>` | exit 0, "All matched files use Prettier code style!" (`.sql`, `.sh`, `.jsonl` have no parser; markdown is excluded by `.prettierignore`) | PASS |
| B03 | Typecheck | `pnpm --filter @borso-app/pragma typecheck` (cdk and app tsconfigs) | exit 0 | PASS |
| B04 | knip | `pnpm exec knip` | exit 0, configuration hints only | PASS |
| B05 | Type assertions only `as const` / `as unknown` | grep `\bas (?!const\|unknown)` over changed files | only test names and import aliases (`Function as CloudFrontFunction`, `TEST_ENV as ENV`); `as const` at ConsentPage.tsx:89 | PASS |
| B06 | No `any` | grep `: any\|<any>\|as any` | none | PASS |
| B07 | No comments in code | added `//` and `/*` lines; `borso/no-comments` in B01 | only `@FollowsBlueprint`, `@Feature`, `@DependsOnExternal`, `@vitest-environment` blocks and one `Stryker disable next-line … : <reason>` (oauth.core.ts:139) | PASS |
| B08 | Names carry intent, named constants | sampled oauth/, mcp/, tool controllers | `ACCESS_TOKEN_LIFETIME_MS`, `LAST_USE_WRITE_INTERVAL_MS`, `BEARER_PREFIX`, `METHOD_NOT_ALLOWED_STATUS`, `OPAQUE_TOKEN_BYTES`; no one-letter locals | PASS |
| B09 | Controllers are dispatchers | grep `.filter(\|.map(\|.reduce(\|.find(\|.sort(` in `*-tools.controller.ts` | none; each tool maps one service outcome to an answer | PASS |
| B10 | Layer suffixes and blueprints | `scripts/reports.sh blueprints`; `blueprint-indexing.ts --check`; `convention-drift.ts --check` | "Annotations are complete"; "No question gained a new answer" | PASS |
| B11 | `useEffect` is a smell | grep `useEffect(` in changed `.tsx/.ts` | none | PASS |
| B12 | `site/` never imports `@api/*` beyond the router type | ESLint `borso/no-api-import-in-site` | covered by B01 | PASS |

## C. Tests pass

| # | Workspace | Command | Exit | Verdict |
|---|---|---|---|---|
| C01 | @borso-app/pragma (core) | `pnpm --filter @borso-app/pragma run test:core` | 0 — 270 files, 2746 tests, 100% statements (4402), branches (2069), functions (1255), lines (3767) | PASS |
| C02 | @borso-app/pragma (back-e2e) | `pnpm --filter @borso-app/pragma run test` on the local Postgres | 0 — 48 files, 379 tests (one more than the second pass: the `b23c3708` case) | PASS |
| C03 | @borso/infra | `pnpm --filter @borso/infra run test:coverage` | 0 — 30 files, 509 tests, 100% on all four measures | PASS |
| C04 | Mutation, changed pure modules | `pnpm exec stryker run --mutate <the 12 changed pragma *.core.ts, *.utils.ts, *.adapter.ts, comma-separated>`; infra/cdk `--mutate src/internal/naming.utils.ts` | 0 — pragma 573 killed, 0 survived; infra 177 killed, 0 survived; score 100 both | PASS |
| C05 | `*.utils.ts` have a sibling test | `assistant-install.utils.ts`, `formatters.utils.ts`, `rate-limit.utils.ts`, `naming.utils.ts` | each has its `*.utils.test.ts`, run in C01 and C03 | PASS |

## D. Test coverage of spec

Use cases routed to `/visual-validation` (Account section install blocks and Revoke, consent Allow and Deny, at 375 px and 1280 px): 3; out of scope for this report.

| # | Use case | Covering test | Verdict |
|---|---|---|---|
| D01 | Happy 1–2: register, authorize, sign in, allow, tokens | `runs the whole flow: consent, code, tokens, and the code cannot be spent twice` at api/src/oauth/oauth.controller.test.ts:412 — `expect(grants[0]?.memberId).toBe(member.memberId)` | PASS |
| D02 | Happy 3: tools listed, calls succeed | `lists every served tool, advertises tools only, and serves two clients at once with no session` at api/src/mcp/mcp.controller.test.ts:195 | PASS |
| D03 | Happy 4: other members pushed, actor not | `pushes each setlist change to the other members only` in api/src/setlists/setlists-tools.controller.test.ts (also the sessions, takes, songs and transitions tool suites) | PASS |
| D04 | Edge: attribution to the granting member | `comments on a take as the granting member, …` in api/src/takes/takes-tools.controller.test.ts | PASS |
| D05 | Edge: redirect URI https or loopback any port | unit table in api/src/oauth/redirect-uri.core.test.ts; e2e `registers the clients Claude Code and Vibe describe, and refuses any other redirect address` at oauth.controller.test.ts:293 | PASS |
| D06 | Edge: PKCE S256, `plain` refused | `refuses another verifier, a challenge of another length, and the plain method` in api/src/oauth/token.core.test.ts; e2e `never redirects an unknown client …, and redirects other faults back` at oauth.controller.test.ts:359 | PASS |
| D07 | Edge: refresh rotated on every use | `rotates the refresh token, and a replay of the old one revokes the grant and is reported` at oauth.controller.test.ts:511 | PASS |
| D08 | Edge: replaying an old refresh token revokes the grant | `revokes the grant when a token two rotations old is replayed after a thief refreshed twice` at oauth.controller.test.ts:532, plus :511 | PASS |
| D09 | Edge: revoke on Account page → next call 401 | `stops answering once the member revokes the grant on the Account page` at mcp.controller.test.ts:240 | PASS |
| D10 | Edge: password reset loses every grant (tokens refused) | `stops answering once the member resets their password` at mcp.controller.test.ts:262; `ends every grant of a member who changes password` at oauth.controller.test.ts:631 | PASS |
| D11 | Edge: password change loses every grant (no longer listed) | `stops listing the grants of a member who changes password before any assistant calls again` at oauth.controller.test.ts:649 — `expect(listed.grants).toEqual([])` after `PUT /api/me/password`, with no refresh or call in between, so only the new join can empty the list | PASS |
| D12 | Edge: take from the terminal | `signs an upload, then records the take as the granting member` in api/src/takes/takes-tools.controller.test.ts | PASS |
| D13 | Edge: deleting a member deletes their grants | `deletes the grants and pending codes of a deleted member` at oauth.controller.test.ts:733 | PASS |
| D14 | Edge: previews keep grants out of the clone | clone and reader blocklist assertions in apps/pragma/cdk/test/stack.test.ts | PASS |
| D15 | Error: unknown tool or schema error → MCP error naming the field | `answers an argument the schema refuses with an error naming the field, never a 500` at mcp.controller.test.ts:225 | PASS |
| D16 | Error: service refusal → same code as the route | `answers the refusal codes the routes answer` in songs-tools.controller.test.ts (and the sessions, setlists, takes suites) | PASS |
| D17 | Error: 11th registration in an hour → 429 | `refuses the eleventh registration in an hour from one address and reports it` at oauth.controller.test.ts:317 | PASS |
| D18 | Test strategy: route and tool lists match | api/src/mcp/tool-coverage.test.ts; core cases in tool-coverage.core.test.ts | PASS |

## E. Scale

| # | Write path or state | Question | Failing case, or the key or test that holds it | Verdict |
|---|---|---|---|---|
| E01 | `exchangeAuthorizationCode` → `claimAuthorizationCode` (token.service.ts:87-90; oauth.repository.ts:87-102) | Check-then-write, concurrent proof | `DELETE … WHERE code_hash = … RETURNING` on the primary key; a DSQL conflict is caught by `claimingOrLosing(…, null)`. Tests at oauth.controller.test.ts:552 (race, `[200, 400]`, one grant) and :567 (simulated commit abort → `invalid_grant`) | PASS |
| E02 | `exchangeRefreshToken` → `hasRotatedGrant` (token.service.ts:150-158; oauth.repository.ts:182-199) | Check-then-write, concurrent proof | Conditional `UPDATE … WHERE refresh_token_hash = presented RETURNING`; tests at :587 (race) and :601 (simulated abort → `invalid_grant`, grant kept) | PASS |
| E03 | Replay and expiry → `deleteGrant` (token.service.ts:131-149) | Concurrent write | Delete by primary key, idempotent, under `retryingConflictAborts` | PASS |
| E04 | `recordGrantUse` → `updateGrantLastUse` (token.service.ts:192-200) | Concurrent write | Throttled to once every 5 minutes, a conflict abort is caught and logged; two parallel clients both succeed in mcp.controller.test.ts:195 | PASS |
| E05 | `registerAssistantClient` → rate-limit bucket (oauth.service.ts:81-89) | Check-then-write | The existing atomic counter `incrementAttemptBucket` behind `consumeAttempt` (credentials.service.ts:40-52), not a read then a write | PASS |
| E06 | `insertAssistantClient`, `insertAuthorizationCode`, `insertAssistantGrant` | Check-then-write | No decision read first; keys are `randomUUID()` or the hash of 32 random bytes | PASS |
| E07 | `listGrantsOfMember` (oauth.repository.ts:226-245, changed in `b23c3708`) | Write path | A read only; adds no write | PASS |
| E08 | Per-process state | grep `^(let\|const) x = new (Map\|Set)\|^let ` in changed api files | none; the MCP server and transport are built per request | PASS |
| E09 | Tool write paths | New write logic in services | Tools call the service functions the routes call; the service diffs are `defineTool` re-exports and the `saveOwnContactDetails` return shape | PASS |

## Notes

- **No blocker.** The only code change since the second pass, `b23c3708`, is covered by D11 and passes every gate.
- **ESLint needs a larger heap on this diff.** With the default Node heap the 131-file run dies with "JavaScript heap out of memory"; with `--max-old-space-size=8192` it exits 0. This affects the gate's running, not the code. The second pass hit the same thing.
- **Question, a code issued before a password change.** `exchangeAuthorizationCode` (token.service.ts:91-102) stamps the new grant with the credential's epoch *at exchange time*. Allow on the consent page at t, a password change at t+10 s, the exchange at t+20 s → a live grant under the new epoch. The spec speaks of grants, and this is a pending code inside its 60-second life, bound to the client's PKCE verifier, so it is not graded. Should a code carry the epoch it was issued under, so a password change also ends codes already handed out?
- **Question, the consent page names the client in its own words.** Any client may register with any `https://` redirect address and any `client_name` (oauth.core.ts:82-85), and the consent page shows only that name ("Claude Code wants to act on pragma as Hugo"). A page that registers itself as "Claude Code" with its own redirect address gets the same wording as the real one. The spec fixes that wording; should the consent page also show the redirect host?
- **Question, a lost refresh answer signs the client out (carried over).** A client that retries a refresh whose answer it lost presents a token that is no longer current and revokes its own grant. That is what the spec's replay rule says.
- **Question, song creation and notifications (carried over).** Input metric (3) and plan gate 14 say a song created through the MCP notifies the other members, but `createSong` sends no push in the app either, and the Product decision is "exactly like one made in the app". The code follows the decision.
- **`get_take`.** Listed by the spec, but no route reads one take and the spec makes the router list final (A05).
- **Question, consent page framing (carried over).** No `frame-ancestors` or `X-Frame-Options` in `apps/pragma` or `infra/cdk/src` (grep). Does anything deny framing, so a page cannot overlay the Allow button?

## Verdict: PASS
