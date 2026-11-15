# Invariants — borsouvertures, `site/src/review`

The rules the terms of [the vocabulary](../../../VOCABULARY.md) hold in this folder,
and the tests that hold them. A `Held by` path is relative to `apps/borsouvertures/`.

## Daily plan

- `buildDailyPlan` puts due cards first, by due instant then by id. New cards
  follow in the order `listDeckCards` gives: deck `order`, then line order, then
  ply order, with one name card slipped in after every four deck cards.
- A card of a personal deck never seen is due from its `dueFromDay` and is
  never one of the new cards.
- New cards stop at `newCardsPerDay` minus the cards already introduced today.
  The setting is 10 by default, 0 to 30, and is kept on the device.
- The plan is derived from the review log at each render and is never stored.

Held by: `site/src/review/daily-plan.core.test.ts` › takes the cards introduced today off the limit
Held by: `site/src/review/daily-plan.core.test.ts` › come up from the day after the line was added, outside the new card limit

## Due

- A card is due on a calendar day and not at an instant. Its `dueAt` is turned
  into the device's calendar day and compared with today.
- `dueAt` comes from replaying the card's review events through `ts-fsrs` with
  the pinned `SCHEDULER_CONFIGURATION`, fuzz off, so two devices holding the
  same events agree.

Held by: `site/src/review/daily-plan.core.test.ts` › counts a card as due on the calendar day of the device, not at the instant

## New

- A card stops being new at its first review, on any device. The day of that
  first review is the day it counts against `newCardsPerDay`.

Held by: `site/src/review/daily-plan.core.test.ts` › counts a card on the day of its first review only, whichever device made it

## Retention

- A review counts only when the card had been seen before and was due. The
  first review of a new card and a review made ahead of its day count for
  nothing.
- A card was due when the stamped days between its previous review and this one
  cover the interval the scheduler gave. Each review keeps the calendar day of
  the device that made it.
- `projectDeckRetention` groups the due reviews by deck and by week. A week
  starts on the Monday of the review's calendar day.
- Today shows the last 30 days per deck, and Stats the last 12 weeks. A week
  with no due review is drawn as empty, never as 0%.
- It is derived from the review log at each render and is never stored.

Held by: `site/src/review/retention.core.test.ts` › leaves retention unchanged for a review of a card that is not due

## Review

- A review is the event, a session in review mode is the run of them. Today's
  session asks the daily plan, and a deck's session asks that deck's share of
  it, or its already seen cards ahead of their day when the plan holds none.
- The session ends with the share recalled on the first try and tomorrow's due
  count.

Held by: `site/src/routes/OpeningTrainerPage.test.tsx` › recalls a card and shows its idea, misses a card through Show the move, and ends with the recalled share

## Streak

- `countStreakDays` reads the calendar day stamped on each review event and
  nothing else, so the streak is the same on every device holding the same
  events.
- A streak whose last review was yesterday still stands, because today is not
  over. One whose last review was two days ago is 0.

Held by: `site/src/review/streak.core.test.ts` › reads the stamped day across a time-zone change, not the instant
