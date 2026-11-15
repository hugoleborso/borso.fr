# Invariants of borsouvertures, in `site/src/decks`

The rules the terms of [the vocabulary](../../../VOCABULARY.md) hold in this folder,
and the tests that hold them. A `Held by` path is relative to `apps/borsouvertures/`.

## Card

- `Card` is a union discriminated by `kind`: `move`, `name` and `trap`. Every
  member carries a `cardId` and a `deckId`, and all three are scheduled alike.
- A name card shows the position at the end of the shortest line of
  `openings.json` with one name of `content/name-cards.json`, and offers four
  names, the right one once. Its id is `name:<positionKey>`, and every name card
  sits in the deck `opening-names`. Picking the right name recalls it.
- A trap card plays the opponent's move, then asks the reader for every reader
  move of the solution. Its id is `trap:<puzzleId>`, and it sits in the deck
  whose `trapFilter` matched. Any move off the solution misses it.
- "Puzzle" names only the Lichess source row (`PuzzleRow`, `puzzleId`), which
  `build:traps` filters into `content/traps.json`. In the app the unit is a trap
  card.
- A move card's id is `move:<deckId>:<positionKey>`, built by `buildMoveCardId`.
  The id is the position and not the line, so editing the later moves of a line
  keeps the earlier ids and their history.
- A position two decks of one side share is one card, owned by the deck with
  the lower `order`. A personal deck is outside that rule: its card at a
  position a file deck also holds is a card of its own.
- A move card of a personal deck carries `dueFromDay`, the day after its line
  was added. Until it is first reviewed it is due from that day, outside the new
  card limit, and the deck page can review it ahead before.
- `isExpectedMove` accepts the move a card or a trap step expects. A board
  drop names no promotion piece, so a move of four characters matches a
  promotion on its two squares.

Held by: `site/src/decks/card.core.test.ts` › accepts a board drop on the two squares of a promotion, and only the book piece when one is named

## Idea

- An idea is keyed by the position key after the reader's move, so two paths
  that transpose share one text.
- Every reader move of every line has an idea in English and in French, of 280
  characters at most. The build fails otherwise.
- Ideas are content and stay out of the i18n catalogues. `selectIdeaText` picks
  the French text for a French interface and the English text for any other.
- A file based on Wikipedia carries its source, and the session shows the
  credit under each of its ideas.
- A personal deck has no written idea. Each reader move shows the name of its
  line in its place, with the source `opening-name`, under the title
  "Opening".

## Ply

- The index of a ply in a line is what `formatMoveNotation` numbers: an even
  index is a White move, `1. e4`, and an odd one a Black move, `1... c5`.
