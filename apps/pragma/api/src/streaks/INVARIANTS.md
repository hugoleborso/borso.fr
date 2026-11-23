# Invariants of pragma, in `api/src/streaks`

The rules the terms of [the vocabulary](../../../VOCABULARY.md) hold in this folder,
and the tests that hold them. A `Held by` path is relative to `apps/pragma/`.

## Presence

- Keyed on member and `present_on`, so every later opening of the same day
  adds no row (`INSERT … ON CONFLICT DO NOTHING`).
- Written by the two reads every opening of the app makes, `GET /api/me`
  (the app shell) and `GET /api/streaks` (Home), before they answer, so the
  flame Home shows already counts today. An assistant's `get_me` writes
  none: a tool call is not the member opening the app.
- Deleted with its member.

Held by: `api/src/streaks/streaks.controller.test.ts` › counts today once the member opens the app, with one presence for the day
Held by: `api/src/streaks/streaks.controller.test.ts` › records the opening of the app from the signed-in member read
Held by: `api/src/streaks/streaks.controller.test.ts` › removes the presences of a deleted member
Held by: `api/src/me/me-tools.controller.test.ts` › reads the flames in get_me, and an assistant read does not light the member’s day

## Streak

- The `streak-reminder` job runs at 20:00 `Europe/Paris` in production only.
  A member whose day has not counted gets at most one push that day, claimed
  on the group key `streak:<memberId>:<day>`.
- The at-risk push names what a missed day costs. With a joker left it is
  `streak-at-risk` and says how many jokers will be left after tonight.
  With none left it is `streak-at-risk-last` and says the flame goes out at
  midnight.
- `GET /api/streaks` returns the week of each flame. An assistant's
  `get_me` does not: its projection keeps the count, today and the jokers.

Held by: `api/src/streaks/streaks.controller.test.ts` › counts today once the member opens the app, with one presence for the day
Held by: `api/src/streaks/streak-reminder.service.test.ts` › sends one push per open member and claims each group once when run twice
Held by: `api/src/streaks/streak-reminder.core.test.ts` › warns a member whose open flame is above 2 days that tonight costs a joker
Held by: `api/src/streaks/streak-reminder.core.test.ts` › warns a member with no joker left that the flame goes out at midnight
Held by: `api/src/streaks/streaks.core.test.ts` › keeps both flames and each member’s count, without ids or colours
