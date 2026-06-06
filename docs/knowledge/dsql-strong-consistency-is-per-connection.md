# Aurora DSQL read-after-write is per-connection — a fresh GET can miss a just-committed PUT

## The trap

Two HTTP requests to a Lambda-backed API — a write (`PUT`) immediately
followed by a read (`GET`) — can be served by **different Lambda
invocations on different DSQL connections**. Aurora DSQL gives you
read-your-own-writes consistency *within a connection/transaction*, but
a read that starts on connection B microseconds after a commit on
connection A can still observe the **pre-commit snapshot**. The commit
is durable and globally consistent shortly after, but "shortly" is long
enough to lose a back-to-back read.

In PR #31 this reverted an optimistic UI: the front fired `PUT /reorder`
(200, persisted), then a TanStack Query `onSettled` refetch fired the
`GET` ~1 ms later on another connection and got the **old** order, which
overwrote the correct optimistic cache. Captured live: `PUT` sent
`[…, b16f]`, the immediate `GET` returned `[b16f, …]`.

## Why a `curl` loop won't reproduce it

The obvious local check — a tight `curl` loop doing `PUT` then `GET` —
gives a **false PASS**. `curl` (and most keep-alive HTTP clients) reuse
a single warm connection, so the `GET` rides the same DSQL session as
the `PUT` and reads-its-own-writes consistently. The lag only shows
across *separate* connections, which is exactly the browser → API → new
Lambda shape. If you must probe this from the shell, force a new
connection per request (e.g. separate processes, `Connection: close`),
or — better — reproduce in the real client and watch the network.

## What to do instead

- **For a write whose full result the client already knows** (a reorder,
  a toggle, a value the request itself sets), don't blind-refetch on
  settle. Trust the optimistic cache and reconcile from the mutation
  **response**, not a fresh `GET`. See
  [`../dantotsus/optimistic-reorder-reverted-by-stale-dsql-read.md`](../dantotsus/optimistic-reorder-reverted-by-stale-dsql-read.md).
- **For a write that needs server-generated data** (an insert that
  returns a new id), you do need the round-trip — but reconcile from the
  POST/PUT response body rather than a separate `GET` invalidation, so
  the read shares the write's commit and connection.
- Don't paper over it with a `setTimeout` before the refetch — the lag
  isn't bounded by a number you can hard-code.

## See also

- [`../dantotsus/optimistic-reorder-reverted-by-stale-dsql-read.md`](../dantotsus/optimistic-reorder-reverted-by-stale-dsql-read.md)
- [`debug-client-state-reverts-in-the-browser-first.md`](./debug-client-state-reverts-in-the-browser-first.md)
