# `hc` + TanStack Query — the data-layer migration shipped in the PR #23 kaizen

Operator observation that triggered this:

> *« apiClient was not tanstackQuery ??? »* — post-merge PR #23 review.

The previous data layer was two hand-rolled hooks
(`useStandingsPoll.ts`, `useResource.ts`) over `useSyncExternalStore`
plus a hand-rolled `apiClient` that re-typed every endpoint with a
Zod schema on the read side. The combination paid for itself twice
in PR #23: the polling-storm dantotsu
([`usesyncexternal-store-subscribe-must-be-stable.md`](../dantotsus/usesyncexternal-store-subscribe-must-be-stable.md))
and the relative-fetch dantotsu
([`frontend-fetch-must-go-through-api-client.md`](../dantotsus/frontend-fetch-must-go-through-api-client.md)).
The kaizen migration replaced both layers.

## What landed

**Back (`apps/last-loop-lepin/api/src/`):** every controller is now
a chained `new Hono().get(...).route(...)...` so Hono can infer
each route's path × method × request/response shape into the
router's TS type. `app.ts` composes the controllers via `.route()`
chaining at module level and exports `type AppType = ReturnType<typeof
buildAppRouter>` — the type carries the full route tree.

**Front (`apps/last-loop-lepin/site/src/`):**

- `api/client.ts` was rewritten on top of `hc<AppType>(API_BASE)`.
  Each `apiClient.<method>` dispatches to the typed
  `client.api.<path>.$<method>(...)`. The response is narrowed via
  `r.ok` and `.json()` returns the OK-branch body, fully typed from
  the back. No Zod schema on the read side, no path string written
  twice.
- `data/useStandingsPoll.ts` is now a thin adapter over `useQuery`
  with `refetchInterval: 2_000`. The cache map, the listener set,
  the lazy-start guard, and the subscribe arrow that caused
  PR #23's polling storm are all gone.
- `data/useResource.ts` is a thin adapter over `useQuery`.
- `main.tsx` wraps `<App>` in a `<QueryClientProvider>` with
  `refetchOnWindowFocus: false` (we already poll standings ; focus-
  refetch would compound).

## What the kaizen kept

The two Biome Grit plugins ship as defence-in-depth even though the
direct causes are gone:

- [`no-inline-subscribe-in-use-sync-external-store.grit`](../../biome-plugins/no-inline-subscribe-in-use-sync-external-store.grit)
  — guards the three remaining direct `useSyncExternalStore` call
  sites (clock-store consumers) and anything that bypasses TanStack
  Query in the future.
- [`no-direct-api-fetch-in-site.grit`](../../biome-plugins/no-direct-api-fetch-in-site.grit)
  — guards against any reintroduction of `fetch('/api/...')`
  literals outside the apiClient.

## What's still wrong (follow-up)

- **No mutation primitive in use yet.** The admin actions
  (`adminCreateEdition`, `adminVoidPunch`, etc.) still call
  `apiClient.<method>` imperatively from event handlers and reload
  the page or rely on the standings poll to pick up the change.
  Next admin-feature touch should adopt `useMutation` + `queryClient.invalidateQueries`
  so the relevant queries refresh deterministically.
- **A few `.ts` consumers still narrow `result.data` from a hc-
  inferred union to the domain DTO via a runtime spread.** This
  works but means the DTO and the inferred type can drift. Next
  read-side touch should consider replacing the domain DTO with
  the inferred type directly (no spread, no duplication).

## See also

- [`docs/dantotsus/built-my-own-before-checking-the-library.md`](../dantotsus/built-my-own-before-checking-the-library.md) — umbrella dantotsu on the NIH pattern.
- [`docs/dantotsus/usesyncexternal-store-subscribe-must-be-stable.md`](../dantotsus/usesyncexternal-store-subscribe-must-be-stable.md), [`docs/dantotsus/frontend-fetch-must-go-through-api-client.md`](../dantotsus/frontend-fetch-must-go-through-api-client.md) — the two bugs this migration eradicated structurally.
