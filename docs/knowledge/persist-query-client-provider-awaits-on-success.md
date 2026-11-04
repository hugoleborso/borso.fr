---
summary: '`PersistQueryClientProvider` awaits a promise returned by `onSuccess` before it stops restoring, so a prefetch returned from it holds every query, and the first screen, until the network answers.'
triggers:
  paths:
    - 'apps/*/site/src/main.tsx'
    - 'apps/*/site/src/lib/query-client.setup.ts'
---

# `PersistQueryClientProvider` awaits `onSuccess`

_Read in `@tanstack/react-query-persist-client` 5.102.8,
`build/modern/PersistQueryClientProvider.js`, on 2026-11-03._

```js
persistQueryClientRestore(options)
  .then(() => refs.current.onSuccess?.())
  .catch(() => refs.current.onError?.())
  .finally(() => { setIsRestoring(false) })
```

`onSuccess`'s return value is returned into the chain, so a promise from it
delays `finally`. While the provider is restoring, every query waits. A
callback that returns `queryClient.prefetchQuery(...)` therefore blocks the
first screen behind a network round trip, offline too until it fails.

Fire the work and return nothing. pragma's `startOfflineReading` in
`apps/pragma/site/src/lib/query-client.setup.ts` is typed `(): void` and
calls `void loadOfflineReadingWhenSignedIn(queryClient)`. Keep that shape.

The plan of PR #247 said to run the prefetch from `onSuccess` and named
`ensureQueryData` and `prefetchQuery`. 5.102.8 marks both deprecated, and
oxlint's `no-deprecated` refuses them, so read the installed API before
naming a TanStack call in a plan.
