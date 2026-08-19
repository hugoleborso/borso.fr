# Vocabulary — last-loop-lepin

The application runs a backyard-ultra style race: the whole field sets off on
the same loop at every hourly top, and anyone who is not back before the next
top is out. Three groups use it. Organisers prepare the race and record the
loops from an admin screen, runners can confirm their own loop from their
phone, and spectators follow the standings live. This page fixes the words for
the things the code handles, so a name chosen while writing matches the name
already in the tree.

## Admin session

An organiser's logged-in session, held on the server and referenced by an
opaque cookie value.

Lives in: `api/src/auth/`

- `admin_sessions.id` is the primary key, `expires_at` is not null, and the
  session expires 12 hours after it was issued.
- The PIN is checked against a scrypt hash held in the single-row
  `admin_credentials` table. Login is denied with reason `misconfigured` when
  that row is absent.
- Login attempts are counted per client address in `auth_attempts`: five
  attempts per five-minute window, then reason `rate-limited`.

## Bib

The number pinned to a runner, which is how organisers and screens pick them
out on race day.

Lives in: `api/src/runner/`

- The API requires a bib when a runner is created: a positive integer up to
  9999.
- The `bib` column itself is nullable, and `Runner.bib` is `number | null`.
- `validateRunnerDraft` rejects a bib another runner of the edition already
  holds, with reason `bib-already-taken`.

Not to be confused with: the slug, which is the identifier used in URLs and in
every reference from another table.

## Catch-up punch

A punch the organisers add after the fact, for a loop a runner ran but nobody
recorded.

Lives in: `api/src/punch/`

- `catchupPunch` refuses a loop that has not started yet, and refuses when the
  runner already holds a non-voided punch for that loop.
- `finishedAt` is parked one millisecond before the end of the requested
  loop's interval, which credits the runner with a full-interval loop time.
- The row is written with `source` `admin` and `correctedAt` set to now, and
  any manual did-not-finish row for that runner in that edition is deleted, so
  the runner reads as in-race again.

## Corral

The waiting area where a runner who has finished their loop early stands until
the next hourly top.

Lives in: `api/src/punch/`, where the rule it explains sits in `punch.core.ts`

- Every loop starts at the top, so a fast runner gains rest, not distance.
- Corral time is not part of a loop duration: `loopDurationMs` measures from
  the loop's own hourly top, not from the previous punch.

## Correction

An edit an organiser makes to a punch's finishing instant after it was
recorded.

Lives in: `api/src/punch/`

- `correctPunch` replaces `finished_at` and stamps `corrected_at` with the
  moment of the edit.
- `mostRecentCorrectionAt` takes the latest of every `correctedAt` and
  `voidedAt` across an edition's punches. The spectator payload carries it so
  the screen can say the standings were amended.

Not to be confused with: a void, which keeps the punch but stops it counting.

## Did not finish

A runner who is out of the race, either because the organisers recorded it or
because they missed a loop.

Lives in: `api/src/punch/`

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

## Edition

One running of the race: one day, one track, one field of runners.

Lives in: `api/src/edition/`

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

Where an edition sits between being prepared and being over.

Lives in: `api/src/edition/`

- Three values: `setup`, `live`, `finished`. A status column holding anything
  else makes the repository throw while mapping the row.
- The spectator screen shows the announcement for `setup`, and the live screen
  for the other two.

## Fastest lap

The shortest single loop of the whole edition.

Lives in: `api/src/ranking/`

- Computed over every non-voided punch with `loopDurationMs`, so it is the
  edition record rather than a ranking among the runners still in.
- The result is a list. Two entries mean two runners tied at the millisecond.
  A runner holding the minimum on two loops appears once.
- Empty when no punch yields a duration.

## GPX track

The course file the organisers upload, and the distance, climb and coordinates
derived from it.

Lives in: `api/src/helpers/gpx/`, stored on the edition by `api/src/edition/`

- `parseGpx` throws `GpxParseError` for input with no `<gpx>` or `<trk>` root
  and for input with no usable `<trkpt>`. The edition endpoints answer both as
  a 400.
- `startLatLng` is the first track point. It is what the sunrise and sunset
  calculation and the self-punch distance both read.
- Per-point elevations and per-point time fractions are all or nothing: one
  point missing the value drops the whole series. Time fractions increase
  strictly from 0 to 1, and each series present has the same length as
  `points`.
- Climb is cumulative positive change with a 3 m noise floor, so descents and
  GPS jitter do not add to it.

## Hourly top

The moment a loop starts: `startsAt` plus a whole number of intervals.

Lives in: `api/src/edition/`

- The gap between tops is `intervalMinutes`, which the API accepts between 1
  and 240 and defaults to 60.
- `nextHourlyTop` answers `startsAt` for any moment before the race, however
  far ahead the question is asked, and nothing once the next boundary would
  fall at or after `endsAt`.
- `totalHourlyTops` is how many whole intervals fit between `startsAt` and
  `endsAt`, which is the number of loops the edition can hold.

## Loop

One circuit of the track, run by the whole field between two hourly tops.

Lives in: `api/src/edition/`

- Loops are numbered from 1. Loop N starts at `startsAt` plus
  `(N - 1) × intervalMinutes`.
- An edition holds `totalHourlyTops(edition)` loops, and the per-loop CSV
  emits one column per loop.

Not to be confused with: a punch, which is the record that one runner closed
one loop. A loop exists whether or not anyone punched it.

## Loop duration

How long a runner took over one loop.

Lives in: `api/src/punch/`

- `loopDurationMs` is
  `punch.finishedAt − (startsAt + (loopIndex − 1) × intervalMs)`, so it is
  measured from the loop's own hourly top.
- It is `null` when the punch lands before that top, which the CSV renders as
  an empty cell.
- `lastLoopDurationMs` and `fastestLap` both call it, so the formula is
  written once.

## Loop index

Which loop a punch belongs to.

Lives in: `api/src/punch/`

- `loop_index` is not null on `loop_punches`, and the catch-up endpoint takes
  a positive integer only.
- `loopIndexAt(edition, now)` is 0 at or before the start, and rises by one at
  every interval after it.
- A live punch takes `Math.max(1, loopIndexAt(edition, now))`, so a punch at
  the very start counts for loop 1.
- `computeStandings` caps the loop it expects closed at `totalHourlyTops`,
  because `loopIndexAt` keeps rising after the race is over.

## Punch

The record that one runner closed one loop, at one instant.

Lives in: `api/src/punch/`

- `id` is a UUID primary key. `edition_slug`, `runner_slug`, `loop_index` and
  `finished_at` are not null.
- `source` is `admin` or `self`. The column is nullable, and the repository
  reads anything other than `self` as `admin`.
- `validatePunchTiming` is the single place a live punch is accepted. It
  refuses before `startsAt` (`race-not-started`), after `endsAt`
  (`race-finished`), and when the runner already holds a non-voided punch for
  the target loop (`already-punched-this-loop`).
- One punch per runner and loop is held by that check rather than by the
  database. Aurora DSQL takes neither the partial unique index nor the foreign
  keys, and the schema file records that beside the table.

## Rank

A runner's place in the standings.

Lives in: `api/src/ranking/`

- Runners still in the race come before runners who are out.
- Within a tier, a deeper last valid loop ranks higher. At equal depth, the
  earlier `lastFinishedAt` ranks higher, and a runner with no punch at all
  sorts after everyone who has one.
- Two runners on the same loop with the same finish millisecond both carry
  `rank: 'ex-aequo'` in place of a number.

## Runner

A person entered in one edition. The runners of one edition are its roster.

Lives in: `api/src/runner/`

- A runner belongs to exactly one edition: `runners` has a composite primary
  key on `(edition_slug, slug)`, and `createRunner` refuses a slug the edition
  already carries.
- `edition_slug`, `slug` and `display_name` are not null. `photo_key` and
  `bib` are nullable.
- `slugifyDisplayName` builds the default slug: lower case, accents stripped,
  runs of other characters folded to a dash, edge dashes trimmed, cut to 64
  characters.
- `validateRunnerDraft` rejects a slug with a leading or trailing dash, which
  the slug pattern on its own accepts.
- The shape the front receives adds `photoUrl`, composed from `photoKey` and
  the photos CDN host. It is null when either of the two is missing.

## Runner status

Whether a runner is still in the race, and which loop the answer refers to.

Lives in: `api/src/ranking/`

- Two shapes: `{ kind: 'in-race', lastLoop }` and
  `{ kind: 'dnf', outAtLoop, reason }`.
- A runner is in-race when their valid punches run unbroken up to the loop
  that should be closed, and no manual did-not-finish row names them.
- The count of consecutive loops starts at 1 and stops at the first gap, so
  punches after a missed loop do not raise it.

## Self-punch

A punch a runner records from their own phone.

Lives in: `api/src/punch/`

- `POST /api/self-punches` carries no admin session on purpose. The file
  header names the geofence as the barrier and the spec question that accepted
  identity by self-selection.
- The body may carry latitude, longitude and accuracy, each nullable, with
  latitude bounded to ±90 and longitude to ±180.
- When both coordinates are present, the service records
  `distanceFromCenterM`, the great-circle distance from the track's start
  point. The row is written with `source` `self` and the request's user agent.
- Timing is decided by the same `validatePunchTiming` as an organiser's punch.

## Slug

The lower-case identifier an edition or a runner is addressed by.

Lives in: `api/src/edition/` for the edition slug, `api/src/runner/` for the
runner slug

- Both accept lower-case letters, digits and dashes only. An edition slug is 3
  to 64 characters, a runner slug 2 to 64.
- `editionSlugSchema` is declared once and imported by the punch and runner
  slices rather than restated.
- The edition slug is the primary key and never changes: the update payload
  omits it and takes it from the URL path.

## Standings

The whole field, ranked, at one moment.

Lives in: `api/src/ranking/`

- `computeStandings` takes the edition, the runners, the punches, the manual
  did-not-finish rows and `now`, and reads nothing else.
- Voided punches are filtered out before anything is computed.
- `raceEnded` is true when `now` is at or past `endsAt`, or when at most one
  runner is still in-race.
- The payload carries `computedAt`, the ranked list and the edition's fastest
  lap.
- Two CSV exports read the same standings: one row per runner, and one column
  per loop.

## Sunrise and sunset

The two daylight markers stored on the edition and shown against the loops.

Lives in: `api/src/helpers/sun/`

- Computed from the track's start coordinates and the start date, using the
  standard 90.833° zenith, which already folds in the solar disc and
  refraction.
- Recomputed whenever an edition in `setup` has its start moved or its GPX
  replaced.
- A place and date with no sunrise or no sunset raises `SunCalculationError`,
  which the edition endpoints answer as a 400.

## Void

Marking a punch as no longer counting, while keeping the row.

Lives in: `api/src/punch/`

- `voidPunch` stamps `voided_at` and leaves everything else in place.
- Every projection filters on `voidedAt === null` before counting anything.
- Voiding is what lets a runner be punched again for the same loop, which is
  why one punch per runner and loop is an application rule rather than a
  database constraint.

## Words we do not use

- **Race** for a specific event. One running is an **edition**; `race` is the
  general word, and survives only in `RaceEdition` and in the punch rejection
  reasons `race-not-started` and `race-finished`.
- **Lap** for the unit of the race. The unit is a **loop**. The word `lap`
  survives in `fastestLap` and in the per-loop CSV export, which is a known
  split rather than a distinction.
- **Boucle**, **dossard**, **orga**, **pointage**. Write **loop**, **bib**,
  **organiser** and **punch**. French belongs in `fr.json`, not in an
  identifier.
- **Scan**, **checkpoint**, **chip read**, **timing**. The record is a
  **punch**, and the act is punching.
- **Delete a punch**. A punch is **voided**, which keeps the row and stops it
  counting.
- **Eliminated**, **dropped**, **abandoned**. The state is **did not finish**
  on the back end, and the front end says **out** to the reader.
- **Leaderboard** on the back end. The ranked field is the **standings**;
  `Leaderboard` is the name of the front-end component that draws it.
- **Athlete**, **participant**, **competitor**, **user**. A person entered in
  an edition is a **runner**. A person logged into the admin screen is an
  **admin**.
- **Name** and **id** for a runner. The two fields are **displayName**, what a
  reader sees, and **slug**, what a URL and a foreign reference carry.
- **Interval** on its own for the race cadence. The column is
  `intervalMinutes`, and the moment it produces is an **hourly top**.
- **Trace** for the course. The uploaded file is the **GPX**, and what it
  yields is the **track**.
