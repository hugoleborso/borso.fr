# Invariants of pragma, in `site/src/routes/home`

The rules the terms of [the vocabulary](../../../../VOCABULARY.md) hold in this folder,
and the tests that hold them. A `Held by` path is relative to `apps/pragma/`.

## Home

- The next session is the earliest one whose calendar day in Paris is
  today or later (`selectNextSession` in `domain/session-schedule.core.ts`),
  practice or concert alike.
- Its one primary action is **Start the practice** on a practice's own
  day when practice mode is offered; otherwise it opens that session's
  first setlist, or the session when it has none; with no session ahead
  it offers **New session**.
- The member's open tasks list the ones naming the next session first.
Held by: `site/src/routes/home/home.core.test.ts` › lists the songs where the member plays, an override included, with the instruments
Held by: `site/src/routes/home/HomePage.test.tsx` › shows an empty state with New session when no session is ahead
