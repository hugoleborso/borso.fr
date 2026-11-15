# Invariants of pragma, in `api/src/streaks`

The rules the terms of [the vocabulary](../../../VOCABULARY.md) hold in this folder,
and the tests that hold them. A `Held by` path is relative to `apps/pragma/`.

## Streak

- `GET /api/streaks` answers today, my flame and the band's, and nothing per
  member: every member counts the same session days, so every member's
  flame is the same.
- Reading the streaks writes nothing. Opening the app does not light a day.

Held by: `api/src/streaks/streaks.controller.test.ts` › leaves today open when the member opens the app on a day with no session
Held by: `api/src/streaks/streaks.controller.test.ts` › counts today for me and the band when a %s is dated today
