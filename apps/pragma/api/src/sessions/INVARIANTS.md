# Invariants of pragma, in `api/src/sessions`

The rules the terms of [the vocabulary](../../../VOCABULARY.md) hold in this folder,
and the tests that hold them. A `Held by` path is relative to `apps/pragma/`.

## Concert

- A row in `session` whose `kind` is `concert`.
- Carries `venue` (1 to 256 characters), `capacity` (0 to 100 000) and
  `friendsCountPerMember`, a map from member id to a count between 0 and
  1 000. Its gear is a list of gear items under `api/src/gear-items/`. The
  `gear` text column stays in the table, because DSQL refuses `DROP
  COLUMN`, and no code reads or writes it.
- `concertCreateSchema` is `.strict()`, so a body carrying a practice-only
  key is rejected at the controller.
- A concert is upcoming when its date is strictly after now
  (`selectUpcomingConcerts` in `domain/upcoming-concerts.core.ts`).

Held by: `api/src/sessions/sessions.schema.test.ts` › refuses a field it does not own, rather than dropping it silently
Held by: `api/src/sessions/sessions.schema.test.ts` › refuses a capacity outside what a room can hold
Held by: `api/src/sessions/sessions.schema.test.ts` › refuses the free-text gear the gear checklist replaced
Held by: `domain/upcoming-concerts.core.test.ts` › treats a concert starting exactly now as already started

## Practice

- A row in `session` whose `kind` is `practice`.
- Carries `preparedConcertId`, which may be null, and `origin`, which is
  `free_slot` for a practice booked from a free slot and null otherwise
  (`SESSION_ORIGINS`). Nothing else beyond the shared columns.
- `practiceCreateSchema` is `.strict()`, so a body carrying a concert-only
  key is rejected at the controller.

Held by: `api/src/sessions/sessions.schema.test.ts` › refuses a venue, which belongs to the other kind
Held by: `api/src/sessions/sessions.controller.test.ts` › moves a practice onto another concert it prepares

## Session

- One table for both kinds, keyed on the `kind` column. `kind` and `date`
  are `NOT NULL`.
- The API validates the body as a discriminated union on `kind`, so a
  concert and a practice cannot borrow each other's columns.
- The API lists sessions with the coming ones first, nearest at the top,
  then the past ones, newest first (`orderSessionsForListing` in
  `domain/session-schedule.core.ts`). The Sessions screen shows one side at
  a time: the coming ones nearest first (`selectComingSessions`) or the past
  ones newest first (`selectPastSessions`). A session is still coming for the
  whole of its calendar day in the band's time zone, so a practice that
  started this morning stays the next session until midnight in Paris
  (`selectNextSession`, which Home reads).
- Deleting a session detaches the setlists it carried and keeps them
  (`deleteSessionWithCascade`). Another session may be playing the same
  one, and the setlists index holds it either way. It also keeps the takes
  recorded in it and clears their `session_id`, and keeps the tasks
  naming it and clears theirs.
- The session page shows, in order, a preview of each setlist (count,
  total time, the first three songs with their lineup, never their key),
  **Who does what** (the tasks naming the session), and the takes recorded
  at it grouped by song.

Held by: `api/src/sessions/sessions.controller.test.ts` › lists coming sessions first, nearest at the top, then past ones
Held by: `domain/session-schedule.core.test.ts` › keeps a session from earlier today as the next one until midnight
Held by: `domain/session-schedule.core.test.ts` › keeps the sessions of past days, newest first
Held by: `api/src/sessions/sessions.controller.test.ts` › rejects a payload that mixes concert-only with practice-only fields
Held by: `api/src/sessions/sessions.controller.test.ts` › detaches the setlists on session delete, and keeps them
Held by: `api/src/takes/takes.controller.test.ts` › deleting the session keeps its takes and clears their session
