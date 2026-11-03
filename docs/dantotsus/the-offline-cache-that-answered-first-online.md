---
date: 2026-11-01
introduced-at: implementation
detected-at: production
severity: high
related-pr: none (the service worker came in commit fec7d61e, before pull requests carried numbers here)
fix-pr: none (the pull request is opened after this entry is committed)
fix-commits: [self]
eradication-level: 1
eradication-paths: [apps/pragma/site/public/sw.js, apps/pragma/site/src/sw/service-worker.test.ts, apps/pragma/site/src/lib/query-client.setup.ts, eslint-rules/optimistic-mutation-declares-scope.js]
time-to-detect: months
tags: [react, tanstack-query, service-worker, optimistic-updates, pragma]
zone: apps/pragma/site/public/sw.js
weak-point: optimistic-write-undone
recurs: [optimistic-reorder-reverted-by-stale-dsql-read, the-blueprint-that-mandated-the-refetch-that-undid-it]
blueprints: [query-optimistic-mutation]
---

# The offline cache that answered first, online

## User impact

Thomas reordered a setlist on his phone, tapped Done, came back, and found
the old order. He reported it on 2026-10-31 at 12:40 Paris time:

> « quand je change l'ordre, je clique sur terminé puis je reviens, ça a pas
> pris en compte les modifs »

Reproduced on a production build at 375 px with real touch drags (measured):

| Step | Screen | Database |
| --- | --- | --- |
| Three drags, then Done | new order | new order |
| Back to Order after 33 s | **old order** | new order |
| One more drag on that screen | old order plus that drag | **old order plus that drag** |

The last step turns a wrong display into lost data. The three earlier drags
are gone from the database.

In prod, one setlist received six `PUT /reorder` between 11:36 and 11:39:52
UTC, all answering 200 (measured, CloudWatch), which fits the 12:40 report.
No `GET /entries` reached the server after 11:39:52. A worker answer still
sends a background request, so that gap is unexplained. A dropped phone
connection would fit (guess).

## Causal chain

- Back on the order page, the setlist shows the order from before the drags
  - TanStack Query refetched `GET /api/setlists/:id/entries`, because the
    cache was older than its 30 s `staleTime`
    - The service worker answered that request from its own cache, holding
      the response from when the page was first opened
      - `staleWhileRevalidate` returns the cached copy whenever one exists,
        online or not (`apps/pragma/site/public/sw.js:124-135`)
      - The entries path is on its list of cached reads
        (`sw.js:86`)
    - Nothing ever updated that copy after the drags
      - The worker lets every non-GET request through untouched
        (`sw.js:94`, `sw.js:153`), so `PUT /reorder` leaves its cache as
        it was
      - Its background request does refresh the copy, but only for the
        next read. The screen keeps the old answer (measured)
- The next drag then saves the old order
  - Each `PUT /reorder` carries the whole order as the screen shows it, so a
    drag on the old screen writes the old order back with one change
- Two quick drags can also save an older order on their own
  - Two `PUT /reorder` were in flight at once in prod: A sent at
    11:38:05.279 answered after B sent at 05.856 (measured)
    - TanStack Query runs mutations in parallel by default, and the order
      they finish in may differ from the order of the calls
      ([Mutations guide](https://tanstack.com/query/latest/docs/framework/react/guides/mutations))
      - `useReorderSetlist` declares no `scope`, so every drop sends at once
    - The one that commits last wins, since each carries the whole order.
      Reproduced locally with a forced 1.5 s delay on the first `PUT`

```js
function staleWhileRevalidate(request) {
  return caches.open(DATA_CACHE).then(async (cache) => {
    const cached = await cache.match(request);
    const networkPromise = fetch(request).then(/* refresh the copy */);
    return cached ?? networkPromise; // ← the copy wins whenever it exists
  });
}
```

## Root cause of occurrence

*Thought the offline cache only answers when the network is down, actually
stale-while-revalidate answers every read from its copy first, and no write
ever refreshes that copy.*

The worker was added for offline use, in commit `fec7d61e`
("offline service worker + offline banner"). The strategy it chose serves
the copy online too. The optimistic mutations keep TanStack Query's cache in
step with each write, and nothing keeps the worker's cache in step. There
are two caches, and only one of them is updated.

## Detection failure causes

- **Local validation:** `registerServiceWorker` returns early when
  `import.meta.env.DEV` is set, so `pnpm dev` never runs the worker. Every
  local check, including the first reproduction, ran without it (measured).
- **Unit tests:** `sw.js` is a plain file under `public/`. No test runs its
  fetch strategies.
- **Previous dantotsus:** two earlier reverts of an optimistic write were
  blamed on a stale Aurora DSQL read and fixed by removing refetches. That
  removal hid the symptom for the screens that stopped refetching. It did
  not touch the worker, which serves the same stale order to any later read.
  Whether the worker caused those earlier cases too is a guess.
- **Production monitoring:** every request answers 200. A read served from
  the worker's cache never reaches the server, so nothing records it.

## Countermeasure

The operator chose option E of
[ADR-202611011313](../adr/202611011313-pragma-offline-reads-through-the-query-cache.md),
which removes the second cache instead of keeping it in step.

- The worker caches the app shell, the fingerprinted assets and push, and
  no `/api/` read. `activate` deletes the old `pragma-v4-data` cache on
  every phone at the next start.
- The TanStack Query cache, which every optimistic write already updates,
  is saved to `localStorage` and restored at start-up, so offline reading
  shows the last order the member saved.
- Once signed in, the app loads the catalog, every song, the next session,
  its setlists and their entries into that cache, which is what the worker
  pre-cached from `/api/offline-manifest`.
- Every setlist entry write declares one `scope`, so two drags never travel
  at once and the older one cannot commit last.

Verified by unit tests (measured): the worker test below, the persist
round trip, the session-end purge, the sign-in prefetch and the core suite
of the site (726 tests in `site/src/lib`, all passing).

## Eradication

**Type:** structural impossibility (level 1)

**Reference:** commit `[self]` on this entry's pull request

```diff
-  if (url.pathname.startsWith('/api/') && isReadableApiPath(url.pathname)) {
-    event.respondWith(staleWhileRevalidate(request));
-    return;
-  }
```

The worker holds no copy of any API read, so no copy can answer before the
network. The only read cache left is the one the writes update.

**Detection kept beside it:** `service-worker.test.ts` seeds an old copy of
`GET /api/setlists/setlist-1/entries` in every cache, answers the network
with the newer order, and asserts the page receives the network body.

**Proof it can fail:** with the previous `sw.js` restored, the test refused
it (measured):

```
× sends an API read to the network even when a cache holds an older copy, so a saved setlist order is never answered from before the drags
AssertionError: expected '{"entries":[{"id":"a"},{"id":"b"}]}' to be '{"entries":[{"id":"b"},{"id":"a"}]}'
```

**For the overlapping `PUT`s (level 2):** `borso/optimistic-mutation-declares-scope`
refuses an optimistic mutation without a `scope`. Its rule test refuses the
planted cases (9 tests passing, measured), and `oxlint --type-aware` over
pragma, talos and last-loop-lepin reports it nowhere (measured).

**Similar instances:** every path the worker listed in `isReadableApiPath`
(songs, sessions, setlists by session, entries, instruments, members, the
offline manifest) had the same exposure. Deleting the data cache removes
all of them at once. `grep -rn "caches.open" apps/*/site/public` finds no
other worker that caches API reads.
