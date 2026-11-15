# Invariants of pragma, in `api/src/studies`

The rules the terms of [the vocabulary](../../../VOCABULARY.md) hold in this folder,
and the tests that hold them. A `Held by` path is relative to `apps/pragma/`.

## Study

- Keyed on member, song, instrument and `studied_on`. The rows logged before
  the song page's **Practised** toggle was removed stay as history and keep
  counting in the **flame**, so no member lost a flame to the change.
- The songs a member has to learn are the **To learn** filter of the Songs
  tab: their study queue, one row per song, ready songs left out
  (`selectSongsToLearn`). The Studies page this replaced is gone.
- Deleted with its song or its member.

Held by: `api/src/streaks/streaks.controller.test.ts` › keeps counting a study logged before presences replaced it
Held by: `api/src/studies/studies.controller.test.ts` › removes studies and score history with the member

## Concert readiness

- The next concert is the earliest concert strictly after now; its songs
  are those of every setlist linked to it, counted once.
- A song is ready when, for every lineup it is played with in those
  setlists, each member and instrument has a score and the mean is 7 or
  more. One member with nothing recorded keeps the song not ready.

Held by: `api/src/studies/concert-readiness.core.test.ts` › is ready when the lineup mean is exactly the threshold
Held by: `api/src/studies/concert-readiness.core.test.ts` › is not ready with one silent player even when the others would carry the mean
Held by: `api/src/studies/studies.controller.test.ts` › counts the songs of every setlist linked to the next concert, once each
