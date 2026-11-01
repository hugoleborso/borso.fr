---
date: 2026-11-01
introduced-at: implementation
detected-at: production
severity: high
related-pr: none (the service worker came in commit fec7d61e, before pull requests carried numbers here)
fix-pr: none (the operator has not chosen the countermeasure yet)
fix-commits: none (proposal under review)
eradication-level: 5
eradication-paths: []
time-to-detect: months
tags: [react, tanstack-query, service-worker, optimistic-updates, pragma]
zone: apps/pragma/site/public/sw.js
weak-point: optimistic-write-undone
recurs: [optimistic-reorder-reverted-by-stale-dsql-read, the-blueprint-that-mandated-the-refetch-that-undid-it]
blueprints: [query-optimistic-mutation]
---

> Status: proposal. Nothing below is merged. The operator chooses the
> countermeasure after reading this entry.

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

Proposed, not applied. A and B fix the cause. C and D fix the second, smaller
defect.

| Option | What changes | Cost |
| --- | --- | --- |
| A. API reads go network first, the copy only when offline | Online, every read is fresh. Offline behaviour is unchanged | A slower read when the network is slow, since the copy no longer answers first |
| B. Keep stale-while-revalidate, and drop the cached copy on every write to the same resource | Reads stay instant | Each write path must map to the reads it affects, and a missed mapping brings the bug back |
| C. Block a drag while a reorder is pending (the operator's idea) | No two reorders in flight | The list freezes until the server answers. 240 ms to 1.65 s per drag in prod |
| D. One `scope` on the setlist entry mutations | Requests queue, the screen stays responsive | A failed request's rollback can also drop the drags queued after it |

Recommendation: A, plus D or C. A matches what the worker was added for,
which is offline use.

## Eradication

Proposed, level 4 (detection) or level 1 (structural), not shipped.

- **Structural (level 1)**: with A, the worker has no online answer from a
  copy, so a write cannot be hidden by it. The remaining copy is reached only
  when the network fails.
- **Detection (level 4)**: a test that loads `sw.js` with a mocked `caches`
  and `fetch`, and asserts that an online read of every cached API path
  returns the network answer. Planted defect: the current
  `staleWhileRevalidate`, which the test must refuse.
- **Similar instances:** every path in `isReadableApiPath` (`sw.js:80-91`)
  has the same exposure: songs, sessions, setlists by session, entries,
  instruments, members and the offline manifest. Each has optimistic writes
  that the worker never sees (inferred from the list, not reproduced one by
  one).
- **For the overlapping `PUT`s:** the rule `borso/optimistic-mutation-declares-scope`
  on the branch refuses an optimistic mutation without a `scope`. It fails on
  a planted defect (measured). It flags 51 call sites in three apps, so it is
  a separate decision.
