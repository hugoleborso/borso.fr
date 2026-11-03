# Technical validation — Setlist order survives

- Spec: [`../spec/spec.md`](../spec/spec.md)
- Plan: [`../plan/plan.md`](../plan/plan.md)
- Branch: fix/pragma-setlist-reorder
- Base: origin/main
- Run at: 2026-11-03T07:41:46Z
- Round: 2
- Reviewed: a1c92d551c30afc6506c486f668111153660b958
- Previous: [`technical-validation-2026-11-03-0725.md`](./technical-validation-2026-11-03-0725.md), reviewed `a5da94607ee09eeec632ec076613290550ab9c85`
- Touched workspaces: @borso-app/pragma (site)

Round 2 reads `git diff a5da9460..a1c92d55`: two commits (`51c9301e fix(pragma): let a setlist be reordered only from an order the server confirmed`, `a1c92d55 refactor(pragma): derive the offline manifest type from the API client`), six files under `apps/pragma/site/src/` plus the round-1 report. The spec has no *Test strategy* section. The 375 px production sweep stays routed to /visual-validation, as in round 1.

## A. Correctness vs spec

| # | Spec ref | Claim | Code (file:line) | Evidence (quoted) | Verdict |
|---|---|---|---|---|---|
| A01 | Goal ("the next drag never writes an older order back") | The order screen always asks the server on mount, even when a restored copy is fresh | apps/pragma/site/src/lib/queries/setlist-entries.queries.ts:59-61 | `export function useSetlistEntriesToReorder(setlistId: string) {` / `return useQuery({ ...setlistEntriesQueryOptions(setlistId), refetchOnMount: 'always' });` | PASS |
| A02 | Goal | No row can be dragged until the server has answered after the screen opened | apps/pragma/site/src/routes/setlists/SetlistOrderPage.tsx:38, 57-58 | `const entriesQuery = useSetlistEntriesToReorder(setlistId);` / `const isOrderFromTheServer = entriesQuery.isFetchedAfterMount;` / `if (setlistQuery.isLoading \|\| !isOrderFromTheServer) {` renders `t('common.loading')` and no `SetlistOrderList`. In query-core 5.102.8 `queryObserver.js:258` `isFetchedAfterMount: newState.dataUpdateCount > queryInitialState.dataUpdateCount \|\| …`, so restored data alone does not satisfy it | PASS |
| A03 | Goal | A failed refetch shows an error, never the restored copy to drag | SetlistOrderPage.tsx:50-55 | `if (entriesQuery.isError) {` / `<p … role="alert">` / `{t('setlist.failure.load')}` (key present in en.json:551 and fr.json:551) | PASS |
| A04 | Round-1 B15 (standard 03) | `OfflineManifestUrls` is derived from the Hono client | apps/pragma/site/src/lib/queries/offline-reading.utils.ts:3-4, 8-13 | `type OfflineManifestResponse = InferResponseType<(typeof api.api)['offline-manifest']['$get'], 200>;` / `export type OfflineManifestUrls = Pick<OfflineManifestResponse, 'songDetailUrls' \| 'nextSessionUrl'>;` | PASS |

## Round-1 findings

| # | Round-1 row | Fixed by | Verdict |
|---|---|---|---|
| R01 | E02 (a drag on a restored, not-yet-refetched order cancels the refetch and PUTs the restored order) | `51c9301e` setlist-entries.queries.ts:60 and SetlistOrderPage.tsx:57-58. The round-1 failing case (restored `[a,b,c]`, server holds `[c,b,a]`, drag during the 1.65 s refetch) no longer reaches `useReorderSetlist`: the list is not rendered while `isFetchedAfterMount` is false, and becomes true only when the mount refetch answers, at which point the cache holds `[c,b,a]` | PASS |
| R02 | A15 (Goal) | same fix, see A01-A03 | PASS |
| R03 | D13 (no test for the drag-on-restored-cache case) | `51c9301e` setlist-entries.queries.test.tsx:217-237 and SetlistOrderPage.test.tsx:70-85, see D01-D03. Both new tests fail when the fix is reverted (measured: removing `refetchOnMount: 'always'` and gating on `!entriesQuery.isLoading` gives 2 failed / 7 passed) | PASS |

## B. Code cleanliness

| # | Rule | Check | Evidence | Verdict |
|---|---|---|---|---|
| B01 | No abbreviations / 1-letter locals | read the 6 changed files in full | none found (`entriesQuery`, `isOrderFromTheServer`, `answer`, `states`) | PASS |
| B02 | Lint clean | `pnpm exec oxlint --type-aware <6 changed .ts/.tsx files>` | exit 0, no output | PASS |
| B03 | Typecheck | `pnpm --filter @borso-app/pragma run typecheck` | exit 0 | PASS |
| B04 | knip | `pnpm knip` | exit 0, configuration hints only (`useSetlistEntries` still has callers) | PASS |
| B05 | No `any`, assertions only `as const` / `as unknown`, no `useEffect`, no module `let`/`Map`/`Set` | `git diff a5da9460..HEAD -- apps \| grep -nE '^\+.*(\bany\b\|\bas [A-Z]\|useEffect\(\|^\+let \|new (Map\|Set))'` | exit 1, none found | PASS |
| B06 | No prose comments | read in full | only `// @FollowsBlueprint test-query-hook` and `// @FollowsBlueprint test-component-render` added | PASS |
| B07 | Magic numbers / strings named | read in full | `APP_STALE_TIME_MS = 30_000` in the hook test; no other literal added | PASS |
| B08 | `noUncheckedIndexedAccess` | read in full | `states.at(-1)` compared with `toStrictEqual`, no unguarded index | PASS |
| B09 | Standards checklist (01): "a boolean name is not negated" | read SetlistOrderPage.tsx | `const isOrderFromTheServer = entriesQuery.isFetchedAfterMount;` at :57, used as `!isOrderFromTheServer` | PASS |
| B10 | Standards checklist (01): "a file name says what the file holds" | new file | `SetlistOrderPage.test.tsx` sits beside `SetlistOrderPage.tsx` | PASS |
| B11 | Standards checklist (03): "a response from the Hono client, rather than being written out by hand" | offline-reading.utils.ts:8-13 | derived through `InferResponseType`, see A04 | PASS |
| B12 | Standards checklist (05): "a route composes organisms and owns no layout primitive" | read SetlistOrderPage.tsx in full | `<p className="m-0 px-4 py-4 text-meta text-danger sm:px-9 sm:py-7" role="alert">` at SetlistOrderPage.tsx:51 adds a styled, padded element to a route. It copies the file's existing loading `<p>` at :60 and missing-id `<p>` at :30. Introduced: this branch (line :51), pre-existing (:30, :60); Fix size: one file | FAIL (non-blocking) |
| B13 | Standards checklist (09): "a key's dotted path names the screen and the element" | `setlist.failure.load` | reused key, already used by `SetlistEditor.tsx:185` for the same failure | PASS |
| B14 | Standards checklist (10): "a test name states the behaviour and the condition" | 4 new `it` names | "offers no row to drag while the order on screen is a saved copy the server has not confirmed", "refetches a restored order on mount and says so only once the server answered" | PASS |
| B15 | Standards checklist (12): disable comments | grep `eslint-disable` in diff | none added | PASS |

## C. Tests pass

| # | Workspace | Command | Exit | Verdict |
|---|---|---|---|---|
| C01 | @borso-app/pragma | `pnpm --filter @borso-app/pragma exec vitest run --project core --changed a5da94607ee09eeec632ec076613290550ab9c85 --coverage` | 0 (15 files, 100 tests; coverage 100% on the 13 gated statements) | PASS |
| C02 | @borso-app/pragma | `pnpm --filter @borso-app/pragma run test:e2e --changed a5da94607ee09eeec632ec076613290550ab9c85` | 0 ("No test files found"; no `api/` path changed) | PASS |
| C03 | `*.utils.ts` sibling tests | changed `offline-reading.utils.ts` | `offline-reading.utils.test.ts` exists and ran in C01 | PASS |

## D. Test coverage of spec

| # | Use case | Covering test | Verdict |
|---|---|---|---|
| D01 | Goal: a restored order is refetched on mount even when fresh, and the hook reports the server answer only once it arrived | `it('refetches a restored order on mount and says so only once the server answered')` at apps/pragma/site/src/lib/queries/setlist-entries.queries.test.tsx:217; seeds `[a,b]` fresh under a 30 s `staleTime`, holds the fetch on a deferred; `expect(states.at(-1)).toStrictEqual({ order: ['a', 'b'], isFetchedAfterMount: false });` at :232 then `{ order: ['b', 'a'], isFetchedAfterMount: true }` at :237 | PASS |
| D02 | Goal: no row to drag while the order is unconfirmed; rows once confirmed | `it('offers no row to drag while the order on screen is a saved copy the server has not confirmed')` at apps/pragma/site/src/routes/setlists/SetlistOrderPage.test.tsx:70, `expect(container.querySelectorAll('li')).toHaveLength(0);` at :72; `it('offers the rows once the server answered after the page opened')` at :75, `toHaveLength(2)` at :78 | PASS |
| D03 | Goal: a failed refetch never offers the restored copy | `it('says the order could not be loaded instead of offering the saved copy')` at SetlistOrderPage.test.tsx:81; `expect(container.querySelector('[role="alert"]')).not.toBeNull();` at :84 and `toHaveLength(0)` at :85 | PASS |
| D04 | Data shape: `buster` saved (round-1 Note) | query-client.setup.test.ts:124-125 `const saved: unknown = JSON.parse(localStorage.getItem(PERSISTED_CACHE_KEY) ?? 'null');` / `expect(saved).toMatchObject({ buster: queryCachePersistOptions.buster });` | PASS |

## E. Scale

| # | Write path or state | Question | Failing case, or the key or test that holds it | Verdict |
|---|---|---|---|---|
| E01 | Server write paths | Check-then-write | `git diff --name-only a5da9460..HEAD` lists no `api/`, `cdk/`, `.service.ts`, `.repository.ts`, `.controller.ts` or migration path. The diff writes to no database | PASS |
| E02 | Module-level state | Per-process state | the B05 grep finds no added `let`, `Map` or `Set` at module level | PASS |
| E03 | Client: persisted entries cache read by the order screen | A drag made before the mount refetch answers | Held by SetlistOrderPage.tsx:57-58 (`isFetchedAfterMount` gate) and setlist-entries.queries.ts:60 (`refetchOnMount: 'always'`); proved by D01 and D02 | PASS |

## Blocking findings

- none

## Non-blocking findings

- B12: SetlistOrderPage.tsx:51 adds a padded, styled `<p role="alert">` inside a route, beside two pre-existing ones at :30 and :60, where the standard asks a route to compose organisms or molecules only.
- Offline order screen (no row number, it has no category row). Offline, `/setlists/:id/order` shows "Loading…" until the network returns. With the default `networkMode: 'online'` (query-client.setup.ts:36 sets none), the mount refetch pauses, `isFetchedAfterMount` stays false, and the screen never renders the restored order nor its "Copy order" button. On `origin/main` the worker's data cache served that screen offline. The spec promises offline reading of "the catalog and the next setlist" (Acceptance), which the setlist editor still meets, and puts offline writes out of scope.

## Notes

- The `isFetchedAfterMount` gate assumes the order screen mounts after the persisted cache is hydrated. If it mounted during restore, `hydrate` would `setState` the existing empty query with the saved `dataUpdateCount` (query-core `hydration.js:79-81`), and `isFetchedAfterMount` would read true before any server answer. Today that cannot happen: `RequireSession` renders `CheckingSession` while `probe.isPending`, and the probe does not fetch while `isRestoring`, so every gated route mounts after hydration. Should a test or a comment-free structural guard (for example `useIsRestoring()` in the page) pin that ordering, so a change to the gate cannot reopen the window?
- Offline order screen (see Non-blocking): should it show the restored order read-only with an offline notice, for example through `networkMode: 'offlineFirst'` on this query plus `OfflineBanner`, rather than an endless "Loading…"?
- SetlistOrderPage.test.tsx mocks the app's own query hooks (`vi.mock('../../lib/queries/setlist-entries.queries', …)`), which docs/standards/10-testing.md "No mocks for pure code, and few mocks anywhere" discourages. It follows precedent (`SetlistScenePage.test.tsx`, `SongScenePage.test.tsx`), and D01 covers the real hook, so the composed claim is covered by the two tests together. Should a single test drive the page against `stubFetch` instead?
- Round-1 non-blocking B15 is fixed (A04). Round-1 Notes on cross-device last-write-wins, 7-day `gcTime` for search keys, and refetch after `onSessionEnded` are untouched by this diff and remain open questions.

## Verdict: PASS
