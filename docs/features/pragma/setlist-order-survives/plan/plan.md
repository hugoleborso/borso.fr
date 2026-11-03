# Plan: setlist order survives

Spec: [spec.md](../spec/spec.md).

| # | Spec item | Where it lands | Test |
| --- | --- | --- | --- |
| 1 | No API read from a worker cache | `site/public/sw.js`: delete `DATA_CACHE`, `OFFLINE_MANIFEST_URL`, `listManifestUrls`, `cacheUrlIfReachable`, `precacheManifestUrlsIfReachable`, `isReadableApiPath`, `staleWhileRevalidate` and the `/api/` branch of `fetch`. `activate` keeps only `SHELL_CACHE`, so the old `pragma-v4-data` is deleted on the next activation | `site/src/sw/service-worker.test.ts`: an online `GET /api/setlists/:id/entries` with a stale copy seeded returns the network body; the data-cache tests go |
| 2 | Shell, assets, push unchanged | untouched branches of `sw.js` | existing tests stay green |
| 3 | Persisted query cache | `site/src/lib/query-client.setup.ts`: `gcTime` default raised to the persister `maxAge`, export the persister (`@tanstack/query-async-storage-persister` over `window.localStorage`) and the persist options (`maxAge`, `buster`, `dehydrateOptions.shouldDehydrateMutation: () => false`). `site/src/main.tsx`: `PersistQueryClientProvider` instead of `QueryClientProvider` | unit test of the persist options |
| 4 | Fill the cache for offline reading | new `site/src/lib/queries/offline-reading.queries.ts`: reads `/api/offline-manifest`, then `queryClient.ensureQueryData` for each read with the same key and fetcher the hooks use (extract `…QueryOptions` from `songs`, `sessions`, `setlists`, `setlist-entries` query modules). Run from `PersistQueryClientProvider`'s `onSuccess` when the session probe says signed in | unit test: missing keys are fetched, present keys are not |
| 5 | Serial entry writes | done in `d4c2a61a` | existing `setlist-entries.queries.test.tsx` |
| 6 | No saved mutations | `shouldDehydrateMutation: () => false` | covered by row 3 test |
| 7 | Drop on session end | `onSessionEnded` in `query-client.setup.ts` also removes the persisted client | unit test |

Dependencies: `@tanstack/react-query-persist-client` and
`@tanstack/query-async-storage-persister`, both 5.102.8 to match the catalog
`@tanstack/react-query` (checked with `npm view`). Added to the pnpm catalog.

## Risks

- Restored data from an older build has an old shape. Detection: a crash on
  start. Mitigation: `buster`.
- `gcTime` lower than `maxAge` drops restored queries. Mitigation: row 3
  sets them equal.
- A prefetch fired before sign-in answers 401 and ends the session.
  Mitigation: row 4 runs only when signed in.

## Pre-flight gates

`pnpm --filter @borso-app/pragma run typecheck`, lint with `--type-aware`,
the core vitest project, the touched e2e files.
