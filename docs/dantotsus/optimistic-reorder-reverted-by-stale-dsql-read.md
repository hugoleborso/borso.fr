---
date: 2026-06-06
introduced-at: implementation
detected-at: qa
severity: high
related-pr: '#31'
fix-commits: [12bf7d9a91, c933140e0, e4c428591]
eradication-level: 2
eradication-paths: [eslint-rules/no-refetch-of-optimistically-written-query.js, eslint-rules/optimistic-mutation-declares-scope.js, apps/pragma/site/public/sw.js]
time-to-detect: hours
tags: [react, tanstack-query, dsql, optimistic-updates, pragma]
zone: apps/pragma/site/src/lib/queries
weak-point: optimistic-write-undone
blueprints: [query-optimistic-mutation]
---

# The reorder that travelled to the server and came back wrong

## User impact

A band member drags a setlist row to a new place. The row should stay there.

| | Seen | Expected |
| --- | --- | --- |
| Drop a dragged row | The drop animates, then the row jumps back to its old slot and stays | The row stays where it was dropped |
| The database | Holds the new order | Holds the new order |

The operator reported it twice, the second time precisely: *"l'animation est
correcte mais une fois l'animation terminée, la carte saute à son état
d'origine. Est-ce que c'est le même state partout ?"*

## Causal chain

- The row jumped back after the drop animation.
  - The TanStack Query cache for the entries list was overwritten with the old
    order, after the optimistic update had written the new one.
    - The reorder mutation refetched the list it had just written, on settle.
      At `12bf7d9a91^`, `apps/pragma/site/src/lib/queries/setlists.ts`:

      ```ts
      onSettled: (_data, _error, variables) => {
        if (!isLastPendingMutation(queryClient.isMutating({ mutationKey: ENTRY_MUTATION_KEY }))) {
          return;
        }
        void queryClient.invalidateQueries({ queryKey: setlistKeys.entriesOf(variables.setlistId) });   ← ❌ refetch of a key this mutation wrote
      },
      ```

      - The refetch answered the pre-reorder order. Captured live: `PUT` sent
        `[…, b16f]`, the next `GET` returned `[b16f, …]`.
        - The service worker answered that `GET` from its own cache (inferred
          from the code, not reproduced). At `12bf7d9a91`, `sw.js` listed
          `/api/setlists/<id>/entries` among its cached reads and answered
          them with `return cached ?? networkPromise;`. A cached copy from
          before the drag won whenever one existed (Machine). The worker came
          in commit `fec7d61ea`, 2026-05-20, before this defect.
      - The refetch existed because every optimistic mutation in the file
        invalidated on settle, a pattern copied to all three entry mutations.

The first version of this entry blamed a cross-connection read lag in Aurora
DSQL. `docs/knowledge/dsql-strong-consistency-is-per-connection.md` contests
it, measured on 2026-11-04: 0 stale reads in 180 fresh-connection `GET`s after
30 reorders. AWS documents DSQL reads as strongly consistent.

## Root cause of occurrence

*Thought a refetch after a write reaches the server and returns what the write
committed, actually every API read went through a service worker whose
stale-while-revalidate returned its cached copy first.* (Machine)

At `12bf7d9a91`, `apps/pragma/site/public/sw.js` routed every read in
`isReadableApiPath`, the entries path included, to a handler ending in
`return cached ?? networkPromise;`. Nothing in `setlists.ts` shows that a
`GET` may not reach the network. The same worker later lost a saved order in
production ([`the-offline-cache-that-answered-first-online.md`](./the-offline-cache-that-answered-first-online.md)).

A second misconception made the worker matter: *thought invalidate-and-refetch
after every mutation is always safe, actually for a write whose full result the
client already holds, the refetch adds nothing and can only undo it.*

## Detection failure causes

- **Typing:** `invalidateQueries` is well typed. What the read returns is a
  runtime property.
- **Linter:** at the time no rule told a refetch of a key the mutation wrote
  from a refetch of another key.
- **Local validation, false pass:** a tight `curl` loop of `PUT` then `GET`
  never reproduced it. `curl` does not go through the service worker, and that
  run also reused one warm connection. The run sent two wrong fixes out
  ([`debug-client-state-reverts-in-the-browser-first.md`](../knowledge/debug-client-state-reverts-in-the-browser-first.md)).
- **CI:** unit tests mock the network, and no test ran the service worker in
  front of an API read.
- **QA:** caught it, with a manual drag on the seeded preview and a browser
  repro capturing the `PUT` order against the `GET` order.

## Countermeasure

Commit [`12bf7d9`](https://github.com/hugoleborso/borso.fr/commit/12bf7d9a91)
removed the `onSettled` refetch from `useReorderSetlist`. `onMutate` already
writes the complete new order, and `onError` rolls back on a real failure. The
row stayed after the drop on the preview.

## Eradication

**Type:** DevX check (level 2), and the worker branch subtracted.

**Reference:**

- Commit [`c933140e0`](https://github.com/hugoleborso/borso.fr/commit/c933140e0)
  added `eslint-rules/no-refetch-of-optimistically-written-query.js`, now wired
  as `borso/no-refetch-of-optimistically-written-query: error` in `.oxlintrc.json`.
  It refuses an `invalidateQueries` or `refetchQueries` of a key the same
  mutation wrote with `setQueryData`. Its message, line 6, still tells the agent
  it stops that an immediate `GET` "may be served by another Lambda on another
  DSQL connection that still sees the pre-commit snapshot", the belief this
  entry no longer holds.
- Commit [`e4c428591`](https://github.com/hugoleborso/borso.fr/commit/e4c428591)
  (PR #247) made `apps/pragma/site/public/sw.js` answer no API read. Its fetch
  handler now passes mutations through and handles only the shell and
  fingerprinted assets. `grep -c api apps/pragma/site/public/sw.js` prints 0.
  The same change added `eslint-rules/optimistic-mutation-declares-scope.js`,
  so two drops no longer race.

The CLAUDE.md "Clean code" rule this entry first cited is gone from CLAUDE.md.

```diff
-    onSettled: (_data, _error, variables) => {
-      …
-      void queryClient.invalidateQueries({ queryKey: setlistKeys.entriesOf(variables.setlistId) });
-    },
```

**Proof it can fail:** the rule ships with
`eslint-rules/no-refetch-of-optimistically-written-query.test.js`, whose
invalid cases plant this refetch.

**Proposed:** rewrite the rule's message in
`eslint-rules/no-refetch-of-optimistically-written-query.js` to state the real
reason: the client already holds what the mutation wrote, so a refetch of that
key adds no data and can only undo it, through a cache, a race or a slow read.
`docs/standards/06-data-fetching.md` lines 107 to 110 give the same DSQL
reason and change with it. The message is read at the moment an agent decides
whether to keep the refetch, so it would stop planting a contradicted cause
there.

**Similar instances:** `grep -rn 'invalidateQueries' apps/*/site/src --include=*.ts`
lists every refetch. The lint rule now runs on all of them. Append and delete
keep a refetch, because append needs the server-assigned id.
