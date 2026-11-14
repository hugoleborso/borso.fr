# Technical validation — A member's own write keeps another member's change visible

- Spec: [`../spec/spec.md`](../spec/spec.md)
- Plan: [`../plan/plan.md`](../plan/plan.md)
- Branch: claude/pragma-writes-keep-staleness
- Base: origin/main (`bf1385060`)
- Run at: 2026-11-14T09:47:35Z
- Round: 1
- Reviewed: f16d524e4620ee779454d420b930f7370bf13d9c
- Touched workspaces: @borso-app/pragma (site only), root `eslint-rules/`, `docs/standards/`

The spec is in the short form (Goal, Problem, Behaviour, Acceptance, Out of scope). Categories A and D are built from its four *Behaviour* bullets and two *Acceptance* bullets, split per claim. 1 use case routed to /visual-validation; out of scope for this report (the two-browser hugo/marc acceptance). No merge commit sits above the base. HEAD did not move during the review.

## A. Correctness vs spec

| # | Spec ref | Claim | Code (file:line) | Evidence (quoted) | Verdict |
|---|---|---|---|---|---|
| A01 | Behaviour 1 | A cache write keeps an entry stale when a stale message had made it stale | apps/pragma/site/src/lib/queries/cache-write.queries.ts:16-19 | `const query = queryClient.getQueryCache().find<Data>({ queryKey, exact: true });` / `const wasStale = query?.state.isInvalidated === true;` / `queryClient.setQueryData<Data>(queryKey, update);` / `if (wasStale) query.invalidate();` | PASS |
| A02 | Behaviour 1 | The written data still shows at once | cache-write.queries.ts:18 | `queryClient.setQueryData<Data>(queryKey, update);` runs before the re-invalidation, so the data lands synchronously | PASS |
| A03 | Behaviour 1 | Every write in `onMutate`, `onSuccess` and the `onError` rollback goes through the helpers | 23 `*.queries.ts` files and `query-client.setup.ts` | 124 `setQueryData`/`setQueriesData` calls on `origin/main` (`git grep -c`, non-test); the diff removes 119 + 3 and keeps 2 disabled. `grep -rnE 'setQueryData\|setQueriesData' apps/pragma/site/src` (non-test) finds only songs.queries.ts:135, setlists.queries.ts:148 and the helper itself. Rollback example, songs.queries.ts:204: `writeKeepingStaleness(queryClient, songKeys.byId(variables.id), context.previousById);` | PASS |
| A04 | Plan, Data shape | `writeEachKeepingStaleness` replaces `setQueriesData` over the same set | cache-write.queries.ts:27-28; takes.queries.ts:182, setlists.queries.ts:96 | `for (const query of queryClient.getQueryCache().findAll({ queryKey: queryKeyPrefix })) {` / `writeKeepingStaleness<Data>(queryClient, query.queryKey, update);` (the same `findAll({ queryKey })` TanStack's `setQueriesData` iterates) | PASS |
| A05 | Plan, Data shape | `writeKeepingStaleness` text identical to PR #327's | cache-write.queries.ts:11-20 | Fetched PR #327 head (`claude/brave-newton-1eeenf`) through the REST contents API; `diff` of the function bodies is empty | PASS |
| A06 | Behaviour 2 | Keeping an entry stale sends no request | cache-write.queries.ts:19 | `query.invalidate()`; query-core 5.106.0 `query.ts:686-689`: `if (!this.state.isInvalidated) { this.#dispatch({ type: 'invalidate' }) }`, and `QueryObserver.onQueryUpdate` (`queryObserver.ts:864-869`) only calls `updateResult()` and `#updateTimers()` | PASS |
| A07 | Problem | Staleness survives a reload through the persisted cache | query-core `hydration.ts:185-186` | `state: { ...query.state, …}` so `isInvalidated: true` is dehydrated with the entry and rebuilt on hydrate | PASS |
| A08 | Behaviour 3 | A write to a key no stale message can have reached stays `setQueryData`, disabled with a reason naming why the key is new | songs.queries.ts:134-135; setlists.queries.ts:147-148 | `// eslint-disable-next-line borso/no-direct-query-cache-write -- seeds the detail of the song this request just created, whose id no stale message can have named yet` / `queryClient.setQueryData<SongByIdResponse>(songKeys.byId(data.song.id), data);` | PASS |
| A09 | Behaviour 4 | Lint rule refuses `setQueryData`/`setQueriesData` under `apps/pragma/site/src` | eslint-rules/no-direct-query-cache-write.js:11, 37-42; .oxlintrc.json:564-567 | `const CACHE_WRITE_METHODS = new Set(['setQueryData', 'setQueriesData']);`; `"files": ["apps/pragma/site/src/**/*.{ts,tsx}"]` … `"borso/no-direct-query-cache-write": "error"` | PASS |
| A10 | Behaviour 4 | Except in `lib/queries/cache-write.queries.ts` | no-direct-query-cache-write.js:13, 34-36 | `const CACHE_WRITE_MODULE_PATTERN = /(^\|\/)lib\/queries\/cache-write\.queries\.ts$/;` / `return {};` | PASS |
| A11 | Behaviour 4 | Except in test files | .oxlintrc.json:573-580 | `"apps/pragma/site/src/**/*.test.{ts,tsx}"`, `"…/*.test-utils.ts"`, `"…/test/**/*.ts"` → `"borso/no-direct-query-cache-write": "off"` | PASS |
| A12 | Behaviour 4 | A *direct* `setQueryData` is refused in every spelling | no-direct-query-cache-write.js:17; no-direct-query-cache-write.test.js:14 | `!callee.computed &&` excludes a computed member, and the suite pins `'queryClient["setQueryData"](songKeys.list(), next);'` as **valid**. Failing case: `queryClient['setQueryData'](songKeys.list(), next)` in `apps/pragma/site/src/lib/queries/songs.queries.ts` lints clean and clears another member's staleness | FAIL (non-blocking) |
| A13 | Plan, Changes | Standard and gate documented | docs/standards/06-data-fetching.md:200-215, 263-265; 12-linting-and-gates.md:107 | `## A write keeps another member's staleness`; `` `oxlint:borso/no-direct-query-cache-write` rejects a `setQueryData` or `setQueriesData` call … `` | PASS |
| A14 | Plan, Changes | Rule registered in the plugin | eslint-rules/index.js:21, 75 | `'no-direct-query-cache-write': noDirectQueryCacheWrite,` | PASS |

## B. Code cleanliness

| # | Rule | Check | Evidence | Verdict |
|---|---|---|---|---|
| B01 | No abbreviations / 1-letter locals | read every added line | `wasStale`, `queryKeyPrefix`, `CACHE_WRITE_METHODS`, `readCacheWriteMethod`, `addTitle`, `seed`; none abbreviated | PASS |
| B02 | Magic numbers / strings extracted | read new files | rule message and method set in `MESSAGE` / `CACHE_WRITE_METHODS`; test keys in `LIST_KEY` / `OTHER_KEY` | PASS |
| B03 | No prose comments | `grep '^\+.*// '` on added lines | only `// @FollowsBlueprint …` and the two `eslint-disable-next-line … -- <reason>` lines; the JSDoc in cache-write.queries.ts:5-10 is the machine-read `@Blueprint` block | PASS |
| B04 | Function names describe the result | sampled | `writeKeepingStaleness`, `writeEachKeepingStaleness`, `readCacheWriteMethod` (returns the method name or `null`) | PASS |
| B05 | Type assertions limited to `as const` / `as unknown` | grep ` as [A-Z]` on added lines | none found | PASS |
| B06 | No `any` | `grep -nP '\bany\b'` on added lines | none found | PASS |
| B07 | `noUncheckedIndexedAccess` honoured | grep `\[[0-9]+\]` on added lines | only in songs.queries.test.tsx:213, 226, 230, guarded by `?.` at 230 and passed to `unknown`-typed `setQueryData` elsewhere; `pnpm run typecheck` exit 0 | PASS |
| B08 | Lint clean | `pnpm exec oxlint --type-aware <29 changed .ts/.tsx/.js files>` and `pnpm exec oxlint --type-aware apps/pragma/site/src` | both exit 0, no output | PASS |
| B09 | `useEffect` is a smell | `grep -nE '\buseEffect\('` on added lines | none found | PASS |
| B10 | Typecheck | `pnpm run typecheck` in apps/pragma | exit 0 | PASS |
| B11 | Knip | `pnpm exec knip` (root) and `--workspace apps/pragma` | exit 0, configuration hints only | PASS |
| B12 | Standards checklist (12): "the reason on a disable comment is a claim about that line which a reader can check" | read in full | songs.queries.ts:134 and setlists.queries.ts:147 name the new id; the key is built from `data.song.id` / `data.setlist.id`, which the server just returned, so no cached query existed for a stale message to invalidate. Introduced: this branch | PASS |
| B13 | Standards checklist (01): "a file name says what the file holds" | read in full | `cache-write.queries.ts` holds the two cache-write functions of the query layer; the blueprint index files it under layer `query` | PASS |
| B14 | Standards checklist (01): "a comment documents something the code cannot say" | read in full | the `@BlueprintDescription` at cache-write.queries.ts:9 states why `setQueryData` loses the invalidation, which the code cannot say | PASS |
| B15 | Standards checklist (06): "a mutation whose full result the client already holds reconciles from the response rather than refetching" | read every changed `*.queries.ts` in full | every `onSuccess` still writes the response (e.g. songs.queries.ts:197 `writeKeepingStaleness<SongByIdResponse>(queryClient, songKeys.byId(data.song.id), data);`); no write adds an `invalidateQueries` or `refetch` | PASS |
| B16 | Standards checklist (03, 07, 05, 08, 09, 10, 11, 02, 04, 14) | read in full | no derived types, untrusted input, effects, routes, props, variants, i18n keys, database writes, `.core`/`.utils` choices or pre-commit checks in the diff; test names state behaviour and condition (e.g. `"keeps the songs stale after this member's own update, so the other change still loads"`) | PASS |

## C. Tests pass

| # | Workspace | Command | Exit | Verdict |
|---|---|---|---|---|
| C01 | @borso-app/pragma | `pnpm --filter @borso-app/pragma exec vitest run --project core --changed bf13850605… --coverage --reporter=verbose` | 0 (54 files, 299 tests; includes cache-write.queries.test.ts and songs.queries.test.tsx:210) | PASS |
| C02 | @borso-app/pragma | `pnpm --filter @borso-app/pragma run test:e2e --changed <full base SHA>` | 0 ("No test files found"; the diff touches no `api/` file) | PASS |
| C03 | root `eslint-rules` | `npx vitest run eslint-rules/no-direct-query-cache-write.test.js eslint-rules/disable-directives.test.js` | 0 (2 files, 19 tests) | PASS |
| C04 | mutation gate | `scripts/mutate-changed.sh` | not run: the diff changes no `.core`, `.utils` or `.adapter` file, and `eslint-rules/` is outside `stryker.config.js` `mutate` | PASS |
| C05 | `*.utils.ts` coverage | enumerate | the diff adds or changes no `*.utils.ts`; the `--coverage` run gated 0 files | PASS |
| C06 | lockfile / catalog | `git diff --name-only` | neither `pnpm-lock.yaml` nor `pnpm-workspace.yaml` changed | PASS |

## D. Test coverage of spec

| # | Use case | Covering test | Verdict |
|---|---|---|---|
| D01 | Behaviour 1: a write keeps an entry a stale message made stale | `it("writes the data and keeps an entry another member's write made stale")` at cache-write.queries.test.ts:25, asserting `expect(queryClient.getQueryState(LIST_KEY)?.isInvalidated).toBe(true);` (:32) after `invalidateQueries` set it up (:27) | PASS |
| D02 | Behaviour 1: through a real mutation (`onMutate` and `onSuccess`) | `it("keeps the songs stale after this member's own update, so the other change still loads")` at songs.queries.test.tsx:210; sets up with `selectInvalidationFilters(['songs'])` (:214), asserts `isInvalidated` `toBe(true)` on list and detail (:231-232). On `main` the `onSuccess` `setQueryData` dispatches `success`, whose `successState` sets `isInvalidated: false` (query-core `query.ts:1077`), so :231 fails there | PASS |
| D03 | Behaviour 1: the `onError` rollback keeps staleness | structural: every rollback routes through `writeKeepingStaleness` (A03; the lint rule refuses any other route), and a value write onto a stale entry is pinned by cache-write.queries.test.ts:45-52, `expect(queryClient.getQueryState(LIST_KEY)?.isInvalidated).toBe(true);` | PASS |
| D04 | Behaviour 1: the written data still shows at once | cache-write.queries.test.ts:31 `expect(queryClient.getQueryData(LIST_KEY)).toEqual({ titles: ['Composition 7', 'Repro Y'] });`; songs.queries.test.tsx:230 `expect(settled?.songs[0]?.title).toBe('Renamed');` | PASS |
| D05 | Behaviour 1: a fresh entry stays fresh | `it('leaves a fresh entry fresh')` at cache-write.queries.test.ts:36, :42 `isInvalidated).toBe(false)` | PASS |
| D06 | `writeEachKeepingStaleness` writes every entry under the prefix and nothing outside | cache-write.queries.test.ts:66 (:72-75) and :78 (:83) | PASS |
| D07 | Behaviour 2: keeping an entry stale never sends a request by itself | `it('marks the stale entry without refetching it')` at cache-write.queries.test.ts:45 asserts `fetchStatus).toBe('idle')` (:51), but no observer is mounted on `LIST_KEY`, so nothing could refetch whatever the helper did. Failing case: replace `query.invalidate()` at cache-write.queries.ts:19 with `void queryClient.invalidateQueries({ queryKey, exact: true })`; query-core `queryClient.ts:501-510` then calls `refetchQueries` with `type: filters?.refetchType ?? filters?.type ?? 'active'`, so with a mounted `useSongs` observer a `GET /api/songs` follows every write (inferred from the source, not run), and all six cache-write tests and songs.queries.test.tsx:210 (which mounts only `useUpdateSong`) still pass. The claim needs a test with an active query observer and a stubbed `fetch` asserting no call after the write | FAIL (blocking) |
| D08 | Behaviour 3: a key no stale message can have reached may stay `setQueryData` with a disable naming why | structural: songs.queries.ts:134-135 and setlists.queries.ts:147-148 carry the reason; the id comes from the server response, so no cached query exists for it. `disable-directives.test.js` case `borso/no-direct-query-cache-write` (added at :45-58) pins that the directive suppresses the rule | PASS |
| D09 | Behaviour 4: refuses `setQueryData` | no-direct-query-cache-write.test.js:19 `code: 'queryClient.setQueryData(songKeys.list(), next);'` with `errors: [{ messageId: 'directCacheWrite', … }]` | PASS |
| D10 | Behaviour 4: refuses `setQueriesData` | no-direct-query-cache-write.test.js, invalid case `queryClient.setQueriesData({ queryKey: takeKeys.ofSessions() }, …)` with `data: { method: 'setQueriesData' }` | PASS |
| D11 | Behaviour 4: allowed inside `cache-write.queries.ts` | no-direct-query-cache-write.test.js:38-44, `createRuleTester(CACHE_WRITE_MODULE, …)` with `valid: ['queryClient.setQueryData<Data>(queryKey, update);']` | PASS |
| D12 | Behaviour 4: allowed in test files | structural: .oxlintrc.json:573-580 turns it off; `oxlint --type-aware apps/pragma/site/src` exits 0 while songs.queries.test.tsx:213 calls `queryClient.setQueryData(...)` | PASS |
| D13 | Acceptance 1: hook test with live-invalidation filters, list and detail still invalidated, fails on `main` | same as D02 | PASS |

## E. Scale

| # | Write path or state | Question | Failing case, or the key or test that holds it | Verdict |
|---|---|---|---|---|
| E01 | Database writes | Check-then-write | `git diff origin/main...HEAD --name-only` lists no `*.service.ts`, `*.repository.ts` or `*.controller.ts`, and no file under `apps/pragma/api/`; the diff writes only to the browser's query cache | PASS |
| E02 | Module-level state | Per-process state | `grep -nE '^(let\|const) [a-zA-Z]+ = new (Map\|Set)\|^let '` on changed files finds only `const CACHE_WRITE_METHODS = new Set(['setQueryData', 'setQueriesData']);` (no-direct-query-cache-write.js:11), an immutable lookup in a lint rule, not request state | PASS |
| E03 | Concurrent proof | Key held under concurrency | no key-held rule in the diff, so no concurrent test is owed | PASS |

## Blocking findings

- D07 — Behaviour 2 ("never sends a request by itself") has no test that can fail: the only test that names it mounts no query observer, so swapping `query.invalidate()` for `invalidateQueries` would add a `GET` after every write and every test would stay green.

## Non-blocking findings

- A12 — the lint rule skips a computed `queryClient['setQueryData'](…)`, and its suite pins that as valid (no-direct-query-cache-write.test.js:14), so that spelling clears another member's staleness without a lint error.

## Notes

- cache-write.queries.test.ts:23 and :63 carry `// @FollowsBlueprint test-query-hook`, whose description is "Mounts a probe component … The transport is a stubbed `fetch` returning a deferred promise". These tests call two plain functions and mount nothing. Should they follow a plain-function test blueprint instead? No standards bullet covers it, so no row.
- The `lint-rule` blueprint says the rule "exports the matching predicate so the test can drive it directly". `readCacheWriteMethod` is exported (no-direct-query-cache-write.js:15) but no test imports it. Is the export meant to be driven, or dropped?
- The detail entry's data after the update is not asserted in songs.queries.test.tsx:210, only its `isInvalidated`. The acceptance reads "the list and the detail still invalidated with the update applied". Is the detail's `title` meant to be asserted too?

## Verdict: FAIL
