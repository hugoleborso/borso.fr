# Invariants of pragma, in `api/src/studies`

The rules the terms of [the vocabulary](../../../VOCABULARY.md) hold in this folder,
and the tests that hold them. A `Held by` path is relative to `apps/pragma/`.

## Study queue

- The songs a member has to learn are the **To learn** filter of the Songs
  tab: their study queue, one row per song, ready songs left out
  (`selectSongsToLearn`). It is read from mastery scores and lineups only.
- No code reads or writes the `study` table. It stays in the database
  until the operator decides to drop it.

Held by: `api/src/studies/study-queue.core.test.ts` › lists one row per instrument I hold, not-ready first, then lowest score, then title
Held by: `site/src/routes/catalog/catalog-page.core.test.ts` › leaves out a ready song, a song no longer in the catalogue and a song the search misses

## Concert readiness

- The next concert is the earliest concert strictly after now; its songs
  are those of every setlist linked to it, counted once.
- A song is ready when, for every lineup it is played with in those
  setlists, each member and instrument has a score and the mean is 7 or
  more. One member with nothing recorded keeps the song not ready.

Held by: `api/src/studies/concert-readiness.core.test.ts` › is ready when the lineup mean is exactly the threshold
Held by: `api/src/studies/concert-readiness.core.test.ts` › is not ready with one silent player even when the others would carry the mean
Held by: `api/src/studies/studies.controller.test.ts` › counts the songs of every setlist linked to the next concert, once each
