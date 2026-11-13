# Vocabulary — borsouvertures

`borsouvertures` is a progressive web app for learning chess openings, with a
small API that syncs one account. It ships hand-written decks that a reader reviews a few cards a day,
on a schedule that asks each card again when it is about to be forgotten. It
also ships a book built from the Lichess `chess-openings` tables, which the
Explore tab drives two ways: a learner drills one variation until every line in
it has been seen, or a player keeps a game inside a chosen part of the book for
as long as they can. What a reader picks lives in one localStorage record, and
what a reader has reviewed lives in a log of review events in the browser's
IndexedDB. Every screen works without the API. The one account, the owner's,
also pushes its events to the API and pulls the events of its other devices.

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
- A signed-in device pushes the review events whose `receivedAt` is `null`,
  then pulls the account's events after its sync cursor, and merges both into
  its log by id. A refused push keeps the batch queued and shows "sync paused".
  A 401 shows the sign-in link again. Offline is not an error.
- The account link shows only when the session route answers, so with no API
  the app shows no dead link.

Held by: `api/src/auth/auth.controller.test.ts` › has no enrolment route
Held by: `api/src/auth/auth.controller.test.ts` › rate limits the sixth failed sign-in, even with the right password
Held by: `api/src/review-events/review-events.controller.test.ts` › stores a batch pushed twice once, and answers the stored receivedAt both times

## Auto opponent

The automated reply that answers the reader's move. In Explore it is one of the
available book moves, picked at random. In a game on a deck page it has a move
source, `book` then `stockfish`.

Lives in: `site/src/openings/machineEffects.ts`, used by the two machines in
`site/src/openings/`, and `site/src/opponent/deck-game-machine.utils.ts` for a
game on a deck page

- `pickRandomCandidate` reads `Math.random` and `scheduleTimeoutCallback` reads
  `setTimeout`. Both are injected as options, so a test drives a machine with
  no clock and no randomness.
- The reply is delayed by 200 ms in the play machine and 250 ms in the learn
  machine, and it captures the run it was scheduled for, comparing that
  object's identity against the machine's current run before it lands.
- The play machine takes the reader's choice as `PlayMachineConfig.autoOpponent`,
  persisted as `playAutoOpponent`; `setAutoOpponent` changes it on the running
  game rather than restarting it. The learn machine answers every opponent ply.
- In a game on a deck page the move source is `book` while the moves played are
  the start of a deck line that still has a move, and the reply is one of those
  moves after 450 ms. From the first position with no such move the source is
  `stockfish`, for the rest of the game, and `opponent_left_deck` is recorded
  once.
- The `stockfish` source is the vendored worker, started by
  `site/src/opponent/stockfish.adapter.ts` when a game starts and stopped when
  it ends. It searches 400 ms a move. No answer to `uci` within 10 s raises
  `StockfishLoadFailedError`, and the game then ends where the deck ends. A
  move the board refuses raises `StockfishIllegalMoveError`.
- The strength is one of seven steps in
  `site/src/opponent/opponent-strength.core.ts`, persisted as
  `opponentStrength`. Three easier steps set `Skill Level` 0, 3 and 6 and show
  no rating. Seven set `UCI_Elo` 1320, 1500, 1700, 1900, 2000, 2200 and 2500.
  The default is 2000.
  A step sends one option family, never both.
- A game on a deck page stores no review event.

Held by: `site/src/opponent/deck-game-machine.utils.test.ts` › asks Stockfish for the move at the stored strength when the line ends
Held by: `site/src/components/organisms/DeckGame.test.tsx` › stores no review, so the counts on Today stay as they were

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

The set of lines a session accepts moves from, after the selection and the play
scope have narrowed the dataset.

Lives in: `site/src/openings/bookEngine.utils.ts`

- `gatherCandidates` walks openings, then variations, then lines, dropping an
  entry when the play scope names ids at that level and the entry is not one of
  them, and again when the selection names one id other than the sentinel `all`.
- `computeBookState` keeps the candidates whose `movesUci` start with the moves
  played, and reports `inBook` as "at least one candidate survived".
- `uniqueOpening`, `uniqueVariation` and `uniqueLine` are filled only while
  every surviving candidate agrees on that level, so they arrive one after
  another as the game narrows.
- `atLineEnd` is true when candidates survive and every one of them has exactly
  as many moves as have been played.

## Book move

A move the book allows at the next ply from the position on the board.

Lives in: `site/src/openings/bookTree.utils.ts` for a drill,
`site/src/openings/bookEngine.utils.ts` for a game

- Both are the distinct UCI strings at index `playedMovesUci.length` across the
  lines still matching the played prefix. `nextMovesAt` answers it for one
  variation, `possibleNextMovesUci` for the whole book.
- `selectVisibleBookMoves` decides whether the board draws them as arrows.
  Hiding them is the default, because the point of a drill is to recall the
  move rather than read it.

Not to be confused with: a candidate, which is a whole line still in play
rather than a single move.

## Candidate

One `(opening, variation, line)` triple that still matches the moves played.

Lives in: `site/src/openings/bookEngine.utils.ts`

- `BookCandidate` names all three levels, because the status panel reports the
  opening, the variation and the line separately.
- `candidateCount` is the number of surviving triples, and the interface calls
  that number *matches*.

Not to be confused with: the `candidates` parameter of `pickRandom` and of
`MoveButtonList`, which is a list of UCI book moves. The word carries two
meanings in this codebase.

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
  the lower `order`.
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
- New cards stop at `newCardsPerDay` minus the cards already introduced today.
  The setting is 10 by default, 0 to 30, and is kept on the device.
- The plan is derived from the review log at each render and is never stored.

Held by: `site/src/review/daily-plan.core.test.ts` › takes the cards introduced today off the limit

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

Held by: `scripts/decks/deck-build.core.test.ts` › rule 4 refuses two reader moves from one position

Not to be confused with: an opening, which is an entry of the Lichess book that
Explore reads. A deck is content written for this application.

## Drill

One run of learn mode against one variation.

Lives in: `site/src/openings/learnTreeMachine.utils.ts`, with the target
resolved in `site/src/openings/learnSession.core.ts`

- A `LearnTreeRun` holds the variation, the side, one `Chess` engine, the played
  moves and the visited leaves. `start` builds a fresh one, so the object's
  identity is the run's identity.
- A move is checked against the book moves before it reaches the board, so the
  board only ever holds a position the variation contains.
- The drill is cleared when every line of the variation has been visited.
- `findLearnDrillTarget` answers `NO_DRILL_TARGET`, a placeholder with an empty
  variation id, when the selection names no opening or no variation.
  `isLearnDrillReady` is the test the screen branches on.

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

## Explore

The tab that holds learn mode and play mode over the whole openings dataset.

Lives in: `site/src/components/organisms/ExploreScreen.tsx`

- Nothing done in Explore stores a review event, so a drill or a game there
  leaves the due count and the new count unchanged.

Held by: `site/src/routes/OpeningTrainerPage.test.tsx` › leaves the due and new counts unchanged after time spent in Explore

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

## Learn mode

The mode where the reader drills one variation until its tree is covered.

Lives in: `site/src/openings/` (`learnSession.core.ts`,
`learnTreeMachine.utils.ts`, `openingFlow.core.ts`)

- Selecting is single-pick: tapping a card replaces the selection, and
  `isOpeningActive` and its siblings read the selection rather than the scope.
- The picker shows the variations of the selected opening, and the lines of the
  selected variation.
- A session may start once the selection names a variation other than the
  sentinel `all` (`isLearnSessionReady`).
- Arrows follow the machine's own `showRevealedArrows` flag, which
  `revealArrows` sets and the next accepted move clears.

Not to be confused with: play mode, the other value of `Mode`, which narrows
the book instead of naming one variation.

## Line

One row of the source dataset: a named move sequence, and the leaf of the tree
a drill walks.

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
- `shortLineName` trims the opening's name and colon, then the variation's name
  and comma, off the front of the line's name, and answers `null` when nothing
  distinctive is left.
- The shipped dataset holds 2313 lines.

Not to be confused with: a variation, which is the group a line belongs to. A
line is always a leaf; a variation never is.

## Move

One ply, written either as UCI or as SAN.

Lives in: `site/src/openings/uciSquare.utils.ts`, with the conversion in
`site/src/components/atoms/moveNotation.utils.ts`

- UCI is what the machines, the book and the arrows speak: two squares, each
  matching `/^[a-h][1-8]$/`, plus an optional promotion piece, one of `q`, `r`,
  `b`, `n`. `toSquare` throws on anything else.
- SAN is for reading. `describeMoveInStandardNotation` replays the UCI move from
  a FEN to get it, and answers the raw UCI when the move is illegal there.

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
- `all` is reserved as a selection sentinel, so an entry carrying it as its own
  id is never returned by `findOpening`.

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

## Out of book

The state the reader reaches by playing a move the book does not allow at that
ply.

Lives in: `site/src/openings/learnTreeMachine.utils.ts` and
`site/src/openings/playMachine.utils.ts`

- A drill compares the move against the book moves first, so the rejected move
  never touches the board. A game applies it, recomputes the book state, and
  takes the move back off both the engine and the history when nothing matches.
- Both machines answer `'rejected-out-of-book'` and raise a flag the screen
  reads to open the modal, which `dismissOutOfBook` lowers.
- A drill also answers `'rejected-no-variation'` before it has been started and
  `'rejected-opponents-turn'` on the opponent's ply.

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

Not to be confused with: out of book, which is the state of a drill or a game
in Explore. A review has an outcome, a drill does not.

## Play mode

The mode where the reader plays a whole game and tries to stay inside a chosen
part of the book.

Lives in: `site/src/openings/` (`playSession.core.ts`, `playMachine.utils.ts`,
`playScope.core.ts`)

- Selecting is multi-pick: tapping a card toggles it in and out of the play
  scope, and picking a child adds its parents.
- A session may start as soon as anything narrows the book: a selection at any
  level, or a non-empty play scope (`isPlaySessionReady`).
- Reaching `atLineEnd` raises `successOpen` and shows the completion banner.
  `selectLineLabel` gives that banner the line's short name, and
  `selectCompletionMessageKey` picks the named or the generic message from
  whether there is one.
- `isUndoAllowed` needs two played moves while the auto opponent is on and one
  while it is off, which is also how many plies `undo` takes back.

Not to be confused with: learn mode. Leaving learn for play resets the play
scope and the selection, so a game does not inherit the drill.

## Play scope

The set of openings, variations and lines a play session may wander inside.

Lives in: `site/src/state/persistedState.utils.ts` for the type, with the rules
in `site/src/openings/playScope.core.ts`

- Three arrays of ids: `openingIds`, `variationIds`, `lineIds`. All three empty
  means nothing has been narrowed, and an empty array at one level means that
  level does not filter.
- Toggling a variation adds its opening when absent, and toggling a line adds
  both its variation and its opening. Clearing a level clears every level below.
- The book engine reads the same three arrays as `PlayScopeFilter`, where
  `lineIds` is optional. The two types describe the same value.

Not to be confused with: the selection, which names at most one id per level.

## Ply

One half-move, by one side.

Lives in: `site/src/openings/learnTreeMachine.utils.ts` and
`site/src/openings/playMachine.utils.ts`

- `playedMovesUci.length` is the ply count, and it is what indexes into a line's
  `movesUci`.
- `isOpponentToMove` is a parity test on it: the opponent is to move on odd
  plies when the reader is white, and on even plies when the reader is black.
- `PLIES_PER_FULL_MOVE` is 2 in both machines, and `MOVES_PER_FULL_TURN` is the
  same 2 in `playSession.core.ts`.

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

The small static board shown on a card in the opening picker.

Lives in: `site/src/openings/previews.utils.ts`

- Every preview is a FEN reached by replaying at most 6 plies of SAN, and replay
  stops at the first move `chess.js` refuses.
- An opening previews the first line of the first variation whose name contains
  `main`, and the first line of its first variation otherwise. A variation
  previews its first line, and a line previews itself.

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

## Selection

The one opening, one variation and one line a reader has picked, each of which
may instead be "all" or nothing yet.

Lives in: `site/src/openings/selectors.utils.ts`

- Three fields, `openingId`, `variationId` and `lineId`, each a string or `null`.
- `ALL_KEY` is the string `all`, a value rather than a type, meaning every entry
  at that level. The finders read the sentinel before the dataset, so an entry
  whose own id is `all` is never found.
- `FULL_SELECTION` sets all three to `all`, and is both the initial state and
  what a reset restores.
- Picking an opening resets the variation and the line to `all`; picking a
  variation resets the line.

Not to be confused with: the play scope, which is a set per level rather than
one id per level, and is what play mode reads.

## Session

One mounted board playing one mode, from the moment its machine starts until
the component unmounts. The modes are `learn`, `play` and `review`.

Lives in: `site/src/components/organisms/SessionScreen.tsx` for learn and play,
`site/src/components/organisms/ReviewSession.tsx` for review, with the mount
hook in `site/src/lib/session-start.hook.ts`

- A session in review mode asks a list of cards fixed at its start. It is not a
  stored `Mode`: the stored field keeps the two Explore modes, and the review
  session is the screen `review-session`.

- `useSessionStart` runs the machine's `start` inside `useState`'s lazy
  initialiser, which React calls once per mount and before the first paint.
- The machines are module-level singletons, so a control outside the board
  drives the same object the board reads.
- Restarting is a remount: the session body carries `buildSessionKey(...)` as
  its `key`, a string joining the mode, the side, the three selection ids and
  the three scope id lists, so any change to those replaces it and starts a new
  run.

Not to be confused with: the view, which is which screen is showing.

## Side

The colour the reader plays, and therefore the board's orientation.

Lives in: `site/src/state/persistedState.utils.ts`

- Two values, `white` and `black`. It feeds `isOpponentToMove`, so changing it
  changes which plies the auto opponent answers.
- It is part of the session key, so changing it restarts the session.

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
- It is the unit a drill runs against, and the unit whose lines a cleared drill
  has covered.
- The shipped dataset holds 587 variations.

Not to be confused with: a line, which is one move sequence inside a variation.
A picker column shows variations; the column beside it shows the lines of one.

## View

Which of the application's two screens is showing, as stored.

Lives in: `site/src/state/persistedState.utils.ts`, resolved in
`site/src/components/organisms/trainerScreen.core.ts`

- Two stored values: `select` and `session`.
- `selectTrainerScreenKind` adds a third rendered kind, `load-failure`, which
  outranks the stored view when the dataset failed to load.
- The whole persisted record lives under the localStorage key
  `borsouvertures.v1`, and a record that fails to parse is discarded in favour
  of the initial state.

## Visited leaf

A line a drill has reached the exact end of.

Lives in: `site/src/openings/bookTree.utils.ts`

- `leafReachedAt` matches when the played moves and the line's `movesUci` are
  equal in length and element by element, and answers the first such line in
  declaration order.
- The ids accumulate in the run's `visitedLeafIds`, and the drill panel shows
  that set's size against the variation's line count.
- `isVariationCleared` requires every line of the variation to be in the set.

Not to be confused with: a line. Every leaf is a line; the word *leaf* is used
where the tree shape matters, which is inside the drill helpers.

## Words we do not use

- **family** for a top-level entry. The entry is an **opening**. The word
  survives only in the build script's `FAMILIES` list, which is the name of its
  input rather than of the thing it produces.
- **repertoire**, **course**, **chapter**. The book is the **openings dataset**,
  and its three levels are **opening**, **variation** and **line**.
- **node**, **branch**, **tree** as domain nouns. The tree is a shape the drill
  helpers reason about; the things themselves are **lines** and **leaves**.
- **engine**, **bot**, **AI**. The reply is the **auto opponent**, and it is a
  uniform random pick among the book moves. The program that checks the decks
  is named by its own name, **Stockfish**, and identifiers say `stockfish`.
- **quiz**, **exercise**, **test**. One run of learn mode is a **drill**, and a
  drill is **cleared**.
- **game** as a stored entity. A game is one **session** in play mode, and it
  lives in the machine's current run.
- **wrong move**, **mistake**, **error** for a move the book rejects. The reader
  is **out of book**.
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
