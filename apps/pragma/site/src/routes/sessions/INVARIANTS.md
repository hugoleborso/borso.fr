# Invariants — pragma, `site/src/routes/sessions`

The rules the terms of [the vocabulary](../../../../VOCABULARY.md) hold in this folder,
and the tests that hold them. A `Held by` path is relative to `apps/pragma/`.

## Practice mode

- Offered only for a practice, on its own calendar day in Paris, once its
  setlists hold a song (`isPracticeModeOffered`). A session has a date and
  no end time, so a practice running past midnight loses the mode the
  next day.
- The songs follow the session's setlists in their order, then each
  entry's position (`buildPracticeSongs`).
- The current song is held on each device, in local storage under the
  session, never on the server: two phones in the same practice move
  independently. A position stored on another day is ignored, and when
  the stored song has left the setlist the following one becomes current
  (`resolvePracticeIndex`).
- Moving between songs writes nothing to the server. A take recorded here
  carries the current song and the practice, as any take does; the quick
  note writes the current setlist entry's note.

Held by: `site/src/routes/sessions/practice-mode.core.test.ts` › makes the following song current when the stored one was removed
Held by: `site/src/routes/sessions/PracticeModePage.test.tsx` › starts on the first song, and Next song moves on without writing to the server
