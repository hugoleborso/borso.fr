# Vocabulary — last-loop-lepin

The application runs a backyard-ultra style race: the whole field sets off on
the same loop at every hourly top, and anyone who is not back before the next
top is out. Three groups use it. Organisers prepare the race and record the
loops from an admin screen, runners can confirm their own loop from their
phone, and spectators follow the standings live. This page fixes the words for
the things the code handles, so a name chosen while writing matches the name
already in the tree.

The rules each term holds, and the tests that hold them, sit beside the code
in the `INVARIANTS.md` its `Invariants:` line names. The repository's own
words are in [`docs/VOCABULARY.md`](../../docs/VOCABULARY.md).

## Admin session

An organiser's logged-in session, held on the server and referenced by an
opaque cookie value.

Lives in: `api/src/auth/`

Invariants: `api/src/auth/INVARIANTS.md`

## Bib

The number pinned to a runner, which is how organisers and screens pick them
out on race day.

Lives in: `api/src/runner/`

Invariants: `api/src/runner/INVARIANTS.md`

Not to be confused with: the slug, which is the identifier used in URLs and in
every reference from another table.

## Catch-up punch

A punch the organisers add after the fact, for a loop a runner ran but nobody
recorded.

Lives in: `api/src/punch/`

Invariants: `api/src/punch/INVARIANTS.md`

## Corral

The waiting area where a runner who has finished their loop early stands until
the next hourly top.

Lives in: `api/src/punch/`, where the rule it explains sits in `punch.core.ts`

Invariants: `api/src/punch/INVARIANTS.md`

## Correction

An edit an organiser makes to a punch's finishing instant after it was
recorded.

Lives in: `api/src/punch/`

Invariants: `api/src/punch/INVARIANTS.md`

Not to be confused with: a void, which keeps the punch but stops it counting.

## Did not finish

A runner who is out of the race, either because the organisers recorded it or
because they missed a loop.

Lives in: `api/src/punch/`

Invariants: `api/src/punch/INVARIANTS.md`

## Edition

One running of the race: one day, one track, one field of runners.

Lives in: `api/src/edition/`

Invariants: `api/src/edition/INVARIANTS.md`

## Edition status

Where an edition sits between being prepared and being over.

Lives in: `api/src/edition/`

Invariants: `api/src/edition/INVARIANTS.md`

## Fastest lap

The shortest single loop of the whole edition.

Lives in: `api/src/ranking/`

Invariants: `api/src/ranking/INVARIANTS.md`

## GPX track

The course file the organisers upload, and the distance, climb and coordinates
derived from it.

Lives in: `api/src/helpers/gpx/`, stored on the edition by `api/src/edition/`

Invariants: `api/src/helpers/gpx/INVARIANTS.md`

## Hourly top

The moment a loop starts: `startsAt` plus a whole number of intervals.

Lives in: `api/src/edition/`

Invariants: `api/src/edition/INVARIANTS.md`

## Loop

One circuit of the track, run by the whole field between two hourly tops.

Lives in: `api/src/edition/`

Invariants: `api/src/edition/INVARIANTS.md`

Not to be confused with: a punch, which is the record that one runner closed
one loop. A loop exists whether or not anyone punched it.

## Loop duration

How long a runner took over one loop.

Lives in: `api/src/punch/`

Invariants: `api/src/punch/INVARIANTS.md`

## Loop index

Which loop a punch belongs to.

Lives in: `api/src/punch/`

Invariants: `api/src/punch/INVARIANTS.md`

## Punch

The record that one runner closed one loop, at one instant.

Lives in: `api/src/punch/`

Invariants: `api/src/punch/INVARIANTS.md`

## Rank

A runner's place in the standings.

Lives in: `api/src/ranking/`

Invariants: `api/src/ranking/INVARIANTS.md`

## Runner

A person entered in one edition. The runners of one edition are its roster.

Lives in: `api/src/runner/`

Invariants: `api/src/runner/INVARIANTS.md`

## Runner status

Whether a runner is still in the race, and which loop the answer refers to.

Lives in: `api/src/ranking/`

Invariants: `api/src/ranking/INVARIANTS.md`

## Self-punch

A punch a runner records from their own phone.

Lives in: `api/src/punch/`

Invariants: `api/src/punch/INVARIANTS.md`

## Slug

The lower-case identifier an edition or a runner is addressed by.

Lives in: `api/src/edition/` for the edition slug, `api/src/runner/` for the
runner slug

Invariants: `api/src/edition/INVARIANTS.md`

## Standings

The whole field, ranked, at one moment.

Lives in: `api/src/ranking/`

Invariants: `api/src/ranking/INVARIANTS.md`

## Sunrise and sunset

The two daylight markers stored on the edition and shown against the loops.

Lives in: `api/src/helpers/sun/`

Invariants: `api/src/helpers/sun/INVARIANTS.md`

## Void

Marking a punch as no longer counting, while keeping the row.

Lives in: `api/src/punch/`

Invariants: `api/src/punch/INVARIANTS.md`

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
