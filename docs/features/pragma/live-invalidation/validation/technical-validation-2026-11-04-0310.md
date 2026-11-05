# Technical validation — band data refreshes itself when another member changes it

- Spec: [`../spec/spec.md`](../spec/spec.md)
- Plan: [`../plan/plan.md`](../plan/plan.md) (absent)
- Branch: claude/fervent-galileo-sqcfvh
- Base: origin/main
- Run at: 2026-11-04T03:36:34Z
- Round: 2
- Reviewed: e18059b221fda46ea29b63d0e167edf4cab5579b
- Previous: [`technical-validation-2026-11-04-0239.md`](technical-validation-2026-11-04-0239.md), reviewed at e65a97de66391a4793e6fb0f8687a634cbb5c168
- Touched workspaces: @borso-app/pragma (api, site, domain, vitest config)

This round reads only `git diff e65a97de..e18059b2` (three commits: 0eae13a8 docs, 7ba906e4 docs, e18059b2 fix). The spec is still in the short form. Commit e18059b2 amended *Data shapes* and *Behaviour* 3 and 4 after round 1. Category A and D rows below come from those amended bullets, with files taken from the diff. Nothing is routed to `/visual-validation`. The plan is still absent. Round 1 already raised that (A01, non-blocking), so it is not raised again here.

## A. Correctness vs spec

| # | Spec ref | Claim | Code (file:line) | Evidence (quoted) | Verdict |
|---|---|---|---|---|---|
| A01 | Data shapes, message (amended) | `{ kind: 'stale', written: string[] }`, each entry an API root or `all` | apps/pragma/domain/stale-scope.core.ts:50-51 | `export function buildStaleMessage(written: readonly WrittenRoot[]): StaleMessage { return { kind: STALE_MESSAGE_KIND, written }; }` | PASS |
| A02 | Behaviour 3 (amended) | `written` holds the path root of the write, the first segment after `/api/` | apps/pragma/api/src/realtime/stale-scope.core.ts:48-49 and `readWrittenApiRoot` | `if (isReadMethod(method) \|\| isSilentWrite(path)) return null; return readWrittenApiRoot(splitPath(path));`, with `if (segments[0] !== API_SEGMENT) return null; const root = segments[1];` | PASS |
| A03 | Behaviour 3 (amended) | A `POST /mcp` write sends the roots of the write routes its tools declare | apps/pragma/api/src/realtime/stale-scope.core.ts:69,90; mcp.service.ts `rememberToolWrittenRoots` | `return [...new Set(tool.routes.flatMap((route) => selectRouteWrittenRoot(route) ?? []))];` and `if (write.rememberedRoots.length > 0) return write.rememberedRoots;`. Read of every tool's `routes:` list: `update_me` declares `PUT /api/me/contact`, `POST /api/studies`, `DELETE /api/studies/:songId/:instrumentId`, which covers the `writeStudyForTool` call in me.service.ts; the `delete` tool declares the route of all seven kinds | PASS |
| A04 | Behaviour 4 (amended) | The tab invalidates every query key root that reads a written root, directly or through a derived read | apps/pragma/site/src/lib/live-invalidation.core.ts:137-138; site/src/lib/queries/query-read-roots.core.ts:46-49; domain/stale-scope.core.ts:78 | `return staleQueryRoots.map((queryRoot) => ({ queryKey: [queryRoot] }));`; `.filter(([, reads]) => isReadingAny(reads, written))`; `studies: ['instruments', 'mastery', 'members', 'sessions', 'setlists', 'songs', 'streaks'],` | PASS |
| A05 | Behaviour 4 (amended) | `all` invalidates every query | site/src/lib/queries/query-read-roots.core.ts:46; live-invalidation.core.ts:137 | `if (written.includes(EVERY_WRITTEN_ROOT)) return EVERY_WRITTEN_ROOT;` → `if (staleQueryRoots === EVERY_WRITTEN_ROOT) return [{}];` | PASS |
| A06 | Behaviour 4 | The invalidation waits while a mutation is pending | site/src/lib/live-invalidation.core.ts:130,154 | `addPendingWrittenRoots(state.pendingWrittenRoots, written)`, which collapses to `[EVERY_WRITTEN_ROOT]` once `all` is held | PASS |
| A07 | Behaviour 2 | Reopening still invalidates every query | site/src/lib/live-invalidation.core.ts (`openSocket`) | `return receiveWrittenRoots(opened, [EVERY_WRITTEN_ROOT], isMutating);` | PASS |
| A08 | Behaviour 5 | A failed or late send is still reported, now tagged with the written roots | apps/pragma/api/src/realtime/broadcast-outcome.core.ts | `const writtenTag = written.join(WRITTEN_TAG_SEPARATOR);` → `tags: { 'realtime.written': writtenTag, 'realtime.code': … }` | PASS |

## Round-1 findings

| # | Round-1 row | Fixed by | Verdict |
|---|---|---|---|
| R01 | A13 (blocking): `PUT /api/mastery/overrides` sent `mastery`, which missed `['studies','overrides',X]` and `['studies','overview']`; `POST /api/setlists/:id/entries` sent `setlists`, which missed `['studies','overview']` | e18059b2. apps/pragma/site/src/lib/queries/query-read-roots.core.ts:26 `studies: ['studies', 'mastery'],` and apps/pragma/domain/stale-scope.core.ts:78 `studies: [… 'mastery', … 'setlists', …]`. Case 1: `selectStaleQueryRoots(['mastery'])` returns `['mastery', 'streaks', 'studies']` (query-read-roots.core.test.ts:41). Case 2: `expandReadRoots(['studies']).has('setlists')` is true (domain/stale-scope.core.test.ts:68), and live-invalidation.setup.test.ts:102 sends `{"kind":"stale","written":["setlists"]}` and asserts `isInvalidated(harness.queryClient, ['studies', 'overview'])).toBe(true)` | PASS |
| R02 | D30 (blocking): no test tied a write's scope to the site queries that read its data | e18059b2. api/src/realtime/derived-read-roots.test.ts:128 and :136 read every service and repository's cross-slice imports against `DERIVED_READ_ROOTS`, with the cascade writes (`WRITES_INTO`) and a check that no exemption is unused. site/src/lib/queries/query-key-roots.test.ts:86 and :104 read every `*.queries.ts` file's `$get` calls and key factories against `QUERY_READ_ROOTS`. I checked the scanners' blind spots by hand. No `useQuery`, `queryKey` or `fetch` sits outside `site/src/lib/queries/`. No API controller imports another slice's service. The only cross-slice value imports in unscanned API files are in `*.core.ts` and `*.schema.ts` (studies → mastery, audience → songs, me → members/studies), and each one is already in its slice's row. Every write into another slice's table (instruments, members, sessions, songs repositories) lands in a row that lists the writer | PASS |
| R03 | B09 (non-blocking): site restated `READ_METHODS` | e18059b2. domain/stale-scope.core.ts:56-59 holds `READ_METHODS` and `isReadMethod` once; site live-invalidation.core.ts:142 `!isReadMethod(method)` | PASS |
| R04 | B10 (non-blocking): `RealtimeTicketGrant` written by hand | e18059b2. site/src/lib/queries/realtime.queries.ts:6 `export type RealtimeTicketGrant = InferResponseType<typeof api.api.realtime.ticket.$get, 200>;` | PASS |
| R05 | B11 (non-blocking): two VOCABULARY promises carried no `Held by:` | e18059b2. VOCABULARY.md *Realtime connection* now names both `cdk/test/stack.test.ts` tests. I grepped each of the 14 `Held by:` lines in the realtime entries for its test name, and every name exists | PASS |

## B. Code cleanliness

| # | Rule | Check | Evidence | Verdict |
|---|---|---|---|---|
| B01 | Lint clean | `pnpm exec oxlint --type-aware <every added or modified .ts in the round-2 diff>` | exit 0, no output | PASS |
| B02 | Typecheck | `pnpm --filter @borso-app/pragma run typecheck` | exit 0 | PASS |
| B03 | knip | `pnpm exec knip` | exit 0, configuration hints only | PASS |
| B04 | No `any` / assertions limited to `as const`, `as unknown` | `grep -nP '\bany\b'` and `grep -nP ' as (?!const\b\|unknown\b)'` on changed files | matches only English prose in test names | PASS |
| B05 | No prose comments | `grep -nE '^\s*(//\|/\*)'` on changed files, ignoring machine annotations | only `@FollowsBlueprint`, `@Feature`, `@BlueprintDescription` and the existing `Stryker disable` | PASS |
| B06 | `useEffect` is a smell | `grep -nE '\buseEffect\('` on changed files | none found | PASS |
| B07 | Result-naming verbs (01) | `selectWrittenRoot` returns a root or `null`; `selectToolWrittenRoots`, `selectAnnouncedWrittenRoots`, `selectStaleQueryRoots`, `selectInvalidationFilters` return what they name; `readStaleWrittenRoots` returns `null` on a bad frame; `buildStaleMessage` builds | each verb matches its return | PASS |
| B08 | VOCABULARY definitions still true (01) | read the entries *Derived read root*, *Query read roots*, *Stale message* and *Written root* against the code | e.g. "A written root the tab does not know is read as `all`" matches live-invalidation.core.ts:115 `return isWrittenRoot(entry) ? entry : EVERY_WRITTEN_ROOT;`; "A write through an assistant **tool** announces the roots of the write routes that tool declares" matches stale-scope.core.ts:69 | PASS |
| B09 | Standards checklist: "`reviewer` checks that a file name says what the file holds" (01) | read in full | VOCABULARY.md:792 and :805 say *Stale message* and *Written root* live in `domain/stale-scope.core.ts` and `api/src/realtime/stale-scope.core.ts`. This diff removed the *Stale scope* entry and every `StaleScope` identifier, and no code or vocabulary term says "stale scope" any more. The files still carry the old name: `stale-scope.core.ts` (domain and api), `stale-scope.middleware.ts`, `stale-scope-coverage.test.ts`, `mcp-stale-scope.test.ts`, `tool-stale-scope.test.ts`. Failing case: a reader looking up `stale-scope.core.ts` in the vocabulary finds no *stale scope* term. Introduced: this branch; Fix size: 6 file renames plus their imports | FAIL (non-blocking) |
| B10 | Standards checklist: shape copied from the claimed blueprint (`// @FollowsBlueprint core-lookup-table`: "a total mapping from a domain union … the function itself holds no condition") | read in full | site/src/lib/queries/query-read-roots.core.ts:8 `export const QUERY_READ_ROOTS: Readonly<Record<string, readonly ApiRoot[]>> = {` is keyed by `string`, and its function at :46 branches with `if (written.includes(EVERY_WRITTEN_ROOT)) return EVERY_WRITTEN_ROOT;`. domain/stale-scope.core.ts:62 `Readonly<Partial<Record<ApiRoot, …>>>` is not total, and `expandReadRoots` (:94) recurses. Failing case: a new `ApiRoot` with no `DERIVED_READ_ROOTS` row compiles, where the blueprint promises a type error. derived-read-roots.test.ts › maps every slice to the API roots it serves still catches a new slice, so nothing ships wrong. Introduced: this branch; Fix size: two annotations (name another blueprint, or none) | FAIL (non-blocking) |
| B11 | Standards checklist: one rule stated once across site and API (02) | read in full | `isReadMethod` lives once in domain (R03). The read-root tables live once each, `DERIVED_READ_ROOTS` in domain and `QUERY_READ_ROOTS` in the site that owns the query keys | PASS |
| B12 | Standards checklist: derived types (03) | read in full | `type WrittenApiRoot = (typeof WRITTEN_API_ROOTS)[number]` (domain); `RealtimeTicketGrant` inferred from the Hono client (R04) | PASS |
| B13 | Standards checklist: untrusted input parsed with Zod (03) | live-invalidation.core.ts `staleMessageSchema` | `written: z.array(z.string()).min(1)`, then each entry goes through `isWrittenRoot`; `readWrittenRoots(value: unknown)` filters through the same guard on the API side | PASS |
| B14 | Standards checklist: test names state behaviour and condition (10) | new and renamed tests | e.g. `reads a root this tab does not know as everything, so a newer API is never missed`; `keeps no exemption that matches no import` | PASS |
| B15 | Standards checklist: `.core.ts` vs `.utils.ts` (02) | `query-read-roots.core.ts` | holds a band-level rule (which screens a write makes stale), not a generic helper | PASS |

## C. Tests pass

| # | Workspace | Command | Exit | Verdict |
|---|---|---|---|---|
| C01 | @borso-app/pragma core | `pnpm exec vitest run --project core --changed e65a97de… --coverage --maxWorkers=2` | 0 (394 files, 3774 tests, coverage thresholds held) | PASS |
| C02 | @borso-app/pragma back-e2e | `DATABASE_URL=$(../../scripts/local-postgres.sh start pragma) pnpm exec vitest run --project back-e2e --project back-e2e-assistants --changed e65a97de… --maxWorkers=2` | 0 (51 files, 439 tests) | PASS |
| C03 | @borso-app/pragma, feature files named | `vitest run api/src/realtime api/src/mcp/mcp-stale-scope.test.ts api/src/mcp/tool-stale-scope.test.ts domain/stale-scope.core.test.ts site/src/lib/live-invalidation site/src/lib/queries/query-key-roots.test.ts site/src/lib/queries/query-read-roots.core.test.ts` | 0 (17 files, 141 tests) | PASS |
| C04 | Mutation on changed gated files | `scripts/mutate-changed.sh e65a97de…` | 0. Score 100.00. 0 survived across `domain/stale-scope.core.ts` (16), `api/src/realtime/stale-scope.core.ts` (71), `broadcast-outcome.core.ts` (21), `site/src/lib/queries/query-read-roots.core.ts` (9), `live-invalidation.core.ts` (145) and the rest of the run | PASS |
| C05 | `*.utils.ts` siblings | round-2 diff | no `*.utils.ts` added or changed | PASS |

## D. Test coverage of spec

| # | Use case | Covering test | Verdict |
|---|---|---|---|
| D01 | Data shapes: message is `{ kind: 'stale', written }` | `wraps the written roots in the message the socket carries` at domain/stale-scope.core.test.ts:29, `toStrictEqual({ kind: 'stale', written: ['setlists', 'mastery'] })`; `posts the root the write touched to every tab but the writer’s own` at api/src/realtime/realtime.controller.test.ts:182, `data: { kind: 'stale', written: ['tasks'] }` (:192) | PASS |
| D02 | Behaviour 3: `written` is the path root of the write | `names the API root of a write, the first segment after /api/` at api/src/realtime/stale-scope.core.test.ts:13; `decides every write route, so a new slice cannot ship without saying what it writes` at stale-scope-coverage.test.ts:29, `expect(undecided).toStrictEqual([])` | PASS |
| D03 | Behaviour 3: an MCP write sends its tool's write-route roots | `sends the roots a writing tool’s routes touch, not everything` at api/src/mcp/mcp-stale-scope.test.ts:31, `expect(posts).toStrictEqual([{ kind: 'stale', written: ['tasks'] }])` (:37); tool-stale-scope.test.ts:43 `selectToolWrittenRoots(getTool('reorder_setlist'))).toStrictEqual(['setlists'])` | PASS |
| D04 | Behaviour 4a: invalidates the key roots that read a written root directly, and only those | `invalidates the queries that read what a message says was written, and only those` at site/src/lib/live-invalidation.setup.test.ts:102; `['setlists','list']` true, `['songs','list']` false | PASS |
| D05 | Behaviour 4b: through a derived read | same test, `expect(isInvalidated(harness.queryClient, ['studies', 'overview'])).toBe(true)` after `written: ["setlists"]`; `reads the application table when no table is passed` at query-read-roots.core.test.ts:41, `selectStaleQueryRoots(['mastery'])).toStrictEqual(['mastery', 'streaks', 'studies'])` | PASS |
| D06 | Behaviour 4c: `all` invalidates every query | `filters the queries under every query root that reads a written root, or every query` at site/src/lib/live-invalidation.core.test.ts:374, `expect(selectInvalidationFilters(['all'])).toStrictEqual([{}])`; reopening path at live-invalidation.setup.test.ts:119 | PASS |
| D07 | Behaviour 4d: waits while a mutation is pending | `holds an invalidation while a write is pending and flushes it once the write settles` at live-invalidation.setup.test.ts:141, `toBe(false)` before `settle.resolve()` and `toBe(true)` after | PASS |
| D08 | Goal: the tables that route a write to its readers match the code | `lists in a slice’s row every slice its services and repositories read` (derived-read-roots.test.ts:128), `lists the writer in the row of every slice a write cascades into` (:136), `lists under each key root every API root its query module reads` (query-key-roots.test.ts:86), `reads every root the API can announce from some query, or names it as read by none` (:104); each asserts `toStrictEqual([])` on the list of misses | PASS |

## E. Scale

| # | Write path or state | Question | Failing case, or the key or test that holds it | Verdict |
|---|---|---|---|---|
| E01 | Round-2 diff | Write paths | `git diff e65a97de..HEAD` on api, domain and site sources, grepped for `insert(`, `update(`, `delete(`, `onConflict` and `transaction(`, finds nothing. The diff only renames what the existing broadcast sends | PASS |
| E02 | `SILENT_WRITE_PATHS`, `DERIVED_READ_ROOTS`, `QUERY_READ_ROOTS` | Per-process state | Read-only constant tables, so they hold no rule per instance. The grep for `^let` and `= new (Map\|Set)` at module level finds nothing new | PASS |
| E03 | Request-scoped `writtenRoots` (stale-scope.middleware.ts `rememberWrittenRoots`) | Per-process state | Held on the Hono `context` of one request and merged there. It does not outlive the request | PASS |

## Blocking findings

- None.

## Non-blocking findings

- B09: The files `stale-scope.core.ts` (domain and api), `stale-scope.middleware.ts` and three tests still carry the name of the *Stale scope* term this diff retired. VOCABULARY points readers at them under *Written root* and *Stale message*.
- B10: `// @FollowsBlueprint core-lookup-table` sits on a `string`-keyed table and a `Partial` table, and both functions under it branch. The blueprint promises a total mapping from a union, with no condition in the function.

## Notes

- The plan is still absent (round 1, A01). The spec was amended a second time (e18059b2) with no plan section, so this round took the files from the diff.
- `me: ['members']` and `members: ['instruments', 'me']` sit in `DERIVED_READ_ROOTS`, and `members` sits in almost every row. So a `PUT /api/me/contact` or a calendar-feed write now invalidates nearly every key root in every other open tab. The commit message admits this. Round 1's question applies here too: has anyone counted those refetches against the reserved concurrency of 10 named in `docs/dantotsus/five-musicians-filled-ten-lambdas.md`?
- The derived-read scanner reads only `*.service.ts` and `*.repository.ts`. Today no cross-slice read hides in a controller or a `*.core.ts` file outside an existing row (checked by hand, see R02). Should the scan also cover `*.core.ts` and `*.controller.ts`, so that a future read placed there cannot slip past?
- `WRITES_INTO` exempts a link from the read check, and `songs → mastery` is both a cascade delete and a tool-only read (`readSongForTool`). If a later HTTP route reads mastery through that import, the test will not ask for `mastery` in the songs row. Should a cascade exemption name the imported functions rather than the slice?

## Verdict: PASS
