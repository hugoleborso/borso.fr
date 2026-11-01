# ADR-202611011313: Pragma reads offline from the persisted query cache, and its service worker keeps only the shell and push

- **Status:** proposed
- **Date:** 2026-11-01
- **Deciders:** Hugo
- **Tags:** pragma, offline, data

## Context

Pragma promises offline reading on the way to a concert: the catalog, the
songs and the next session's setlist
([first-features spec, section 5](../features/pragma/first-features/spec/spec.md)).
Since commit `fec7d61e` the service worker answers the cached API reads with
stale-while-revalidate (`apps/pragma/site/public/sw.js:124-135`). It returns
its copy first whenever one exists, online too, and no write ever updates that
copy. TanStack Query keeps a second cache of the same data, which the
optimistic mutations do update. On a production build, a refetch after the
30 s `staleTime` showed a setlist's order from before three drags, and the
next drag saved that old order (measured, see
[the dantotsu](../dantotsus/the-offline-cache-that-answered-first-online.md)).
The worker also serves the app shell, which no in-app cache can replace, and
receives push notifications (`sw.js:170` imports `sw-notifications.js`).
Offline writes are out of scope, as in the spec.

## Decision

**One data cache: TanStack Query's, persisted.** The service worker keeps the
app shell and push notifications and stops caching API responses. The app
wraps its client in `PersistQueryClientProvider`, so the query cache, which
every optimistic write already updates, is saved to browser storage and
restored at start-up. The app prefetches the catalog, the songs and the next
session's setlist and entries, which the worker used to pre-cache from
`/api/offline-manifest`. Online, every read follows the default
`networkMode: 'online'` and goes to the network once stale. Offline, the
restored cache answers. There is no second copy left to drift from the first.

## Consequences

- `+` A write and the data shown offline come from the same cache, so an
  optimistic write can no longer be undone by a stale copy.
- `+` `sw.js` loses its data strategies and the offline manifest pre-cache,
  which is code the repo maintained by hand next to a library feature.
- `-` Two new dependencies, `@tanstack/react-query-persist-client` and a
  persister package, both at the catalog version 5.102.8 (checked on npm).
- `-` The persisted cache has a size limit set by the browser storage chosen.
  The size of the catalog and song payloads on prod data is unknown, so the
  plan measures it before choosing localStorage or IndexedDB.
- `-` Data is available offline only once the app has run and prefetched it.
  The worker's install step pre-cached it before the first screen.
- `~` `gcTime` must be at least the persister's `maxAge`, or restored queries
  are collected early (TanStack persistQueryClient docs).

## Alternatives considered

### Option E — Persisted query cache, worker for shell and push (chosen)

- **Raised by:** author, chosen by the operator
- **Summary:** as in *Decision*.
- **Strengths:**
  - One cache, so no write can be hidden by another copy.
  - Uses a TanStack feature instead of a hand-written strategy.
- **Costs:**
  - Two dependencies and a rewrite of offline reading.
- **Rationale:** it removes the cause, the second cache, instead of keeping it
  in step.

### Option A — Worker reads network first, its copy only when the network fails (rejected)

- **Raised by:** author
- **Summary:** change `staleWhileRevalidate` to network first for API reads.
- **Strengths:** a small diff in `sw.js` and no dependency.
- **Costs:** the two caches stay. Offline, the copy holds the last read, not
  the last write, so an order changed and then read offline before any
  refetch is the old one.
- **Rejection rationale:** loses on "one source of truth". It would win if
  dependency count weighed more than drift.

### Option B — Keep stale-while-revalidate, drop the copy on every write (rejected)

- **Raised by:** author
- **Summary:** each non-GET request deletes the worker's copies of the reads it
  affects.
- **Strengths:** reads stay instant online.
- **Costs:** a hand-kept map from each write path to the reads it changes.
- **Rejection rationale:** loses on "one source of truth" and on maintenance.
  A missed mapping brings the defect back silently.

### Option D — Do nothing (rejected)

- **Raised by:** author
- **Summary:** keep the worker as it is.
- **Strengths:** no work.
- **Costs:** drags keep being lost on prod, as reported on 2026-10-31.
- **Rejection rationale:** loses on correctness.

## Evaluation rubric

| Criterion | Weight | Why it matters |
|---|---|---|
| One source of truth for read data | high | Two caches with one kept in step caused the lost setlist order |
| Offline reading on the metro | high | The spec's stated value of the PWA |
| Hand-written code to maintain | medium | `sw.js` sits at the 300-line lint cap (`docs/knowledge/the-service-worker-grows-by-importscripts.md`) |
| New dependencies | low | Each is an ADR decision, and both are first-party TanStack packages |

|   | E | A | B | D |
|---|---|---|---|---|
| One source of truth | ✓ one cache | ✗ two caches | ✗ two caches | ✗ two caches |
| Offline reading | ✓ restored cache | ✓ worker copy | ✓ worker copy | ✓ worker copy |
| Hand-written code | ✓ worker shrinks | ✓ small change | ✗ write-to-read map | ✓ none added |
| New dependencies | ✗ two | ✓ none | ✓ none | ✓ none |

## Implementation pointers

- Spec: [first-features, section 5](../features/pragma/first-features/spec/spec.md)
- Plan: none yet, to be written after this record is accepted
- Commit: stamped by /after-task-kaizen on merge
- Files: `apps/pragma/site/public/sw.js:80-91` (cached API paths),
  `sw.js:124-135` (stale-while-revalidate), `sw.js:41-52` (offline manifest
  pre-cache), `apps/pragma/site/src/lib/query-client.setup.ts` (client)
- Related: [the-offline-cache-that-answered-first-online](../dantotsus/the-offline-cache-that-answered-first-online.md)
