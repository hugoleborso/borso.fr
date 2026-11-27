---
date: 2026-11-01
introduced-at: implementation
detected-at: production
severity: high
related-pr: none (the service worker came in commit fec7d61e, before pull requests carried numbers here)
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
      - `PUT /reorder` went through the worker untouched (`sw.js:94` and
        `:153` before the fix), so the copy stayed as it was before the drags
      - The worker's background request refreshed the copy for the next
        read only. The screen kept the old answer (measured)
      - `staleWhileRevalidate` returns the cached copy whenever one exists,
        online or not, and the entries path was on its list of cached reads
        (`apps/pragma/site/public/sw.js:86` and `:124-135` before the fix)
        ← the faulty line

        ```js
        return cached ?? networkPromise; // the copy wins whenever it exists
        ```

        - Commit `fec7d61e` ("offline service worker + offline banner",
          2026-05-20) wrote it, and called it "the spec's offline-read scope"
          - The plan it implemented named the scope only: "SW caches catalog
            JSON + all 3 chart formats + setlist of session with smallest
            future `date`", through a precache list from
            `/api/offline-manifest`
            (`docs/features/pragma/first-features/plan/plan.md:18`). It said
            nothing of when a cached copy answers while online
            - The planner wrote that it "had to invent the cache strategy
              from scratch" and asked for a `/pwa-service-worker` recipe that
              did not exist (`plan.md:132`). Material
- The next drag then saves the old order
  - Each `PUT /reorder` carries the whole order as the screen shows it, so a
    drag on the old screen writes the old order back with one change
- Two quick drags can also save an older order on their own
  - Two `PUT /reorder` were in flight at once in prod: A sent at
    11:38:05.279 answered after B sent at 05.856 (measured)
    - TanStack Query runs mutations in parallel by default, and the order
      they finish in may differ from the order of the calls
      ([Mutations guide](https://tanstack.com/query/latest/docs/framework/react/guides/mutations))
      - `useReorderSetlist` declared no `scope`, so every drop sent at once
    - The one that commits last wins, since each carries the whole order.
      Reproduced locally with a forced 1.5 s delay on the first `PUT`

## Root cause of occurrence

*Thought an offline cache only answers when the network is down, actually
stale-while-revalidate answers every read from its copy first, and no write
ever refreshes that copy.* **Material.**

The agent that wrote `fec7d61e` had the plan in its context, and the plan
held no answer to give. It named what to cache and not when the copy answers.
Its planner had flagged the gap itself: "The planner had to invent the cache
strategy from scratch: which assets to precache vs runtime-cache, how to
version the cache" (`plan.md:132`). No recipe for a service worker existed in
the repository, since this was its first. So the agent took the common
offline recipe, stale-while-revalidate, and its commit message calls that the
spec's scope. The optimistic mutations keep TanStack Query's cache in step
with each write. Nothing keeps the worker's cache in step. There were two
caches, and only one of them was updated.

## Detection failure causes

- **Technical validation:** round 2 failed the worker as A10, on scope only:
  "SW caches all session reads stale-while-revalidate; no
  `/api/offline-manifest` endpoint"
  (`validation/technical-validation-2026-05-20-0020.md:32`). Commit
  `d7be0d9ac` closed A10 by adding the manifest, and its message says
  "Stale-while-revalidate stays as the runtime default". The next visual
  validation wrote that "the change tightened cache scope, not the cache
  mechanic" (`visual-validation-2026-05-20-1035.md:40`). Every row checked
  what is cached, and none checked when the copy answers.
- **Local validation:** `registerServiceWorker` returns early when
  `import.meta.env.DEV` is set, so `pnpm dev` never runs the worker. Every
  local check, including the first reproduction, ran without it (measured).
- **Unit tests:** `sw.js` is a plain file under `public/`. No test ran its
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
[ADR-2026-11-01T1313](../adr/2026-11-01T1313-pragma-offline-reads-through-the-query-cache.md),
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

Verified on production builds of this branch served against the local API
at 375 px, one run after the other on the same setlist (measured,
Playwright):

| Step | `main`'s worker | This branch |
| --- | --- | --- |
| Three drags | server has the new order | server has the new order |
| Back to Order after 35 s | **order from before the drags** | the saved order |
| One more drag | server gets the old order plus that drag | server gets the saved order plus that drag |

The unit tests cover the same path: the worker test below, the persist
round trip, the session-end purge and the sign-in prefetch.

The saved cache opened a sibling of the same class, found by technical
validation: the order page showed an order restored from `localStorage`,
up to 7 days old, and accepted a drag before its mount refetch answered.
The drag cancels that refetch, so it could send the restored order over a
newer one. The order page now refetches on every mount and shows no row
until that fetch answered (`useSetlistEntriesToReorder`,
`SetlistOrderPage.tsx`). Its two tests fail with the fix reverted
(measured).

## Eradication

**Type:** structural impossibility (level 1)

**Reference:** the commit adding this file, squashed on `main` as
`e4c428591` (PR #247).

```diff
-  if (url.pathname.startsWith('/api/') && isReadableApiPath(url.pathname)) {
-    event.respondWith(staleWhileRevalidate(request));
-    return;
-  }
```

The worker holds no copy of any API read, so no copy can answer before the
network. The only read cache left is the one the writes update. It still
holds: `grep -n '/api/' apps/pragma/site/public/sw.js` finds nothing
(measured 2026-11-27). The missing strategy recipe no longer matters for API
reads, because there is no strategy left to choose.

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
