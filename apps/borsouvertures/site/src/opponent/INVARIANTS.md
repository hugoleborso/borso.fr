# Invariants — borsouvertures, `site/src/opponent`

The rules the terms of [the vocabulary](../../../VOCABULARY.md) hold in this folder,
and the tests that hold them. A `Held by` path is relative to `apps/borsouvertures/`.

## Auto opponent

- `pickRandomCandidate` reads `Math.random` and `scheduleTimeoutCallback` reads
  `setTimeout`. Both are injected as options, so a test drives the machine with
  no clock and no randomness.
- The move source is `book` while the moves played are the start of a deck line
  that still has a move, and the reply comes after 450 ms. From the first
  position with no such move the source is `stockfish`, for the rest of the
  game, and `opponent_left_deck` is recorded once.
- The book reply is weighted by the deck's lines. `listNextBookMoves` lists the
  next move once per line still open, and the uniform pick over that list makes
  a move twice as likely when twice as many lines go through it. In the Albin
  deck 2. c4 comes up 7 times in 13.
- When the reader's own move leaves the deck at a position where the deck has a
  reader move, `missedBookMove` keeps that deck move's notation for the rest of
  the game, and the status band names it in place of the move source.
- The `stockfish` source is the vendored worker, started by
  `site/src/opponent/stockfish.adapter.ts` when a game starts and stopped when
  it ends. The evaluation bar shares that worker through the adapter's queue,
  from the one client in `site/src/opponent/stockfish-client.setup.ts`. It
  searches 400 ms a move. No answer to `uci` within 10 s raises
  `StockfishLoadFailedError`, and the game then ends where the deck ends. A
  move the board refuses raises `StockfishIllegalMoveError`.
- The strength is one of ten steps in
  `site/src/opponent/opponent-strength.core.ts`, persisted as
  `opponentStrength`. Three easier steps set `Skill Level` 0, 3 and 6 and show
  no rating. Seven set `UCI_Elo` 1320, 1500, 1700, 1900, 2000, 2200 and 2500.
  The default is 2000.
  A step sends one option family, never both.
- A game on a deck page stores no review event.

Held by: `site/src/opponent/deck-game-machine.utils.test.ts` › asks Stockfish for the move at the stored strength when the line ends
Held by: `site/src/components/organisms/DeckGame.test.tsx` › stores no review, so the counts on Today stay as they were
Held by: `site/src/opponent/deck-game-machine.utils.test.ts` › names the deck move the reader missed, and keeps it for the rest of the game
Held by: `site/src/opponent/deck-game-machine.utils.test.ts` › weighs the book pick by the lines through each move: 2. c4 in 7 of the 13 Albin lines

## Evaluation bar

- An **evaluation** is a `StockfishEvaluation`, read from White's side
  whoever is to move. It is `centipawns`, or `mate` with the winner and the
  number of moves, 0 when the side to move is already mated.
- Each position is searched to depth 14 and for 500 ms at most, with the
  strength limit lifted, and the reading is cached by position key.
- The bar shows in Explore, the line stepper and the deck game, never in a
  review, and the `isEvaluationBarShown` setting hides it everywhere.
- The bar shares the deck game's worker. When that worker cannot load, the bar
  turns invisible in its place and nothing is reported.

Held by: `site/src/opponent/stockfish-evaluation.core.test.ts` › lifts every strength limit, then searches 14 plies deep for 500 ms at most
Held by: `site/src/opponent/stockfish.adapter.test.ts` › waits for the move search ahead of it, on the same worker
Held by: `site/src/opponent/stockfish.adapter.test.ts` › stops a running search when its position is left, and hands back nothing
Held by: `site/src/components/organisms/DeckGame.test.tsx` › evaluates each position of the game on the same worker, and draws the bar beside the board
Held by: `site/src/components/organisms/DeckGame.test.tsx` › hides the bar quietly, with no report, when the worker cannot load
