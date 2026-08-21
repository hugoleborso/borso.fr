# A probe that does not mount the read cannot reproduce an invalidation defect

TanStack Query's `invalidateQueries` marks matching queries stale and refetches
only the **active** ones — a query with no mounted observer is marked and left
alone until something subscribes. This is documented behaviour, and it is a
trap for tests.

## How it cost an afternoon

PR #84 fixed a delete whose `onSettled` invalidation refetched the list it had
just optimistically written, so the deleted row came back. Two separate tests
failed to reproduce it.

**The original test** asserted the optimistic write and stopped:

```tsx
send({ id: 'instr-a' }).catch(() => undefined);
await flushMicrotasks();
expect(cache()?.instruments).toHaveLength(0);   // passes

pending.resolve(jsonResponse({ id: 'instr-a', deleted: true }));
await flushMicrotasks();
tree.unmount();                                  // the revert happens here, unasserted
```

**The second attempt** asserted after the response and still passed, because
the probe component mounted the mutation and nothing else:

```tsx
function ProbeDelete({ sink }) {
  sink(useDeleteInstrument().mutateAsync);   // no useInstrumentsList
  return null;
}
```

With no mounted list query, `invalidateQueries` marked and returned. No `GET`
was issued, the cache kept the optimistic value, and the test passed against
the exact bug it was written to catch.

## The shape that works

Mount the read beside the write, and let the stub answer the refetch with the
state the server would have had:

```tsx
function ProbeDeleteOnTheListScreen({ sink }) {
  useInstrumentsList();                       // the observer that makes the query active
  sink(useDeleteInstrument().mutateAsync);
  return null;
}

stub = stubFetch(async (request) =>
  request.method === 'DELETE' ? jsonResponse({ deleted: true }) : jsonResponse(SEED),
);
```

Two details matter beyond mounting:

- **The mount itself fetches.** Record `stub.calls.length` after the initial
  flush and assert on the slice after it, or the mount's own `GET` is counted
  as the refetch.
- **Assert the absence of the read, not only the cache.** `expect(calls.slice(n).map(c => c.method)).toStrictEqual(['DELETE'])`
  pins the fix rather than its consequence, and survives a change to what the
  stub returns.

## The general rule

A test for cache-invalidation behaviour has to mount every query the behaviour
touches. A probe is a convenient way to get a hook's handle out of React, and
it is a bad model of a screen — the screen's reads are what make an invalidation
observable at all.

Verify a regression test by running it against the unfixed code before trusting
it. Both attempts above looked correct and were green for the wrong reason.

## See also

- [`../dantotsus/the-blueprint-that-mandated-the-refetch-that-undid-it.md`](../dantotsus/the-blueprint-that-mandated-the-refetch-that-undid-it.md)
  — the defect these tests were failing to catch.
- [`dsql-strong-consistency-is-per-connection.md`](./dsql-strong-consistency-is-per-connection.md)
  — why the refetch returned stale data in the first place.
