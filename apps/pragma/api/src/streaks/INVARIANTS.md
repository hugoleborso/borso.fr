# Invariants of pragma, in `api/src/streaks`

The rules the terms of [the vocabulary](../../../VOCABULARY.md) hold in this folder,
and the tests that hold them. A `Held by` path is relative to `apps/pragma/`.

## Streak

- The `streak-reminder` job runs at 20:00 `Europe/Paris` in production only.
  A member whose day has not counted gets at most one push that day, claimed
  on the group key `streak:<memberId>:<day>`.

Held by: `api/src/streaks/streaks.controller.test.ts` › counts today after a study and drops it after the undo
Held by: `api/src/streaks/streak-reminder.service.test.ts` › sends one push per open member and claims each group once when run twice
