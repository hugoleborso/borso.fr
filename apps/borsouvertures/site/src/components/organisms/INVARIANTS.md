# Invariants of borsouvertures, in `site/src/components/organisms`

The rules the terms of [the vocabulary](../../../../VOCABULARY.md) hold in this folder,
and the tests that hold them. A `Held by` path is relative to `apps/borsouvertures/`.

## Explore

- The board takes a tap on a book move in the list or any legal move dropped on
  it. Back takes one move off, and start over clears them. The moves played stay
  while the reader visits another tab.
- The heading is the name of the last named position along the moves played, or
  "No named opening yet".
- The side toggle turns the board and is the side a line is added for.
- *Add to my deck* writes a `line-added` event for the moves played. It is off
  at the start and when "My lines" already holds the line, and it answers with a
  notice when it refuses one.
- Nothing done in Explore stores a review event.

Held by: `site/src/routes/OpeningTrainerPage.test.tsx` › leaves the due and new counts unchanged after time spent in Explore
Held by: `site/src/routes/OpeningTrainerPage.explorer.test.tsx` › adds a line to My lines, refuses it a second time, shows it on Decks and removes it

## Session

- A session asks a list of cards fixed at its start. Today's session asks the
  daily plan, and a deck's session asks that deck's share of it.
- `useSessionStart` runs the machine's `start` inside `useState`'s lazy
  initialiser, which React calls once per mount and before the first paint.
