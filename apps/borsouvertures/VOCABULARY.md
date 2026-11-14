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

## Account

The one synced identity, the owner's. There is no sign-up and no route that
creates it.

Lives in: `api/src/auth/`, `site/src/lib/queries/account.queries.ts`,
`site/src/review/`

- The account is one `operator_credential` row, an argon2id hash and a
  `session_epoch`, plus the HMAC signing key in `app_config`. A script writes
  them on prod and the fixture seed writes them on a preview and in local dev.
- Signing in sets a signed `HttpOnly` cookie that lasts 30 days. A new epoch
  ends every session issued before it.
- The sixth failed sign-in from one address within 15 minutes answers
  `rate-limited`. A sign-in before the credential exists answers
  `auth-not-bootstrapped`.
- A signed-in device pushes the review events and the deck line events whose
  `receivedAt` is `null`, then pulls the account's events after each log's sync
  cursor, and merges both into that log by id. A refused push keeps the batch queued and shows "sync paused".
  A 401 marks the sync `expired`, and a band under the top bar says the session
  expired, with a button that opens the sign-in form in the settings sheet. The
  band shows on the screens that draw no board.
  Offline is not an error. A browser whose store cannot write still pulls every
  page into the open tab, and keeps that cursor in memory only.
- The account link shows only when the session route answers, so with no API
  the app shows no dead link.

Held by: `api/src/auth/auth.controller.test.ts` › has no enrolment route
Held by: `api/src/auth/auth.controller.test.ts` › rate limits the sixth failed sign-in, even with the right password
Held by: `api/src/review-events/review-events.controller.test.ts` › stores a batch pushed twice once, and answers the stored receivedAt both times
Held by: `site/src/review/sync.setup.unavailable-store.test.ts` › pulls every page once into the open tab and keeps the cursor off the disk
Held by: `site/src/components/organisms/TopBar.test.tsx` › says the session expired after a 401 and opens the sign-in form in the settings sheet

## Auto opponent

The automated reply that answers the reader's move in a game on a deck page. It
has a move source, `book` then `stockfish`.

Lives in: `site/src/opponent/deck-game-machine.utils.ts`, with the randomness
and the timer in `site/src/openings/machineEffects.ts`

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

## Board theme

The palette the board is drawn with.

Lives in: `site/src/theme/boardThemes.utils.ts`

- Four ids: `lichess`, `chesscom`, `nord`, `sand`. Each carries a `light`, a
  `dark`, a `highlight` and an `arrow` colour, plus the i18n key of its name.
- Pieces come from react-chessboard's bundled SVG set in every theme, which is
  what keeps the board drawable offline.

Not to be confused with: the persisted field, which is named `boardStyle`. The
two names are the same thing.

## Book

The lines of the openings dataset the explorer matches the moves played
against.

Lives in: `site/src/explorer/explorer.core.ts`

- `flattenExplorerLines` turns the dataset into one `ExplorerLine` per line,
  with its opening name, variation name, line name and UCI moves.
- A line is in the book of a position when its moves start with the moves
  played. A position reached by another move order is not matched: the
  explorer follows move orders, not position keys.
- The position is out of book when no line starts with the moves played. The
  screen says so and keeps the name of the last named position.

## Book move

A move the book knows from the position on the board.

Lives in: `site/src/explorer/explorer.core.ts`

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

Not to be confused with: a deck's book move, the deck move a card expects or
the auto opponent plays.

## Card

One question the scheduler asks again: a position of a deck where the reader
has exactly one move to play.

Lives in: `site/src/decks/card.core.ts`, with the stored shape in
`site/src/decks/deck.utils.ts`

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

Not to be confused with: a line, which is a whole move sequence. A line of 18
plies holds nine reader moves, so up to nine cards.

## Daily plan

The cards a reader is asked today: the due cards, then the new cards.

Lives in: `site/src/review/daily-plan.core.ts`

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

## Deck

A hand-written set of lines for one side, with one idea per reader move, that a
reader reviews card by card.

Lives in: `content/decks/`, built by `scripts/decks/deck-build.core.ts` and
read through `site/src/decks/deck.utils.ts`

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

Not to be confused with: an opening, which is an entry of the Lichess book that
Explore reads. A deck is content written for this application. A personal deck
is a deck the reader built in Explore, not a content file.

## Deck line event

The immutable record of one line added to or removed from a personal deck.

Lives in: `domain/deck-line-event.core.ts`, stored by
`site/src/personal-deck/deck-line-event-store.adapter.ts`, synced by
`api/src/deck-line-events/`

- It holds an `id` made on the device, a `kind` (`line-added` or
  `line-removed`), the `side`, the moves in UCI, the `openingName` reached or
  `null`, the device instant `occurredAt`, the device's `calendarDay`, the
  `deviceId`, and `receivedAt`, `null` until a server stamps it.
- A line is named by its side and its moves (`buildDeckLineKey`), so a removal
  names the line it removes.
- Events live in the IndexedDB database `borsouvertures-personal-deck`, in the
  store `deck-line-event`, and on the server in `deck_line_event`. Push, pull,
  cursor and merge work as for review events, under the cursor key
  `borsouvertures.deck-line-sync-cursor`.

Held by: `api/src/deck-line-events/deck-line-events.controller.test.ts` › stores a batch pushed twice at once from two sessions once, and answers both with the same receipts

## Due

The state of a card whose scheduled day has come.

Lives in: `site/src/review/daily-plan.core.ts`, with the schedule in
`site/src/review/scheduler.core.ts`

- A card is due on a calendar day and not at an instant. Its `dueAt` is turned
  into the device's calendar day and compared with today.
- `dueAt` comes from replaying the card's review events through `ts-fsrs` with
  the pinned `SCHEDULER_CONFIGURATION`, fuzz off, so two devices holding the
  same events agree.

Held by: `site/src/review/daily-plan.core.test.ts` › counts a card as due on the calendar day of the device, not at the instant

## ECO code

The Encyclopaedia of Chess Openings classification the source row carried.

Lives in: `site/src/openings/types.ts`

- A line carries exactly one, as `eco`. An opening carries `ecoCodes`, the
  distinct codes of every row folded into it, in first-seen order.
- Both are plain strings to the parser, which checks the type and nothing about
  the format.

## Evaluation bar

The thin bar beside a board that shows how Stockfish rates the position, with
White's share filled from White's side and the evaluation written as text.

Lives in: `site/src/opponent/stockfish-evaluation.core.ts`, with the query in
`site/src/lib/queries/stockfish-evaluation.queries.ts` and the bar in
`site/src/components/atoms/EvaluationBar.tsx`

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

Not to be confused with: an outcome, which is what a review records. The bar
records nothing.

## Explore

The tab that opens the book as a board the reader plays on. The operator's words
were "an open deck"; the tab keeps its name, because a deck in this file is the
set of cards a reader reviews.

Lives in: `site/src/components/organisms/OpenExplorer.tsx`, with the moves played
in `site/src/explorer/explorer.store.ts`

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

## Idea

The short text that explains one reader move: which piece goes where, and why.

Lives in: `site/src/decks/idea.utils.ts`, parsed by
`scripts/decks/ideas-markdown.core.ts`

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

## Line

One row of the source dataset: a named move sequence.

Lives in: `site/src/openings/types.ts`, built by `scripts/build-openings.ts`

- `id`, `name`, `eco`, `movesSan` and `movesUci` are all required, and the
  parser rejects the dataset when any of them has the wrong type.
- `movesSan` and `movesUci` are the same moves in the two notations, produced
  from one `chess.js` history, so they index together.
- `id` is `buildLineId(name, movesUci)`: the slug of the name, a hyphen, then a
  64-bit FNV fingerprint of the moves joined by spaces, in base 36. The name
  alone is not an identifier, because the upstream dataset reuses one name
  across several move sequences.
- `assertUniqueLineIds` fails the build on a repeated `opening/variation/line`
  triple. Lines are sorted by `name.localeCompare` inside their variation.
- The shipped dataset holds 2313 lines.

Not to be confused with: a variation, which is the group a line belongs to. A
line is always a leaf; a variation never is.

## Move

One ply, written either as UCI or as SAN.

Lives in: `site/src/openings/uciSquare.utils.ts`

- UCI is what the machines, the book, the events and the arrows speak: two squares, each
  matching `/^[a-h][1-8]$/`, plus an optional promotion piece, one of `q`, `r`,
  `b`, `n`. `toSquare` throws on anything else.
- SAN is for reading. The explorer and the decks get it by replaying the UCI
  moves through `chess.js`. The board asks for the promotion piece and names
  it in the UCI move. A move without one still promotes to a queen in the
  explorer and the deck game.

## New

The state of a card that has no review event yet.

Lives in: `site/src/review/daily-plan.core.ts`

- A card stops being new at its first review, on any device. The day of that
  first review is the day it counts against `newCardsPerDay`.

Held by: `site/src/review/daily-plan.core.test.ts` › counts a card on the day of its first review only, whichever device made it

## Opening

A top-level entry of the book: a named family of variations, such as the
Sicilian Defense.

Lives in: `site/src/openings/types.ts`, built by `scripts/build-openings.ts`

- `id`, `name`, `ecoCodes` and `variations` are all required. `id` is
  `toSlug(name)`: lower case, apostrophes dropped, runs of anything else folded
  to a hyphen, edge hyphens trimmed.
- A source row joins the first name in the build script's `FAMILIES` list that
  its own name starts with, so the list is ordered most specific first and the
  build fails when any entry wins no row. Twenty families are listed and twenty
  ship.

## Openings dataset

The book as a file: `openings.json`, shipped twice and read once per page load.

Lives in: `site/src/openings/` (`openings-source.adapter.ts`, `loadOpenings.ts`,
`openingsResource.ts`)

- `fetchOpeningsDocument` is the only outbound call in the site. A refusal, a
  network failure and a malformed body all collapse to `null`, because the
  caller acts the same way on all three.
- `loadOpenings` uses the fetched document when it parses to a non-empty list,
  and the copy bundled into the JS chunks otherwise. Failure on both paths is
  reported as `{ ok: false, error }`, which `selectOpeningsLoad` flattens to the
  status `failed`.
- `readOpeningsRequest` memoises the promise in a module-level holder, so a
  component reading it with React's `use` resumes rather than refetches.
- The service worker caches `/openings.json` cache-first under
  `openings-cache-<OPENINGS_CACHE_VERSION>`, and the build script rewrites that
  version constant every time it regenerates the file.

## Outcome

What one review of a card ended in: `recalled` or `missed`.

Lives in: `domain/review-event.core.ts`, decided in
`site/src/review/review-machine.utils.ts`

- A card is recalled when the reader plays its book move. A move outside the
  deck, or a tap on *Show the move*, misses it.
- Recalled maps to the scheduler's Good and missed to Again. No other grade is
  used.
- A missed card comes back later in the same session, and that second answer
  stores no review event.

Held by: `site/src/review/review-machine.utils.test.ts` › brings a missed card back at the end, and its second answer stores no event

Not to be confused with: out of book, which is the state of a position in
Explore. A review has an outcome, an explored position does not.

## Personal deck

A deck the reader builds in Explore, shown as "My lines", one per side.

Lives in: `site/src/personal-deck/`

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

Not to be confused with: a deck, which is a content file. The two build the same
`BuiltDeck`.

## Ply

One half-move, by one side.

Lives in: `site/src/decks/card.core.ts`

- The index of a ply in a line is what `formatMoveNotation` numbers: an even
  index is a White move, `1. e4`, and an odd one a Black move, `1... c5`.

## Position key

The stored name of a position: the first four fields of its FEN, joined by one
space.

Lives in: `domain/position-key.core.ts`

- The four fields are the board, the side to move, the castling rights and the
  en passant square. The two move counters are dropped, so two move orders that
  reach one position share a key.
- `chess.js` writes the en passant square only when a capture is possible, so
  the key changes only when the position really does.

Held by: `domain/position-key.core.test.ts` › carries an en passant square that changes a position key

Not to be confused with: a FEN, which is the full six-field string a board is
drawn from.

## Preview

The small static board shown beside a named deck, line or book move.

Lives in: `site/src/openings/previews.utils.ts`

- A deck previews its first line after at most 6 plies of SAN, and a deck line
  its last position. Replay stops at the first move `chess.js` refuses.
- A book move in Explore previews the position after it.

## Retention

The share of due cards recalled on the first try, per deck and per week.

Lives in: `site/src/review/retention.core.ts`

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

Not to be confused with: accuracy, which is the share recalled over every
stored review of a deck, due or not.

## Review

One answer a reader gives to one card.

Lives in: `site/src/review/`

- A review is the event, a session in review mode is the run of them. Today's
  session asks the daily plan, and a deck's session asks that deck's share of
  it, or its already seen cards ahead of their day when the plan holds none.
- The session ends with the share recalled on the first try and tomorrow's due
  count.

Held by: `site/src/routes/OpeningTrainerPage.test.tsx` › recalls a card and shows its idea, misses a card through Show the move, and ends with the recalled share

## Review event

The immutable record of one review, and the only thing progress is made of.

Lives in: `domain/review-event.core.ts`, stored by
`site/src/review/review-event-store.adapter.ts`

- It holds an `id` made on the device, the `cardId`, the `outcome`, the device
  instant `reviewedAt`, the device's `calendarDay` at that instant, the
  `deviceId`, and `receivedAt`, which is `null` until a server stamps it.
- Card state, the daily plan and every count are replayed from the events and
  never stored. `listReviewEventsInReplayOrder` orders them by replay instant,
  then by id.
- `selectReplayInstant` is the earliest of `reviewedAt`, `receivedAt` and now,
  so an event from a clock running ahead is clamped.
- Events live in the IndexedDB database `borsouvertures-review`, in the object
  store `review-event`, keyed by `id`. When the store cannot open or write, the
  log stays in memory and a banner says progress will not be kept.

Held by: `domain/review-event.core.test.ts` › clamps a reviewedAt in the future to now
Held by: `site/src/routes/OpeningTrainerPage.reload.test.tsx` › finds the same progress after a reload

## Session

One mounted board asking cards, from the moment its machine starts until the
component unmounts.

Lives in: `site/src/components/organisms/ReviewSession.tsx`, with the mount hook
in `site/src/lib/session-start.hook.ts`

- A session asks a list of cards fixed at its start. Today's session asks the
  daily plan, and a deck's session asks that deck's share of it.
- `useSessionStart` runs the machine's `start` inside `useState`'s lazy
  initialiser, which React calls once per mount and before the first paint.

## Side

The colour the reader plays, and therefore the board's orientation.

Lives in: `site/src/state/persistedState.utils.ts`

- Two values, `white` and `black`. A deck has one. In Explore the persisted
  `side` turns the board and names the personal deck a line is added to.

## Streak

The run of consecutive calendar days holding at least one review, ending today
or yesterday.

Lives in: `site/src/review/streak.core.ts`

- `countStreakDays` reads the calendar day stamped on each review event and
  nothing else, so the streak is the same on every device holding the same
  events.
- A streak whose last review was yesterday still stands, because today is not
  over. One whose last review was two days ago is 0.

Held by: `site/src/review/streak.core.test.ts` › reads the stamped day across a time-zone change, not the instant

## Variation

A named group of lines inside one opening, such as the Classical Variation.

Lives in: `site/src/openings/types.ts`, built by `scripts/build-openings.ts`

- `id`, `name` and `lines` are all required.
- The name comes from the source row's title: the text between the colon and the
  first comma, and `Main Line` when the title has no colon. `id` is the slug of
  that name.
- In Explore it is the middle level a book move names, read as
  `Family: Variation`.
- The shipped dataset holds 587 variations.

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
