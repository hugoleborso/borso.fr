# Setlist order survives

## Goal

A band member who reorders a setlist and comes back sees the order they
saved, and the next drag never writes an older order back. Offline reading
of the catalog and the next session keeps working.

Decision: [ADR-202611011313](../../../../adr/202611011313-pragma-offline-reads-through-the-query-cache.md),
option E. Cause: [the dantotsu](../../../../dantotsus/the-offline-cache-that-answered-first-online.md).

## Behaviour

1. Online, every API read reaches the network. The service worker answers
   no `/api/` request from a cache.
2. The service worker keeps serving the app shell, the fingerprinted assets
   and push notifications as today.
3. The TanStack Query cache is saved to `localStorage` and restored at
   start-up, so a member who opens the app offline reads what the app last
   held, optimistic writes included.
4. Once signed in, the app loads into that cache what is missing among the
   catalog list, every song, the next session, its setlists and their
   entries. It never refetches what the cache already holds just for this.
5. Two setlist entry writes never travel at once. Each waits for the
   previous answer (`scope`, already on this branch).
6. Offline writes stay out of scope. Paused mutations are not saved.
7. The cache saved on a phone is dropped when the session ends, so the next
   person who signs in on that phone does not read the previous band data.

## Data shape

- Persisted value: TanStack's `PersistedClient` under the `localStorage` key
  `pragma.query-cache`, queries only, `maxAge` 7 days, `buster` a constant
  bumped when a cached payload changes shape.
- Prod size today: 116 songs, 245 setlist entries, 18 sessions, about
  110 KB of row data (measured on 2026-11-03 with `pg_column_size`), well
  under the `localStorage` quota.

## Out of scope

- Writing offline.
- Changing `/api/offline-manifest`, which the app now reads instead of the
  worker.

## Acceptance

- A unit test loads `sw.js`, seeds an old copy of an API read in every
  cache, and asserts an online read returns the network answer.
- At 375 px on a production build: three drags, Done, back after 35 s, the
  new order shows. Offline (network cut), the catalog and the next setlist
  still show.
