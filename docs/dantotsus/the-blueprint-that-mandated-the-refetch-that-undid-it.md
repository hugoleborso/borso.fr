---
date: 2026-08-21
introduced-at: implementation
detected-at: qa
severity: high
related-pr: 31
fix-pr: pending
fix-commits: []
eradication-level: 2
time-to-detect: months
tags: [react, tanstack-query, dsql, optimistic-updates, pragma, last-loop-lepin, blueprints]
blueprints: [query-optimistic-mutation]
---

# The blueprint that mandated the refetch that undid it

## Symptom

Deleting an instrument on `pragma` did not look optimistic. The row went, then
came back. The operator reported it as a missing optimistic update: *"Il n'y a
pas d'optimistic update à la suppression d'instrument sur pragma."*

`useDeleteInstrument` had an optimistic update the whole time. Its own
`onSettled` was putting the row back.

## Root-cause chain

1. **Why did the deleted row come back?** `onSettled` ran
   `invalidateQueries({ queryKey: instrumentKeys.all })`, which refetched
   `GET /instruments` while the instruments screen had that query mounted, and
   the answer still carried the deleted row.
2. **Why did the answer still carry it?** Same reason as in June: the `GET` is
   a separate request on a separate Aurora DSQL connection, and DSQL read after
   write visibility holds per connection, so a read starting microseconds after
   another connection's commit can still see the snapshot from before it.
3. **Why was that shape still in the code, three months after a dantotsu named
   it?** Because
   [`optimistic-reorder-reverted-by-stale-dsql-read`](./optimistic-reorder-reverted-by-stale-dsql-read.md)
   shipped its eradication as a sentence in CLAUDE.md and changed one call site
   out of twenty-three. Nothing mechanical read that sentence.
4. **Why did the twenty-two siblings keep it?** Because the blueprint they name
   told them to. `query-optimistic-mutation`'s own `@BlueprintDescription`
   ended on *"`onSettled` invalidates only once `isLastPendingMutation` reports
   the family has drained"*. A follower copying the canonical example copied the
   refetch, and `docs/standards/06-data-fetching.md` carried both instructions
   at once: a table row prescribing the `onSettled` invalidate, and a section
   below it forbidding exactly that.
5. **Why did nobody notice the fixed call site was different?** Because
   `borso/no-comments` bans the comment the June fix used to explain itself, so
   the fix reduced to an absence. A missing `onSettled` reads as an omission,
   not as a decision, and nobody sweeps for an omission.

**Root cause:** *a dantotsu whose countermeasure was prose left the canonical
example still teaching the defect, so the pattern kept reproducing itself, and
the one corrected instance was indistinguishable from a forgotten one.*

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

- `query-optimistic-mutation` — `onMutate` plus `onError`, and nothing that
  refetches.
- `query-optimistic-insert` — the same, plus an `onSuccess` that swaps the row
  written under a client generated identifier for the row the response carries.
  This is what removes the last honest reason to refetch: every `POST` in both
  applications returns the created row through the same repository projection
  the list select uses, so the response already holds everything the `GET`
  would have brought back.
- `query-pessimistic-mutation` — unchanged, for the writes whose result the
  response alone cannot settle.

Applied to all 23 sites across `pragma` and `last-loop-lepin`. The four
`setlists` mutations that had no optimistic path at all — rename, delete, link,
unlink, each fully determined by its request — became optimistic in the same
pass.

## Eradication (mandatory — code-level)

**Type:** DevX check (level 2) — a lint rule that rejects the shape at lint
time. June's entry claimed level 2 for a CLAUDE.md sentence a reviewer was
supposed to enforce, which is level 5 on this ladder; nothing mechanical ran,
and that is why the shape survived in twenty-two places.

`borso/no-refetch-of-optimistically-written-query` rejects an
`invalidateQueries` or `refetchQueries` call inside a `useMutation` whose
options carry `onMutate`. It resolves the transitive case too: it first names
every function in the file whose body refetches, then treats a call to one of
those names as the refetch itself, because extracting the call into a
well-named helper is exactly the move a reader makes when a linter complains,
and it is the move `last-loop-lepin` had already made unprompted.

The rule deliberately does not try to decide which key is safe to refetch,
which is the undecidable question June stopped at. It bans the pair, and a
genuine exception is written where every other exception in this repository is
written: on the line, as `eslint-disable-next-line` with a reason a reviewer can
check. That turns the invisible omission this defect depended on into a visible
claim.

A regression test in `instruments.queries.test.tsx` pins the behaviour from the
screen's side: the probe mounts `useInstrumentsList` beside the mutation, the
stub answers any `GET` with the pre-delete list, and the test asserts both that
the row stays gone and that the delete issues no read. It fails on the old code
with the reported symptom, the deleted row present again.

## See also

- [`optimistic-reorder-reverted-by-stale-dsql-read.md`](./optimistic-reorder-reverted-by-stale-dsql-read.md)
  — the same root cause found in June, on one surface, eradicated in prose.
- [`dsql-strong-consistency-is-per-connection.md`](../knowledge/dsql-strong-consistency-is-per-connection.md)
  — the database property underneath both.
