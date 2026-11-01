---
date: 2026-11-01
introduced-at: implementation
detected-at: production
severity: high
related-pr: '#31'
fix-pr: none (the pull request is not open yet)
fix-commits: [self]
eradication-level: 2
eradication-paths: [eslint-rules/optimistic-mutation-declares-scope.js]
time-to-detect: months
tags: [react, tanstack-query, dsql, optimistic-updates, pragma, talos, last-loop-lepin]
zone: apps/pragma/site/src/lib/queries
weak-point: optimistic-write-undone
recurs: [optimistic-reorder-reverted-by-stale-dsql-read, the-blueprint-that-mandated-the-refetch-that-undid-it]
blueprints: [query-optimistic-mutation]
---

# Two drags in flight, and the older order won

## Symptom

A band member reordered a setlist, tapped Done, came back later, and found the
old order: *"quand je change l'ordre, je clique sur terminé puis je reviens,
ça a pas pris en compte les modifs"*.

The screen showed the new order right after Done. The database held an older
one (measured locally, see below). The next visit refetched and showed it.

## Root-cause chain

1. **Why did the next visit show the old order?** The entries `GET` returned
   the order the database held, and the database held the order of an earlier
   drag.
2. **Why did the database hold an earlier drag?** Two `PUT /reorder` calls were
   in flight at once, and the one sent first committed last. Each carries the
   whole order, so the last commit wins. Prod, 2026-10-31: request A started at
   11:38:05.279, B at 11:38:05.856, B answered 200 at 06.250, A answered 200 at
   06.727 after 1.65 s billed (measured, CloudWatch `pragma-prod-api`).
3. **Why could A commit after B?** DSQL takes no locks. B commits first, A's
   commit aborts on the conflict, and `retryingConflictAborts` runs A again with
   its older id list, which still passes the same-ids check (inferred: the X-Ray
   trace shows no SQL detail, and a cold start would give the same timing).
   Locally, a 1.5 s delay before the transaction gives the same result: screen
   on drag 2, database on drag 1 (measured).
4. **Why were two requests in flight at once?** `useReorderSetlist` declared no
   mutation `scope`, so TanStack Query sends every call as soon as it is made.
5. **Why did the screen not notice?** Since
   `optimistic-reorder-reverted-by-stale-dsql-read`, an optimistic mutation
   never refetches what it wrote. That removed the stale read, and with it the
   only path by which the client learnt that the server disagreed. The
   `onMutate` write also resets the cache's age, so Done and the back link
   showed the cache for 30 s without a request (measured).

**Root cause:** *thought "the order the requests leave in is the order they
commit in", actually "two requests in flight commit in any order, and a client
that never rereads what it wrote keeps showing the one that lost".*

## Detection failure causes

- **Linter:** the standard already asked that writes answering one shared value
  share a `scope`. Only a `reviewer` line enforced it, and it named counts and
  streaks, not a full-order write. 54 of 58 optimistic mutations had no scope
  (measured by script; oxlint later counted 51 call sites).
- **Unit tests:** every hook test fires one mutation. None fires two before
  the first answers, which is the only shape that loses a write.
- **Local validation:** local PUTs take 40 to 120 ms and Postgres locks the
  setlist row, so even drags 45 ms apart never overlapped (measured).
- **Production monitoring:** both requests answered 200. Nothing is wrong in
  any single request, so no error reached Sentry or the logs.

## Countermeasure

- **Code:** `useReorderSetlist` and every other entry mutation share
  `ENTRY_WRITE_SCOPE`. `onMutate` still runs at once (measured in
  `@tanstack/query-core` 5.102.8 `mutation.ts`), so the row moves on the drop,
  and the second `PUT` leaves when the first answers. With the scope, the same
  delayed double drag sent PUT 2 two milliseconds after PUT 1 answered, and the
  database matched the screen (measured in the browser).

## Eradication (mandatory — code-level)

**Type:** DevX check (level 2 — custom rule)

**Reference:** this commit.

**The actual fix:**

```diff
+// eslint-rules/optimistic-mutation-declares-scope.js
+if (!hasProperty(options, 'onMutate') || hasProperty(options, 'scope')) return;
+context.report({ node: options, messageId: 'optimisticMutationWithoutScope' });
```

```diff
 export function useReorderSetlist() {
   const queryClient = useQueryClient();
   return useMutation({
     mutationKey: ENTRY_MUTATION_KEY,
+    scope: ENTRY_WRITE_SCOPE,
```

The rule fails its own suite when its `scope` check is removed, and the new
`useReorderSetlist` test fails with two requests in flight when the scope is
removed (both measured).

**Sibling defects swept:** the 51 unscoped optimistic mutations in `pragma`,
`talos` and `last-loop-lepin` each got their file's write scope. The
`reviewer` line in `docs/standards/06-data-fetching.md` became the rule.

**Not covered:** two devices writing the same setlist still last-writer-wins
on the server. A version check on the reorder would close it. No report of it
exists.

## See also

- [`optimistic-reorder-reverted-by-stale-dsql-read.md`](./optimistic-reorder-reverted-by-stale-dsql-read.md)
- [`the-blueprint-that-mandated-the-refetch-that-undid-it.md`](./the-blueprint-that-mandated-the-refetch-that-undid-it.md)
- [`dsql-strong-consistency-is-per-connection.md`](../knowledge/dsql-strong-consistency-is-per-connection.md)
