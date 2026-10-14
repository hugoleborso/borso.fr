---
date: 2026-10-14
introduced-at: implementation
detected-at: production
severity: medium
related-pr: '#178'
fix-pr: none (this kaizen pull request, numbered once it opens)
fix-commits: [self]
eradication-level: 1
eradication-paths: [apps/pragma/site/src/lib/query-client.setup.ts, apps/talos/site/src/lib/query-client.setup.ts, apps/banana-rush/site/src/lib/query-client.setup.ts, apps/last-loop-lepin/site/src/lib/query-client.setup.ts]
time-to-detect: days
tags: [react, tanstack-query, pragma]
zone: apps/pragma/site/src/lib/queries
recurs: none (the earlier tanstack-query entries are a refetch undoing an optimistic write; this is a write that refetched too little)
---

# The closed vote left its setlist empty

## Symptom

The operator closed the vote on the setlist *Set frappadingue de bar* on their
phone. The app opened the setlist page, which said *"No song in this set yet."*
It should have listed the songs the vote had kept. The songs were saved: a
reload showed them.

## Root-cause chain

- The setlist page rendered an empty setlist.
  - It read the setlist from the TanStack Query cache, not from the server.
    - The vote page had loaded that setlist while it was still empty, and
      `staleTime` is 30 seconds, so the copy still counted as fresh.
      - `useCloseVote` invalidated `votingKeys.all` only, and the setlist sits
        under `setlistKeys`.
        - Each mutation chose by hand which queries its write makes stale, and
          the close endpoint writes the setlist entries, a table the voting
          keys do not read.

**Root cause:** a mutation's author has to list the queries its write touches,
and that list is read off the screen being built, while the write reaches
tables other screens read. TanStack Query documents the global alternative:
*"you can use the global cache callbacks to invalidate everything after a
mutation"* ([Automatic Query Invalidation after
Mutations](https://tkdodo.eu/blog/automatic-query-invalidation-after-mutations)).

## Detection failure causes

- **Typing:** a query key is an array; nothing ties a mutation to the keys its
  endpoint changes.
- **Linter:** `borso/no-refetch-of-optimistically-written-query` checks the
  opposite case, a refetch that should not happen.
- **Tests:** `voting.queries.ts` has no test, and a test of the hook would
  have mounted the vote board only, not the setlist read.
- **Review:** PR #172 and earlier passed review with the narrow invalidation.

## Countermeasure

PR #178 made `useCloseVote` and `useSetVoteStatus` also invalidate
`setlistKeys.all`.

## Eradication

Every application's query client now owns the rule. A `MutationCache`
`onSuccess` invalidates every query after a mutation succeeds, unless the
mutation wrote the cache optimistically through `onMutate`:

```ts
mutationCache: new MutationCache({
  onSuccess: async (_data, _variables, _context, mutation) => {
    const shouldRefetchEverything = isSettledByRefetch(mutation.options);
    if (shouldRefetchEverything) await queryClient.invalidateQueries();
  },
}),
```

Only mounted queries refetch at once; the rest refetch when a screen mounts
them. An optimistic mutation is left out because CLAUDE.md forbids its
refetch: a DSQL read on another connection can undo the write
([the dantotsu](./optimistic-reorder-reverted-by-stale-dsql-read.md)).

- **Similar instances:** the same `QueryClient` setup in `pragma`, `talos`,
  `banana-rush` and `last-loop-lepin` (which built its client inline in
  `main.tsx` and now has `lib/query-client.setup.ts` like the others). At
  the time of writing they hold 87 `useMutation` calls; every one without
  `onMutate` is now covered whatever keys it lists.
- **Proof:** `query-client.setup.test.ts` mounts a read of another screen and
  runs a mutation. With the previous `query-client.setup.ts` it fails,
  *"expected vi.fn() to be called 2 times, but got 1 times"*; with the rule it
  passes. The same test runs in all four applications.
- **What is not covered:** an optimistic mutation that also changes data
  another screen reads still has to invalidate that screen's keys by hand.
