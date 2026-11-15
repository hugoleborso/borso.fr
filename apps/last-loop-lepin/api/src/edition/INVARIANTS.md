# Invariants — last-loop-lepin, `api/src/edition`

The rules the terms of [the vocabulary](../../../VOCABULARY.md) hold in this folder,
and the tests that hold them. A `Held by` path is relative to `apps/last-loop-lepin/`.

## Edition

- `slug` is the primary key. `display_name`, `starts_at`, `ends_at`,
  `sunrise_at`, `sunset_at`, `interval_min`, `gpx` and `status` are all not
  null, and `interval_min` defaults to 60.
- `createEdition` refuses a start at or after the end, and refuses a slug that
  already exists.
- The GPX metadata is stored as JSON text because Aurora DSQL has no `jsonb`,
  and is validated by `gpxMetadataSchema` when the row is read.
- The schedule, the track and the display name can be replaced only while the
  edition is in `setup`, and the same gate guards deletion.
- `getCurrentEdition` answers the live edition, else the earliest upcoming
  edition still in `setup`, else the most recently ended one.

## Edition status

- Three values: `setup`, `live`, `finished`. A status column holding anything
  else makes the repository throw while mapping the row.
- The spectator screen shows the announcement for `setup`, and the live screen
  for the other two.

## Hourly top

- The gap between tops is `intervalMinutes`, which the API accepts between 1
  and 240 and defaults to 60.
- `nextHourlyTop` answers `startsAt` for any moment before the race, however
  far ahead the question is asked, and nothing once the next boundary would
  fall at or after `endsAt`.
- `hourlyTopOfLoopMs(edition, loopIndex)` is the instant loop `loopIndex`
  starts. It is written once in `punch.core.ts`, and both the loop duration and
  the catch-up punch's finishing instant are derived from it.
- `totalHourlyTops` is how many whole intervals fit between `startsAt` and
  `endsAt`, which is the number of loops the edition can hold.

## Loop

- Loops are numbered from 1. Loop N starts at `startsAt` plus
  `(N - 1) × intervalMinutes`.
- An edition holds `totalHourlyTops(edition)` loops, and the per-loop CSV
  emits one column per loop.

## Slug

- Both accept lower-case letters, digits and dashes only. An edition slug is 3
  to 64 characters, a runner slug 2 to 64.
- `editionSlugSchema` is declared once and imported by the punch and runner
  slices rather than restated.
- The edition slug is the primary key and never changes: the update payload
  omits it and takes it from the URL path.
