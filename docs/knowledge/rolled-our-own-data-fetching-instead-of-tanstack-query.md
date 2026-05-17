# We rolled our own `useStandingsPoll` / `useResource` instead of using TanStack Query

Operator observation, post-merge on PR #23: *« apiClient was not
tanstackQuery ??? »*. Captured here so the next data-layer touch
revisits the call.

## What we have today

Two custom hooks living under `apps/last-loop-lepin/site/src/data/`:

- `useResource<T>(key, thunk)` — one-shot async resource, cached by
  string key. Used for `editions/current`, `editions:all`,
  per-runner lookups, per-runner-punch lookups.
- `useStandings(editionSlug)` — 2 s-interval polling against
  `/api/standings/:slug`. Used by the spectator page, runner-fiche
  page, and admin page.

Both are thin wrappers over `useSyncExternalStore` with a module-scope
cache map. ~110 lines each. Implemented from scratch when the data
layer was minimal — no mutations, no auth-aware queries, no
optimistic updates, no infinite scrolling.

## What we paid for the rollout

- **PR #23: the polling-storm dantotsu**
  ([`usesyncexternal-store-subscribe-must-be-stable.md`](../dantotsus/usesyncexternal-store-subscribe-must-be-stable.md)).
  TanStack Query's `useQuery` hook would not have made the same
  identity mistake because its subscribe wiring is internal — the
  consumer just hands in `queryKey` and `queryFn` and gets a
  cached, deduplicated, refetch-on-mount, interval-polled result.
  Even a naïve implementation would have had ~14 req/s caught by
  the library author's own tests, not ours, months ago.
- **Boilerplate every time we add an endpoint.** Each new resource
  needs a key naming convention, a thunk that closes over the
  args, and consumers that re-derive the cache entry on every
  render. With React Query it's `useQuery({ queryKey: [...], queryFn:
  () => ... })`.
- **No mutation primitive.** When we ship the next admin mutation
  (e.g. a button that updates an edition), we'll need a third
  custom hook. TanStack Query ships `useMutation` for that, with
  built-in `onSuccess` invalidate-this-query support.

## Reframes that kept us off the library

- *"We don't have many endpoints; the boilerplate is fine."* — true
  until the polling bug burnt 4 hours of debug + cost ~13× the
  intended request rate on the back during live retransmission.
- *"useSyncExternalStore is the modern primitive; React 18 makes
  rolling our own easy."* — true that the primitive is good. Easy
  is a different question — see the dantotsu.

## The follow-up (when, not whether)

Pick this up as a feature task next time the data layer needs to
grow (next mutation, next non-trivial cache invalidation, next
optimistic-update site). Drop-in migration:

1. `pnpm --filter @borso-app/last-loop-lepin add @tanstack/react-query`.
2. Wrap `<App>` in a `QueryClientProvider`.
3. Convert `useResource` call sites to `useQuery({ queryKey, queryFn:
   thunk })`. Keys are already stable strings.
4. Convert `useStandings` to `useQuery({ queryKey: ['standings',
   slug], queryFn: ..., refetchInterval: 2_000 })`. Mark the queryKey
   `['standings', slug]` so the cache shape is explicit.
5. Delete `useResource.ts` + `useStandingsPoll.ts`.
6. The Biome plugin
   [`no-inline-subscribe-in-use-sync-external-store.grit`](../../biome-plugins/no-inline-subscribe-in-use-sync-external-store.grit)
   stays — it covers any other library / our-own code that touches
   the primitive directly.

## See also

- [`docs/dantotsus/built-my-own-before-checking-the-library.md`](../dantotsus/built-my-own-before-checking-the-library.md) — the umbrella dantotsu on this pattern; this knowledge entry is the latest concrete instance.
- [`docs/dantotsus/usesyncexternal-store-subscribe-must-be-stable.md`](../dantotsus/usesyncexternal-store-subscribe-must-be-stable.md) — the specific bug a battle-tested library would have prevented.
