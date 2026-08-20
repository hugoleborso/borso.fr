# Vocabulary — borsouvertures

`borsouvertures` is a front-end-only progressive web app for learning chess
openings. It ships a book built from the Lichess `chess-openings` tables and
drives it two ways: a learner drills one variation until every line in it has
been seen, or a player keeps a game inside a chosen part of the book for as
long as they can. There is no server and no account, and everything a reader
picks lives in one localStorage record.

This file names the things the application talks about. Use these words in
identifiers, file names, commit messages and specs. Every claim below is taken
from the type, pure helper or machine named beside it.

## Auto opponent

The automated reply that answers the reader's move with one of the available
book moves, picked at random.

Lives in: `site/src/openings/machineEffects.ts`, used by the two machines in
`site/src/openings/`

- `pickRandomCandidate` reads `Math.random` and `scheduleTimeoutCallback` reads
  `setTimeout`. Both are injected as options, so a test drives a machine with
  no clock and no randomness.
- The reply is delayed by 200 ms in the play machine and 250 ms in the learn
  machine, and it captures the run it was scheduled for, comparing that
  object's identity against the machine's current run before it lands.
- The play machine takes the reader's choice as `PlayMachineConfig.autoOpponent`,
  persisted as `playAutoOpponent`; `setAutoOpponent` changes it on the running
  game rather than restarting it. The learn machine answers every opponent ply.

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

## ECO code

The Encyclopaedia of Chess Openings classification the source row carried.

Lives in: `site/src/openings/types.ts`

- A line carries exactly one, as `eco`. An opening carries `ecoCodes`, the
  distinct codes of every row folded into it, in first-seen order.
- Both are plain strings to the parser, which checks the type and nothing about
  the format.

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
- The shipped dataset holds 1837 lines.

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

## Preview

The small static board shown on a card in the opening picker.

Lives in: `site/src/openings/previews.utils.ts`

- Every preview is a FEN reached by replaying at most 6 plies of SAN, and replay
  stops at the first move `chess.js` refuses.
- An opening previews the first line of the first variation whose name contains
  `main`, and the first line of its first variation otherwise. A variation
  previews its first line, and a line previews itself.

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
the component unmounts.

Lives in: `site/src/components/organisms/SessionScreen.tsx`, with the mount hook
in `site/src/lib/useSessionStart.ts`

- `useSessionStart` runs the machine's `start` inside `useState`'s lazy
  initialiser, which React calls once per mount and before the first paint.
- The two machines are module-level singletons, so a control outside the board
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

## Variation

A named group of lines inside one opening, such as the Classical Variation.

Lives in: `site/src/openings/types.ts`, built by `scripts/build-openings.ts`

- `id`, `name` and `lines` are all required.
- The name comes from the source row's title: the text between the colon and the
  first comma, and `Main Line` when the title has no colon. `id` is the slug of
  that name.
- It is the unit a drill runs against, and the unit whose lines a cleared drill
  has covered.
- The shipped dataset holds 477 variations.

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
  uniform random pick among the book moves.
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
- **position** for a stored value. A position on the board is a **FEN** string.
- **French** in identifiers. The application's name is French and the interface
  ships `fr.json`; the code is English.
