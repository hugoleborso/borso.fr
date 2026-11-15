# Vocabulary — borsouvertures

`borsouvertures` is a progressive web app for learning chess openings, with a
small API that syncs one account. It ships hand-written decks that a reader reviews a few cards a day,
on a schedule that asks each card again when it is about to be forgotten. It
also ships a book built from the Lichess `chess-openings` tables, which the
Explore tab opens as a board: the reader plays moves, sees which openings,
variations and lines each book move leads to, and adds a line he likes to his
personal deck, "My lines". The reader's settings live in one localStorage
record. What a reader has reviewed and the lines he added live in two logs of
events in the browser's IndexedDB. Every screen works without the API. The one
account, the owner's, also pushes its events to the API and pulls the events of
its other devices.

This file names the things the application talks about. Use these words in
identifiers, file names, commit messages and specs. Every claim below is taken
from the type, pure helper or machine named beside it.

The rules each term holds, and the tests that hold them, sit beside the code
in the `INVARIANTS.md` its `Invariants:` line names. The repository's own
words are in [`docs/VOCABULARY.md`](../../docs/VOCABULARY.md).

## Account

The one synced identity, the owner's. There is no sign-up and no route that
creates it.

Lives in: `api/src/auth/`, `site/src/lib/queries/account.queries.ts`,
`site/src/review/`

Invariants: `api/src/auth/INVARIANTS.md`

## Auto opponent

The automated reply that answers the reader's move in a game on a deck page. It
has a move source, `book` then `stockfish`.

Lives in: `site/src/opponent/deck-game-machine.utils.ts`, with the randomness
and the timer in `site/src/openings/machineEffects.ts`

Invariants: `site/src/opponent/INVARIANTS.md`

## Board theme

The palette the board is drawn with.

Lives in: `site/src/theme/boardThemes.utils.ts`

Invariants: `site/src/theme/INVARIANTS.md`

Not to be confused with: the persisted field, which is named `boardStyle`. The
two names are the same thing.

## Book

The lines of the openings dataset the explorer matches the moves played
against.

Lives in: `site/src/explorer/explorer.core.ts`

Invariants: `site/src/explorer/INVARIANTS.md`

## Book move

A move the book knows from the position on the board.

Lives in: `site/src/explorer/explorer.core.ts`

Invariants: `site/src/explorer/INVARIANTS.md`

Not to be confused with: a deck's book move, the deck move a card expects or
the auto opponent plays.

## Card

One question the scheduler asks again: a position of a deck where the reader
has exactly one move to play.

Lives in: `site/src/decks/card.core.ts`, with the stored shape in
`site/src/decks/deck.utils.ts`

Invariants: `site/src/decks/INVARIANTS.md`

Not to be confused with: a line, which is a whole move sequence. A line of 18
plies holds nine reader moves, so up to nine cards.

## Daily plan

The cards a reader is asked today: the due cards, then the new cards.

Lives in: `site/src/review/daily-plan.core.ts`

Invariants: `site/src/review/INVARIANTS.md`

## Deck

A hand-written set of lines for one side, with one idea per reader move, that a
reader reviews card by card.

Lives in: `content/decks/`, built by `scripts/decks/deck-build.core.ts` and
read through `site/src/decks/deck.utils.ts`

Invariants: `content/decks/INVARIANTS.md`

Not to be confused with: an opening, which is an entry of the Lichess book that
Explore reads. A deck is content written for this application. A personal deck
is a deck the reader built in Explore, not a content file.

## Deck line event

The immutable record of one line added to or removed from a personal deck.

Lives in: `domain/deck-line-event.core.ts`, stored by
`site/src/personal-deck/deck-line-event-store.adapter.ts`, synced by
`api/src/deck-line-events/`

Invariants: `domain/INVARIANTS.md`

## Due

The state of a card whose scheduled day has come.

Lives in: `site/src/review/daily-plan.core.ts`, with the schedule in
`site/src/review/scheduler.core.ts`

Invariants: `site/src/review/INVARIANTS.md`

## ECO code

The Encyclopaedia of Chess Openings classification the source row carried.

Lives in: `site/src/openings/types.ts`

Invariants: `site/src/openings/INVARIANTS.md`

## Evaluation bar

The thin bar beside a board that shows how Stockfish rates the position, with
White's share filled from White's side and the evaluation written as text.

Lives in: `site/src/opponent/stockfish-evaluation.core.ts`, with the query in
`site/src/lib/queries/stockfish-evaluation.queries.ts` and the bar in
`site/src/components/atoms/EvaluationBar.tsx`

Invariants: `site/src/opponent/INVARIANTS.md`

Not to be confused with: an outcome, which is what a review records. The bar
records nothing.

## Explore

The tab that opens the book as a board the reader plays on. The operator's words
were "an open deck"; the tab keeps its name, because a deck in this file is the
set of cards a reader reviews.

Lives in: `site/src/components/organisms/OpenExplorer.tsx`, with the moves played
in `site/src/explorer/explorer.store.ts`

Invariants: `site/src/components/organisms/INVARIANTS.md`

## Idea

The short text that explains one reader move: which piece goes where, and why.

Lives in: `site/src/decks/idea.utils.ts`, parsed by
`scripts/decks/ideas-markdown.core.ts`

Invariants: `site/src/decks/INVARIANTS.md`

## Line

One row of the source dataset: a named move sequence.

Lives in: `site/src/openings/types.ts`, built by `scripts/build-openings.ts`

Invariants: `site/src/openings/INVARIANTS.md`

Not to be confused with: a variation, which is the group a line belongs to. A
line is always a leaf; a variation never is.

## Move

One ply, written either as UCI or as SAN.

Lives in: `site/src/openings/uciSquare.utils.ts`

Invariants: `site/src/openings/INVARIANTS.md`

## New

The state of a card that has no review event yet.

Lives in: `site/src/review/daily-plan.core.ts`

Invariants: `site/src/review/INVARIANTS.md`

## Opening

A top-level entry of the book: a named family of variations, such as the
Sicilian Defense.

Lives in: `site/src/openings/types.ts`, built by `scripts/build-openings.ts`

Invariants: `site/src/openings/INVARIANTS.md`

## Openings dataset

The book as a file: `openings.json`, shipped twice and read once per page load.

Lives in: `site/src/openings/` (`openings-source.adapter.ts`, `loadOpenings.ts`,
`openingsResource.ts`)

Invariants: `site/src/openings/INVARIANTS.md`

## Outcome

What one review of a card ended in: `recalled` or `missed`.

Lives in: `domain/review-event.core.ts`, decided in
`site/src/review/review-machine.utils.ts`

Invariants: `domain/INVARIANTS.md`

Not to be confused with: out of book, which is the state of a position in
Explore. A review has an outcome, an explored position does not.

## Personal deck

A deck the reader builds in Explore, shown as "My lines", one per side.

Lives in: `site/src/personal-deck/`

Invariants: `site/src/personal-deck/INVARIANTS.md`

Not to be confused with: a deck, which is a content file. The two build the same
`BuiltDeck`.

## Ply

One half-move, by one side.

Lives in: `site/src/decks/card.core.ts`

Invariants: `site/src/decks/INVARIANTS.md`

## Position key

The stored name of a position: the first four fields of its FEN, joined by one
space.

Lives in: `domain/position-key.core.ts`

Invariants: `domain/INVARIANTS.md`

Not to be confused with: a FEN, which is the full six-field string a board is
drawn from.

## Preview

The small static board shown beside a named deck, line or book move.

Lives in: `site/src/openings/previews.utils.ts`

Invariants: `site/src/openings/INVARIANTS.md`

## Retention

The share of due cards recalled on the first try, per deck and per week.

Lives in: `site/src/review/retention.core.ts`

Invariants: `site/src/review/INVARIANTS.md`

Not to be confused with: accuracy, which is the share recalled over every
stored review of a deck, due or not.

## Review

One answer a reader gives to one card.

Lives in: `site/src/review/`

Invariants: `site/src/review/INVARIANTS.md`

## Review event

The immutable record of one review, and the only thing progress is made of.

Lives in: `domain/review-event.core.ts`, stored by
`site/src/review/review-event-store.adapter.ts`

Invariants: `domain/INVARIANTS.md`

## Session

One mounted board asking cards, from the moment its machine starts until the
component unmounts.

Lives in: `site/src/components/organisms/ReviewSession.tsx`, with the mount hook
in `site/src/lib/session-start.hook.ts`

Invariants: `site/src/components/organisms/INVARIANTS.md`

## Side

The colour the reader plays, and therefore the board's orientation.

Lives in: `site/src/state/persistedState.utils.ts`

Invariants: `site/src/state/INVARIANTS.md`

## Streak

The run of consecutive calendar days holding at least one review, ending today
or yesterday.

Lives in: `site/src/review/streak.core.ts`

Invariants: `site/src/review/INVARIANTS.md`

## Variation

A named group of lines inside one opening, such as the Classical Variation.

Lives in: `site/src/openings/types.ts`, built by `scripts/build-openings.ts`

Invariants: `site/src/openings/INVARIANTS.md`

Not to be confused with: a line, which is one move sequence inside a variation.
A picker column shows variations; the column beside it shows the lines of one.

## Words we do not use

- **family** for a top-level entry. The entry is an **opening**. The word
  survives only in the build script's `FAMILIES` list, which is the name of its
  input rather than of the thing it produces.
- **repertoire**, **course**, **chapter**. The book is the **openings dataset**,
  and its three levels are **opening**, **variation** and **line**.
- **node**, **branch**, **tree** as domain nouns. The things are **lines** and
  **book moves**.
- **engine**, **bot**, **AI**. The reply is the **auto opponent**, and it is a
  pick among the book moves weighted by the deck's lines. The program that checks the decks
  is named by its own name, **Stockfish**, and identifiers say `stockfish`.
- **eval**, **score** for the number on the evaluation bar. It is an
  **evaluation**, spelt in full in identifiers. `score` stays the word of the
  UCI lines Stockfish prints.
- **quiz**, **exercise**, **test** for a card.
- **game** as a stored entity. A game on a deck page lives in the machine's
  current run.
- **wrong move**, **mistake**, **error** for a move the book does not know. The
  position is **out of book**.
- **open deck** for Explore. A deck is the set of cards a reader reviews, so the
  tab stays **Explore**, and the deck it feeds is the **personal deck**.
- **colour** for the side. The two values are **white** and **black**, and the
  field is `side`. `color` in the codebase is a board theme's palette entry.
- **algebraic notation** unqualified. Say **SAN** for the readable form and
  **UCI** for the four-character form the machines speak; those are the two
  field suffixes, `movesSan` and `movesUci`.
- **position** for a stored value. A position on the board is a **FEN** string,
  and the stored name of one is a **position key**.
- **wrong**, **correct**, **score**, **grade** for a review. A review has an
  **outcome**, `recalled` or `missed`.
- **repertoire** for a set of lines. The set is a **deck**.
- **flashcard**, **puzzle**. The unit is a **card**.
- **French** in identifiers. The application's name is French and the interface
  ships `fr.json`; the code is English.
