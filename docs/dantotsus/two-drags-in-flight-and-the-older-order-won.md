---
date: 2026-11-01
introduced-at: implementation
detected-at: production
severity: high
related-pr: '#31'
fix-pr: none (the operator has not chosen the countermeasure yet)
fix-commits: none (proposal under review, nothing is merged)
eradication-level: 5
eradication-paths: []
time-to-detect: months
tags: [react, tanstack-query, dsql, optimistic-updates, pragma]
zone: apps/pragma/site/src/lib/queries
weak-point: optimistic-write-undone
recurs: [optimistic-reorder-reverted-by-stale-dsql-read, the-blueprint-that-mandated-the-refetch-that-undid-it]
blueprints: [query-optimistic-mutation]
---

# Two drags in flight, and the older order won

> Status: proposal for the operator to accept or reject. The countermeasure and
> eradication below are not merged. The front matter says level 5 until one is.

## Symptom

A band member reorders a setlist, taps Done, comes back later, and finds an
older order:

> « quand je change l'ordre, je clique sur terminé puis je reviens, ça a pas
> pris en compte les modifs » (Thomas)

| Moment | Screen shows | Database holds |
| --- | --- | --- |
| Right after Done | the 2nd drag | the 1st drag |
| Back 35 s later | **the 1st drag** | the 1st drag |

Measured in a browser on a local stack, with the first `PUT` slowed by 1.5 s.
Without the delay, local `PUT`s take 40 to 120 ms and never overlap, even
with drags 45 ms apart.

## Root-cause chain

1. **Why does the setlist come back in an older order?** The `GET /entries`
   on the return visit reads the database, and the database holds an earlier
   drag.
2. **Why does the database hold an earlier drag?** Two `PUT /reorder` were in
   flight at once, and the one sent first committed last. Each carries the
   whole order, so the last commit erases the other.
3. **Why can two be in flight at once?** Each drop calls
   `useReorderSetlist().mutate` straight away. TanStack Query runs mutations
   in parallel by default, *"even if you invoke `.mutate()` of the same
   mutation multiple times"*, and *"the order in which mutations are
   fulfilled may differ from the order of `mutate` function calls"*
   ([Mutations guide](https://tanstack.com/query/latest/docs/framework/react/guides/mutations)).
4. **Why can the first one commit last?** On Aurora DSQL there is no row lock.
   B commits, A's commit aborts on the conflict, and `retryingConflictAborts`
   reruns A with its older id list, which still passes the same-ids check
   (inferred from the code, not observed).
5. **Why does the screen not notice?** Since
   `optimistic-reorder-reverted-by-stale-dsql-read`, an optimistic mutation
   never rereads what it wrote, so nothing tells the client the server kept
   another order. `onMutate`'s `setQueryData` also makes the cache fresh for
   30 s, so Done and an immediate return show the cache without a request
   (measured).

**Root cause:** *thought "requests leave in the order of the gestures, so the
last one sent is the last one written", actually "two requests in flight
commit in any order, and a client that never rereads what it wrote keeps
showing the one that lost".*

### What prod shows, and what it does not

- On 2026-10-31 one setlist got six reorders. Two overlapped: A started at
  11:38:05.279, B at 05.856. B answered 200 in 394 ms, A answered 200 in
  1.65 s, after B (measured, CloudWatch `pragma-prod-api`, the only reorders
  in the 7-day retention).
- The three reorders that followed did not overlap and each resent the whole
  order. So the final database order probably matches the last screen
  (inferred). This sequence proves the overlap happens in prod. It does not
  prove it is the loss Thomas saw.
- Nothing records who made those drags. Thomas's report date decides whether
  it is this sequence or one older than the log retention.

## Detection failure causes

- **Linter:** standard 06 already asked that writes answering one shared value
  share a `scope`. Only a `reviewer` line enforced it, and it named counts and
  streaks. 54 of 58 optimistic mutations had no scope (measured by script).
- **Unit tests:** every hook test fires one mutation. None fires a second
  before the first answers.
- **Local validation:** local `PUT`s are fast and Postgres locks the setlist
  row, so overlaps never happen locally (measured).
- **Production monitoring:** both requests answer 200. Nothing errors, so
  neither Sentry nor the logs flag anything.

## Countermeasure (proposed)

Two shapes, both on `SetlistOrderPage` and `useReorderSetlist` only:

| Option | What the user sees | Cost |
| --- | --- | --- |
| A. Refuse a drag while a reorder is pending (operator's idea) | The list is locked until the server answers | 240 ms to 1.65 s of frozen list per drag (prod timings) |
| B. Give the entry mutations one `scope` | Every drop moves at once, requests queue behind each other | None visible. A failed request rolls back to its snapshot, which can also drop the drags queued after it |

B keeps the list responsive and is what the code on the branch does. In the
browser, the second `PUT` left 2 ms after the first answered, and the database
matched the screen (measured). A and B combine if a visible lock is wanted.

Neither covers two devices reordering the same setlist at once. The server
keeps whichever commits last. A version number on the reorder would close
that, and no such report exists.

## Eradication (proposed, level 2)

**Type:** DevX check (level 2, custom rule), not merged.

`borso/optimistic-mutation-declares-scope` rejects a `useMutation` whose
options carry `onMutate` and no `scope`.

```diff
+if (!hasProperty(options, 'onMutate') || hasProperty(options, 'scope')) return;
+context.report({ node: options, messageId: 'optimisticMutationWithoutScope' });
```

Proof it can fail, measured on the branch:
- With its `scope` check removed, the rule's own suite fails (1 of 9 cases).
- With `scope` removed from `useReorderSetlist`, the new hook test fails with
  `expected [ …(2) ] to have a length of 1 but got 2`: two `PUT`s in flight
  instead of one.

**Sibling defects:** the rule flags 51 call sites across `pragma`, `talos` and
`last-loop-lepin`. Each would get its file's write scope. That widens the
change to three apps, so it is a separate decision from the setlist fix.

## See also

- [`optimistic-reorder-reverted-by-stale-dsql-read.md`](./optimistic-reorder-reverted-by-stale-dsql-read.md)
- [`the-blueprint-that-mandated-the-refetch-that-undid-it.md`](./the-blueprint-that-mandated-the-refetch-that-undid-it.md)
- [`dsql-strong-consistency-is-per-connection.md`](../knowledge/dsql-strong-consistency-is-per-connection.md)
