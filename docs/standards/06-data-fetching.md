# 06. Data fetching

## Rule

Every call from a front end to its own back end goes through TanStack Query,
and every request and response type comes from the Hono client. A front end
never calls `fetch` against its own API, and it never declares a response type
by hand.

## Reason

A hand-written fetch helper re-declares the response shape, so the front end
and the back end hold two copies of the same contract and the copies drift. The
drift compiles, and it fails at runtime.

The Hono client removes the second copy. You export the router type from the
API entry point, the front end reads it, and a renamed field on the back end
becomes a TypeScript error in the component that reads it.

TanStack Query removes the second problem, which is that hand-rolled fetching
in React means writing loading state, error state, caching, deduplication, and
refetching over and over, and getting one of the five wrong each time.

## Wiring the Hono client

The API exports the type of its router:

```ts
// api/src/app.ts
const apiRouter = app
  .route('/api/runners', runnerController)
  .route('/api/punches', punchController);

export type AppRouter = typeof apiRouter;
```

The front end builds one client from the type:

```ts
// site/src/lib/api.ts
import { hc } from 'hono/client';
import type { AppRouter } from '../../../api/src/app';

export const api = hc<AppRouter>(API_BASE === '' ? '/' : API_BASE, {
  init: { credentials: 'include' },
});
```

Then every call is typed on both ends:

```ts
const response = await api.api.runners[':runnerId'].$get({
  param: { runnerId },
});
```

The API base URL matters, because the front end and the API sit on different
origins in preview and in production. A relative `/api/...` string reaches the
static site distribution, which has no `/api` behaviour, so the request falls
through to the single page application and returns the 404 page. Always build
URLs through the client.

## Query modules

Query keys and hooks live in one module per domain, under
`site/src/lib/queries/<domain>.ts`, so that no caller invents a key.

```ts
export const runnerQueryKeys = {
  all: ['runners'] as const,
  detail: (runnerId: string) => ['runners', runnerId] as const,
};

export function useRunner(runnerId: string) {
  return useQuery({
    queryKey: runnerQueryKeys.detail(runnerId),
    queryFn: async () => {
      const response = await api.api.runners[':runnerId'].$get({
        param: { runnerId },
      });
      return response.json();
    },
  });
}
```

Reads use `useQuery`, and writes use `useMutation`. A mutation either
invalidates the keys it affected in `onSuccess`, or it applies an optimistic
update in `onMutate` and rolls back in `onError`.

## Do not refetch a write whose result you already hold

When the request itself fully determines the new state, e.g., a reorder or a
toggle, reconcile from the mutation response and do not add an `onSettled`
call to `invalidateQueries`.

Refetching in that case adds no data, and it can revert the user interface,
because an immediate `GET` after a write may be served by a different Lambda
and a different DSQL connection that still sees the state from before the
commit. DSQL read after write consistency holds per connection and not across
connections.

Keep the refetch only when the server generates data the client cannot predict,
e.g., an insert that returns a new identifier. The full account is in
[`docs/dantotsus/optimistic-reorder-reverted-by-stale-dsql-read.md`](../dantotsus/optimistic-reorder-reverted-by-stale-dsql-read.md).

## The one allowed direct fetch

Uploading a file to a presigned S3 URL uses `fetch` directly, because the
request goes to Amazon and not to our API, and the Hono client knows nothing
about it. The presign call itself still goes through the client and through
`useMutation`.

## Forms

A form uses `@tanstack/react-form`, so that field state, validation, dirty
tracking, submission, and arrays of fields all go through one
`useForm({ defaultValues, validators, onSubmit })` call. The validator wraps
the same Zod schema the back end uses, so the two cannot disagree.

Six `useState` calls for six fields, with a hand-written submit handler, is
banned.

## Tables

A table, a grid, or a matrix uses `@tanstack/react-table` in its headless form,
so that sorting, filtering, and virtualisation come from the library. A
hand-rolled `<table>` with manual sort and filter state is banned.

## Enforced by

- `borso/no-direct-api-fetch-in-site`, a custom ESLint rule, which rejects a
  `fetch` call whose URL literal starts with `/api/`.
- `borso/no-api-anchor-in-site`, a custom ESLint rule, which rejects a JSX
  attribute whose literal value starts with `/api/`.
- `borso/no-server-state-in-use-state`, a custom ESLint rule, which rejects a
  `useEffect` that calls `fetch` or an API client method and then sets state.
- `@typescript-eslint/no-unsafe-assignment` and its siblings, which fail on any
  response value that has lost its type.
