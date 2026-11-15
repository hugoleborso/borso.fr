# Invariants — borsouvertures, `content/decks`

The rules the terms of [the vocabulary](../../VOCABULARY.md) hold in this folder,
and the tests that hold them. A `Held by` path is relative to `apps/borsouvertures/`.

## Deck

- A deck is one folder: `deck.json`, `ideas.en.md` and `ideas.fr.md`. The build
  finds decks by listing the folders, so adding or removing one needs no code
  change.
- A position where the reader moves has exactly one reader move across the
  whole deck. The opponent may have several moves from one position, and that
  is what makes lines.
- `order` decides which deck owns a position two decks share, and the order new
  cards are introduced in.
- The build writes every deck into `site/public/decks.json`, which the site
  fetches once per page load. A deck that fails to parse there raises
  `DeckContentInvalidError`.
- The Lines tab of a deck page steps through one line on the board.
  `listLineSteps` gives one step per ply, with the position after it, the
  piece, its squares, the kind of move and, for a reader move only, its idea.
  `moveLineStepPosition` keeps the position between 0, the starting position,
  and the ply count.

Held by: `scripts/decks/deck-build.core.test.ts` › rule 4 refuses two reader moves from one position
Held by: `site/src/decks/line-stepper.utils.test.ts` › stays inside the line at both ends
