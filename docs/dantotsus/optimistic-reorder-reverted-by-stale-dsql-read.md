---
date: 2026-06-06
introduced-at: implementation
detected-at: qa
severity: high
related-pr: 31
fix-pr: 31
fix-commits: [12bf7d9]
eradication-level: 2
time-to-detect: hours
tags: [react, tanstack-query, dsql, optimistic-updates, pragma]
blueprints: [query-optimistic-mutation]
---

# The reorder that travelled to the server and came back wrong

## Symptom

Dragging a setlist row to a new position animated correctly, then —
once the drop animation finished — the row **jumped back to its
original slot** and stayed there. The user reported it twice, the
second time precisely: *"l'animation est correcte mais une fois
l'animation terminée, la carte saute à son état d'origine. Est-ce que
c'est le même state partout ?"*

The server had the new order persisted the whole time.

## Root-cause chain

1. **Why did the row revert after the animation?** The TanStack Query
   cache for the entries list was overwritten with the *old* order
   shortly after the optimistic update applied the new one.
2. **Why was the cache overwritten with the old order?** The reorder
   mutation's `onSettled` ran `invalidateQueries`, which refetched the
   entries `GET` immediately after the `PUT /reorder` returned 200.
   That refetch resolved with the pre-reorder order.
3. **Why did the refetch return the pre-reorder order when the `PUT`
   had already committed (200)?** It was a different request, served by
   a different Lambda invocation on a different Aurora DSQL connection.
   DSQL's read-after-write visibility lags across connections: a read
   that starts microseconds after a commit on another connection can
   still see the pre-commit snapshot. Captured live: `PUT` sent order
   `[…, b16f]` (b16f last), the immediate refetch `GET` returned
   `[b16f, …]` (b16f first).
4. **Why did a refetch exist at all for reorder?** The optimistic
   mutation pattern in `setlists.ts` invalidates the query on settle —
   a blanket habit copied across every mutation, including the ones
   (like reorder) where the client already holds the complete,
   authoritative result and the `PUT` confirms it with 200.

**Root cause:** *thought "invalidate-and-refetch after every mutation
is always safe", actually "for a write whose full result the client
already knows, the post-write refetch adds nothing and can race a
not-yet-visible DSQL commit on another connection, reverting the
optimistic update".*

## Detection failure causes

- **Typing:** invisible — `invalidateQueries` is well-typed; the bug is
  a timing/consistency property, not a type.
- **Linter / static analysis:** no rule distinguishes a "full-state-known"
  write (safe to trust optimistically) from an "id-needing" write (add,
  which genuinely needs the server round-trip). The distinction isn't
  statically decidable.
- **Functional validation locally — false PASS:** the read-after-write
  lag was probed with a tight `curl` loop (`PUT` then immediate `GET`)
  and **never reproduced**, because `curl --keepalive` reuses one warm
  connection, where DSQL reads-its-own-writes consistently. The lag
  only appears across *separate* connections — exactly the app's
  `PUT`-then-`GET` shape. The warm-loop test gave false confidence and
  sent two wrong fixes out (see
  [`debug-client-state-reverts-in-the-browser-first.md`](../knowledge/debug-client-state-reverts-in-the-browser-first.md)).
- **CI:** unit tests mock the network; the cross-connection DSQL race
  has no representation in the test environment.
- **QA:** this is where it was caught — manual drag on the seeded
  preview, then a browser-driven repro capturing the `PUT` order vs the
  `GET` order.

## Countermeasure

- **Code:** commit [`12bf7d9`](https://github.com/hugoleborso/borso.fr/commit/12bf7d9) —
  removed the `onSettled` refetch from `useReorderSetlist`. The
  optimistic `onMutate` already writes the complete new order (every
  entry id + its new position); `onError` rolls back on a real failure;
  any later entries refetch (energy edit, remount, focus) reconciles
  once the write has propagated. No blind refetch, no revert.

## Eradication (mandatory — code-level)

**Type:** code diff (structural removal for the reorder surface) +
convention (level 2 — a CLAUDE.md "Clean code" rule the
`/technical-validation` reviewer enforces, generalising the fix to the
sibling optimistic mutations where a lint can't tell the two cases
apart).

**Reference:** [PR #31](https://github.com/hugoleborso/borso.fr/pull/31) ·
commit [`12bf7d9`](https://github.com/hugoleborso/borso.fr/commit/12bf7d9) ·
CLAUDE.md *Clean code* "Optimistic writes the client fully knows".

**The actual fix:**

```diff
     onError: (_error, variables, context) => {
       if (context?.previous !== undefined) {
         queryClient.setQueryData<EntriesCache>(
           setlistKeys.entriesOf(variables.setlistId),
           context.previous,
         );
       }
     },
-    onSettled: (_data, _error, variables) => {
-      if (!isLastPendingMutation(queryClient.isMutating({ mutationKey: ENTRY_MUTATION_KEY }))) {
-        return;
-      }
-      void queryClient.invalidateQueries({ queryKey: setlistKeys.entriesOf(variables.setlistId) });
-    },
+    // Deliberately no `onSettled` refetch — see CLAUDE.md "Clean code".
+    // A reorder's optimistic cache already holds the complete, correct
+    // order and the PUT returns 200; an immediate GET can read a
+    // pre-commit DSQL snapshot on another connection and revert it.
   });
 }
```

**Sibling defects swept:** `useAppendSetlistEntry` / `useDeleteSetlistEntry`
share the refetch-after-write shape but legitimately need the round-trip
(append needs the server-assigned id), so they keep the refetch and are
*not* changed here. They remain latent candidates for the
reconcile-from-response upgrade; the CLAUDE.md rule names the boundary
so the next implementer reconciles from the mutation response rather
than blind-refetching when the response carries the full result.

## See also

- [`debug-client-state-reverts-in-the-browser-first.md`](../knowledge/debug-client-state-reverts-in-the-browser-first.md)
  — why the warm-connection `curl` test lied, and the browser-repro
  discipline that finally located this.
- [`dsql-strong-consistency-is-per-connection.md`](../knowledge/dsql-strong-consistency-is-per-connection.md)
  — the DSQL property underneath this race.
