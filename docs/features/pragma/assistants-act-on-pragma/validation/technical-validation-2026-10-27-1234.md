# Technical validation — assistants act on pragma through MCP and OAuth

- Spec: [`../spec/spec.md`](../spec/spec.md)
- Plan: [`../plan/plan.md`](../plan/plan.md)
- Branch: `claude/pragma-assistants-mcp`
- Base: `origin/main`
- Head: `1f88c0fb`
- Run at: 2026-10-27T12:34:28Z
- Touched workspaces: `@borso-app/pragma` (api, site, cdk), `@borso/infra` (infra/cdk)
- Run mode: the `technical-validator` agent procedure, executed inline by the pipeline stage `technical-validation-01`, because a workflow subagent has no `Agent` tool to dispatch it. The stage did not implement the feature and read only the spec, the plan and the diff.

The spec routes the Account section and the consent page (Allow, Deny, Revoke at 375 px and 1280 px) to `/visual-validation`; those are out of scope here. The manual smoke with a real Claude Code, Vibe, claude.ai or Le Chat client is a `human:` gate after deploy.

## A. Correctness vs spec

| # | Spec ref | Claim | Code (file:line) | Evidence (quoted) | Verdict |
|---|---|---|---|---|---|
| A01 | Result, install URL | `https://pragma.borso.fr/mcp`, `/oauth/*` and `/.well-known/oauth-*` reach the API in production | apps/pragma/cdk/lib/stack.ts (`ASSISTANT_PATH_PATTERNS`); infra/cdk/src/constructs/static-site.ts | `'/mcp', '/oauth/authorize', '/oauth/token', '/oauth/register', '/oauth/revoke', '/.well-known/oauth-*'` passed as `extraPathPatterns` | PASS |
| A02 | Result, Account page install blocks | The install blocks give an address that reaches the MCP server of the stage the page is served from | apps/pragma/site/src/lib/assistant-install.utils.ts:14-16; apps/pragma/site/src/components/organisms/AssistantConnections.tsx:44 | `return new URL(ASSISTANT_SERVER_PATH, pageOrigin).toString();` with `listAssistantInstallations(readPageOrigin())` | FAIL |
| A03 | Q "Where does the MCP server run" / ADR-0041 | Stateless Streamable HTTP at `/mcp`, JSON responses, no session | apps/pragma/api/src/mcp/mcp-server.adapter.ts:62-75 | `new StreamableHTTPTransport({ sessionIdGenerator: undefined, enableJsonResponse: true })`; GET and DELETE answer 405 (mcp.controller.ts:66-72) | PASS |
| A04 | Q "Tools from routes or services" | Each tool is the route's Zod schema plus one service call, as the member | apps/pragma/api/src/songs/songs-tools.controller.ts:58-98 | `inputSchema: songIdParamSchema, run: async ({ id }) => { const song = await findSongById(id); …` | PASS |
| A05 | Result, tool list | Every tool the spec names exists | `grep name: '<tool>'` over `*-tools.controller.ts` | 30 of 31 named tools found; `get_take` has no route (`GET /api/takes/:id` is not mounted, takes.controller.ts:35-107), and the spec makes the router list final | PASS |
| A06 | Result, "a route without a tool fails a test" | Two-way route and tool comparison | apps/pragma/api/src/mcp/tool-coverage.test.ts:27-37 | `expect(readCoverage().routesWithoutTool).toEqual([])`, `toolsWithoutRoute`, `staleExclusions` | PASS |
| A07 | Q "How are notifications triggered" | Existing fan-out, no notify tool, actor skipped | apps/pragma/api/src/setlists/setlists-tools.controller.ts:97-98 | `run: async (input, actor) => { const outcome = await createSetlist(input, actor);` — no tool calls `notifyBand` (grep) | PASS |
| A08 | Edge: acts as the member | Attribution from the grant, never from input | apps/pragma/api/src/mcp/mcp.controller.ts:59-62; oauth/bearer-session.middleware.ts:21 | `actor: { memberId: readMemberId(context), now: clock() }`; `rememberMemberId(context, verdict.memberId)` | PASS |
| A09 | Edge: redirect URIs | https, or loopback http on any port | apps/pragma/api/src/oauth/redirect-uri.core.ts:15-39 | `return url.protocol === HTTPS_PROTOCOL \|\| isLoopbackHttp(url);` and same host, path and query on any port | PASS |
| A10 | Edge: PKCE S256 only | `plain` refused | apps/pragma/api/src/oauth/oauth.core.ts:125-130 | `query.code_challenge_method === PKCE_METHOD && S256_CHALLENGE_PATTERN.test(challenge)` | PASS |
| A11 | Edge: rotation | A refresh token is rotated on every use | apps/pragma/api/src/oauth/oauth.repository.ts:186-204 | `UPDATE … SET refresh_token_hash = new, previous_refresh_token_hash = presented WHERE id = … AND refresh_token_hash = presented RETURNING id` | PASS |
| A12 | Edge: replay | "Replaying an old one revokes the whole grant" | apps/pragma/api/src/oauth/token.core.ts:128-139; oauth.repository.ts:129-143 | `if (grant.previousRefreshTokenHash === presented.refreshTokenHash) return 'replayed';` — only the one token rotated away last is remembered | FAIL |
| A13 | Edge: revoke on Account page | Deletes the grant; next call is 401 | apps/pragma/api/src/oauth/oauth.repository.ts:223-229 | `.delete(assistantGrantTable).where(and(eq(…id, grantId), eq(…memberId, memberId)))` | PASS |
| A14 | Edge: credential change | A password reset ends every grant | apps/pragma/api/src/oauth/token.core.ts:112-119, 181-188 | `if (credential.sessionEpoch !== grant.sessionEpoch) return 'stale-epoch';` checked on every bearer call and refresh | PASS |
| A15 | Edge: take from the terminal | `request_take_upload` then `create_take` | apps/pragma/api/src/takes/takes-tools.controller.ts:48-71 | `route: 'POST /api/takes/sign'` and `route: 'POST /api/takes'` | PASS |
| A16 | Edge: member deleted | Grants go with the member | apps/pragma/api/src/members/members.repository.ts (diff); oauth.repository.ts:255-263 | `await deleteAssistantStateOfDeletedMember(transaction, id);` deletes grants and codes in the member-deletion transaction | PASS |
| A17 | Edge: previews | Per-stage issuer; grants never cloned | apps/pragma/cdk/lib/stack.ts:26-29, 170 | `'assistant_authorization_code', 'assistant_client', 'assistant_grant'` in `SECRET_TABLES_BLOCKED_ON_PREVIEW` → `tableBlocklist`; `OAUTH_ISSUER: apiPublicOrigin(…)` | PASS |
| A18 | Error: unknown tool, schema error | MCP error naming the field, never a 500 | SDK validation, exercised in mcp.controller.test.ts:225-238 | `expect(String(refusal.body)).toContain('title')`, `toContain('add_song')` | PASS |
| A19 | Error: service refusal | Same code as the route | apps/pragma/api/src/songs/songs-tools.controller.ts:65 vs songs.controller.ts:43 | tool `{ error: 'not-found' }`, route `context.json({ error: 'not-found' }, 404)` | PASS |
| A20 | Error: DCR rate limit | 10 per hour per address → 429 | apps/pragma/api/src/oauth/oauth.service.ts:78-89; oauth.controller.ts:107 | `consumeAttempt(ASSISTANT_REGISTRATION_BUDGET, …)`; `context.json({ error: 'rate-limited' }, 429)` | PASS |
| A21 | Q "Token lifetimes" | Access 1 h, refresh 90 days, SHA-256 hashes | apps/pragma/api/src/oauth/token.core.ts:21-27, 32-34 | `ACCESS_TOKEN_LIFETIME_SECONDS = MINUTES_PER_HOUR * SECONDS_PER_MINUTE`, `REFRESH_TOKEN_LIFETIME_DAYS = 90`, `createHash('sha256')` | PASS |
| A22 | ADR-0042, discovery | RFC 9728 and RFC 8414 metadata, path-suffixed form | apps/pragma/api/src/oauth/oauth.controller.ts:76-85 | `.get('/oauth-authorization-server'…)`, `.get('/oauth-protected-resource'…)`, `.get('/oauth-protected-resource/mcp'…)` | PASS |
| A23 | Mermaid, 401 | `WWW-Authenticate` names the resource metadata | apps/pragma/api/src/oauth/token.core.ts:170-172; bearer-session.middleware.ts:16-19 | `` `Bearer resource_metadata="${selectProtectedResourceMetadataUrl(issuer)}"` `` | PASS |
| A24 | Edge: sign in first | The consent query survives sign-in | apps/pragma/site/src/components/organisms/RequireSession.tsx (diff) | `state={{ from: `${location.pathname}${location.search}` }}` | PASS |
| A25 | Database changes | Three tables, hashes only, no `DEFAULT now()` | apps/pragma/api/src/database/migrations/0020_assistant_grants.sql:11-54 | three `CREATE TABLE`, unique indexes on the three hash columns | PASS |
| A26 | Types / domain model | New nouns in `VOCABULARY.md` | apps/pragma/VOCABULARY.md (diff) | `scripts/check-vocabulary-paths.sh` → exit 0 | PASS |
| A27 | Analytics inputs | Four product events | oauth.service.ts:94, token.service.ts:86, 116, 159; mcp-server.adapter.ts:31-35 | `recordProductEvent({ event: 'assistant_client_registered' })`, `…'assistant_grant_created'`, `…'assistant_grant_revoked'`, `TOOL_CALLED_EVENT` | PASS |
| A28 | Zero-defect | `OAuthTokenReplay`, `McpToolFailed`, `OAuthRegistrationRateLimited` reported | token.service.ts:112-115; mcp-server.adapter.ts:39-42; oauth.service.ts:87 | `exchange.reportFailure({ name: TOKEN_REPLAY_FAILURE, …})` etc. | PASS |
| A29 | Out of scope | Tools only, no resources, prompts or streaming | apps/pragma/api/src/mcp/mcp-server.adapter.ts:49-58 | only `server.registerTool(…)`; e2e `expect(Object.keys(first.getServerCapabilities() ?? {})).toEqual(['tools'])` | PASS |

## B. Code cleanliness

| # | Rule | Check | Evidence | Verdict |
|---|---|---|---|---|
| B01 | ESLint clean | `pnpm exec eslint --no-warn-ignored --max-warnings 0 <128 changed .ts/.tsx/.js files>` | exit 0 (needed `NODE_OPTIONS=--max-old-space-size=6144`; the default heap ran out) | PASS |
| B02 | Prettier clean | `pnpm exec prettier --check <135 changed non-markdown files>` | "All matched files use Prettier code style!" | PASS |
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
| C01 | @borso-app/pragma (core) | `pnpm run test:core` (inside `test:coverage`) | 0 — 270 files, 2738 tests, 100% statements, branches, functions, lines | PASS |
| C02 | @borso-app/pragma (back-e2e) | `pnpm run test` on the local Postgres | 0 — 48 files, 373 tests | PASS |
| C03 | @borso/infra | `pnpm --filter @borso/infra run test:coverage` | 0 — 30 files, 509 tests, 100% on all four measures | PASS |
| C04 | Mutation, changed pure modules | `pnpm exec stryker run --mutate <12 changed *.core.ts, *.utils.ts, *.adapter.ts>` | 0 — 564 mutants, 564 killed, score 100 | PASS |
| C05 | `*.utils.ts` have a sibling test | `assistant-install.utils.ts`, `formatters.utils.ts`, `rate-limit.utils.ts`, `naming.utils.ts` | each has its `*.utils.test.ts`, run in C01/C03 | PASS |

## D. Test coverage of spec

Use cases routed to `/visual-validation` (Account section install blocks and Revoke, consent Allow and Deny, at 375 px and 1280 px): 3; out of scope for this report.

| # | Use case | Covering test | Verdict |
|---|---|---|---|
| D01 | Happy 1–2: register, authorize, sign in, allow, tokens | `runs the whole flow: consent, code, tokens, and the code cannot be spent twice` at api/src/oauth/oauth.controller.test.ts:404 — `expect(grants[0]?.memberId).toBe(member.memberId)` | PASS |
| D02 | Happy 3: tools listed, calls succeed | `lists every served tool, advertises tools only, …` at api/src/mcp/mcp.controller.test.ts:195 — `expect(tools.map((tool) => tool.name)).toEqual(SERVED_TOOLS)` | PASS |
| D03 | Happy 4: other members pushed, actor not | `pushes each setlist change to the other members only` at api/src/setlists/setlists-tools.controller.test.ts:362 (also sessions:133, takes:308, songs:120, transitions:41) | PASS |
| D04 | Edge: attribution to the granting member | `comments on a take as the granting member, …` at api/src/takes/takes-tools.controller.test.ts:177 | PASS |
| D05 | Edge: redirect URI https or loopback any port | `accepts a loopback address on any port against the same host, path and query` at api/src/oauth/redirect-uri.core.test.ts:41; e2e `refuses any other redirect address` at oauth.controller.test.ts:285 — `expect(offLoopback.status).toBe(400)` | PASS |
| D06 | Edge: PKCE S256, `plain` refused | `refuses another verifier, a challenge of another length, and the plain method` at api/src/oauth/token.core.test.ts:66; e2e oauth.controller.test.ts:351 — `` expect(plain.headers.get('location')).toBe(`…?error=invalid_request&state=…`) `` | PASS |
| D07 | Edge: refresh rotated on every use | `rotates the refresh token, …` at oauth.controller.test.ts:503 — `expect(rotated.refresh_token).not.toBe(first.refresh_token)` | PASS |
| D08 | Edge: replaying an old refresh token revokes the grant | same test, oauth.controller.test.ts:503 — replays only the token rotated away last; no test replays a token two rotations old, which is the case A12 shows unhandled | FAIL |
| D09 | Edge: revoke on Account page → next call 401 | `stops answering once the member revokes the grant on the Account page` at api/src/mcp/mcp.controller.test.ts:240 — `expect(afterRevoke.status).toBe(401)` | PASS |
| D10 | Edge: password reset loses every grant | `stops answering once the member resets their password` at mcp.controller.test.ts:262; `ends every grant of a member who changes password` at oauth.controller.test.ts:537 | PASS |
| D11 | Edge: take from the terminal | `signs an upload, then records the take as the granting member` at api/src/takes/takes-tools.controller.test.ts:142 | PASS |
| D12 | Edge: deleting a member deletes their grants | `deletes the grants and pending codes of a deleted member` at oauth.controller.test.ts:615 — `expect(await countGrants()).toBe(0)` | PASS |
| D13 | Edge: previews keep grants out of the clone | `clones prod into a preview with its passwords, but no passkey, …` at apps/pragma/cdk/test/stack.test.ts:178, and the reader blocklist at :145 | PASS |
| D14 | Error: unknown tool or schema error → MCP error naming the field | `answers an argument the schema refuses with an error naming the field, never a 500` at mcp.controller.test.ts:225 | PASS |
| D15 | Error: service refusal → same code as the route | `answers the refusal codes the routes answer` at songs-tools.controller.test.ts:63 (and sessions:105, setlists:255, takes:226) | PASS |
| D16 | Error: 11th registration in an hour → 429 | `refuses the eleventh registration in an hour from one address and reports it` at oauth.controller.test.ts:309 — `expect(refused.status).toBe(429)` | PASS |
| D17 | Test strategy: route and tool lists match | api/src/mcp/tool-coverage.test.ts:27-37 | PASS |

## E. Scale

| # | Write path or state | Question | Failing case, or the key or test that holds it | Verdict |
|---|---|---|---|---|
| E01 | `exchangeAuthorizationCode` → `claimAuthorizationCode` (api/src/oauth/token.service.ts:70-71; oauth.repository.ts:86-101) | Check-then-write and concurrent proof | Held on Postgres by `DELETE … WHERE code_hash = … RETURNING` on the primary key. But the blueprint it follows (`repository-conditional-claim`, audience.repository.ts:128) says "on Aurora DSQL the loser is aborted at commit … so the caller must also treat a serialization failure as a lost claim", and nothing here does: two `POST /oauth/token` with the same code at once on DSQL → the loser's OC000 reaches `answerUnhandledError` → 500 and a Sentry error, where the spec asks for `invalid_grant`. No back-e2e test fires the two exchanges at once. | FAIL |
| E02 | `exchangeRefreshToken` → `hasRotatedGrant` (token.service.ts:124-133; oauth.repository.ts:186-204) | Check-then-write and concurrent proof | Held on Postgres by the conditional `UPDATE … WHERE refresh_token_hash = presented RETURNING`. Same gap as E01 on DSQL: two `POST /oauth/token grant_type=refresh_token` with the same token at once → loser answers 500 instead of `invalid_grant`, with no catch of `isConflictAbort`. No back-e2e test fires the two refreshes at once. | FAIL |
| E03 | `recordGrantUse` → `updateGrantLastUse` (token.service.ts:165-173) | Concurrent write | Throttled to once every 5 minutes and a conflict abort is caught and logged (`if (!isConflictAbort(error)) throw error;`); two clients calling at once in mcp.controller.test.ts:204-212 both succeed | PASS |
| E04 | `registerAssistantClient` → rate-limit bucket (oauth.service.ts:81-89) | Check-then-write | Held by the existing atomic `INSERT … ON CONFLICT DO UPDATE … RETURNING` counter (auth/auth.repository.ts:67-90, blueprint `repository-atomic-counter`), whose concurrent test is auth.controller.test.ts:107 | PASS |
| E05 | `insertAssistantClient`, `insertAuthorizationCode`, `insertAssistantGrant` | Check-then-write | No decision read first: keys are `randomUUID()` or the hash of 32 random bytes | PASS |
| E06 | Per-process state | grep `^(let\|const) x = new (Map\|Set)\|^let ` in changed api files | none; the MCP server and transport are built per request (mcp-server.adapter.ts:62-75) | PASS |
| E07 | Tool write paths | New write logic in services | The tools call the existing service functions the routes call; the diff's service changes are re-exports of `defineTool` and one `saveOwnContactDetails` return shape (me.service.ts) | PASS |

## Notes

- **A02 (FAIL, preview install address).** `buildAssistantServerUrl(pageOrigin)` uses `window.location.origin`. On a preview the site is served by the previews CDN (`pragma-pr-<N>.preview.borso.fr`), whose host-routing function (infra/cdk/src/internal/cf-host-routing-function.code.js:52-55) rewrites every extensionless path of a single-page app to `index.html`, while the API, and so `/mcp` and the issuer, live on `previewApiHostname` (`OAUTH_ISSUER: apiPublicOrigin(…)`, the plan's own workspace note at plan.md:12). Failing case: open the Account page on PR N's preview, copy the Claude Code command → `claude mcp add … https://pragma-pr-N.preview.borso.fr/mcp` → `POST /mcp` answers the SPA's HTML instead of a 401 with `WWW-Authenticate`, so the flow never starts and plan gate 14 cannot be run from the page. The unit test `serves the assistants from the page origin, so a preview shows its own address` (assistant-install.utils.test.ts:15) pins the wrong address. Production is correct because the site and the API share the origin.
- **A12 / D08 (FAIL, replay detection keeps one token).** `findGrantByRefreshTokenHash` matches the current or the immediately previous hash only. Failing case: an attacker steals refresh token R1 and refreshes twice (R1 → R2 → R3); the legitimate client then presents R1 → no row matches → `invalid_grant`, the grant survives, and the attacker keeps R3 for 90 days. The spec says replaying *an old* token revokes the grant. Plan D5 chose one previous hash; it handles the single-refresh theft but not this one. Fixing it needs every rotated-away hash of the grant to stay recognisable (a table of retired hashes keyed by hash, or a token family id carried in the token).
- **E01 / E02 (FAIL, DSQL loser of a claim).** On the local Postgres both claims are correct, which is why every test passes; the failing case only shows on Aurora DSQL, where the losing transaction gets a serialization failure instead of zero rows. Catch `isConflictAbort` around the claim and the rotation and answer `invalid_grant`, then add a back-e2e test that fires two exchanges and two refreshes at once and asserts one success, one `invalid_grant` and one grant row.
- **Question, spec inconsistency on song creation.** Input metric (3) says "a song created through the MCP … notifies the other members", but `createSong` (songs.service.ts:93) sends no push in the app either, and the Product decision is "exactly like one made in the app". The code follows the decision. Plan gate 14 ("creates a song that the other members are notified of") will not hold as written. Does the operator want song creation to notify, which would change the app as well, or should the spec's metric and gate 14 name a setlist or lineup change instead?
- **`get_take`.** The spec lists it, but no route reads one take, and the spec says the router list is final; `list_takes` and `list_take_comments` cover reading. Recorded by implementation-05; graded PASS on the spec's own rule.
- **Question, D2 exclusions.** `/api/admin/*`, passkeys, password, calendar feed, push subscription and the grants are excluded with a reason each; the plan leaves them to the operator's review.
- **Question, consent page framing.** The consent page answers a cookie-gated JSON POST, which a cross-site form cannot send, but nothing in the diff sets `frame-ancestors` or `X-Frame-Options` on the site. Does the existing site CSP already deny framing, so a page cannot overlay the Allow button?

## Verdict: FAIL
