# Plan — pragma never asks the API for more than two things at once

> Early quality check. Pair with [`../spec/spec.md`](../spec/spec.md) (SHA-256 `25433b7d…df63`) and [ADR-2026-11-05T0445](../../../../adr/2026-11-05T0445-pragma-reads-leave-in-one-batch-per-tick.md). When a defect lands and a Dantotsu traces back here, the chain is visible: the plan either named the risk and we missed mitigating it, didn't name the risk at all (planning gap), or named it correctly and the defect comes from elsewhere.

Goal. One pragma tab never has more than 2 read requests in flight, on any route, so `pragma-prod-api` (reserved concurrency 10) is never filled by one member. The smallest change is in the transport under `api`, not in the screens. Raising the concurrency is excluded.

Branch `claude/wizardly-mendel-0nq8qs` was level with `origin/main` when this plan was written (measured, `git log HEAD..origin/main` empty on 2026-11-05).

## Slices

Five commits. Each leaves the branch green. The brief suggested rule B first. The code says otherwise, because rule B refuses three lines in `offline-reading.queries.ts` and one in `setlist-entries.queries.ts` today (spec, Rule B hits). So D3 and D12 land first, and rule B lands with zero hits and no temporary disable.

| # | Commit | Spec refs | Depends on |
|---|---|---|---|
| 1 | `refactor(pragma): preload offline reading from the lists and delete the offline manifest` | D3, D12, Types (VOCABULARY), stale scope | none |
| 2 | `feat(meta): refuse a request fan-out over a mapping in site code` | D10, D11, I3 | 1 |
| 3 | `feat(pragma): answer a read batch in one Lambda` | D9, D14, D15, ADR | none |
| 4 | `feat(pragma): send the reads of one tick as one batch, two in flight at most` | D13, D15, D16, D17, I1, I2 | 3 |
| 5 | `feat(pragma): open behind the pragma mark until the first band data lands` | D6, D18, Result (opening screen) | 4 |

Slice 1 is a `refactor:` that replaces a mechanism. Its commit body names the property the manifest had and the new path drops: one server-side choice of what to preload, read in one call. The new path picks the next session with the same rule as home instead.

## How each spec decision becomes code

### Slice 1. Offline preload from the lists, manifest deleted (D3, D12)

| Spec ref | Decision | Where it lands | Self-check |
|---|---|---|---|
| D3 | The preload reads the songs and sessions lists, picks the next session with `selectNextSession`, then reads that session, its setlists and their entries | `site/src/lib/queries/offline-reading.queries.ts`. `loadOfflineReadingWhenSignedIn` awaits `Promise.allSettled([query(songsListQueryOptions()), query(sessionsListQueryOptions())])` (a literal pair, allowed by D10), then `selectNextSession(sessions, new Date())`, then `loadNextSession` as today with its entries read through the D12 helper. `loadSongDetails` keeps seeding `songKeys.byId` from the list and drops the per-song fallback, since no target list remains | `offline-reading.queries.test.ts` asserts the requested paths are `/api/songs`, `/api/sessions`, `/api/sessions/:id`, `/api/setlists/by-session/:id`, `/api/setlists/:id/entries`, and never `/api/offline-manifest` or `/api/songs/:id` |
| D3 | A list read for the preload | `site/src/lib/queries/sessions.queries.ts`. Extract `sessionsListQueryOptions()` from `useSessionsList` (same key `sessionKeys.list()`), so the preload and home share one cache entry | `grep -n "sessionsListQueryOptions" site/src/lib/queries/*.ts` shows the hook and the preload |
| D3, edge "today and already started" | Home and the preload pick the same session | Both call `selectNextSession` from `domain/session-schedule.core.ts` | Test case in `offline-reading.queries.test.ts`: a session today at an hour already past is preloaded |
| D3, edge "No session ahead" | The preload stops after the lists | `offline-reading.queries.ts`, early return on `null` | Test case: an empty sessions list requests nothing past the two lists |
| D3 | Drop `selectOfflineReadingTargets` and `OfflineManifestUrls`, keep `isSignInUpdate` | `site/src/lib/queries/offline-reading.utils.ts(+test)` | `pnpm knip` reports no unused export. `scripts/check-pure-modules-have-callers.sh` passes |
| D3 | The restore start reads the cached probe and never fetches it | `site/src/lib/query-client.setup.ts`. `startOfflineReading` on restore reads `queryClient.getQueryData(authKeys.session())`. With no cached probe it does nothing, and the cache subscription (`isSignInUpdate`) starts the preload when `RequireSession`'s probe lands. This removes one known split group (spec Risks) | `query-client.setup.test.ts`: a restore with no cached probe sends no request. The `/api/offline-manifest` assertion at line 157 becomes `/api/sessions` |
| D3 | Delete the route, its core, test and service function | Delete `api/src/sessions/offline-manifest.core.ts(+test)`. Remove `buildOfflineManifestRouter` from `sessions.controller.ts`, `getNextSessionOfflineManifest` from `sessions.service.ts`, the `.route('/api/offline-manifest', …)` line from `app.ts` | `grep -rn "offline-manifest\|OfflineManifest" apps/pragma` returns only `docs/` |
| D3 (not in spec) | `offline-manifest.core.ts` holds `@Blueprint core-projection`, which 64 files follow (measured). Deleting it orphans them and the `blueprint-index` check fails | Move the `@Blueprint core-projection` block onto `projectSessionForTool` in `api/src/sessions/session-tool.core.ts` (already a follower). Rewrite `@BlueprintDescription` to describe that function. Then `pnpm exec tsx .claude/skills/blueprint/blueprint-indexing.ts --accept api/src/sessions/offline-manifest.core.test.ts` to drop its subject entry from `docs/standards/blueprint-subjects.json` | `pnpm exec tsx .claude/skills/blueprint/blueprint-indexing.ts --check` exits 0 |
| D3 | Stale scope | `domain/stale-scope.core.ts`, drop `offline-manifest` from `UNANNOUNCED_API_ROOTS` and `DERIVED_READ_ROOTS`. `site/src/lib/queries/query-read-roots.core.ts`, drop its row. `api/src/realtime/derived-read-roots.test.ts`, drop it from the `sessions` row | `stale-scope-coverage.test.ts`, `derived-read-roots.test.ts` and `query-key-roots.test.ts` pass |
| D3 | MCP exclusion | `api/src/mcp/tool-coverage.core.ts`, delete `'GET /api/offline-manifest'` | `api/src/mcp/tool-coverage.test.ts` reports no stale exclusion |
| D12 | One shared helper for entries per setlist of one session, with the inline disable | `site/src/lib/queries/setlist-entries.queries.ts`. `entriesOfSetlistsQueryOptions(setlistIds)` returns the `queries` array. `useEntriesOfSetlists` and `loadNextSession` both call it. The rule B disable goes on that one line in slice 2, where the rule exists, because `reportUnusedDisableDirectives` is `error` (measured in `.oxlintrc.json`) | `grep -c "setlistEntriesQueryOptions(setlist" site/src/lib/queries/*.ts` shows one call site |
| Types | VOCABULARY | `apps/pragma/VOCABULARY.md`. Remove **Offline manifest** (line 853) and its two `Held by` lines. Rewrite the **Offline reading** wording, if any, to name `selectNextSession` | `scripts/check-vocabulary-paths.sh` exits 0 |

### Slice 2. Rule B, `borso/no-request-fan-out-in-site` (D10, D11, I3)

| Spec ref | Decision | Where it lands | Self-check |
|---|---|---|---|
| D10 | Refuse a `.map`, `.flatMap` or `Array.from(x, fn)` whose callback sends a request directly or through a same-file function. A literal array with no spread passes | `eslint-rules/no-request-fan-out-in-site.js`, `// @FollowsBlueprint lint-rule` and the transitive pass from `lint-rule-transitive-call` (`no-refetch-of-optimistically-written-query.js:253`). A call sends a request when it is `fetch(…)`, a member call named `$get`, `$post`, `$put`, `$patch` or `$delete`, or a member call named `query`, `fetchQuery`, `prefetchQuery` or `ensureQueryData` | RuleTester suite, cases below |
| D10 | `useQueries` and `useSuspenseQueries` over a mapping are refused, whatever the callback holds | Same file. `queries:` property whose value is a `.map`, `.flatMap` or `Array.from` call | RuleTester: `useQueries({ queries: ids.map((id) => options(id)) })` is invalid |
| D11 | Loop check. A `$get`, `queryClient.query` or `queryClient.fetchQuery` awaited in a `for`, `for…of`, `for…in`, `while` or `do…while` body, directly or through a same-file function. A write in a loop stays allowed | Same file, second `messageId` | RuleTester: `for (const id of ids) await api.x[':id'].$get(…)` invalid, `for (…) await api.x.$delete(…)` valid |
| D11 | Two messages, verbatim from the spec, each ending with `See docs/standards/06-data-fetching.md.` | `MESSAGE_FAN_OUT` and `MESSAGE_AWAITED_IN_LOOP` constants | RuleTester asserts each `messageId` |
| D11 | Scope | `eslint-rules/index.js` registers it. `.oxlintrc.json` sets it to `error` in the existing `apps/*/site/**/*.{ts,tsx}` block (line 535) and `off` in the `**/*.test.{ts,tsx,js}` block (line 926), because a test's fetch answers a stub | RuleTester runs one valid case under `apps/pragma/api/src/x.ts` to show the rule is site-only by configuration, as `test-lint-rule` asks |
| D12 | The one surviving hit | `setlist-entries.queries.ts`, `// eslint-disable-next-line borso/no-request-fan-out-in-site -- one read per setlist of one session; production holds at most 1 per session (measured)` | `scripts/lint-repository.sh` exits 0 |
| I3 | `pnpm lint` refuses the planted lines | RuleTester invalid cases: the dantotsu's faulty `Promise.allSettled([… ids.map((id) => queryClient.query(…))])`, a `.map` calling `queryClient.query`, a `$get` in a `.flatMap`, a same-file helper that calls `$get` used in a `.map`, `useQueries` over a map, `$get` awaited in `for…of`, `queryClient.fetchQuery` awaited in `while`. Valid near misses: the `voting.queries.ts` literal pair of invalidations, `keys.map((key) => caches.delete(key))`, a `$delete` awaited in a loop, `Promise.all([a(), b()])`, an `invalidateQueries` in a map | `pnpm exec vitest run eslint-rules/no-request-fan-out-in-site.test.js` passes |
| D11 | The standard the messages point to | `docs/standards/06-data-fetching.md`, a new section "One request per item, and the read batch" (the read batch, its 10 and 2, why a fan-out still costs a database read per item) and a bullet in "Enforced by" | `grep -n "no-request-fan-out-in-site" docs/standards/06-data-fetching.md` matches |

### Slice 3. The API read batch (D9, D14, D15)

| Spec ref | Decision | Where it lands | Self-check |
|---|---|---|---|
| D15, Types | Constants and wire types shared by both sides | `domain/read-batch.core.ts(+test)`, `// @FollowsBlueprint core-lookup-table`. `READ_BATCH_PATH`, `MOST_READS_PER_BATCH = 10`, `MOST_READS_IN_FLIGHT = 2`, `BatchedRead`, `ReadBatch`, `BatchedAnswer`, `ReadBatchAnswer`, and `isBatchableRead(path)`. It requires the `/api/` prefix, refuses `READ_BATCH_PATH` itself, and refuses a path whose `new URL(path, base).pathname` differs from its raw pathname (so `/api/../x` and `%2e%2e` fail) | Unit cases from the spec: allows `/api/songs?x=1`, refuses `/mcp`, `/api/read-batch`, `/api/../x` |
| Malformed batch | `400 read-batch-invalid` and nothing run | `api/src/read-batch/read-batch.schema.ts(+test)`, `// @FollowsBlueprint schema-input-only`. Zod: `reads` array of 1 to `MOST_READS_PER_BATCH`, `path` passes `isBatchableRead`, `headers` keys in `PRAGMA_REQUEST_HEADER_NAMES` (`domain/request-headers.core.ts`), values strings | Schema test: 0 reads, 11 reads, `/mcp`, `/api/read-batch`, a `cookie` header key each fail |
| D14 | Each read runs through the whole app with the outer headers, minus `content-type` and `content-length`, plus its own allowed headers. Answers keep only `content-type` | `api/src/read-batch/read-batch.core.ts(+test)`, `// @FollowsBlueprint core-projection`. `buildItemRequest(read, outerUrl, outerHeaders): Request` (method `GET`, same origin as the outer URL) and `toBatchedAnswer(status, contentType, body): BatchedAnswer` | Unit: the cookie and the item's ballot token ride, `content-type` and `content-length` do not, an answer never carries `set-cookie` |
| D14 | Run the reads in parallel and keep the order | `api/src/read-batch/read-batch.service.ts`, `answerReadBatch(batch, outerRequest, runRead)`. It awaits `Promise.all(batch.reads.map(…))` and reads each body with `response.text()`. The spec placed this in the controller. `borso/no-array-methods-in-controllers` refuses `.map` there (measured in `eslint-rules/no-array-methods-in-controllers.js`), so it lives in a service. No blueprint fits a service that fans out through a function it is handed. It borrows `service-clock-injected`, whose principle is that the impure input arrives as an argument | Covered by the back e2e below. Rule B does not apply in `api/` |
| D14 | Mount outside the typed chain, with the app's own `fetch` | `api/src/read-batch/read-batch.controller.ts`, `// @FollowsBlueprint controller-dispatch`. `buildReadBatchRouter(runRead: (request: Request, env: unknown) => Response \| Promise<Response>)`. `zValidator('json', readBatchSchema)`, then `answerReadBatch`, then `context.json(answer, 200)`. The validator's hook answers `400 { error: 'read-batch-invalid' }` and reports through `reportTaggedFailure` | Back e2e |
| D14 | `createApp` mounts it beside the test seed, so it never enters `AppRouter` | `api/src/app.ts`, `app.route(READ_BATCH_PATH, buildReadBatchRouter((request, env) => app.fetch(request, env)))`. Mounted after `buildAppRouter`, so `traceRequests`, `logger`, `cors`, the written-roots announcer and `onError` already wrap it (Hono applies `use('*')` to later routes) | `stale-scope-coverage.test.ts` lists the route through `createApp().routes` |
| D9 | `200` whenever the body parsed, with per-read status | Service returns answers in input order | Back e2e, cases below |
| Stale scope | The batch writes nothing | `api/src/realtime/stale-scope.core.ts`, add `['api', 'read-batch']` to `SILENT_WRITE_PATHS` | `stale-scope-coverage.test.ts` "decides every write route" and "keeps no silent path that matches no mounted write" pass |
| MCP | Not for assistants | `api/src/mcp/tool-coverage.core.ts`, `'POST /api/read-batch': 'The transport a browser tab folds its reads into; an assistant calls each tool.'` | `tool-coverage.test.ts` passes |
| Analytics | `read_batch.size` on the span | `api/src/helpers/observability/error-reporting.adapter.ts`, `recordReadBatchSize(size)` sets the attribute on the active span. The controller calls it | Adapter test asserts the attribute on a fake span |
| Back e2e | Behaviour against seeded Postgres | `api/src/read-batch/read-batch.controller.test.ts`, `// @FollowsBlueprint test-back-e2e` with `buildAuthenticatedApp` | Cases from the spec. Three reads in order with their bodies. A read without cookie answers `401` beside a public audience read answering `200` in one unauthenticated batch. A throwing read answers `500` beside `200`s (a route stubbed to throw via `vi.spyOn` on its service). 11 reads, a `GET` on the batch path, a path outside `/api/`, the batch path as an item, each `400` with nothing run (spied service never called) |
| Types | VOCABULARY | Add **Read batch** (Lives in `domain/read-batch.core.ts`, `api/src/read-batch/`. Held by the schema test and the e2e) | `scripts/check-vocabulary-paths.sh` |

### Slice 4. The client transport (D13, D15, D16, D17)

| Spec ref | Decision | Where it lands | Self-check |
|---|---|---|---|
| D13 | The transport sits in the `fetch` option of `hc`, under `fetchWatchingSessionEnd` | `site/src/lib/api.client.ts`. `fetchWatchingSessionEnd` calls `sendThroughReadTransport(input, signWrite(init))` instead of `fetch`. Session-end detection stays per item, since each caller gets its own `Response` | `api.client.test.ts` keeps both cases. New case, a `401` ended-session body on one item of a batch fires `onSessionEnded` once |
| D13, D15, D16, D17 | The transport. A group opens on the first read of a task and closes at the end of it. A group of one read leaves as its own `GET`. Two or more leave as `POST READ_BATCH_PATH`. At most `MOST_READS_IN_FLIGHT` read requests in flight. A closed group that finds no free slot waits in one queue and merges with any later group until a slot frees, then leaves in chunks of `MOST_READS_PER_BATCH`. Writes and non-batchable reads pass straight to `fetch` and skip the cap | `site/src/lib/read-batch.adapter.ts(+test)`, `// @FollowsBlueprint adapter-direct-upload` (the site adapter that owns a `fetch`). `createReadTransport({ fetchResponse, closeGroup })` for tests, and one module instance used by `api.client.ts`. It reads `globalThis.fetch` at call time, so `stubFetch` and `vi.stubGlobal` keep working | Adapter cases from the spec: two reads in one task are one `POST`. One read is a `GET`. A third group waits until one of two in-flight requests answers. A write passes at once. A failed batch fails every caller with its status. A network error rejects every caller. Added: two queued groups merge into one batch when a slot frees (the `retry: 1` path). 23 reads leave as 10, 10, 3 |
| D13 | Microtask or `setTimeout(…, 0)` | `closeGroup` is injected. The default is `setTimeout(close)`, decided by the prototype in fix round 3: cold `/` sent 4 requests with `queueMicrotask` and 3 with `setTimeout`, and cold `/setlists/:setlistId` 4 and 3 (measured, `pnpm dev`, `runs/2026-11-05-0410-ttc/agents/implementation-08.md`). The microtask closed the group before the preload's next wave, issued a few promise turns later in the same task, could join the realtime ticket | Adapter case: a read issued a few promise turns later in the same task joins the group |
| D16 retry | A failed batch's reads retry as one group | Each failed batch records how many callers of each read it failed. A retry joins its batch's gathering, which leaves into the open group once every failed caller came back, or `RETRY_STRAGGLER_WAIT_MS` after the first one for a caller that never retries (the probe has `retry: false`). Each query's retry timer is set at its own instant, so a `setTimeout(0)` after the first retry missed timers set 3 ms later (measured, visual validation row 38) | `api.client.test.ts`, seven queries failing 1 ms apart resend as one batch, and "Try again" after a batch failure and a lone failure sends one batch |
| Edge "same path twice" | One item, one `Response` per caller | `site/src/lib/read-batch.core.ts(+test)`, `// @FollowsBlueprint utils-pure-module`. `toBatchedRead(url, init, apiBase): BatchedRead \| null` (null for a write, a URL outside `apiBase + '/api/'`, or a header outside `PRAGMA_REQUEST_HEADERS`), `mergeIdenticalReads`, `splitIntoBatches`, `toCallerResponse(answer)`. The adapter builds one `Response` per caller from the answer text, so no body is read twice | Unit: the probe and the instruments list share one item and each read their own body |
| `204` | A null-body status answers `''` | `toCallerResponse` passes `null` as body for 101, 204, 205 and 304, because `new Response('', { status: 204 })` throws | Unit case for `204` |
| Edge "headers" | Only `PRAGMA_REQUEST_HEADERS` ride an item | `toBatchedRead` | Unit: `x-ballot-token` rides, an unknown header makes the read leave alone as a `GET` |
| Zero-defect | `read-batch-failed` to Sentry with status and size | `site/src/observability/error-reporting.adapter.ts`, `reportReadBatchFailed({ status, size })`. The transport calls it on a non-200 batch or a network error | Adapter test with a fake reporter |
| Tests | 40 site test files stub `fetch` by URL | `site/src/lib/queries/queries.test-utils.tsx`. `stubFetch` recognises `POST /api/read-batch`, answers each item through `handler(new Request(item))`, records each item `Request` in `calls`, and answers the batch. `restore()` also resets the transport's queue, so a test that leaves a `deferred()` pending cannot hold a slot for the next test | `pnpm --filter @borso-app/pragma exec vitest run --project core` passes with no assertion changed outside slice 4's own files |
| D13 prototype | Pick the closer by measurement | Run `pnpm dev`, sign in with the seeded member, and for `/`, `/catalog` and `/setlists/:setlistId` count requests cold with each closer through the resource-timing snippet in gate 5.4. Keep `queueMicrotask` unless `setTimeout` yields fewer requests on some route. Write the six counts into the commit body | `git log -1 --format=%B` shows the table |
| Spec Risks | A group split across tasks | TanStack's `notifyManager` schedules observer notifications with `setTimeout(0)` (measured, `@tanstack/query-core@5.102.8` `notifyManager.js:3`). So each dependent wave is its own task and its own group. The bounds in the spec already count one request per wave | Gate 5.4 counts |

### Slice 5. The opening screen (D6, D18, Result)

| Spec ref | Decision | Where it lands | Self-check |
|---|---|---|---|
| D6, D18 | The gate states | `site/src/components/organisms/session-gate.core.ts(+test)`. `SessionGateState = 'sign-in-required' \| 'opening' \| 'opening-failed' \| 'granted'`. `selectOpeningWait(queries)` reads each query's key, `status`, `fetchStatus` and `data` and returns `'band-data' \| 'reading' \| 'failed' \| 'not-started'`. `selectSessionGateState(hasMarker, isProbeAuthenticated, openingWait)`. No marker or a probe answering `false` gives `sign-in-required`. `band-data` gives `granted`. `reading` and `not-started` give `opening`. `failed` gives `opening-failed` | Unit cases from the spec plus two below |
| D18, plan decision | "Nothing in flight and no band data" is read as "no read in flight, no band data, and at least one read failed or paused". A wait that has not started yet is not over | `selectOpeningWait`. On the first render the probe exists in the cache with `fetchStatus: 'idle'` before its observer subscribes (TanStack builds the query during render). Without this, the first frame would show the failure | Unit: an `idle` pending probe with nothing else gives `not-started` |
| Offline cold open | A paused read counts as failed | `selectOpeningWait` treats `fetchStatus: 'paused'` as failed when nothing is fetching. TanStack's default `networkMode: 'online'` pauses a query offline and never errors it, so the screen would otherwise wait forever | Unit case for `paused`. Visual check with the network offline |
| D6 | "Nothing cached" means no band query holds data | `isBandDataQuery` moves from `query-client.setup.ts` to `session-gate.core.ts` (both read it) | `query-client.setup.test.ts` still passes |
| D18 | The gate reads the cache without an effect | `site/src/components/organisms/opening-wait.hook.ts`, `// @FollowsBlueprint hook-external-store`. `useSyncExternalStore` with `subscribe` wrapped in `useCallback([queryClient])` (allowed by `borso/no-inline-subscribe-in-use-sync-external-store`) and a snapshot that returns the string from `selectOpeningWait`, so React compares primitives | `grep -n "useEffect" site/src/components/organisms/opening-wait.hook.ts` returns nothing |
| D6 | The route mounts beneath the overlay, inert and hidden, so its reads join the probe's group | `site/src/components/organisms/RequireSession.tsx`. In `opening` and `opening-failed` it renders `<div inert className="invisible">` around `<Outlet />` and the `OpeningScreen` above it. The view table keeps one lookup, no branch in the body | Component test: in `opening`, the outlet's text is in the DOM and `inert` |
| Result, layout | `h-dvh` page on the surface token, mark 9 rem (`sm:` 11 rem), caption in `role="status"`, mark `aria-hidden` | `site/src/components/organisms/OpeningScreen.tsx(+test)`, `// @FollowsBlueprint organism-presentational`. Props `state: 'opening' \| 'opening-failed'`, `isOnline`, `onRetry`. Fixed overlay `fixed inset-0 bg-paper`, centred column, `w-36 sm:w-44` | `OpeningScreen.test.tsx` (`test-component-render`): status text per state, offline text, button calls `onRetry` |
| Result, the mark | Inline SVG traced from `public/icons/pragma-logo.png` in four groups | `site/src/components/atoms/PragmaMark.tsx`, `// @FollowsBlueprint atom-plain`. Four `<g>`: left note, keys (three child `<g>` so each key presses alone), right note, echo. Fills `fill-accent` for the mark and `fill-accent` at `opacity-35` for the echo, so dark mode follows the tokens and no arbitrary value is needed. Paths come from a one-off trace with Pillow (installed, measured) in the scratchpad, by colour threshold and contour, simplified by hand. The script is not committed and no dependency is added | `agent-browser` screenshot beside the PNG at the same width. The four group ids are present |
| Result, the downbeat | Entrance 500 ms, loop 1.6 s, echo 90 ms late, exit 200 ms, only `transform` and `opacity` | `site/src/styles/tokens.css`. Keyframes `downbeat-enter-left`, `downbeat-enter-right`, `downbeat-key-rise`, `downbeat-key-press`, `downbeat-note-swing-left`, `downbeat-note-swing-right`, `downbeat-halo`, `downbeat-exit`, and one `--animate-*` token each. Key delays 0, 120 and 240 ms through `animation-delay` tokens. Each loop keyframe starts and ends at rest | `grep -n "@keyframes downbeat" tokens.css` lists them. No keyframe animates a property other than `transform` and `opacity` |
| Result, exit | The overlay exits when band data lands, revealing the filled screen | `RequireSession` keeps the overlay mounted for one 200 ms exit after `granted`, through `onAnimationEnd` on the overlay (a handler, not an effect). Under reduced motion the overlay unmounts at once | Visual check |
| Reduced motion | Static mark, no entrance, loop or exit | `motion-reduce:animate-none` on every animated group. The global rule in `tokens.css` already zeroes durations (line 154), and every keyframe ends at rest, so the static mark is the rest frame | Visual check with `prefers-reduced-motion: reduce` |
| WCAG 2.3.1 | Nothing flashes more than 3 times a second | The halo cycles once per 1.6 s loop | Read off the token |
| Failure | Mark static, text, "Try again" refetches every active query in one group | `RequireSession` passes `onRetry = () => queryClient.refetchQueries({ type: 'active' })`. One synchronous call, so every refetch lands in one task and one group | Component test with `stubFetch`: one `POST /api/read-batch` after the click |
| i18n | `opening.loading`, `opening.failed`, `opening.offline`, `opening.retry` | `site/src/i18n/en.json`, `fr.json`. en: "Tuning up…", "pragma could not reach the band's data.", "You are offline.", "Try again". fr: "On s'accorde…", "pragma n'a pas pu joindre les données du groupe.", "Vous êtes hors ligne.", "Réessayer" | `i18n-parity.core.test.ts` passes |
| Old view | `CheckingSession` goes | `RequireSession.tsx` | `grep -n "CheckingSession" site/src` returns nothing |
| Types | VOCABULARY | Add **Opening screen** (Lives in `session-gate.core.ts`, `OpeningScreen.tsx`. Held by the gate's core test) | `scripts/check-vocabulary-paths.sh` |
| I1, I2, D7 | Acceptance per route | Gate 5.4 | Report beside each bound |

### Out of scope (spec)

| Spec ref | Decision | Where it lands | Self-check |
|---|---|---|---|
| Out of scope | Raising the reserved concurrency | (out of scope) | `git diff origin/main -- infra/cdk/src/constructs/lambda-api.ts` is empty |
| Out of scope | Throttles alarm, batching other apps, batching writes, offline writes | (out of scope) | No diff under `infra/`, `apps/talos`, `apps/last-loop-lepin`, `apps/banana-rush` besides lint fixes rule B forces, of which there are none (spec, Rule B hits) |
| Production strategy | Sentry alerts on `read-batch-failed` (3 in 10 minutes) and `read-batch-invalid` (first) | Created after the preview reports its first span, through the Sentry connector, with the operator's confirmation, since it is an external write | `human:` gate 5.8 |

## Pattern coherence

- No new dependency, as the spec states. The trace uses Pillow already installed in the container, and the script stays in the scratchpad.
- The query modules keep TanStack Query and the typed client. The transport adds no second fetching pattern, it sits under the only one.
- `useEntriesOfSetlists` and the preload shared two copies of the per-setlist fan-out. D12 makes them one.
- The gate today reads the probe through `useQuery`. The new gate also reads the whole cache through `useSyncExternalStore`, the pattern `online-status.hook.ts` already follows. `useIsFetching` was considered and dropped, because a data change without a fetch-count change (a `setQueryData` seed) would not re-render it.

## Risk register

| Risk | Severity | Mitigation in plan | Detection if it slips |
|---|---|---|---|
| Deleting `offline-manifest.core.ts` orphans 64 `@FollowsBlueprint core-projection` markers | high | Slice 1 moves the blueprint onto `projectSessionForTool` first | `blueprint-indexing.ts --check` (gate 1.5) and the pre-commit hook |
| A group splits across tasks, so a route costs more requests than its bound | medium | Microtask default, the D13 prototype, the restore start that no longer probes, and the queue that merges waiting groups | Gate 5.4 counts each route. A route above its bound fails slice 5 |
| A third request leaves while two are in flight (the cap leaks) | high | One counter in the adapter, released in `finally` on settle. Adapter test "a third group waits" | Gate 5.4 peak column. Adapter mutation score 100 |
| A test leaves a `deferred()` pending, holds a slot and hangs the next test in the file | medium | `stubFetch().restore()` resets the transport. `createReadTransport` lets the adapter test own its instance | A core test timeout naming the waiting test |
| `new Response('', { status: 204 })` throws, so a `204` read rejects its caller | medium | `toCallerResponse` passes a null body for null-body statuses | Unit case. Sentry would show a `TypeError` from the transport |
| An offline cold open waits forever, because TanStack pauses rather than fails a query offline | high | `paused` counts as failed in `selectOpeningWait`, and the offline caption shows | Unit case. Visual gate 5.6 with the network offline |
| The first frame shows the failure before the probe subscribes | medium | `not-started` maps to `opening` | Unit case. Visual gate 5.6 screenshots the first 100 ms |
| A route under `RequireSession` outside `AppShell` reads no band data, so the overlay never lifts | medium | `/oauth/consent` and the two scene pages read a query outside `authKeys` (the consent description, the song, the setlist), which counts as band data | Gate 5.4 covers those three routes. A route stuck on the overlay fails it |
| One batch answer exceeds Lambda's synchronous response limit, because ten bodies travel as escaped strings | medium | The songs list is the largest read, and its production size is unknown. Measure it in slice 3 with `APP=pragma scripts/db-read.sh "SELECT count(*) FROM songs"` and the preview's answer size, and report both in the PR | `read-batch-failed` in Sentry with status `502` or `413` |
| A batch of ten cold reads runs past the Lambda timeout of 10 s (`DEFAULT_TIMEOUT_SECONDS`, measured in `lambda-api.ts:28`), since one slow read holds the batch and each new connection signs a DSQL token | medium | No mitigation in code beyond the cap of 10. The batch span reports p50 and p90 from the preview in the PR, as the spec asks | Sentry span duration and `read-batch-failed` with `504` |
| A cross-origin `POST` with `application/json` needs a CORS preflight | low | API Gateway answers the preflight without invoking Lambda (`corsPreflight` on the `HttpApi`, max age 10 minutes, measured in `lambda-api.ts:130-147`). `pnpm dev` is same-origin through the Vite proxy | Preview network panel shows `OPTIONS` answered by API Gateway with no Lambda log line |
| A read whose route needs a header outside `PRAGMA_REQUEST_HEADERS` silently loses it in a batch | medium | `toBatchedRead` returns null for such a read, so it leaves alone as a `GET` | Unit case "an unknown header makes the read leave alone" |
| The audience rate limit counts each batched audience read against the room's bucket, as it does today | low | `readClientAddress` reads the Lambda event, which `context.env` carries to each item | Back e2e "a public read answers 200" runs through the limiter |
| Rule B refuses a legitimate pattern in another app | low | Spec measured zero hits outside pragma beyond allowed shapes | `scripts/lint-repository.sh` in gate 2.3 over the whole repository |
| The persisted cache still holds an `['offline-manifest']` entry for up to 7 days | low | Nothing reads it. It ages out with `PERSISTED_CACHE_MAX_AGE_MS`. Bumping the buster would make every member's next open cold, which costs more | None needed. Listed so it is a decision, not a surprise |
| The trace of the mark drifts from the PNG | low | Side-by-side screenshot in gate 5.6 | `/visual-validation` row for the mark |
| A failed batch reports nothing, as today | high | `reportReadBatchFailed` in slice 4 | Adapter test asserts the report. Preview Sentry shows the event when the API is stopped |

## Code-quality self-check

- [ ] Type assertions are only `as const` and `as unknown`. The batch answer is parsed with a type guard in `read-batch.core.ts`, never cast.
- [ ] No `any`.
- [ ] No abbreviations or one-letter locals outside trivial loop indices.
- [ ] Magic numbers and strings extracted to named constants (`MOST_READS_PER_BATCH`, `MOST_READS_IN_FLIGHT`, `READ_BATCH_PATH`, null-body statuses, animation tokens).
- [ ] No prose comments. `borso/no-comments` refuses every comment a machine does not read.
- [ ] Function names describe the result (`selectOpeningWait`, `toCallerResponse`, `answerReadBatch`, `sendThroughReadTransport`).
- [ ] Commit scopes are `pragma` for slices 1, 3, 4 and 5, and `meta` for slice 2 (rule and standard).
- [ ] Every pure helper lives in `*.core.ts` or `*.utils.ts` with a sibling test at 100% per file, and every new `*.adapter.ts` too.
- [ ] Each new file under `apps/` carries `// @FollowsBlueprint <id>` as named in the tables.
- [ ] Names follow `apps/pragma/VOCABULARY.md`. **Read batch** and **Opening screen** enter it. **Offline manifest** leaves.
- [ ] Every visible string goes through `en.json` and `fr.json`. The opening screen works at 375 px with no horizontal scroll.
- [ ] No `useEffect`. The gate reads the cache through `useSyncExternalStore`, the exit runs on `onAnimationEnd`.

## Pre-flight gates

Subagents never commit, so no git hook runs for them. Each slice therefore runs both halves of lint itself, and the checks the hooks would have run. The order is the order to run them.

Common to every slice:

- C.1 `pnpm --filter @borso-app/pragma lint` (oxlint `--type-aware` over `apps/pragma`).
- C.2 `pnpm run format:check` (oxfmt `--check` over the repository).
- C.3 `pnpm --filter @borso-app/pragma typecheck`.
- C.4 `pnpm --filter @borso-app/pragma exec vitest run --project core --coverage` (the per-file 100% gate on `*.core.ts`, `*.utils.ts`, `*.adapter.ts`, `*.schema.ts`).
- C.5 `pnpm --filter @borso-app/pragma build`.
- C.6 `pnpm knip`.

Slice 1:

- 1.1 to 1.6 C.1 to C.6.
- 1.7 `pnpm --filter @borso-app/pragma run test:e2e api/src/realtime/stale-scope-coverage.test.ts api/src/mcp/tool-coverage.test.ts api/src/sessions`.
- 1.8 `pnpm exec tsx .claude/skills/blueprint/blueprint-indexing.ts --check`.
- 1.9 `scripts/check-vocabulary-paths.sh` and `scripts/check-pure-modules-have-callers.sh`.
- 1.10 `pnpm --filter @borso-app/pragma exec stryker run --mutate site/src/lib/queries/offline-reading.utils.ts,site/src/lib/queries/query-read-roots.core.ts,domain/stale-scope.core.ts,api/src/mcp/tool-coverage.core.ts,api/src/sessions/session-tool.core.ts`, zero surviving mutants.

Slice 2:

- 2.1 `pnpm exec vitest run eslint-rules/no-request-fan-out-in-site.test.js`.
- 2.2 `node_modules/.bin/tsc -p tsconfig.json --noEmit` (the tooling type check that covers `eslint-rules/`).
- 2.3 `scripts/lint-repository.sh` (oxlint `--type-aware` over the whole repository, since the rule applies to every site).
- 2.4 `pnpm run format:check`.
- 2.5 Plant `Promise.all(ids.map((id) => queryClient.query(songQueryOptions(id))))` in a scratch copy of `apps/pragma/site/src/lib/queries/songs.queries.ts`, run `pnpm --filter @borso-app/pragma lint`, expect the fan-out message, then restore the file (`git checkout -- <file>`). Repeat with an awaited `$get` in a `for…of`.
- 2.6 `pnpm exec vitest run --coverage` at the root.

Slice 3:

- 3.1 to 3.6 C.1 to C.6.
- 3.7 `pnpm --filter @borso-app/pragma run test:e2e api/src/read-batch api/src/realtime api/src/mcp/tool-coverage.test.ts api/src/audience`.
- 3.8 `pnpm --filter @borso-app/pragma exec stryker run --mutate domain/read-batch.core.ts,api/src/read-batch/read-batch.core.ts,api/src/realtime/stale-scope.core.ts,api/src/mcp/tool-coverage.core.ts,api/src/helpers/observability/error-reporting.adapter.ts`, zero surviving mutants.
- 3.9 `pnpm exec tsx .claude/skills/blueprint/blueprint-indexing.ts --check` and `scripts/check-vocabulary-paths.sh`.
- 3.10 `APP=pragma scripts/db-read.sh "SELECT count(*) FROM songs"`, the count written into the PR beside the batch answer size.

Slice 4:

- 4.1 to 4.6 C.1 to C.6.
- 4.7 `pnpm --filter @borso-app/pragma exec stryker run --mutate site/src/lib/read-batch.core.ts,site/src/lib/read-batch.adapter.ts,site/src/observability/error-reporting.adapter.ts`, zero surviving mutants.
- 4.8 The D13 prototype, its six counts in the commit body.
- 4.9 `pnpm exec tsx .claude/skills/blueprint/blueprint-indexing.ts --check`.

Slice 5:

- 5.1 to 5.6 C.1 to C.6, where C.4 includes `session-gate.core.test.ts`, `OpeningScreen.test.tsx` and `i18n-parity.core.test.ts`.
- 5.2b `pnpm --filter @borso-app/pragma exec stryker run --mutate site/src/components/organisms/session-gate.core.ts`, zero surviving mutants.
- 5.3 `pnpm exec tsx .claude/skills/blueprint/blueprint-indexing.ts --check` and `scripts/check-vocabulary-paths.sh`.
- 5.4 Acceptance measurement. Against `pnpm dev`, signed in with the seeded member (the seed's only session is a concert 7 days ahead with a setlist, measured in `test-seed.service.ts:193`). "Cold" clears `pragma.query-cache` in `localStorage` and keeps the cookie and the session marker. "Warm" reloads within 5 minutes of a cold open. For each route in the spec's Test strategy table, open it, wait until 3 s pass with no new entry, then run:

  ```
  agent-browser eval "(() => { const reads = performance.getEntriesByType('resource').filter((entry) => new URL(entry.name).pathname.startsWith('/api/')); const edges = reads.flatMap((entry) => [[entry.startTime, 1], [entry.responseEnd, -1]]).sort((left, right) => left[0] - right[0] || left[1] - right[1]); let open = 0; let peak = 0; for (const [, step] of edges) { open += step; peak = Math.max(peak, open); } return JSON.stringify({ count: reads.length, peak, paths: reads.map((entry) => new URL(entry.name).pathname) }); })()"
  ```

  A route fails above its bound in the spec or above a peak of 2. The measured count goes beside each bound in the validation report. The hidden-tab row runs on the PR preview, because the ticket answers no socket URL in `pnpm dev`.
- 5.5 `scripts/phone.sh touch '<the Try again button selector>'` with the API stopped, then the API started. One `POST /api/read-batch` follows and the screen fills.
- 5.6 `human:` screenshots of the opening screen at 375 px and 1280 px, with and without `prefers-reduced-motion: reduce`, its failure with the API stopped, and its offline text with the network offline.
- 5.7 `/visual-validation docs/features/pragma/open-in-two-calls/spec/spec.md`.
- 5.8 `human:` after the preview reports, the operator confirms creating the two Sentry alerts named in the spec's Zero-defect strategy.
- 5.9 `/technical-validation docs/features/pragma/open-in-two-calls/spec/spec.md`.

## Open questions / unknowns

- None that block. The two plan-level readings of the spec are recorded in the tables and need no product call. D18's "nothing in flight" is read as "a read failed or paused and nothing is in flight", so the first frame never shows the failure. Rule B is off in test files, because a test's request answers a stub.
- Unknown, measured during implementation and reported in the PR: the batch's latency p50 and p90 on a cold Lambda, the production songs count and the largest batch answer size.

## Missing technical skills

- A TanStack Query skill. Its scheduler (`notifyManager` on `setTimeout(0)`), `networkMode` pausing offline, and when `useQuery` builds versus fetches decided three rows of this plan, and each was read from `node_modules` this session.
- A Hono skill. How `use('*')` covers routes added after the chain, and how `hc` reaches its `fetch` option synchronously, were read from source.
