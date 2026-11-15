# Invariants — borsouvertures, `site/src/explorer`

The rules the terms of [the vocabulary](../../../VOCABULARY.md) hold in this folder,
and the tests that hold them. A `Held by` path is relative to `apps/borsouvertures/`.

## Book

- `flattenExplorerLines` turns the dataset into one `ExplorerLine` per line,
  with its opening name, variation name, line name and UCI moves.
- A line is in the book of a position when its moves start with the moves
  played. A position reached by another move order is not matched: the
  explorer follows move orders, not position keys.
- The position is out of book when no line starts with the moves played. The
  screen says so and keeps the name of the last named position.

## Book move

- `selectExplorerPosition` gives one `ExplorerCandidate` per distinct next move,
  with its SAN, the position after it, the number of lines through it, the name
  of the line that ends right after it, and whether the book goes on.
- Each candidate carries a level, the first of `opening`, `variation` and
  `line` at which the lines through it still differ, and the names at that
  level, most lines first. The list groups candidates by level, openings first,
  so the reader sees what a move leads to at the coarsest level that still
  tells the moves apart.
- A variation name reads `Family: Variation`, and the variation `Main Line`
  reads as the opening's name.
- The board draws every book move as an arrow.

Held by: `site/src/explorer/explorer.core.test.ts` › shows variations once one opening is reached, then lines once one variation is
