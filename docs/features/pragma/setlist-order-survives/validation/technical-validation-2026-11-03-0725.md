# Technical validation — Setlist order survives

- Spec: [`../spec/spec.md`](../spec/spec.md)
- Plan: [`../plan/plan.md`](../plan/plan.md)
- Branch: fix/pragma-setlist-reorder
- Base: origin/main
- Run at: 2026-11-03T07:31:49Z
- Round: 1
- Reviewed: a5da94607ee09eeec632ec076613290550ab9c85
- Touched workspaces: @borso-app/pragma (site), @borso-app/talos (site, scope only), @borso-app/last-loop-lepin (site, scope only), repository root (eslint-rules, scripts/quality, docs)

The spec has no Q.O.D., *Files to change*, *Use cases / edge cases* or *Test strategy* section. Categories A and D are built from its *Goal*, *Behaviour* (7 items), *Data shape* and *Acceptance* lists, with files taken from the plan table. 1 acceptance check (the 375 px production drag-and-return sweep) is routed to /visual-validation and is out of scope for this report.

## A. Correctness vs spec

| # | Spec ref | Claim | Code (file:line) | Evidence (quoted) | Verdict |
|---|---|---|---|---|---|
| A01 | Behaviour 1 / plan 1 | The worker answers no `/api/` request from a cache | apps/pragma/site/public/sw.js:84-98 | `if (isMutation(request)) return;` … `if (isShellRequest(request, url)) {` … `if (isFingerprintedAssetPath(url.pathname)) {` (the `isReadableApiPath` / `staleWhileRevalidate` branch is deleted; an `/api/` GET falls through with no `respondWith`) | PASS |
| A02 | Behaviour 1 / plan 1 | The old `pragma-v4-data` cache is deleted on activation | apps/pragma/site/public/sw.js:35 | `Promise.all(keys.filter((key) => key !== SHELL_CACHE).map((key) => caches.delete(key)))` | PASS |
| A03 | Behaviour 2 / plan 2 | Shell, assets and push are unchanged | apps/pragma/site/public/sw.js:20-28, 53-82, 100 | `await shellCache.addAll(SHELL_ASSETS);` … `function cacheFirst(request) {` … `importScripts('/sw-notifications.js');` (only the precache call and data branch were removed) | PASS |
| A04 | Behaviour 3 / Data shape | Cache persisted to `localStorage` under `pragma.query-cache`, `maxAge` 7 days, `buster` constant | apps/pragma/site/src/lib/query-client.setup.ts:19-21, 41-55 | `const PERSISTED_CACHE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;` / `const PERSISTED_CACHE_KEY = 'pragma.query-cache';` / `storage: window.localStorage,` / `buster: PERSISTED_CACHE_SHAPE_VERSION,` | PASS |
| A05 | Behaviour 3 / plan risk | `gcTime` equals the persister `maxAge` | apps/pragma/site/src/lib/query-client.setup.ts:36 | `queries: { staleTime: DEFAULT_STALE_TIME_MS, gcTime: PERSISTED_CACHE_MAX_AGE_MS, retry: 1 },` | PASS |
| A06 | Behaviour 3 / plan 3 | Restored at start-up through `PersistQueryClientProvider` | apps/pragma/site/src/main.tsx:40-46 | `<PersistQueryClientProvider client={queryClient} persistOptions={queryCachePersistOptions} onSuccess={startOfflineReading}>` | PASS |
| A07 | Behaviour 4 / plan 4 | Signed in, loads what is missing among catalog list, every song, next session, its setlists and their entries | apps/pragma/site/src/lib/queries/offline-reading.queries.ts:32-56 | `queryClient.query({ ...songsListQueryOptions(), staleTime: NEVER_STALE }),` … `setlistsOfSession.setlists.map((setlist) => queryClient.query({ ...setlistEntriesQueryOptions(setlist.id), staleTime: NEVER_STALE }))` | PASS |
| A08 | Behaviour 4 | Never refetches what the cache holds just for this | offline-reading.queries.ts:13, 34; query-core `query.js:107-109` | `const NEVER_STALE = 'static';` and in query-core `if (staleTime === "static") return false;` after `if (this.state.data === void 0) return true;` | PASS |
| A09 | Behaviour 4 / plan risk | Runs only when signed in, on start-up and on sign-in | offline-reading.queries.ts:64-66; query-client.setup.ts:63-73 | `if (!hasSessionMarker()) return;` / `if (!(await isSignedIn(queryClient))) return;` / `if (isSignIn) startOfflineReading();` | PASS |
| A10 | Behaviour 4 / plan 4 | Same key and fetcher as the hooks (`…QueryOptions` extracted) | songs.queries.ts, sessions.queries.ts, setlists.queries.ts, setlist-entries.queries.ts | `export function setlistEntriesQueryOptions(setlistId: string) {` … `return useQuery({ ...setlistEntriesQueryOptions(setlistId), enabled: isEnabled });` (same shape in the other three modules) | PASS |
| A11 | Behaviour 5 / plan 5 | Two setlist entry writes never travel at once | apps/pragma/site/src/lib/queries/setlist-entries.queries.ts:40, 82, 135, 175, 229, 291 | `const ENTRY_WRITE_SCOPE = { id: 'setlist-entry-writes' } as const;` and `scope: ENTRY_WRITE_SCOPE,` on add, update, delete, restore and reorder | PASS |
| A12 | Behaviour 6 / plan 6 | Paused mutations are not saved | query-client.setup.ts:46-48, 54 | `function isMutationPersisted(): boolean { return false; }` / `dehydrateOptions: { shouldDehydrateMutation: isMutationPersisted },` | PASS |
| A13 | Behaviour 7 / plan 7 | The saved cache is dropped when the session ends | query-client.setup.ts:80-85 | `queryClient.removeQueries({ predicate: isBandDataQuery });` / `void queryCachePersister.removeClient();` (the persister's trailing throttled save reads its latest arguments, so a later save holds only the `auth` keys) | PASS |
| A14 | Out of scope | `/api/offline-manifest` unchanged | `git diff --name-only origin/main...HEAD` | no path under `apps/pragma/api/` in the diff | PASS |
| A15 | Goal | "the next drag never writes an older order back" | apps/pragma/site/src/routes/setlists/SetlistOrderPage.tsx:47, 105-112 | See E02: a drag on a restored, not-yet-refetched order writes that older order back | FAIL (blocking), see E02 |
| A16 | Spec structure | Files to change | spec.md | The spec has no *Files to change* section; the files are taken from the plan table and the diff. The diff also carries work no plan row names: the `borso/optimistic-mutation-declares-scope` rule and its rollout to talos and last-loop-lepin, the dantotsu skill and schema check, and a CLAUDE.md connector rule | PASS (noted) |

## B. Code cleanliness

| # | Rule | Check | Evidence | Verdict |
|---|---|---|---|---|
| B01 | No abbreviations / 1-letter locals | read changed source in full | none found | PASS |
| B02 | Lint clean | `pnpm exec oxlint --type-aware <40 changed .ts/.tsx/.js files>` | exit 0, no output | PASS |
| B03 | Typecheck | `pnpm --filter @borso-app/pragma run typecheck`; `pnpm typecheck` (root) | exit 0 / exit 0 | PASS |
| B04 | knip | `pnpm knip` | exit 0, configuration hints only | PASS |
| B05 | No `any` | `git diff … \| grep -nE '^\+.*\bany\b'` on changed app files | none found | PASS |
| B06 | Type assertions only `as const` / `as unknown` | same grep for `\bas [A-Z]` | none found; new constants use `as const` | PASS |
| B07 | No prose comments | grep `^\+.*// ` | only `// @FollowsBlueprint …` and `/** @DependsOnExternal browser-local-storage */`, `/** @Feature shell */`, all machine-read | PASS |
| B08 | Magic numbers / strings named | read in full | `PERSISTED_CACHE_MAX_AGE_MS`, `PERSISTED_CACHE_KEY`, `PERSISTED_CACHE_SHAPE_VERSION`, `NEVER_STALE`, `UPDATED_EVENT`, `SUCCESS_ACTION`, `PATH_SEPARATOR` | PASS |
| B09 | `useEffect` is a smell | `grep -nE '\buseEffect\('` on changed .ts/.tsx | none added | PASS |
| B10 | `noUncheckedIndexedAccess` | read in full | no index access in new code; tests use `stub.calls` destructuring with `first?.` | PASS |
| B11 | Standards checklist (01): "a `find…` returns `null` … a `build…`, `project…` or `select…` returns what its verb says" | read offline-reading.utils.ts in full | `selectOfflineReadingTargets` and `selectLastPathSegment` return the selected values; no `find…`/`get…` added | PASS |
| B12 | Standards checklist (01): "a definition in a `VOCABULARY.md` is still true" | read apps/pragma/VOCABULARY.md "Offline manifest" | "The list of URLs whose reads the app loads into its saved query cache once signed in … (`loadOfflineReadingWhenSignedIn`). The service worker caches no API read." matches sw.js and offline-reading.queries.ts; "Lives in: `api/src/sessions/`" matches `api/src/sessions/offline-manifest.core.ts` | PASS |
| B13 | Standards checklist (01): "a boolean name is not negated" | read in full | `isMutationPersisted`, `isSignInUpdate`, `isAuthenticatedProbe`, `isBandDataQuery`, `isSignedIn` | PASS |
| B14 | Standards checklist (02): "the choice between `.core.ts` and `.utils.ts`" | read offline-reading.utils.ts | URL segment parsing and a TanStack cache event test, no band vocabulary: `.utils.ts` is right | PASS |
| B15 | Standards checklist (03): "a response from the Hono client, rather than being written out by hand beside the thing it mirrors" | read offline-reading.utils.ts | `export interface OfflineManifestUrls { readonly songDetailUrls: readonly string[]; readonly nextSessionUrl: string \| null; }` at apps/pragma/site/src/lib/queries/offline-reading.utils.ts:78-81 restates two fields of the `/api/offline-manifest` response (`api/src/sessions/offline-manifest.core.ts:12-13`). Nothing breaks today, because the call site at offline-reading.queries.ts:72 still type-checks the Hono response against it. Introduced: this branch; Fix size: one file | FAIL (non-blocking) |
| B16 | Standards checklist (07): reason on a surviving effect | — | no effect added | PASS |
| B17 | Standards checklist (10): "a test name states the behaviour and the condition" | read the 4 changed/new test files | e.g. "sends an API read to the network even when a cache holds an older copy, …", "stops quietly when the network is gone and no manifest was ever held" | PASS |
| B18 | Standards checklist (12): disable comments carry a checkable reason | grep `eslint-disable` in diff | none added | PASS |
| B19 | Standards checklist (06): a mutation that holds the full result reconciles from the response | read changed mutations | only `scope` lines were added; no `onSuccess`/`invalidateQueries` changed | PASS |

## C. Tests pass

| # | Workspace | Command | Exit | Verdict |
|---|---|---|---|---|
| C01 | @borso-app/pragma | `pnpm --filter @borso-app/pragma exec vitest run --project core --changed origin/main --coverage` | 0 (47 files, 259 tests; coverage gate 100% on the 13 gated statements) | PASS |
| C02 | @borso-app/pragma | `pnpm --filter @borso-app/pragma run test:e2e --changed origin/main` | 0 (no affected back-e2e file; the diff touches no `api/` path) | PASS |
| C03 | @borso-app/talos | `pnpm --filter @borso-app/talos exec vitest run --project core --changed origin/main` | 0 (5 files, 17 tests) | PASS |
| C04 | @borso-app/last-loop-lepin | `pnpm --filter @borso-app/last-loop-lepin exec vitest run --project core --changed origin/main` | 0 (2 files, 8 tests) | PASS |
| C05 | root | `pnpm exec vitest run --changed origin/main` | 0 (eslint-rules/optimistic-mutation-declares-scope.test.js, scripts/quality/dantotsu-schema.core.test.ts; 44 tests) | PASS |
| C06 | `*.utils.ts` sibling tests | new `offline-reading.utils.ts` | `offline-reading.utils.test.ts` exists and ran under C01 | PASS |

## D. Test coverage of spec

| # | Use case | Covering test | Verdict |
|---|---|---|---|
| D01 | Behaviour 1 + Acceptance unit test: an online API read with an older copy seeded in every cache returns the network answer | `it('sends an API read to the network even when a cache holds an older copy, …')` at apps/pragma/site/src/sw/service-worker.test.ts:106; seeds `pragma-v4-data` and `SHELL_CACHE`; assertion `expect(receivedByThePage.body).toBe(savedOrder.body);` at :117 | PASS |
| D02 | Behaviour 1: the old data cache is deleted | `it('deletes the API data cache of the previous version on activate')` at service-worker.test.ts:120; `expect([...worker.caches.namedCaches.keys()]).toEqual([]);` at :130 | PASS |
| D03 | Behaviour 2: shell, assets, push unchanged | existing tests at service-worker.test.ts:55-103 (`expect(served?.body).toBe('cached');` at :92, `expect(entryPoint?.body).toBe('<!doctype html><title>fresh</title>');` at :103) and push suite at :165-362 (`expect(worker.notifications[0]?.title).toBe('Nouvelle prise');` at :187), all green in C01 | PASS |
| D04 | Behaviour 3: the query cache is saved to `localStorage` and restored | `it('saves the queries under its own key and never a write waiting for the network')` at apps/pragma/site/src/lib/query-client.setup.test.ts:116; `expect(queryClient.getQueryData(songKeys.list())).toStrictEqual({ songs: [{ id: 'song-1' }] });` at :125 after `queryClient.clear()` and `persistQueryClientRestore` | PASS |
| D05 | Behaviour 3: optimistic writes included | structural: an optimistic write is a `queryClient.setQueryData` in `onMutate` (setlist-entries.queries.ts:303-308), the same call D04 saves and restores at query-client.setup.test.ts:117/125 | PASS |
| D06 | Data shape: `maxAge` 7 days and `gcTime` equal | `it('keeps a query for as long as the saved copy lives, …')` at query-client.setup.test.ts:111; `expect(queryClient.getDefaultOptions().queries?.gcTime).toBe(queryCachePersistOptions.maxAge);` at :113 | PASS |
| D07 | Behaviour 4: loads what is missing | `it('fetches what the cache is missing and leaves what it already holds alone')` at apps/pragma/site/src/lib/queries/offline-reading.queries.test.ts:56; `expect(listRequestedPaths(stub)).toEqual([... '/api/setlists/setlist-next/entries', '/api/songs/song-missing'])` at :66 | PASS |
| D08 | Behaviour 4: never refetches what the cache holds | same test, cache seeded with `songKeys.list()` and `songKeys.byId('song-held')` at :60-61; the `toEqual` at :66 fails if `/api/songs` or `/api/songs/song-held` is requested | PASS |
| D09 | Behaviour 4: once signed in (sign-in triggers it; signed-out and never-signed-in do not) | query-client.setup.test.ts:137 `toContainEqual(expect.stringContaining('/api/offline-manifest'))`; offline-reading.queries.test.ts:89 and :99 `expect(stub.calls).toEqual([]);` | PASS |
| D10 | Behaviour 5: two entry writes never travel at once | `it('shows both drops at once and sends the second order only after the first answer')` at apps/pragma/site/src/lib/queries/setlist-entries.queries.test.tsx:161; `expect(stub.calls).toHaveLength(1);` at :179 | PASS |
| D11 | Behaviour 6: paused mutations are not saved | query-client.setup.test.ts:116 builds an `isPaused: true` mutation; `expect(queryClient.getMutationCache().getAll()).toEqual([]);` at :126 (TanStack's default `shouldDehydrateMutation` keeps paused ones, so this fails without the option) | PASS |
| D12 | Behaviour 7: dropped when the session ends | `it('drops the band data it held and the copy saved on the phone, …')` at query-client.setup.test.ts:61; `expect(localStorage.getItem(PERSISTED_CACHE_KEY)).toBeNull();` at :69 and `expect(queryClient.getQueryData(songKeys.list())).toBeUndefined();` at :68 | PASS |
| D13 | Goal: the next drag never writes an older order back, when the screen opens on a restored cache | (none found); see E02 | FAIL (blocking), see E02 |

## E. Scale

| # | Write path or state | Question | Failing case, or the key or test that holds it | Verdict |
|---|---|---|---|---|
| E01 | Server write paths | Check-then-write | `git diff --name-only origin/main...HEAD \| grep -E 'api/src\|cdk/\|\.service\.ts\|\.repository\.ts\|\.controller\.ts\|migrations'` returns nothing (exit 1). The diff writes to no database. No module-level `Map`/`Set`/`let` was added (`grep -nE '^\+(let\|const) [a-zA-Z]+ = new (Map\|Set)\|^\+let '` exit 1) | PASS |
| E02 | Per-device state: the persisted query cache (query-client.setup.ts:36, 41-55) read by `SetlistOrderPage` and `useReorderSetlist` | A drag made on a restored cache before the refetch answers | `SetlistOrderPage.tsx:47` gates only on `entriesQuery.isLoading`, which is false once entries are restored, so the list renders the restored order while the mount refetch is in flight. A drag then calls `useReorderSetlist`, whose `onMutate` runs `await queryClient.cancelQueries({ queryKey: key });` (setlist-entries.queries.ts:303). That cancels the refetch and reverts to the restored data, and the `PUT` carries an order derived from it. Failing case: phone A saved entries `[a,b,c]` to `pragma.query-cache` on day 0. Member B reorders to `[c,b,a]` on day 1. On day 2, A opens `/setlists/:id/order`, and the `GET /api/setlists/:id/entries` takes 1.65 s (the prod latency quoted in docs/standards/06-data-fetching.md). A drags `b` above `a` within that window, so `PUT /api/setlists/:id/reorder` sends `{ entryIds: ['b','a','c'] }`, B's order is overwritten, and A's screen never shows `[c,b,a]`. Before this branch the same window lasted only the default 5-minute `gcTime` in one tab. Now it lasts 7 days and survives restarts. Introduced: this branch | FAIL (blocking) |
| E03 | Client write serialisation (`ENTRY_WRITE_SCOPE`) | Per-process scope | `scope` queues mutations inside one `MutationCache`, which means one tab. The spec states the rule per client ("Two setlist entry writes never travel at once"), and setlist-entries.queries.test.tsx:179 proves it per client. Cross-device ordering is not a rule the spec states; see Notes | PASS |

## Blocking findings

- E02 (and A15, D13): the restored cache's setlist order is shown and draggable while the mount refetch is in flight. A drag in that window cancels the refetch and `PUT`s an order derived from data up to 7 days old, which overwrites another member's saved order. No test covers this.

## Non-blocking findings

- B15: `OfflineManifestUrls` (offline-reading.utils.ts:78-81) restates two fields of the `/api/offline-manifest` response by hand instead of deriving them from the Hono client type.

## Notes

- The spec has no Q.O.D., *Files to change*, *Use cases / edge cases* or *Test strategy* section. A and D were built from *Behaviour*, *Data shape* and *Acceptance*. Should `/specification` add a *Test strategy* that routes the 375 px production sweep to `/visual-validation` explicitly?
- The diff carries work no plan row names: the new `borso/optimistic-mutation-declares-scope` rule with `scope` added across pragma, talos and last-loop-lepin, the dantotsu skill rewrite and section check in `scripts/quality/dantotsu-schema.core.ts`, and the CLAUDE.md connector rule. All of it lints and tests green (B02, C03-C05). Should it ship in this PR or a separate one?
- query-client.setup.test.ts:124 `expect(localStorage.getItem(PERSISTED_CACHE_KEY)).toContain(queryCachePersistOptions.buster);` passes on any saved string containing `1`, and the seeded `song-1` contains it. Should it parse the saved JSON and compare its `buster` field?
- Two devices, or two tabs, each send whole-order `PUT /reorder` with no version check, so the last commit wins across devices. The spec states serialisation per client only. Is a server-side precondition (for example an `If-Match` on the setlist's last update) wanted?
- `gcTime` is now 7 days for every query, including search results (`songKeys.search(query)`, bar place search). Is in-memory and `localStorage` growth from per-keystroke search keys acceptable within the 7-day window?
- After `onSessionEnded` removes the band queries, any still-mounted `useQuery` observer rebuilds its query on the next render and refetches, which gets another 401. Does the app unmount every band screen when the probe turns `authenticated: false`?

## Verdict: FAIL
