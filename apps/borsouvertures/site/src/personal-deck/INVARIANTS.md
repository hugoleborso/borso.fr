# Invariants of borsouvertures, in `site/src/personal-deck`

The rules the terms of [the vocabulary](../../../VOCABULARY.md) hold in this folder,
and the tests that hold them. A `Held by` path is relative to `apps/borsouvertures/`.

## Personal deck

- `replayPersonalLines` replays the deck line events in time order, then by id.
  `checkLineAdd` refuses a line that holds no move of the reader
  (`no-reader-move`), that the deck already holds whole or as the start of a
  longer line (`already-in-deck`), or that gives the reader a second move at a
  position of the deck, by position key (`conflicts`). A line that extends
  another replaces it. The same check runs on replay, so two devices agree.
- `buildPersonalDecks` builds `my-lines-white` and `my-lines-black`, each only
  when it holds a line, after the file decks. Their move cards are ids
  `move:my-lines-<side>:<positionKey>`, scheduled like any card, and they count
  in retention, the streak, the daily plan and Stats.
- A line is named by its opening name, numbered when two share one, or by its
  moves when it reached no named opening.
- A reader removes a line from its step-through view on the deck page.

Held by: `site/src/personal-deck/personal-deck.core.test.ts` › refuses a line where the reader has another move at a position of the deck
Held by: `site/src/routes/OpeningTrainerPage.explorer.test.tsx` › adds a line to My lines, refuses it a second time, shows it on Decks and removes it
