# Invariants of last-loop-lepin, in `api/src/punch`

The rules the terms of [the vocabulary](../../../VOCABULARY.md) hold in this folder,
and the tests that hold them. A `Held by` path is relative to `apps/last-loop-lepin/`.

## Catch-up punch

- `catchupPunch` refuses a loop that has not started yet, and refuses when the
  runner already holds a non-voided punch for that loop.
- `finishedAt` is parked one millisecond before the end of the requested
  loop's interval, which credits the runner with a full-interval loop time.
- The row is written with `source` `admin` and `correctedAt` set to now, and
  any manual did-not-finish row for that runner in that edition is deleted, so
  the runner reads as in-race again.

## Corral

- Every loop starts at the top, so a fast runner gains rest, not distance.
- Corral time is not part of a loop duration: `loopDurationMs` measures from
  the loop's own hourly top, not from the previous punch.

## Correction

- `correctPunch` replaces `finished_at` and stamps `corrected_at` with the
  moment of the edit.
- `mostRecentCorrectionAt` takes the latest of every `correctedAt` and
  `voidedAt` across an edition's punches. The spectator payload carries it so
  the screen can say the standings were amended.

## Did not finish

- The recorded form is one row per edition and runner: `manual_dnfs` has a
  composite primary key on `(edition_slug, runner_slug)`, so a runner can be
  recorded out only once.
- `out_at_loop`, `reason` and `decided_at` are all not null. `reason` is
  `late` or `manual`, and the API accepts `out_at_loop` from 0 upwards, 0
  meaning the runner never closed a first loop.
- `computeStandings` also derives the state: a runner whose unbroken run of
  valid punches stops short of the loop that should be closed reads as `dnf`
  with reason `late`. A recorded row wins over the derived state, and carries
  its own `outAtLoop`.
- `projectDidNotFinishCandidates` lists the runners an organiser is asked to
  confirm: not already recorded, and with no valid punch landing at or before
  the closing top of the loop that just closed.

## Loop duration

- `loopDurationMs` is
  `punch.finishedAt − hourlyTopOfLoopMs(edition, punch.loopIndex)`, which is
  `punch.finishedAt − (startsAt + (loopIndex − 1) × intervalMs)`, so it is
  measured from the loop's own hourly top and never from the previous punch.
- It is `null` when the punch lands before that top, which the CSV renders as
  an empty cell.
- `lastLoopDurationMs` and `fastestLap` both call it, so the formula is
  written once.

## Loop index

- `loop_index` is not null on `loop_punches`, and the catch-up endpoint takes
  a positive integer only.
- `loopIndexAt(edition, now)` is 0 at or before the start, and rises by one at
  every interval after it.
- A live punch takes `Math.max(1, loopIndexAt(edition, now))`, so a punch at
  the very start counts for loop 1.
- `computeStandings` caps the loop it expects closed at `totalHourlyTops`,
  because `loopIndexAt` keeps rising after the race is over.

## Punch

- `id` is a UUID primary key. `edition_slug`, `runner_slug`, `loop_index` and
  `finished_at` are not null.
- `source` is `admin` or `self`. The column is nullable, and the repository
  reads anything other than `self` as `admin`.
- `validatePunchTiming` decides the race window and the loop. It refuses
  before `startsAt` (`race-not-started`) and after `endsAt` (`race-finished`),
  and it reads no punch.
- One active punch per runner and loop is held by the primary key of
  `loop_punch_claims`, keyed on `(edition_slug, runner_slug, loop_index)`. The
  claim is written in the same transaction as the punch, so of two punches for
  the same loop arriving together one is refused (`already-punched-this-loop`)
  and nothing is written for it. A check over punches read beforehand cannot
  hold this rule, because both requests pass it before either writes.
- Aurora DSQL takes neither the partial unique index nor the foreign keys, so
  `punch.schema.ts` declares neither, and the gaps themselves are listed in
  `docs/knowledge/dsql-postgres-compat-gaps.md`.

Held by: `api/src/punch/punch.service.test.ts` › keeps one punch when the same runner is punched twice at the same instant
Held by: `api/src/punch/punch.service.test.ts` › keeps one punch when a catch-up and a live punch land on the same loop at once

## Self-punch

- `POST /api/self-punches` carries no admin session on purpose: any phone on
  the public network may post, and identity is by self-selection in the
  standings, accepted as a limit of the model. The router lives in its own
  `self-punch.controller.ts` so the absent `requireAdminSession` is visible
  from the file name, and its test pins that the endpoint answers without one.
- The body may carry latitude, longitude and accuracy, each nullable, with
  latitude bounded to ±90 and longitude to ±180. They are telemetry, not a
  gate: there is no geofence, and a self-punch with no coordinates at all is
  accepted.
- When both coordinates are present, the service records
  `distanceFromCenterM`, the great-circle distance from the track's start
  point. The row is written with `source` `self` and the request's user agent.
- Timing is decided by the same `validatePunchTiming` as an organiser's punch.

## Void

- `voidPunch` stamps `voided_at` and deletes the punch's row in
  `loop_punch_claims`, in one transaction, and leaves the punch itself in
  place.
- Every projection filters on `voidedAt === null` before counting anything,
  and a core function taking punches filters them itself rather than trusting
  its caller to have done it.
- Voiding is what lets a runner be punched again for the same loop: the claim
  is gone, so the next punch for that loop can take it.

Held by: `api/src/punch/punch.service.test.ts` › punches a runner again for a loop whose punch was voided
