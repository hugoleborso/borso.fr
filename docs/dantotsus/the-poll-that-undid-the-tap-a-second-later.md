---
date: 2026-09-16
introduced-at: implementation
detected-at: ci
severity: medium
related-pr: '#89'
fix-pr: '#89'
fix-commits: [a36b358d]
eradication-level: 1
time-to-detect: hours
tags: [pragma, react, tanstack-query, dsql, optimistic-updates, ci, flake]
blueprints: [query-optimistic-mutation]
---

# The poll that undid the tap a second later

## Symptom

On the audience vote page, tapping a song a second time is how a visitor
retracts their vote. The row's `aria-pressed` went back to `false` on the tap
and then, about a second later, returned to `true` on its own.

From the visitor's side the application refused their tap. Nothing errored,
nothing logged, the vote was in fact deleted on the server — the screen simply
went back to showing it.

It failed a `VotePage` test on this machine roughly once in thirty runs. I saw
it fail once, could not explain it, and called the suite stable. CI failed on
it the first time the merged branch ran there.

## Root-cause chain

1. **Why did the row come back?**
   A `GET` of the vote state landed after the delete and carried the vote,
   overwriting the optimistic write.

2. **Why did a read land after the write?**
   Both vote mutations call `cancelQueries` in `onMutate`. That cancels the
   reads *in flight at that instant*. The state query also carries a
   `refetchInterval` of one second while a round is open, and the interval is
   not a query — cancelling a query does not stop the timer that starts the
   next one. A fresh read begins a moment after the cancel and is subject to
   nothing.

3. **Why did the server answer it with the vote still there?**
   Aurora DSQL's read-after-write consistency is per connection. The read is
   a second HTTP request, served by a different Lambda on a different
   connection, and that connection's snapshot predates the delete. The answer
   is not stale in any way the database considers wrong; it is a correct read
   of an earlier snapshot.

4. **Why did `cancelQueries` look sufficient?**
   Because it is the documented remedy, and the documentation is written
   against a query that refetches on demand. It answers *"a read is in flight
   when I write"*. It has no answer for *"a read starts while I write"*, which
   is what an interval guarantees will happen eventually.

5. **Why did it hide for so long?**
   The race needs a poll to be in flight at the moment of the tap. At one
   second of interval against a test that taps immediately, that is a narrow
   window on a fast machine and a wide one on a loaded CI runner.

6. **Why did I not chase the one local failure?**
   I had a green re-run and a large diff, and I treated a single unexplained
   failure as noise. It was the defect, reporting itself once.

**Root cause:** the author thought *`cancelQueries` protects an optimistic
write from concurrent reads*, actually *it protects it from reads that have
already started*, and a `refetchInterval` is a machine for starting new ones.

The [`query-optimistic-mutation`](../../.claude/skills/blueprint/blueprint-index.md)
blueprint is tagged in this entry's front matter for that reason: its shape
opens with *"cancels the in flight reads for every key it is about to touch"*
and says nothing about reads that have not started, because under an on-demand
query there are none. Copying it is what made the protection look complete.

## Detection failure causes

- **Typing:** every type is correct. The bug is an ordering between two
  correct calls.
- **Linter:** `borso/no-refetch-of-optimistically-written-query` exists
  precisely for this family and checks `invalidateQueries` / `refetch` inside
  a mutation carrying `onMutate`. A `refetchInterval` declared on an unrelated
  `useQuery` in another file is outside anything a per-file rule can see.
- **Functional validation locally:** the page worked. A one-in-thirty race
  does not reproduce by tapping a button a few times by hand.
- **CI:** caught it — on the merged branch, which is the last cheap moment.
- **Code review:** the mutation reads correctly on its own (`onMutate`
  cancels, writes optimistically, rolls back on error) and the query reads
  correctly on its own (polls while the round is open). The defect exists only
  in their composition, and they are in two different files.

## Countermeasure

- **Code:** commit `a36b358d` — `selectPollInterval` takes the count of
  pending writes and returns `false` while any is in flight.

  ```diff
  -export function selectPollInterval(round: RoundView | null | undefined): number | false {
  +export function selectPollInterval(
  +  round: RoundView | null | undefined,
  +  pendingWriteCount = 0,
  +): number | false {
     if (round === null || round === undefined) return false;
     if (round.isSettled) return false;
  +  if (pendingWriteCount > 0) return false;
     return OPEN_ROUND_POLL_INTERVAL_MS;
   }
  ```

  with `const pendingWriteCount = useIsMutating();` in `useConcertVoteState`.

  **Pausing is not invalidating.** Nothing is refetched by this change; the
  next scheduled read simply waits until the writes have settled. That
  distinction is what keeps it on the right side of
  `no-refetch-of-optimistically-written-query` rather than in tension with it.

## Eradication (mandatory — code-level)

**Type:** code diff (level 1 — structural impossibility, within this pattern)

**Reference:** PR #89 · commit
[`a36b358d`](https://github.com/hugoleborso/borso.fr/commit/a36b358d)

The decision moved into `selectPollInterval`, a `*.utils.ts` function gated at
100% statement, branch, function and line coverage and at 100% mutation. The
interval is no longer a constant a caller may read past a pending write: there
is one function that answers *should a poll run now*, it is pure, it takes the
write count, and every mutant of its new branch is killed by a test.

Expressed as [`utils-poll-that-yields-to-the-writer`](../../.claude/skills/blueprint/blueprint-index.md),
so the next poll written beside an optimistic mutation copies a shape that
already has the answer rather than rediscovering the race:

> Stops the interval while a write is pending, because cancelling in-flight
> reads inside `onMutate` does not stop the interval from starting a new one a
> moment later, and that read is answered from state the server has not
> committed yet.

**Why not a lint rule.** The two halves live in two files — a `refetchInterval`
on a query and an `onMutate` on a mutation that writes the same key — and
ESLint's per-file scope cannot see the pair. A rule that fired on every
`refetchInterval` in a file that also holds a mutation would be noise; one
that tried to resolve the query key across files is a type-aware analysis for
a pattern with a handful of instances. The blueprint plus the gated function
is the honest ceiling here, and it is a real one: the shape to copy exists and
carries its own reasoning.

**Sibling defects swept:** every other poll in `pragma` was checked. The
setlist and catalogue queries do not poll, so this was the only site.

## See also

- [`optimistic-reorder-reverted-by-stale-dsql-read.md`](./optimistic-reorder-reverted-by-stale-dsql-read.md) — the same DSQL property, reached by an explicit refetch rather than an interval.
- [`the-blueprint-that-mandated-the-refetch-that-undid-it.md`](./the-blueprint-that-mandated-the-refetch-that-undid-it.md) — when the pattern itself prescribed the read that undid the write.
- [`dsql-strong-consistency-is-per-connection.md`](../knowledge/dsql-strong-consistency-is-per-connection.md) — why a second request can be served an older snapshot.
