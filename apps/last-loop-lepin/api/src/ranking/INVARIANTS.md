# Invariants of last-loop-lepin, in `api/src/ranking`

The rules the terms of [the vocabulary](../../../VOCABULARY.md) hold in this folder,
and the tests that hold them. A `Held by` path is relative to `apps/last-loop-lepin/`.

## Fastest lap

- Computed over every non-voided punch with `loopDurationMs`, so it is the
  edition record rather than a ranking among the runners still in.
- The result is a list. Two entries mean two runners tied at the millisecond.
  A runner holding the minimum on two loops appears once.
- Empty when no punch yields a duration.

## Rank

- Runners still in the race come before runners who are out.
- Within a tier, a deeper last valid loop ranks higher. At equal depth, the
  earlier `lastFinishedAt` ranks higher, and a runner with no punch at all
  sorts after everyone who has one.
- Two runners on the same loop with the same finish millisecond both carry
  `rank: 'ex-aequo'` in place of a number.

## Runner status

- Two shapes: `{ kind: 'in-race', lastLoop }` and
  `{ kind: 'dnf', outAtLoop, reason }`.
- A runner is in-race when their valid punches run unbroken up to the loop
  that should be closed, and no manual did-not-finish row names them.
- The count of consecutive loops starts at 1 and stops at the first gap, so
  punches after a missed loop do not raise it.

## Standings

- `computeStandings` takes the edition, the runners, the punches, the manual
  did-not-finish rows and `now`, and reads nothing else.
- Voided punches are filtered out before anything is computed.
- `raceEnded` is true when `now` is at or past `endsAt`, or when at most one
  runner is still in-race.
- The payload carries `computedAt`, the ranked list and the edition's fastest
  lap.
- Two CSV exports read the same standings: one row per runner, and one column
  per loop.
