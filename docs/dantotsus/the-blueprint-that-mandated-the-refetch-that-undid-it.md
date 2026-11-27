---
date: 2026-08-21
introduced-at: implementation
detected-at: qa
severity: high
related-pr: '#31'
fix-commits: [c933140e0f, a5f609da82]
eradication-level: 2
eradication-paths: [eslint-rules/no-refetch-of-optimistically-written-query.js]
time-to-detect: months
tags: [react, tanstack-query, dsql, optimistic-updates, pragma, last-loop-lepin, blueprints]
zone: apps/pragma/site/src/lib/queries
weak-point: optimistic-write-undone
recurs: [optimistic-reorder-reverted-by-stale-dsql-read, the-optimistic-update-nobody-could-see]
blueprints: [query-optimistic-mutation]
---

# The blueprint that mandated the refetch that undid it

## User impact

A pragma member who deleted an instrument saw the row disappear, then come back.

| | Seen | Expected |
| --- | --- | --- |
| Delete an instrument | The row goes, then reappears | The row goes and stays gone |

The operator reported it as a missing optimistic update: *"Il n'y a pas d'optimistic update à la suppression d'instrument sur pragma."* ("There is no optimistic update on instrument delete in pragma.") `useDeleteInstrument` had an optimistic update the whole time. Its own `onSettled` put the row back. The same shape sat in 23 mutations across `pragma` and `last-loop-lepin`.

## Causal chain

- The deleted row came back.
  - `onSettled` refetched `GET /instruments` while the instruments screen had that query mounted, and the answer still carried the deleted row:

    ```ts
    onSettled: () => {
      if (!isLastPendingMutation(queryClient.isMutating({ mutationKey: instrumentKeys.all })))
        return;
      void queryClient.invalidateQueries({ queryKey: instrumentKeys.all });  // ← the faulty line
    },
    ```

    - The `GET` ran on a separate Aurora DSQL connection. DSQL read-after-write visibility holds per connection, so a read starting just after another connection's commit can see the snapshot from before it.
  - The mutation copied its blueprint. `query-optimistic-mutation`'s `@BlueprintDescription`, written in `f2fa6f626`, ended on *"`onSettled` invalidates only once `isLastPendingMutation` reports the family has drained"*. 23 `@FollowsBlueprint` markers pointed at it (Machine).
    - `docs/standards/06-data-fetching.md` carried both instructions at once: a table row prescribing the `onSettled` invalidate, and a section below forbidding it.
    - June's [`optimistic-reorder-reverted-by-stale-dsql-read`](./optimistic-reorder-reverted-by-stale-dsql-read.md) named this defect. It shipped its eradication as a CLAUDE.md sentence and changed one call site of 23 (Method).
      - `borso/no-comments` banned the comment that fix used to explain itself, so the one corrected site read as a forgotten `onSettled`, not a decision.

## Root cause of occurrence

*Thought the canonical blueprint was safe to copy. Actually it prescribed the `onSettled` refetch the June entry had named, because June's eradication was prose and never reached the blueprint.* (Machine, with Method behind it)

The CLAUDE.md sentence was loaded in every session (`git show f2fa6f626^:CLAUDE.md`, line 71: "don't blind-refetch a write whose full result the client already holds"). The blueprint and the standard's table contradicted it, and a follower copies the example. Source: the blueprint description quoted above, and the 23 followers.

## Detection failure causes

- **Typing:** invisible. `invalidateQueries` is well typed; the defect is a
  visibility property of the database.
- **Linter:** no rule existed. The June dantotsu concluded none could, on the
  grounds that telling a full-state-known write from an identifier-needing one
  is not statically decidable. True, and not the question that needed asking:
  *"does this mutation refetch a cache it already wrote?"* is decidable, and it
  is the whole defect.
- **Unit tests:** the delete test asserted the optimistic write and stopped
  before the response resolved, so the revert happened after the last
  assertion. A later attempt to reproduce it still passed, because the probe
  component mounted the mutation without the list query, and
  `invalidateQueries` refetches active queries only. The test only reproduces
  the screen's behaviour once the probe mounts `useInstrumentsList` too.
- **CI:** unit tests mock the network, so the cross-connection race has no
  representation there at all.
- **Blueprint gates:** `blueprint-indexing --check` verifies that every
  annotation names a blueprint that exists. It has nothing to say about a
  blueprint whose text is wrong, and 23 correctly formed `@FollowsBlueprint`
  markers pointed at it.
- **Naming as a countermeasure:** `last-loop-lepin` tried to carry the decision
  in a name, `refetchEditionProjectionsTheClientCannotPredict`. The body
  invalidated `editionKeys.all`, the optimistically written list included. A
  name asserting a scoping is not the scoping.

## Countermeasure

Three shapes now, split by what the client cannot know rather than by whether a
refetch felt safe:

- `query-optimistic-mutation`: `onMutate` plus `onError`, and nothing that
  refetches.
- `query-optimistic-insert`: the same, plus an `onSuccess` that swaps the row
  written under a client generated identifier for the row the response carries.
  This is what removes the last honest reason to refetch. Every `POST` in both
  applications returns the created row through the same repository projection
  the list select uses, so the response already holds everything the `GET`
  would have brought back.
- `query-pessimistic-mutation`: unchanged, for the writes whose result the
  response alone cannot settle.

Applied to all 23 sites across `pragma` and `last-loop-lepin`. The four
`setlists` mutations that had no optimistic path at all became optimistic in
the same pass. Rename, delete, link and unlink are each fully determined by
their request.

## Eradication

**Type:** DevX check (level 2)

**Reference:** commits [`c933140`](https://github.com/hugoleborso/borso.fr/commit/c933140e0f) and [`a5f609d`](https://github.com/hugoleborso/borso.fr/commit/a5f609da82). The rule is enabled as an error today (`.oxlintrc.json:558`, read this session).

A lint rule rejects the shape at lint time. June's entry claimed level 2 for a CLAUDE.md sentence a reviewer was
supposed to enforce, which is level 5 on this ladder. Nothing mechanical ran,
and that is why the shape survived in twenty-two places.

`borso/no-refetch-of-optimistically-written-query` rejects an
`invalidateQueries` or `refetchQueries` call whose key covers a key the same
mutation wrote in `onMutate`. It resolves the transitive case too. It first
names every function in the file whose body refetches, then treats a call to
one of those names as the refetch itself, because extracting the call into a
well-named helper is exactly the move a reader makes when a linter complains,
and it is the move `last-loop-lepin` had already made unprompted.

June concluded no rule was possible, because telling a full-state-known write
from an identifier-needing one is not statically decidable. That is true and it
is not the question. *"Does this refetch a key this mutation already wrote?"* is
decidable, because the key factories are object literals. Expanding `list()`
through its spread of `all` gives `['editions','list']`, an argument gives a
segment matching anything, and overlap is then the prefix test TanStack applies
itself. So a refetch of a sibling key needs no exception at all. That matters,
because the first version of this rule banned the pair outright, and the one
place in either application with a legitimate reason to refetch had to carry a
four-sentence comment excusing itself. A rule that makes correct code apologise
is the wrong rule.

The rule's own suite pins both directions. A refetch of `editionKeys.current()`
beside an optimistic write of `editionKeys.list()` passes, and the same code
refetching `editionKeys.all` does not.

The rule is the floor, not the answer. Reviewing this branch turned up the
`current` refetch it now permits, and the better fix was to stop refetching at
all. That projection is a pure selection over the list the mutation had just
rewritten, so it moved to `apps/last-loop-lepin/domain/` and both sides apply
it. A refetch the rule permits is still worth asking whether the client could
have derived.

A regression test in `instruments.queries.test.tsx` pins the behaviour from the
screen's side. The probe mounts `useInstrumentsList` beside the mutation, the
stub answers any `GET` with the pre-delete list, and the test asserts both that
the row stays gone and that the delete issues no read. It fails on the old code
with the reported symptom, the deleted row present again.

**Proof it can fail:** the rule's suite, `eslint-rules/no-refetch-of-optimistically-written-query.test.js`, refuses a refetch of `editionKeys.all` beside an optimistic write of `editionKeys.list()`, and the regression test fails on the old code with the deleted row present again.

**Similar instances:** all 23 `@FollowsBlueprint query-optimistic-mutation` sites were changed in the same pass. `grep -rn "@FollowsBlueprint query-optimistic" apps/` lists today's followers, and the rule runs on each of them.
