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

Reads use `useQuery`, and writes use `useMutation`.

A mutation is one of three shapes, and it says which by carrying the marker of
the blueprint it follows. Ask whether the client can name the row the server
will return.

| It can | Optimistic | `onMutate` writes the predicted state and `onError` restores the snapshot. Nothing refetches. `query-optimistic-mutation`. |
| Everything but the identifier | Optimistic insert | `onMutate` writes the row under an identifier the client generates and keeps it in the context, and `onSuccess` swaps that row for the one the response carries. Nothing refetches. `query-optimistic-insert`. |
| It cannot | Pessimistic | No `onMutate`. `onSuccess` invalidates the affected key, and the header says why the optimistic path is refused. `query-pessimistic-mutation`. |
| No cached query holds the result | Uncached | A `mutationFn` and nothing else, with the header naming whatever does surface the write. `query-uncached-mutation`. |

Reach for pessimistic only when the server computes something, e.g., a parsed
file, a derived timestamp, a generated identifier. A status change, a delete
and a reorder are all fully determined by the request, so they are optimistic
and a spinner on one of them is a defect rather than a style.

## A mutation that wrote the cache never refetches it

A mutation carrying `onMutate` has already written the state it predicted, so
refetching from that same mutation adds no data, and it can revert the user
interface: an immediate `GET` after a write may be served by a different Lambda
on a different DSQL connection that still sees the state from before the commit.
DSQL read after write consistency holds per connection and not across
connections.

An insert is not the exception it looks like. The one thing its client cannot
predict is the identifier, and the response carries it, so the insert settles
from its own answer through `query-optimistic-insert` rather than from a `GET`
that could take the new row straight back out of the list.

If a key really does hold a projection no client can derive, refetch that one
key and write the reason on the line, as an `eslint-disable-next-line`. A
helper named for the scoping is not enough: `last-loop-lepin` had one called
`refetchEditionProjectionsTheClientCannotPredict` whose body invalidated
`editionKeys.all`, the optimistically written list included.

The two accounts are
[`docs/dantotsus/optimistic-reorder-reverted-by-stale-dsql-read.md`](../dantotsus/optimistic-reorder-reverted-by-stale-dsql-read.md)
and
[`docs/dantotsus/the-blueprint-that-mandated-the-refetch-that-undid-it.md`](../dantotsus/the-blueprint-that-mandated-the-refetch-that-undid-it.md).

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

## Reporting goes through one adapter

A reporting client, e.g. Sentry, is imported in exactly one module per
application, under `site/src/observability/`, and every component calls a
function that module exports.

The vocabulary is the reason. A breadcrumb carries a category, a level and a
message, and when each call site picks its own, two screens report the same
thing under two spellings and the dashboard cannot group them. The adapter
fixes those in one place and takes the event name as a closed union, so a name
that does not exist is a type error rather than an event nobody finds.

That module is named `<vendor>.adapter.ts`, so the folder and
[ADR-0012](../adr/0012-outbound-calls-live-in-adapter-files.md) agree rather
than compete. They are answering different questions: the folder is a *scope*,
and it is the narrower rule, because a reporting SDK is the one outbound
dependency whose call sites are the whole application rather than one bounded
context; the suffix is a *layer*, and the architecture map reads it off the path
to know that the edge to the vendor leaves from here. A reporting module that
kept a plain name would sit in the right folder and still land on the map with
no layer at all.

`apps/last-loop-lepin/site/src/observability/sentry.ts` is the one module that
predates the suffix and has not been renamed.

## Enforced by

- `eslint:borso/no-vendor-sdk-outside-adapter` rejects an import of a reporting
  SDK from anywhere under `site/` other than `observability/`.
- `eslint:borso/no-direct-api-fetch-in-site` rejects a `fetch` call whose URL
  literal starts with `/api/`.
- `eslint:borso/no-api-anchor-in-site` rejects a JSX attribute whose literal
  value starts with `/api/`.
- `eslint:borso/no-server-state-in-use-state` rejects a `useEffect` that calls
  `fetch` or an API client method and then sets state.
- `eslint:borso/no-discarded-await-before-navigation` rejects a write whose
  promise is dropped on the way to a route change, where the failure would land
  on a screen nobody is looking at.
- `eslint:borso/no-refetch-of-optimistically-written-query` rejects an
  `invalidateQueries` or `refetchQueries` call whose key covers one the same
  mutation wrote in `onMutate`, including one reached through a helper declared
  in the same file. It expands each key through its factory, so a sibling key
  passes and a prefix of a written key does not; a key it cannot expand, such as
  one from a factory declared in another file, counts as covering.
- `eslint:@typescript-eslint/no-unsafe-assignment` fails on a response value that
  has lost its type.
- `eslint:no-restricted-imports` rejects a database package imported from a
  site. The typed client is the only way across, and a bundler pulling `pg` into
  a browser build fails at run time rather than at build time.
- `reviewer` checks that a mutation whose full result the client already holds
  reconciles from the response rather than refetching, because an immediate read
  after a write can be served a pre-commit snapshot.
- `reviewer` checks that a form goes through `useForm` rather than a chain of
  `useState`, and that a grid goes through `useReactTable`.
