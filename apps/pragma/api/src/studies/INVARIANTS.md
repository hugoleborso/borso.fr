# Invariants — pragma, `api/src/studies`

The rules the terms of [the vocabulary](../../../VOCABULARY.md) hold in this folder,
and the tests that hold them. A `Held by` path is relative to `apps/pragma/`.

## Study

- Keyed on member, song, instrument and `studied_on`, so a second tap on the
  same day changes nothing.
- `studied_on` is the calendar day in `Europe/Paris` of the server clock
  (`parisCalendarDay`). The request carries no date, so a study cannot be
  back-dated, and only a study of today can be undone.
- Accepted only for an instrument the member holds in the song's default
  lineup or in a lineup override of one of its setlist entries.
- A study never changes a score; the two are separate writes.
- Logged from the song page's **Practised**, once per instrument the member
  holds on the song. The songs a member has to learn are the **To learn**
  filter of the Songs tab: their study queue, one row per song, ready songs
  left out (`selectSongsToLearn`). The Studies page this replaced is gone.
- A study names only a song and an instrument that still exist: the write
  claims both rows, reads the lineups and inserts in one retried
  transaction, and is refused with `song-not-found` or
  `instrument-not-found` when a claim finds no row.

Held by: `api/src/studies/studies.controller.test.ts` › logs a study once per day
Held by: `api/src/studies/studies.controller.test.ts` › refuses a body carrying a date, so a study cannot be back-dated
Held by: `api/src/studies/studies.controller.test.ts` › refuses to undo a study of yesterday
Held by: `api/src/studies/studies.controller.test.ts` › accepts an instrument held only through a setlist lineup override
Held by: `api/src/studies/studies.controller.test.ts` › refuses an instrument the member does not hold in the song lineup
Held by: `api/src/studies/studies.controller.test.ts` › refuses a study of a song deleted while the study was being written
Held by: `api/src/studies/studies.controller.test.ts` › refuses a study on an instrument deleted while the study was being written
Held by: `api/src/studies/studies.controller.test.ts` › logs the study once when its first commit loses a conflict on the claimed song

## Concert readiness

- The next concert is the earliest concert strictly after now; its songs
  are those of every setlist linked to it, counted once.
- A song is ready when, for every lineup it is played with in those
  setlists, each member and instrument has a score and the mean is 7 or
  more. One member with nothing recorded keeps the song not ready.

Held by: `api/src/studies/concert-readiness.core.test.ts` › is ready when the lineup mean is exactly the threshold
Held by: `api/src/studies/concert-readiness.core.test.ts` › is not ready with one silent player even when the others would carry the mean
Held by: `api/src/studies/studies.controller.test.ts` › counts the songs of every setlist linked to the next concert, once each
