# Plan for the borsouvertures opening trainer

Build slice 1 first, then slices 2 to 6 in parallel worktrees, and skip slice 7. Each slice section below is a complete brief for one fresh agent.

> Early quality check. Pair with [`../spec/spec.md`](../spec/spec.md). When a defect lands and a Dantotsu traces back here, the chain is visible. The plan named the risk and the mitigation was missed, or the plan did not name the risk, or the plan was right and the defect comes from elsewhere.

Written on 2026-11-13 from SHA `9c208e212`, branch `claude/tender-pasteur-svwn2z`. Every measurement below was taken in this session on Node 22.23.4 unless a row says otherwise. The scratch scripts that produced them are in `/tmp/claude-0/-home-user-borso-fr/9499cdc7-5d1f-5719-8d50-a7d5c2d01baf/scratchpad/technical-conception-01/`.

The six ADRs this plan projects:

- [ADR-2026-11-12T2359](../../../../adr/2026-11-12T2359-borsouvertures-becomes-a-full-stack-app-for-one-account.md), full-stack app for one account.
- [ADR-2026-11-13T0000](../../../../adr/2026-11-13T0000-progress-is-a-log-of-immutable-review-events-merged-by-id.md), immutable review events merged by id.
- [ADR-2026-11-13T0001](../../../../adr/2026-11-13T0001-ts-fsrs-schedules-the-cards-with-fuzz-off.md), `ts-fsrs` with fuzz off.
- [ADR-2026-11-13T0002](../../../../adr/2026-11-13T0002-the-operator-credential-is-written-by-a-script-and-no-route-enrols.md), credential written by a script, no enrolment route.
- [ADR-2026-11-13T0003](../../../../adr/2026-11-13T0003-stockfish-runs-as-two-vendored-unmodified-gpl-worker-files.md), Stockfish as two vendored GPL files.
- [ADR-2026-11-13T0004](../../../../adr/2026-11-13T0004-decks-and-ideas-are-content-files-and-lichess-data-is-pinned.md), decks and ideas as content, Lichess data pinned.

## Decisions

The operator delegated every remaining call on 2026-11-12 (spec, "Perspectives confronted"), so these stand in for his confirmation until the pull-request review. Each row is a call the spec left open, or one the code contradicted. All are reversible unless the row says otherwise.

| # | Decision | Reason and evidence |
|---|---|---|
| D1 | `PreviewableApp` is created with the construct id `Default`, not `App`. | With the id `App`, 12 of the 17 CloudFormation logical ids of `borsouvertures-prod` change, the named bucket and the distribution among them (measured, `logical-ids.mjs`). CloudFormation would then create a second bucket named `borsouvertures-prod` and the prod deploy would fail (inferred). With `Default`, no logical id is lost on prod (17 kept, 43 after) or on a preview (5 kept, 30 after) (measured, `logical-ids-full.mjs`). |
| D2 | `domain/` and the `@domain` alias are created in slice 1, not in slice 6. | Slices 1 to 5 need `ReviewEvent`, the position key and the calendar day. A move in slice 6 would rewrite imports in files that slices 3, 4 and 5 are editing at the same time. The condition of ADR-2026-08-13T0026 (a caller on each side) holds once slice 6 lands. It does not hold if the branch ships without slice 6, and the pull request must then say so. |
| D3 | The app gets no URL router. Tabs and screens live in one in-memory store. | The previews function serves the single-page fallback only to the apps in `SINGLE_PAGE_APPS`, which lists `banana-rush`, `last-loop-lepin` and `pragma` (read in `infra/cdk/src/internal/cf-host-routing-function.code.js`). Adding borsouvertures there needs a `shared-deploy` dispatch. The existing app has no router either (read in `site/src/main.tsx`). |
| D4 | The built decks are one file, `site/public/decks.json`, gitignored, fetched at load and precached. | A generated file imported from source would break `tsc` and `vitest` on a clone that has not built yet. A fetched file parsed from `unknown` has no such coupling, and it is the pattern `openings-source.adapter.ts` already follows (read). |
| D5 | Every reader move must carry a hand-written idea in English and French, 280 characters at most. Rule-derived notes (`pawn-structure.core`) are cut. | Rule-derived notes are first on the spec's cut list and the spec never defines them. A rule with no exception is one line in the build, and the review screen needs no empty state. 280 is a guess for what fits under a board at 375 px. |
| D6 | The idea of a move card is keyed by the position after the reader's move. | The idea explains the move the reader just played, and the spec shows it after the answer. Two paths that transpose reach the same key and share the text. |
| D7 | `deck.json` gains `order`, `pliesPerLine` and `engineExceptions`. | The spec says a shared FEN belongs to the first deck "in file order" and a glob has no stable order. The Scandinavian side lines are shorter than 12 plies (spec, launch decks row). The gambit exception has to live in the deck file (brief). |
| D8 | Deck names stay i18n keys, as the spec and ADR-2026-11-13T0004 say. Slice 1 writes the five launch keys. | It keeps slice 2 out of `en.json` and `fr.json`. The cost is stated under Open questions. A sixth deck touches its folder and the two catalogues. |
| D9 | Line names are English proper names and are not translated. | The Explore tab already shows the Lichess names in English only (read in `openings.json`). The spec gives `DeckLine.name` as one string. |
| D10 | The Stockfish gate allows a loss of 100 centipawns at depth 16, with an absolute ceiling of 250 for a move that carries an exception. | Measured on 14 reader moves of the five openings at depth 16. The largest loss of a book move is 81 (Albin, 5...Be6) and the gambit move 2...e5 loses 54. See "The Stockfish gate". |
| D11 | The scheduler is pinned to `version: 'FSRS-6'`, `desiredRetention: 0.9`, `maximumInterval: 365`, `enableShortTerm: false`, `learningSteps: []`, `relearningSteps: []`, `enableFuzz: false`. | ADR-2026-11-13T0001 leaves the values to the plan. FSRS-6 state is `stability` and `difficulty`, which is the spec's `CardState`. FSRS-7 adds `stabilityFast` (read in the library README). With no short-term steps every interval is at least a day, which fits a daily plan. The configuration ran on Node 22.23.4 and two replays gave equal cards (measured, `fsrs-config.mjs`). 0.9 and 365 are guesses. |
| D12 | A card is due on a calendar day, not at an instant. | A card reviewed at 08:00 with a three-day interval must be due at 07:00 three days later. `dueAt` is turned into the device's calendar day and compared with today. |
| D13 | A missed card comes back in the same session and that second answer stores no event. | The `missed` event already scheduled the card. A second event the same day would move the scheduler twice for one failure. |
| D14 | Retention counts a review only when the card was due and had been seen before. | The spec defines retention as due cards recalled on the first try. The first review of a new card retains nothing yet. |
| D15 | New cards come in deck `order`, then line order, then ply order. There is no per-deck switch. | The spec names no selection of active decks. The daily limit already bounds the load. |
| D16 | Sign-in and the session read go through TanStack Query and TanStack Form. The push and pull of events go through `sync.adapter.ts` over the same Hono client. | `docs/standards/06-data-fetching.md` asks for TanStack Query on every call to the app's own API and for `useForm` on a form. Both packages are in the workspace catalog (read in `pnpm-workspace.yaml`). The sync exchange is rendered by no component, so slice 6 adds that one exception to the standard, in the same pull request. |
| D17 | The account link shows only when `GET /api/auth/session` answers. A network failure or a non-JSON answer hides it. | It keeps the review path free of the API (ADR-2026-11-12T2359). Offline, or with no API deployed, the app is the local trainer and shows no dead link. |
| D18 | `check-decks` runs in a CI job of its own, behind a paths filter, and before a content agent hands back. It is not a commit hook. | The gate costs about 550 ms per reader move (measured). The pre-commit budget is 4 s (read in `docs/standards/14-tool-runtime-budgets.md`). The `dashboard-page` job of `ci.yml` is the model (read). |
| D19 | The spec's backlog row for the API's Sentry DSN is dropped. Slice 6 adds one line to `deploy.yml` and one to `preview.yml`. | `vars.SENTRY_DSN` is already set in the `prod` environment (read in the Done table of `docs/operator-backlog.md`, rows #235 and #263). Each app gets it through a line such as `BANANA_RUSH_SENTRY_DSN` (read in both workflows). |
| D20 | The openings dataset is pinned to commit `3ba6b20d31b2e6125cb0e6a2e792f400717d9d39`. Trap cards are cut from the puzzle dump last modified on 2026-11-01. | `git ls-remote` of `lichess-org/chess-openings` on 2026-11-13 (measured). `curl -I` of `lichess_db_puzzle.csv.zst` answered 200 with 309,751,173 bytes (measured). |
| D21 | Slice 6 is two commits. The first holds `domain/`, `api/` and the site's sync code. The second switches the stack and the workflows. | Each commit builds and passes its tests alone. The two are pushed together, because the first alone turns the preview job red at its seed step. If the second cannot deploy for a reason a session cannot fix, both are reverted. See "The preview path". |
| D22 | The plan adds one backlog row the spec lacks, the Sentry alert rules for the five named errors. | The spec gives each error an alert threshold and names nobody to create the rule. A rule lives in the Sentry project, outside the repository. |

## Slice graph and file ownership

```
slice 1 (serial, first)
   ├── slice 2a..2d  one content agent per deck, each in its own folder
   ├── slice 3       stats and streak
   ├── slice 4       name and trap cards
   ├── slice 5       Stockfish opponent
   └── slice 6a      domain additions, api/, site sync   ->  slice 6b  cdk/, workflows (serial after 6a)
slice 7 skipped (no LICHESS_TOKEN)
```

- Slice 1 is serial and first. Everything else imports what it creates.
- The Albin content of slice 1 and the four decks of slice 2 can be written from time zero by content agents that read only "Deck content format". They can run their gates once slice 1's scripts exist.
- Slices 3, 4, 5 and 6a run in parallel worktrees after slice 1. They commit in the spec's order, 2, 3, 4, 5, 6a, 6b.
- Slice 6b is serial after 6a and is the last commit, so a revert of it is clean.

Files more than one slice touches. Every other file has one slice.

| File | Owner | Later editors and merge rule |
|---|---|---|
| `apps/borsouvertures/package.json`, `pnpm-lock.yaml` | Slice 1 | Slice 4 adds one script line, `build:traps`, and no dependency. Slice 6a adds dependencies and scripts and commits the lockfile once. Merge 4 before 6a. Slices 2, 3 and 5 do not touch either file. |
| `vite.config.ts` | Slice 1 | Slice 6a only (the `/api` dev proxy and the `@api` alias). |
| `vitest.config.ts`, `tsconfig.json`, `tsconfig.cdk.json`, `stryker.config.js` | Slice 1 | Slice 6a only (the projects, `@api`, `api/`, `cdk/`). |
| `knip.json`, `.oxlintrc.json`, `.oxfmtrc.json` | Slice 1 | Slice 6b only (`cdk/bin/cdk.ts`, `api/` entries). |
| `site/src/i18n/en.json`, `fr.json` | Slice 1 | One top-level namespace per slice, inserted after a different anchor so the hunks never touch. Slice 3 inserts `stats` after `today`. Slice 4 inserts `cards` after `review`. Slice 5 inserts `opponent` after `decks`. Slice 6a inserts `account` after `top-bar`. No slice edits another slice's namespace. |
| `VOCABULARY.md` | Slice 1 | One section per noun, alphabetical. Slice 3 adds Retention and Streak. Slice 4 edits Card. Slice 5 edits Auto opponent. Slice 6a adds Account and rewrites the opening paragraph. |
| `site/src/navigation/app-screen.core.ts`, `components/organisms/AppScreens.tsx` (the tab bar's table) | Slice 1 | Slice 3 only (the Stats tab and screen). |
| `components/organisms/TodayScreen.tsx` | Slice 1 | Slice 3 only (streak and 30-day retention). |
| `components/organisms/DeckPage.tsx`, `state/persistedState.utils.ts`, `state/appState.ts` | Slice 1 | Slice 5 only (the game and the stored strength). |
| `scripts/decks/deck-build.core.ts`, `site/src/decks/deck.utils.ts`, `site/src/decks/card.core.ts`, `site/src/review/review-machine.utils.ts`, `components/organisms/ReviewSession.tsx` | Slice 1 | Slice 4 only (two more card kinds). |
| `components/organisms/TopBar.tsx`, `routes/OpeningTrainerPage.tsx`, `site/src/main.tsx`, `site/src/review/review-event-store.adapter.ts` | Slice 1 | Slice 6a only. |
| `README.md`, `THIRD_PARTY_NOTICES.md` | Slice 1 | Slice 6b only (README). |
| `content/decks/<deck-id>/deck.json` | The content agent of that deck (slices 1 and 2) | Slice 4 only, to add `trapFilter`, after slice 2 is merged. |
| `.github/workflows/ci.yml` | Slice 1 (the `deck-content` job) | Nobody. `deploy.yml` and `preview.yml` belong to slice 6b. |

Rules for every slice agent. They come from the root `CLAUDE.md`.

- Do not commit and do not stage. The orchestrator commits.
- Work notes go in `<scratchpad>/<your-label>/`. Log friction with `scripts/kaizen.sh --from <your-label> "<the problem, one sentence>"`.
- Before a new file, run `scripts/reports.sh blueprints`, open the blueprint the row names in `.claude/skills/blueprint/blueprint-index.md`, and mark the code `// @FollowsBlueprint <id>`.
- Read `apps/borsouvertures/VOCABULARY.md` before naming anything. "Engine", "bot", "AI", "quiz", "wrong", "mistake", "repertoire" and "family" stay banned as domain nouns. Identifiers say `stockfish`.
- Every `*.core.ts`, `*.utils.ts` and `*.adapter.ts` row implies a sibling test at 100% coverage. The test follows `test-pure-unit` unless the row names another test blueprint.
- A pure module needs a caller that is not its test in the same slice (`scripts/check-pure-modules-have-callers.sh`).
- No `useEffect`. No type assertion except `as const` and `as unknown`. No comment a machine does not read.

The gate commands every slice runs before it hands back. Hooks do not run for an agent that never commits, so the agent runs them. Timings are measured on the tree at `9c208e212`, all with exit 0.

| Gate | Command | Measured |
|---|---|---|
| G1 lint, type-aware | `pnpm --filter @borso-app/borsouvertures run lint` (it runs `oxlint --type-aware apps/borsouvertures`) | 3.6 s |
| G2 format | `node_modules/.bin/oxfmt --check apps/borsouvertures` plus each root file the slice touched | 0.1 s, 156 files |
| G3 typecheck | `pnpm --filter @borso-app/borsouvertures run typecheck` | 2.0 s |
| G4 tests | Before slice 6a, `pnpm --filter @borso-app/borsouvertures exec vitest run`. From slice 6a, `pnpm --filter @borso-app/borsouvertures run test:core` and `run test:e2e`. | 13.4 s, 36 files, 340 tests |
| G5 coverage | `pnpm --filter @borso-app/borsouvertures exec vitest run --coverage` (add `--project core` from slice 6a) | not measured |
| G6 build | `pnpm --filter @borso-app/borsouvertures build` | 5.4 s |
| G7 mutation | `scripts/mutate-changed.sh origin/main apps/borsouvertures` | not measured |
| G8 registration | `scripts/check-app-registration.sh` | 0.04 s |

## Shared contracts

Slice 1 creates these. Later slices read them and extend only the parts their section names.

```ts
// domain/review-event.core.ts
export type CardKind = 'move' | 'name' | 'trap';
export type ReviewOutcome = 'recalled' | 'missed';
export type CardId = string;      // `move:<deckId>:<positionKey>` | `name:<positionKey>` | `trap:<puzzleId>`
export interface ReviewEvent {
  id: string;                     // UUID made on the device
  cardId: CardId;
  outcome: ReviewOutcome;
  reviewedAt: string;             // device instant, ISO 8601
  calendarDay: CalendarDay;       // device calendar day at reviewedAt
  deviceId: string;               // UUID
  receivedAt: string | null;      // server instant, null until pushed
}
export const REVIEW_EVENT_BATCH_LIMIT = 500;
export function buildMoveCardId(deckId: string, positionKey: PositionKey): CardId;
export function parseCardId(value: string): { kind: CardKind; deckId: string | null; subject: string } | null;
export function parseReviewEvent(value: unknown): ReviewEvent | null;
export function selectReplayInstant(event: ReviewEvent, now: Date): Date;   // earliest of reviewedAt, receivedAt, now
export function listReviewEventsInReplayOrder(events: readonly ReviewEvent[], now: Date): ReviewEvent[];  // by replay instant, then id
export function mergeReviewEvents(local: readonly ReviewEvent[], remote: readonly ReviewEvent[]): ReviewEvent[];  // union by id, a non-null receivedAt wins

// domain/position-key.core.ts
export type PositionKey = string; // the first four FEN fields joined by one space
export function derivePositionKey(fen: string): PositionKey;
export function isPositionKey(value: string): boolean;

// domain/calendar-day.core.ts
export type CalendarDay = string; // YYYY-MM-DD
export function deriveCalendarDay(instant: Date, utcOffsetMinutes: number): CalendarDay;
export function isCalendarDay(value: string): boolean;
export function shiftCalendarDay(day: CalendarDay, days: number): CalendarDay;
export function countDaysBetween(from: CalendarDay, to: CalendarDay): number;
```

`chess.js` 1.x writes the en passant square only when a capture is possible. After `1. e4` the FEN ends `KQkq - 0 1`, and after `1. e4 d5 2. e5 f5` it ends `KQkq f6 0 3` (measured, `example.mjs`). The named test "an en passant square that changes a position key" uses those two positions.

```ts
// site/src/review/scheduler.core.ts
export const SCHEDULER_CONFIGURATION = {
  version: 'FSRS-6', desiredRetention: 0.9, maximumInterval: 365,
  enableShortTerm: false, learningSteps: [], relearningSteps: [], enableFuzz: false,
} as const;
export interface CardState { cardId: CardId; dueAt: string | null; stability: number; difficulty: number; lapses: number }
export function replayCardStates(events: readonly ReviewEvent[], scheduler: Scheduler, now: Date): ReadonlyMap<CardId, CardState>;

// site/src/review/daily-plan.core.ts
export interface DailyPlan { day: CalendarDay; dueCardIds: CardId[]; newCardIds: CardId[] }
```

The golden log for `scheduler.core.test.ts`. One card, first review on 2026-01-01T08:00:00Z, each later review at the card's `dueAt`, grades Good, Good, Again, Good, Good. The `dueAt` values are 2026-01-04, 2026-01-18, 2026-01-20, 2026-01-25 and 2026-02-07, all at 08:00:00Z. Stability after the first review is 2.3065 and difficulty 2.11810397. Lapses end at 1 (measured with `ts-fsrs` 6.0.0, `fsrs-config.mjs`).

```ts
// site/src/navigation/app-screen.core.ts
export type AppTab = 'today' | 'decks' | 'explore';            // slice 3 adds 'stats'
export type AppScreen =
  | { kind: 'today' } | { kind: 'review-session'; deckId: string | null }
  | { kind: 'decks' } | { kind: 'deck'; deckId: string }
  | { kind: 'explore' } | { kind: 'credits' };                  // slice 3 adds 'stats', slice 6a adds 'sign-in'

// site/src/observability/error-reporting.adapter.ts, the whole closed union lands in slice 1
export type ProductEvent =
  | { name: 'review_session_started' } | { name: 'review_session_completed' }
  | { name: 'card_reviewed'; cardKind: CardKind; outcome: ReviewOutcome }
  | { name: 'new_cards_introduced'; count: number } | { name: 'deck_opened'; deckId: string }
  | { name: 'opponent_game_started'; deckId: string } | { name: 'opponent_left_deck'; deckId: string }
  | { name: 'sync_completed'; pushed: number; pulled: number };
export function recordProductEvent(event: ProductEvent): void;   // a Sentry breadcrumb
```

## Deck content format

A content agent needs this section and nothing else. It writes three files per deck and edits no code.

```
apps/borsouvertures/content/decks/<deck-id>/
  deck.json       the lines
  ideas.en.md     one idea per reader move, in English
  ideas.fr.md     the same keys, in French
```

The five launch deck ids, their `order`, side and name key. Slice 1 writes the name keys in `en.json` and `fr.json`.

| `id` | `order` | `side` | `nameKey` | Must cover (spec, launch decks row) |
|---|---|---|---|---|
| `albin-countergambit` | 1 | `black` | `decks.names.albin-countergambit` | 1. d4 d5 2. c4 e5, plus Black's answers to 2. Nf3, the London and 2. e3 |
| `scandinavian-qa5` | 2 | `black` | `decks.names.scandinavian-qa5` | 1. e4 d5 2. exd5 Qxd5 3. Nc3 Qa5 kept short. The weight is on 2. Nf3 (the Tennison Gambit) first, then 2. d4, 2. d3, 2. Nc3 and 2. e5 |
| `caro-kann-two-knights` | 3 | `white` | `decks.names.caro-kann-two-knights` | 1. e4 c6 2. Nc3 d5 3. Nf3 |
| `vienna-game` | 4 | `white` | `decks.names.vienna-game` | 1. e4 e5 2. Nc3, the Vienna Game and the Vienna Gambit |
| `grand-prix-attack` | 5 | `white` | `decks.names.grand-prix-attack` | 1. e4 c5 2. Nc3 and 3. f4 |

The reader is rated 1200 to 1600. A line is 6 to 10 moves long by default. Each deck has one main line first and the side lines a club player meets most.

### `deck.json`

```ts
interface DeckSource {
  id: string;                    // equals the folder name, matches /^[a-z0-9]+(-[a-z0-9]+)*$/
  order: number;                 // positive integer, unique across decks, decides which deck owns a shared position
  nameKey: string;               // a key present in en.json and fr.json
  side: 'white' | 'black';       // the reader's side
  lines: DeckLineSource[];       // at least one, the main line first
  pliesPerLine?: { minimum: number; maximum: number };   // default { minimum: 12, maximum: 20 }
  engineExceptions?: EngineException[];                  // default []
  trapFilter?: { openingTags: string[] };                // read by slice 4 only
}
interface DeckLineSource {
  name: string;                  // English proper name, 3 to 60 characters, unique in the deck
  movesSan: string[];            // SAN from the starting position, both sides, no move numbers
}
interface EngineException {
  movesSan: string[];            // a path that ends on the reader move being excused
  reason: string;                // at least 20 characters, the chess reason the move is in the deck
}
```

`build-decks` fails, and names the deck, the line and the ply, when any of these is false.

1. Every move is legal SAN from the position before it. `chess.js` 1.x throws on an illegal move, so the build catches and reports (read in `docs/knowledge/chessjs-v1-throws-on-illegal-move.md`).
2. A line has between `pliesPerLine.minimum` and `pliesPerLine.maximum` plies.
3. No line repeats another and no line is a prefix of another.
4. A position where the reader moves has exactly one reader move across the whole deck. Two lines may share a position only when they continue with the same reader move. The opponent may have several moves from one position. That is what makes lines.
5. Two decks of the same side that share a position continue with the same reader move there. The card belongs to the deck with the lower `order`.
6. `nameKey` exists in both catalogues.
7. Every `engineExceptions` path is a prefix of a line of this deck, ends on a reader move, and has a reason.
8. Every idea rule below holds.

### The ideas grammar

`ideas.en.md` and `ideas.fr.md` use the same grammar. `oxfmt` ignores Markdown files (read in `.oxfmtrc.json`), so format them by hand.

```
file        = [ front-matter ] { section }
front-matter= "---" NL "source: wikipedia" NL "sourceUrl: " url NL "---" NL
section     = "## " path NL blank-line body
path        = san { " " san }          ; from the starting position, both sides
body        = paragraph { blank-line paragraph }    ; until the next "## " or the end of the file
```

- A path may carry move numbers such as `1.` or `2...`. The build drops any token that matches `/^\d+\.(\.\.)?$/`.
- A path ends on a reader move and is a prefix of at least one line of the deck. The idea explains that last move.
- The body is plain text. No Markdown is rendered. A single line break becomes a space and a blank line separates paragraphs.
- A body has 1 to 280 characters after that folding.
- Every reader move of every line has a section, in both files. Two paths that reach the same position after the reader's move are one idea. Write it once, or write the same text under both paths.
- The two files hold the same set of positions.
- The front matter is present only when the file's text is based on Wikipedia. It then applies to every idea of that file, and the app shows the credit. Only the two keys above are allowed.
- No line of the file starts with `# ` (one hash). Only `## ` headings are read.

### What the build writes

`pnpm --filter @borso-app/borsouvertures run build:decks` writes `apps/borsouvertures/site/public/decks.json`. The file is an output and is gitignored (ADR-2026-08-20T1031, read through ADR-2026-11-13T0004).

```ts
// site/src/decks/deck.utils.ts
interface DecksDocument { version: 1; decks: BuiltDeck[] }          // sorted by order
interface BuiltDeck {
  id: string; nameKey: string; side: Side;
  lines: BuiltDeckLine[];
  cards: MoveCard[];              // the cards this deck owns, in line order then ply order
  ideas: Idea[];
  trapFilter?: { openingTags: string[] };
}
interface BuiltDeckLine { name: string; movesSan: string[]; movesUci: string[] }
interface MoveCard {
  kind: 'move';
  cardId: CardId;                 // `move:<deckId>:<positionKey>`
  deckId: string;
  positionKey: PositionKey;       // the position the reader sees
  fen: string;                    // the full FEN of that position
  opponentMoveUci: string | null; // the move that led there, null when the reader moves first
  bookMoveUci: string; bookMoveSan: string;
  ideaPositionKey: PositionKey;   // the position after the book move, the key of its idea
}
interface Idea { positionKey: PositionKey; en: string; fr: string; source?: 'wikipedia'; sourceUrl?: string }
```

### A worked example

A deck of two short lines. The moves, FENs, keys and UCI strings below were produced by `chess.js` 1.x (measured, `example.mjs`).

`content/decks/albin-countergambit/deck.json`

```json
{
  "id": "albin-countergambit",
  "order": 1,
  "nameKey": "decks.names.albin-countergambit",
  "side": "black",
  "pliesPerLine": { "minimum": 8, "maximum": 20 },
  "lines": [
    { "name": "Main line", "movesSan": ["d4", "d5", "c4", "e5", "dxe5", "d4", "Nf3", "Nc6"] },
    {
      "name": "Lasker Trap",
      "movesSan": ["d4", "d5", "c4", "e5", "dxe5", "d4", "e3", "Bb4+", "Bd2", "dxe3"]
    }
  ]
}
```

`content/decks/albin-countergambit/ideas.en.md`

```markdown
## 1. d4 d5

Meet the queen's pawn in the centre. The gambit comes on the next move.

## 1. d4 d5 2. c4 e5

The Albin Countergambit. Black gives a pawn to open lines and to plant a pawn on d4.

## 1. d4 d5 2. c4 e5 3. dxe5 d4

The point of the gambit. The d4 pawn cramps White's queenside and takes c3 from the knight.

## 1. d4 d5 2. c4 e5 3. dxe5 d4 4. Nf3 Nc6

Defend d4 and aim at e5. The queen's bishop and the queen come out next, and Black castles long.

## 1. d4 d5 2. c4 e5 3. dxe5 d4 4. e3 Bb4+

After 4. e3 White is already in trouble. Check first, so that a piece has to block on d2.

## 1. d4 d5 2. c4 e5 3. dxe5 d4 4. e3 Bb4+ 5. Bd2 dxe3

The Lasker Trap. If White takes the bishop, the pawn takes on f2 with check and promotes on g1.
```

`ideas.fr.md` has the same six headings with French bodies. The build output for this deck holds six cards, because the two lines share their first three reader moves. Its first card and its idea are:

```json
{
  "kind": "move",
  "cardId": "move:albin-countergambit:rnbqkbnr/pppppppp/8/8/3P4/8/PPP1PPPP/RNBQKBNR b KQkq -",
  "deckId": "albin-countergambit",
  "positionKey": "rnbqkbnr/pppppppp/8/8/3P4/8/PPP1PPPP/RNBQKBNR b KQkq -",
  "fen": "rnbqkbnr/pppppppp/8/8/3P4/8/PPP1PPPP/RNBQKBNR b KQkq - 0 1",
  "opponentMoveUci": "d2d4",
  "bookMoveUci": "d7d5",
  "bookMoveSan": "d5",
  "ideaPositionKey": "rnbqkbnr/ppp1pppp/8/3p4/3P4/8/PPP1PPPP/RNBQKBNR w KQkq -"
}
```

```json
{
  "positionKey": "rnbqkbnr/ppp1pppp/8/3p4/3P4/8/PPP1PPPP/RNBQKBNR w KQkq -",
  "en": "Meet the queen's pawn in the centre. The gambit comes on the next move.",
  "fr": "..."
}
```

The other five cards sit at the positions before 2...e5, 3...d4, 4...Nc6, 4...Bb4+ and 5...dxe3. The main line's `movesUci` is `d2d4 d7d5 c2c4 e7e5 d4e5 d5d4 g1f3 b8c6`.

### The gates a content agent runs before it hands back

1. `node_modules/.bin/oxfmt --check apps/borsouvertures/content` (the `deck.json` format).
2. `pnpm --filter @borso-app/borsouvertures run build:decks`. It exits 0 and prints the card count of each deck.
3. `DECK=<deck-id> pnpm --filter @borso-app/borsouvertures run check:decks`. It exits 0.

A content agent touches only its own folder. It reports the card count, the line count and every exception it added, with the loss the gate printed.

## The Stockfish gate

`check-decks` reads every reader move of every deck and asks the engine whether the move loses too much. An agent writes the chess, so a program reads it.

| Parameter | Value | Evidence |
|---|---|---|
| Binary | `apps/borsouvertures/site/public/stockfish/stockfish-19-lite-single.js` with its `.wasm` beside it, the two files the browser loads. The `.wasm` is 1,845,971 bytes. The npm package is not a dependency. | ADR-2026-11-13T0003. The file runs as `node <file>` and speaks UCI on stdin and stdout (read in the package README and measured, `gate-cost.mjs`). |
| How it runs | One child process for the whole run, started with `child_process.spawn(process.execPath, [enginePath])`. The script waits for `uciok` and `readyok` before the first position. | The package wrapper threw when a command came before the engine had loaded (ADR-2026-11-13T0003). |
| Options | `setoption name Hash value 64`. `Threads` is fixed at 1 by the build. | Measured, the engine reports `Threads` min 1 max 1 (ADR). |
| Budget | `go depth 16`, after `ucinewgame` and `isready` for each search. | Depth, not time, so two machines give the same score. Two runs of 14 moves printed identical output (measured). |
| Loss of a reader move | Search the position before the move. If the engine's best move is the book move, the loss is 0. Otherwise search again with `go depth 16 searchmoves <bookMoveUci>`. The loss is the first score minus the second, in centipawns from the reader's side. A `mate N` score counts as plus or minus 10,000. | Measured on 14 moves. Albin 2...e5 loses 54, 5...Be6 loses 81, Scandinavian 1...d5 loses 41, 3...Qa5 loses 0, Vienna 3. f4 loses 18, Grand Prix 3. f4 loses 28, Caro-Kann 3. Nf3 loses 0, Tennison 4...Nf6 loses 64. |
| Margin | `READER_MOVE_MARGIN_CENTIPAWNS = 100`. A move over it fails the gate. | Above every measured book move, below the price of a pawn. |
| Exception | A move over the margin passes only when `engineExceptions` in its `deck.json` holds its exact path and a reason. The margin itself never widens. | Brief. |
| Ceiling | `EXCEPTION_CEILING_CENTIPAWNS = 250`. A move over it fails even with an exception. | A guess for "a piece is hanging". |
| Stale exception | An exception whose move is inside the margin fails the gate. | An exception that excuses nothing rots. |
| Unmodified engine | The script refuses to run when the SHA-256 of either engine file differs from `stockfish-distribution.core.ts`. | The three digests are in ADR-2026-11-13T0003. |
| Scope | Each position is searched once, by position key and move. `DECK=<id>` limits the run to one deck. | |
| Output on a failure | One line per move with the deck, the SAN path, the loss and the engine's best move, then a JSON stub of the exception with an empty `reason`. The empty reason fails `build-decks`, so a person or an agent has to write it. | |

Cost. 14 reader moves took 7.4 s and 7.7 s at depth 16, about 550 ms a move (measured here). The five decks hold an unknown number of reader moves. At 300 moves the run is about 165 s (a guess on the count, and a CI runner's speed was not measured).

Where it runs.

- A content agent runs it on its own deck before it hands back.
- CI runs it on every deck, in a job named `deck-content` that slice 1 adds to `.github/workflows/ci.yml`. The job copies the shape of `dashboard-page`. It has `timeout-minutes: 10` and a `dorny/paths-filter` on `apps/borsouvertures/content/decks/**`, `apps/borsouvertures/site/public/stockfish/**`, `apps/borsouvertures/scripts/check-decks.ts` and `apps/borsouvertures/scripts/decks/**`. It runs `pnpm --filter @borso-app/borsouvertures run check:decks`.
- It does not run on a commit or a push. The pre-commit budget is 4 s.
- `build-decks` (legality, ideas, parity) runs inside `pnpm build` and `pnpm dev`, so `pnpm -r build` in CI and every deploy run it.

## Slice 1. Local decks, with the Albin deck

**Goal.** A reader opens the app, sees Today with a due count and a new count, reviews the Albin deck's move cards with their ideas, and finds the same progress after a reload. No server is involved. The smallest change is the deck pipeline, one deck, the scheduler over a local event log, and four screens.

**Shared and root files.**

| File | Change |
|---|---|
| `scripts/check-no-null-bytes.sh` | Add `*.wasm` to the skipped extensions. The gate refuses the engine's `.wasm` today (measured, exit 1). |
| `.oxlintrc.json` | Add `apps/borsouvertures/site/public/stockfish/**` to `ignorePatterns`. |
| `.oxfmtrc.json` | Add `apps/borsouvertures/site/public/stockfish` and `apps/borsouvertures/site/public/decks.json` to `ignorePatterns`. The engine files must stay byte-identical. |
| `knip.json` | For `apps/borsouvertures`, add `scripts/build-decks.setup.ts`, `scripts/check-decks.setup.ts`, `domain/**/*.core.test.ts` and `scripts/**/*.test.ts` to `entry`, and `domain/**/*.ts` to `project`. |
| `.github/workflows/ci.yml` | Add the `deck-content` job described above. |
| `apps/borsouvertures/.gitignore` | Add `site/public/decks.json`. |
| `package.json` | Add `ts-fsrs` at exactly `6.0.0` (dependency) and `fake-indexeddb` at exactly `6.2.8` (dev dependency). Add `"build:decks": "tsx scripts/build-decks.setup.ts"` and `"check:decks": "tsx scripts/check-decks.setup.ts"`. Change `dev` to `tsx scripts/build-decks.setup.ts && vite` and `build` to `tsx scripts/build-decks.setup.ts && vite build`. |
| `vite.config.ts` | Add the `@domain` alias. Add `decks.json` to `includeAssets`. Add `workbox.globIgnores: ['**/stockfish/**']`. Add a `CacheFirst` runtime rule for paths under `/stockfish/`, cache name `stockfish-19.0.1`. |
| `vitest.config.ts` | Add `@domain`. Include `domain/**/*.test.ts` and `scripts/**/*.test.ts`. Add `domain/**/*.core.ts`, `scripts/**/*.core.ts` and `scripts/**/*.adapter.ts` to the coverage list. |
| `tsconfig.json` | Add `"@domain/*": ["./domain/*"]`, add `node` to `types`, include `domain/**/*.ts` and `scripts/**/*.ts`. |
| `tsconfig.cdk.json` | Include only `bin`. Scripts now import site and domain modules, which need the bundler resolution. |
| `stryker.config.js` | Add `domain/**/*.core.ts`, `scripts/**/*.core.ts` and `scripts/**/*.adapter.ts` to `mutate`. |

**New files.**

| File | Blueprint | Holds |
|---|---|---|
| `domain/review-event.core.ts`, `domain/position-key.core.ts`, `domain/calendar-day.core.ts` | `domain-shared-selection` | The shapes under "Shared contracts". |
| `scripts/decks/deck-source.core.ts` | `core-parse-untrusted` | `parseDeckSource(value: unknown)`, every field rule of `deck.json`. |
| `scripts/decks/ideas-markdown.core.ts` | `core-parser-named-error` | The ideas grammar. |
| `scripts/decks/deck-build.core.ts` | `core-projection` | Replays lines with `chess.js`, applies rules 1 to 8, derives cards and ideas, returns a `DecksDocument` or a list of problems. |
| `scripts/decks/engine-gate.core.ts` | `core-decision` | The loss, the margin, the ceiling, the stale exception, the stub text. |
| `scripts/decks/stockfish-process.adapter.ts` | `adapter-external-service`, test `test-node-adapter` | Spawns the engine. `spawn` is an option, so the test feeds lines from a fake process. |
| `scripts/build-decks.setup.ts`, `scripts/check-decks.setup.ts` | none, thin shells like `scripts/build-openings.ts` | Read the folders by a glob over `content/decks/*/deck.json`, call the cores, write or print. No branch of their own. |
| `scripts/build-openings.ts` (update) | | `LICHESS_COMMIT = '3ba6b20d31b2e6125cb0e6a2e792f400717d9d39'`. Do not rerun it in this slice. A rerun changes `openings.json`, and the vocabulary counts with it. |
| `content/decks/albin-countergambit/` | `data-module` | The Albin deck, per "Deck content format". |
| `site/public/stockfish/stockfish-19-lite-single.js`, `.wasm`, `Copying.txt` | `vendored-third-party` | Copied unmodified from `stockfish@19.0.1`. A copy is in this session at `<scratchpad>/adr-opening-trainer/stockfish/x/package/`. Otherwise `npm pack stockfish@19.0.1` in a scratch folder (161 MB). |
| `site/src/opponent/stockfish-distribution.core.ts` | `core-lookup-table` | Version, file names, byte sizes, the three SHA-256 values of ADR-2026-11-13T0003, the upstream tag `v19.0.1`, and `listTamperedFiles(actualDigests)`. Its test hashes the three committed files. Callers are `check-decks.ts` and the Credits screen. |
| `site/src/opponent/uci.utils.ts` | `utils-pure-module` | `parseUciScore(line)`, `parseBestMove(line)`, `isEngineReady(line)`. Caller in this slice is the process adapter. Slice 5 reuses it. |
| `site/src/decks/deck.utils.ts` | `unknown-payload-parser` | The `DecksDocument` types, `parseDecksDocument(value: unknown)`, `DeckContentInvalidError`. A test parses the output of `deck-build.core` after a JSON round trip, so the build and the loader cannot drift. |
| `site/src/decks/decks-source.adapter.ts`, `site/src/decks/decks-resource.setup.ts` | `adapter-external-service`, `route-suspense-resource` | Fetch `/decks.json` once per page load. A parse failure reports `DeckContentInvalidError` with the tag `deckId`. |
| `site/src/decks/card.core.ts`, `site/src/decks/idea.utils.ts` | `core-projection`, `utils-pure-module` | `listDeckCards`, `findCard`, `isBookMove`, `selectIdeaText(idea, language)`. The card type is a union discriminated by `kind`, with one member today. |
| `site/src/review/scheduler.core.ts` | `core-projection` | `SCHEDULER_CONFIGURATION`, `replayCardStates`. Recalled maps to `Rating.Good`, missed to `Rating.Again`. The library's own `cardId` is never read. |
| `site/src/review/scheduler-resource.setup.ts` | `route-suspense-resource` | Builds the scheduler once. `DefaultScheduler()` returns a promise (ADR-2026-11-13T0001). |
| `site/src/review/daily-plan.core.ts` | `core-view-projection` | `buildDailyPlan`. Due first by `dueAt` then id, then new cards up to `newCardsPerDay` minus those introduced today. |
| `site/src/review/review-machine.utils.ts`, `review-machine.test-utils.ts` | `state-machine-module`, tests `test-machine-transition` and `test-machine-driver` | The session in review mode. `start(plan)`, `playMove(uci)`, `showMove()`, `advance()`. A move outside the deck or `showMove` gives `missed` and requeues the card. The clock and the UUID are injected. |
| `site/src/review/review-effects.setup.ts`, `site/src/review/review-machine.setup.ts` | `machine-impure-edge`, `machine-singleton` | `Date`, `crypto.randomUUID`, `getTimezoneOffset`. The one machine instance. |
| `site/src/review/review-event-store.adapter.ts` | `adapter-storage-keyed-by-record` | IndexedDB, database `borsouvertures-review`, one object store `review-event` keyed by `id`. The `IDBFactory` is an option. Tests pass `fake-indexeddb`'s factory. A failure to open or write throws `ReviewEventStoreUnavailableError` with the tag `operation`. |
| `site/src/review/review-log.store.ts` | `external-store-module` | The events in memory, loaded from the adapter at start. `appendReviewEvent`, `useReviewLog`, `subscribeToReviewLog`, `isProgressKept`. When the store is unavailable the log stays in memory. |
| `site/src/review/device-identity.utils.ts` | `injected-storage-slice` | The device UUID under the localStorage key `borsouvertures.device-id`. |
| `site/src/navigation/app-screen.core.ts`, `navigation.store.ts` | `core-view-intent`, `external-store-module` | `AppTab`, `AppScreen`, `selectActiveTab`, `useAppScreen`, `openScreen`. In memory only. Today is the screen after every load. |
| `components/atoms/TabButton.tsx` | `atom-plain` | A tab at least 44 px high. |
| `components/molecules/TabBar.tsx`, `DailyCounts.tsx`, `DeckRow.tsx`, `IdeaPanel.tsx`, `MoveCardBody.tsx`, `ProgressNotKeptBanner.tsx`, `NewCardsPerDaySelect.tsx` | `molecule-presentational` | `NewCardsPerDaySelect` offers 0 to 30 and sits on the Decks screen. |
| `components/organisms/AppScreens.tsx` | `component-lookup-table` | Screen kind to organism. |
| `components/organisms/TodayScreen.tsx`, `DecksScreen.tsx`, `DeckPage.tsx`, `CreditsScreen.tsx`, `ExploreScreen.tsx` | `organism-presentational` | `ExploreScreen` wraps the existing `TrainerScreens` and takes `ModeToggle` out of the top bar. `CreditsScreen` names Lichess (CC0), Wikipedia (CC BY-SA 4.0) and Stockfish (GPL-3.0) with the source link and the three digests. |
| `components/organisms/ReviewSession.tsx` | `organism-machine-bound` | Board, the opponent's last move replayed, the idea after the answer, *Show the move*, *Next*, and the end screen with the recalled share and tomorrow's due count. The card body comes from a table keyed by card kind. |
| `THIRD_PARTY_NOTICES.md` | mirror `apps/pragma/THIRD_PARTY_NOTICES.md` | The GPL-3.0 notice, the digests, the source link. |

**Updated files.** `site/src/state/persistedState.utils.ts` and `appState.ts` gain `newCardsPerDay` (default 10, 0 to 30). A stored record without the field is discarded for the initial state, as the parser already does. `error-reporting.adapter.ts` gains `ProductEvent` and `recordProductEvent`. `TopBar.tsx` loses `ModeToggle` and gains a Credits link. `routes/OpeningTrainerPage.tsx` renders `AppScreens` and the fixed bottom `TabBar`. `en.json` and `fr.json` gain `tab-bar`, `today`, `review`, `decks` (with `decks.names.*` for the five launch decks), `explore` and `credits`. `VOCABULARY.md` gains Deck, Card (kind `move`), Review, Review event, Due, New, Daily plan, Idea, Position key, Explore and Outcome, and Session gains the `review` mode. Fix its counts to 2313 lines and 587 variations (measured in the spec). `README.md` describes the content folder and the two scripts.

**Tests that prove it.**

- `domain/`. The en passant key. Two devices' events merged and replayed in either arrival order give equal states. A `reviewedAt` in the future is clamped to `now`. Two events at one instant are ordered by id.
- `scheduler.core`. The golden log above. A replay run twice gives equal maps.
- `deck-build.core`. One failing case per rule 1 to 8, and the worked example as the passing case with its six cards.
- `ideas-markdown.core`. Move numbers dropped, a missing French key, two paths with one key and two texts, a body over 280 characters.
- `engine-gate.core`. Inside the margin, over it, over it with an exception, over the ceiling with an exception, a stale exception, a mate score.
- `review-event-store.adapter`. Append and list with `fake-indexeddb`, and the open and write failures.
- Components by role (`test-component-render`). Today shows the counts and Start. A session recalls a card and shows its idea, and misses a card through *Show the move*. The tab bar switches screens. An Explore drill leaves the due count unchanged.

**Gates.** G1 to G8, then `pnpm --filter @borso-app/borsouvertures run build:decks`, `pnpm --filter @borso-app/borsouvertures run check:decks`, `pnpm run knip`, `scripts/check-no-null-bytes.sh apps/borsouvertures/site/public/stockfish/stockfish-19-lite-single.wasm` (exit 0), and `scripts/check-vocabulary-paths.sh`. Then `pnpm --filter @borso-app/borsouvertures dev` and one `agent-browser` pass at 375 px. Today, a session, Decks, a deck page, Explore and Credits render with no horizontal scroll.

**Must not touch.** `infra/`, `bin/app.ts`, any `api/` or `cdk/` path, the other four deck folders, the Stats tab, name and trap cards, the Stockfish worker in the browser.

## Slice 2. The other four launch decks

**Goal.** Four more decks build and pass the engine gate, with no code change. One content agent per deck, each in its own worktree or folder.

**Files.** `content/decks/scandinavian-qa5/`, `content/decks/caro-kann-two-knights/`, `content/decks/vienna-game/`, `content/decks/grand-prix-attack/`, three files each. Nothing else.

**Data shapes.** None. "Deck content format" is the whole contract. The name keys already exist.

**Tests.** None are written. The three content gates are the proof.

**Gates.** The three gates under "The gates a content agent runs". The orchestrator then runs `build:decks` once on the merged tree, because rule 5 (two decks sharing a position) is visible only with every deck present. The three White decks all start with 1. e4, so they share that card and the Caro-Kann deck owns it.

**Must not touch.** Any file outside its own deck folder. That includes `en.json`, `fr.json`, `package.json` and the Albin folder.

## Slice 3. Stats and streak

**Goal.** Today shows the streak and the 30-day retention per deck. A Stats tab shows retention per deck by week over 12 weeks, the streak, and accuracy per deck.

**New files.**

| File | Blueprint | Holds |
|---|---|---|
| `site/src/review/streak.core.ts` | `core-projection` | `countStreakDays(events, today)`. The run of consecutive calendar days holding a review, ending today or yesterday. It reads `calendarDay` off the events and nothing else. |
| `site/src/review/retention.core.ts` | `core-projection` | `projectDeckRetention(events, cards, scheduler, now)` returns `DeckRetention[]`. It replays each card and counts a review only when the card was due and already seen (D14). `weekStart` is the Monday of the event's `calendarDay`. Also `projectDeckAccuracy`, recalled over all stored reviews of a deck. |
| `components/molecules/StreakBadge.tsx`, `RetentionGrid.tsx`, `DeckAccuracyRow.tsx` | `molecule-presentational` | The grid is 12 cells per deck, drawn with CSS. No chart library. |
| `components/organisms/StatsScreen.tsx` | `organism-presentational` | |

**Updated files.** `app-screen.core.ts` (tab and screen kind `stats`), `AppScreens.tsx`, `TodayScreen.tsx`, `en.json` and `fr.json` (namespace `stats`, inserted after `today`), `VOCABULARY.md` (Retention, Streak).

**Data shape.** `interface DeckRetention { deckId: string; weekStart: CalendarDay; dueReviews: number; recalled: number }`, as in the spec.

**Tests.** A not-due review leaves retention unchanged. The first review of a card is not counted. The streak across a time-zone change, with two events whose instants are less than a day apart and whose stamped days differ. A streak that ended two days ago is 0. A week with no due review renders as empty, not as 0%. A component test of the Stats screen by role.

**Gates.** G1 to G7. One `agent-browser` pass of Today and Stats at 375 px.

**Must not touch.** The review machine, the card and deck modules, `DeckPage.tsx`, `persistedState.utils.ts`, `package.json`, any `api/` or `cdk/` path.

## Slice 4. Name cards and trap cards

**Goal.** A name card shows a position and four opening names. A trap card plays the opponent's move, then the reader plays the whole solution. Both are scheduled like move cards. Name cards live in a deck of their own.

**New files.**

| File | Blueprint | Holds |
|---|---|---|
| `content/name-cards.json` | `data-module` | `{ "names": string[] }`. Each entry is the exact name of a row of `openings.json`. The list holds the 20 openings and the five launch openings. |
| `scripts/decks/name-cards.core.ts` | `core-projection` | For each name, the shortest line with that exact name gives the position. The build fails when a name matches no line. Three other names of the list are the wrong choices, picked by a seeded order so every build agrees. |
| `scripts/traps/puzzle-row.core.ts` | `core-parse-untrusted` | Parses one CSV row of the Lichess puzzle dump and decides whether it fits a deck. |
| `scripts/traps/puzzle-dump.adapter.ts` | `adapter-external-service`, test `test-node-adapter` | Streams `https://database.lichess.org/lichess_db_puzzle.csv.zst` through `zlib.createZstdDecompress`, which this Node has (measured). The fetcher is an option. |
| `scripts/build-traps.ts` | thin shell | Writes `content/traps.json`, committed, with the dump's `last-modified` date and the filters (ADR-2026-11-13T0004). |
| `content/traps.json` | `data-module` | `{ dumpLastModified, filters, traps: TrapSource[] }`. |
| `components/molecules/NameCardBody.tsx`, `TrapCardBody.tsx` | `molecule-presentational` | Four choice buttons for a name card. |

**Data shapes.**

```ts
interface NameCard { kind: 'name'; cardId: CardId; positionKey: PositionKey; fen: string; openingName: string; choices: [string, string, string, string] }
interface TrapSource { puzzleId: string; deckId: string; fen: string; movesUci: string[]; rating: number }
interface TrapCard { kind: 'trap'; cardId: CardId; deckId: string; fen: string; opponentMoveUci: string; solutionUci: string[] }
// DecksDocument gains: nameDeck: { id: 'opening-names'; nameKey: string; cards: NameCard[] } and BuiltDeck.traps: TrapCard[]
```

A puzzle fits a deck when one of its `OpeningTags` is in the deck's `trapFilter.openingTags`, the side to move after the first move is the deck's side, its rating is 1000 to 1700, its popularity is at least 80, and the full-move number of its FEN is at most 15. The 10 most played puzzles are kept per deck. All five numbers are guesses. A deck with no `trapFilter` or no match ships no trap card (spec, edge cases).

**Updated files.** `scripts/decks/deck-build.core.ts`, `scripts/build-decks.setup.ts`, `site/src/decks/deck.utils.ts`, `card.core.ts`, `review-machine.utils.ts` (a name card is recalled by the right choice, a trap card by the whole solution, any other move is missed), `ReviewSession.tsx` (two entries in the card body table), `package.json` (one line, `"build:traps": "tsx scripts/build-traps.ts"`), `en.json` and `fr.json` (namespace `cards`, inserted after `review`, with the name deck's key), `VOCABULARY.md` (Card kinds, and "puzzle" names only the Lichess row). Each launch `deck.json` may gain `trapFilter`. That is the one edit this slice makes in a deck folder, and it comes after slice 2 is merged.

**Tests.** A name with no row fails the build. The four choices hold the right name once. A puzzle row for the wrong side is refused. A trap card missed on its second move. The round-trip test of `deck.utils` with the two new kinds.

**Gates.** G1 to G7, `pnpm --filter @borso-app/borsouvertures run build:traps` (it downloads 309,751,173 bytes, measured), `build:decks`, `check:decks`.

**Cut order.** If the dump cannot be downloaded or streamed here, ship name cards alone and say so. Trap cards are third on the spec's cut list.

**Must not touch.** `TodayScreen.tsx`, `DeckPage.tsx`, the stats modules, `opponent/`, any `api/` or `cdk/` path, the lockfile.

## Slice 5. The Stockfish opponent

**Goal.** On a deck page the reader starts a game. The auto opponent plays the deck's moves, then Stockfish at the chosen strength. The game stores no review.

**New files.**

| File | Blueprint | Holds |
|---|---|---|
| `site/src/opponent/opponent-strength.core.ts` | `core-lookup-table` | Seven steps. Three easier ones set `Skill Level` 0, 3 and 6 with `UCI_LimitStrength` off and show no rating. Four set `UCI_LimitStrength` on with `UCI_Elo` 1320, 1500, 1700 and 1900. Default 1320. One option family per step, never both (ADR-2026-11-13T0003). `listStrengthCommands(step)` returns the UCI lines. |
| `site/src/opponent/stockfish.adapter.ts` | `adapter-external-service` | `new Worker('/stockfish/stockfish-19-lite-single.js')`. The worker factory and the timer are options, because jsdom and Node have no `Worker` (measured). It waits for `uciok`, sends the strength, then `position fen` and `go movetime 400`. No answer to `uci` within 10 s throws `StockfishLoadFailedError` with the tag `online`. 400 ms and 10 s are guesses. |
| `site/src/opponent/deck-game-machine.utils.ts`, `deck-game-machine.test-utils.ts` | `state-machine-module`, `test-machine-driver` | The move source is `book` while the played moves are a prefix of a deck line, then `stockfish`. A move the board refuses throws `StockfishIllegalMoveError`. When the worker cannot load, the game ends where the deck ends, with a message. |
| `site/src/opponent/machineInstances.ts` | `machine-singleton` | |
| `components/molecules/OpponentStrengthSelect.tsx` | `molecule-presentational` | |
| `components/organisms/DeckGame.tsx` | `organism-machine-bound` | Rendered inside `DeckPage`, which owns whether a game is on. No new screen kind. |

**Updated files.** `DeckPage.tsx` (the *Play it against Stockfish* control), `persistedState.utils.ts` and `appState.ts` (`opponentStrength`, default the 1320 step), `en.json` and `fr.json` (namespace `opponent`, inserted after `decks`), `VOCABULARY.md` (Auto opponent gains the move source `book` then `stockfish`).

**Tests.** The machine with a fake adapter. Book moves until the line ends, then a Stockfish move. The reader leaves the deck early and `opponent_left_deck` is recorded once. The load failure ends the game at the deck's end. An illegal move from the worker. The adapter with a fake worker and fake timers. No `ReviewEvent` is appended by a game.

**Gates.** G1 to G7. Then `pnpm dev`, one game on the Albin deck in `agent-browser` at 375 px, and a move by Stockfish after the deck ends. On the pull request's preview, `curl -sI https://borsouvertures-pr-<n>.preview.borso.fr/stockfish/stockfish-19-lite-single.wasm` shows the content type. `application/wasm` is expected and was not verified (ADR-2026-11-13T0003).

**Must not touch.** `site/public/stockfish/` (slice 1 vendored it), `vite.config.ts` (slice 1 wrote the cache rule), the review modules, `package.json`, any `api/` or `cdk/` path.

## Slice 6. Sync, with `domain/`, `api/`, `cdk/` and sign-in

**Goal.** The operator signs in on two devices and a review made on one shows on the other. Everyone else sees no difference. The slice is two commits (D21).

### Slice 6a. The API, the schema and the site's sync

Copy the app skeleton from `apps/banana-rush` (`api/src/app.ts`, `main.ts`, `main.dev.ts`, `database/`, `helpers/`, `test/`, `vitest.config.ts`, `vitest.mutation.config.ts`, `drizzle.config.ts`, the `dev` scripts). Copy the auth slice from `apps/pragma/api/src/auth/`, without passkeys and without enrolment (ADR-2026-11-13T0002). Apps do not import each other.

**Routes.**

| Route | Gate | Answer |
|---|---|---|
| `POST /api/auth/sign-in` `{ password }` | public, rate limited by address | 200 and the cookie, 401, 429 on the sixth failure, 503 `auth-not-bootstrapped` when no credential row exists |
| `POST /api/auth/sign-out` | session | 204 |
| `GET /api/auth/session` | public | 200 `{ signedIn: boolean }` |
| `POST /api/review-events` `{ events: ReviewEvent[] }`, 500 at most | session | 200 `{ accepted: { id, receivedAt }[] }`. An id already stored returns its stored `receivedAt`. |
| `GET /api/review-events?after=<cursor>` | session | 200 `{ events, nextCursor }`, 500 at most, ordered by `(received_at, id)`. The read starts one minute before the cursor. |
| `POST /api/__test/seed` | mounted only when `ALLOW_TEST_SEED` is `1` | 200 with a summary. It upserts and never wipes. |
| `POST /api/auth/enrol` | no route | 404 |

**Database.** The four tables of the spec, written in `*.schema.ts` and generated with `pnpm --filter @borso-app/borsouvertures run db:generate`. Do not write `ASYNC` by hand. The migration runner inserts it (read in `infra/cdk/src/internal/migration-runner/statement-rewrites.utils.ts`). No foreign key, no jsonb, no unique index (read in the summary of `docs/knowledge/dsql-postgres-compat-gaps.md`). The push is `INSERT ... ON CONFLICT (id) DO NOTHING`.

**New files.**

| File | Blueprint |
|---|---|
| `api/src/app.ts`, `main.ts`, `main.dev.ts` | `api-composition-root-with-one-error-translation`, `api-lambda-entrypoint`, `api-dev-entrypoint` |
| `api/src/database/client.ts`, `schema.ts`, `migrations/0000_initial.sql`, `migrations.audit.test.ts` | `database-client`, `database-schema-barrel`, `test-artifact-audit` |
| `api/src/auth/auth.controller.ts`, `auth.service.ts`, `auth.repository.ts`, `auth.schema.ts`, `auth.environment.ts` | `controller-split-routers`, `service-orchestration`, `repository-query` and `repository-atomic-counter`, `schema-dsql-constraints`, `environment-reader` |
| `api/src/auth/operator-session.core.ts`, `operator-session.middleware.ts`, `session-cookie.utils.ts`, `rate-limit.utils.ts` | `core-decision`, `middleware-session-gate`, `utils-pure-module` |
| `api/scripts/hash-password.ts` | thin shell. Prints the argon2id hash through the API's own function, for the seed script. |
| `api/src/review-events/review-events.controller.ts`, `.service.ts`, `.repository.ts`, `.schema.ts`, `review-events.core.ts` | `controller-guarded-router`, `service-clock-injected`, `repository-idempotent-upsert`, `schema-table-and-input`, `core-parse-untrusted` (the cursor) |
| `api/src/__test/test-seed.controller.ts`, `test-seed.service.ts`, `test-seed.repository.ts`, `test-seed-fixture.core.ts` | `controller-dispatch`, `service-orchestration`, `repository-idempotent-upsert`, `core-projection` |
| `test/setup-postgres.ts`, `database-utils.ts`, `auth-utils.ts`, `dev-database.setup.ts` | `test-global-setup`, `test-database-isolation` |
| `drizzle.config.ts`, `vitest.mutation.config.ts` | `workspace-test-config` |
| `site/src/lib/api.client.ts` | `typed-api-client` |
| `site/src/lib/queries/account.queries.ts` | `query-module`, `query-pessimistic-mutation` |
| `site/src/review/sync.core.ts` | `core-decision`. `selectUnpushedEvents`, `applyPushReceipt`, `advanceCursor`, `decideSyncOutcome(status)` giving `synced`, `signed-out`, `rejected` or `offline`. |
| `site/src/review/sync.adapter.ts` | `adapter-outcome-instead-of-a-throw`. Push then pull over `api.client.ts`. A 4xx other than 401 reports `SyncRejectedError` with the tags `status` and `route`. Offline reports nothing. |
| `site/src/review/sync.store.ts`, `sync.setup.ts` | `external-store-module`, `browser-edge-module`. The setup subscribes to the review log and to the `online` event, and runs one sync at start. The cursor is kept under the localStorage key `borsouvertures.sync-cursor`. |
| `components/organisms/SignInScreen.tsx`, `components/molecules/AccountLink.tsx`, `SyncPausedBanner.tsx` | `organism-form`, `molecule-presentational` |

The fixture. `test-seed-fixture.core.ts` holds `FIXTURE_OPERATOR_PASSWORD`, a fixture signing key, and about 30 review events over 14 days on Albin cards. Their position keys are constants. A test derives the same keys from `content/decks/albin-countergambit/deck.json` with `chess.js`, so the Lambda bundle carries no chess library and the fixture cannot drift from the deck.

**Updated files.** `domain/review-event.core.ts` only if the API needs a helper it lacks. `review-event-store.adapter.ts` gains `putReviewEvents` (pulled events, and receipts). `TopBar.tsx` shows `AccountLink` per D17. `OpeningTrainerPage.tsx` shows `SyncPausedBanner`. `main.tsx` wraps the page in `QueryClientProvider` and imports `sync.setup`. `app-screen.core.ts` gains `sign-in`. `package.json` gains, from the catalog, `hono`, `@hono/aws-lambda`, `@hono/zod-validator`, `zod`, `drizzle-orm`, `postgres`, `@aws-sdk/dsql-signer`, `@sentry/aws-serverless`, `@tanstack/react-query`, `@tanstack/react-form`, and `hash-wasm` at pragma's version, plus the dev dependencies `@hono/node-server`, `drizzle-kit` and `concurrently`. Its scripts take banana-rush's shape (`dev`, `dev:db`, `dev:api`, `dev:site`, `db:local:*`, `db:generate`, `test:core`, `test:e2e`, `test:full-suite`). `dev:db` must point at `test/dev-database.setup.ts`, which `scripts/check-app-registration.sh` checks, and print the fixture password on its `[dev:db]` line. `vitest.config.ts` becomes two projects, `core` and `back-e2e`. `tsconfig.json`, `vite.config.ts` and `stryker.config.js` gain `@api` and `api/`. `en.json` and `fr.json` gain `account`. `VOCABULARY.md` gains Account and loses "no server and no account". `docs/standards/06-data-fetching.md` gains the sentence of D16.

**Tests.** Back e2e on the local Postgres (`test-back-e2e`). A batch pushed twice stores each event once and returns the same `receivedAt`. A pull returns only events after the cursor, and an event inside the one-minute overlap is returned again. `POST /api/auth/enrol` answers 404. A sign-in before the credential exists answers `auth-not-bootstrapped`. An unsigned push gets 401. The sixth failed sign-in is rate limited. The seed route answers 404 without the flag. Pure tests of `sync.core`, with the 401, 4xx and offline outcomes, and a device clock ahead of the server replayed on the earlier time. Component tests of the sign-in form and of the hidden account link.

**Gates.** G1 to G8 with the project commands, `pnpm run knip`, then `pnpm --filter @borso-app/borsouvertures dev` and a sign-in with the password printed by `[dev:db]`, in two `agent-browser` profiles. A review made in one shows in the other.

**Must not touch.** `bin/app.ts`, `cdk.json`, the workflows, `infra/`, the content folders, the stats, card and opponent modules.

### Slice 6b. The stack and the workflows

**New and updated files.**

| File | Blueprint | Change |
|---|---|---|
| `cdk/bin/cdk.ts` (new), `bin/app.ts` (deleted) | `cdk-app-entrypoint` | Copy `apps/banana-rush/cdk/bin/cdk.ts` without the WebSocket entry. It builds `DsqlClusterStack` named `borsouvertures-cluster` and the app stack, and reads `BORSOUVERTURES_SENTRY_DSN`. |
| `cdk/lib/stack.ts` | `app-cdk-stack` | `buildBorsouverturesAppStack`. `new PreviewableApp(props.scope, 'Default', ...)` (D1). No `cloneFromSchema` on any stage (ADR-2026-11-13T0002). On prod, `readerPrincipalArns` and a `readerTableBlocklist` of `operator_credential`, `app_config` and `sign_in_attempt`. |
| `cdk/test/stack.test.ts` | `test-cdk-synth` | See the tests below. |
| `cdk.json` | | `"app": "tsx cdk/bin/cdk.ts"`. |
| `tsconfig.cdk.json`, `knip.json` | | `cdk/bin`, `cdk/lib`. The knip entry becomes `cdk/bin/cdk.ts` and gains `api/src/main.ts`, `api/src/**/*.test.ts` and `test/**/*.ts`. |
| `package.json` | | `destroy` targets `borsouvertures-pr-${PR_NUMBER}` only, as pragma's does. Today it runs `cdk destroy --all`, which would reach the cluster stack. |
| `.github/workflows/deploy.yml`, `preview.yml` | | One line each, `BORSOUVERTURES_SENTRY_DSN: ${{ matrix.app == 'borsouvertures' && vars.SENTRY_DSN || '' }}`. |
| `scripts/database/read-target.utils.ts` and its test, `scripts/db-read.sh`, `scripts/database/db-read.ts` | | Add `['borsouvertures/prod', 'prod']` and the app's name in the two usage texts. |
| `scripts/seed-operator-credential.sh` | follow `scripts/seed-admin-pin.sh` | Asks for the password without echo, hashes it with `api/scripts/hash-password.ts`, upserts `operator_credential` and the `app_config` signing key on `prod` under the `borso-admin` profile. |
| `docs/operator-backlog.md` | | The rows under "Operator backlog rows". |
| `docs/flows.md` | | Lines 23 and 93 to 95 say a preview looks up a cluster the prod stack owns and needs a first prod deploy. Every full-stack entry point builds the cluster stack itself (read in `apps/banana-rush/cdk/bin/cdk.ts` and in `docs/dantotsus/dsql-first-deploy-must-be-prod.md`). Correct the three lines. |
| `README.md` | | borsouvertures now has `api/`, `cdk/` and `domain/`. The root `CLAUDE.md` says the app has only `site/` and lists three apps for `db-read.sh`. No slice agent edits `CLAUDE.md`. The pull request body proposes the two lines to the operator. |

`.github/path-filters.yml` needs no change. The key `borsouvertures: 'apps/borsouvertures/**'` exists (read) and `scripts/check-app-registration.sh` passes (measured).

**Tests.** `cdk/test/stack.test.ts` asserts four things. The prod template still holds the 17 logical ids listed under "The preview path". `ALLOW_TEST_SEED` is absent from the prod template and present in the preview one (measured so in `logical-ids-full.mjs`). No resource carries a clone-from configuration. The reader blocklist holds the three tables.

**Gates.** G1 to G8, `pnpm --filter @borso-app/borsouvertures run synth` with `STAGE=preview PR_NUMBER=1 CDK_DEFAULT_ACCOUNT=123456789012` and again with `STAGE=prod` (CI runs the same synth with a placeholder account, read in `ci.yml`), `node_modules/.bin/vitest run scripts/database`, `pnpm run knip`.

**Must not touch.** `infra/cdk/`, `infra/shared/`, `.github/path-filters.yml`, any site or API source.

## Slice 7. Move statistics and counters (skipped)

No `LICHESS_TOKEN` exists, so this slice is not built. Nothing above depends on it. When the token exists, the slice adds `scripts/build-move-statistics.ts`, a committed `content/move-statistics.json` holding only the decks' positions with its fetch date and filters, and counters on the Stats screen (ADR-2026-11-13T0004). The backlog row for the token stays open.

## The preview path

**What the pull request's preview is, slice by slice.**

- After slices 1 to 5 the app is still a `StaticSite`. The preview deploys as it does today, and `preview.yml` skips the seed for an app with no `api/` folder (read).
- Slice 6a alone would turn the preview job red. The folder `api/src/__test` then exists while no API is deployed, so the seed step posts to a host that does not answer and exits 1 after the site has deployed (read at lines 346 to 401, the outcome inferred). For that reason 6a and 6b are pushed together.
- After 6b the preview is a `PreviewableApp`. Its site is at `borsouvertures-pr-<n>.preview.borso.fr` and its API at `borsouvertures-pr-<n>-api.preview.borso.fr` (read in `docs/knowledge/preview-api-cross-origin.md`). `preview.yml` already sets `VITE_API_BASE` for every app (read).

**What must be true for the preview of 6b to deploy and work.**

| Condition | Status |
|---|---|
| The first deploy creates the stack `borsouvertures-cluster` with one DSQL cluster. | `PreviewDeployRole` has `PowerUserAccess` and `dsql:CreateCluster` on `*` (read in `infra/shared/lib/deploy-roles.ts`). The cluster stack creates no IAM role (read in `dsql-cluster.ts`). Not verified until the push. |
| The existing preview stack updates in place. | Measured. With the construct id `Default`, the 5 logical ids of a preview and the 17 of prod are all kept. |
| The schema gets its tables. | `DsqlSchema` runs the migrations of `api/src/database/migrations` as a custom resource (read in `previewable-app.ts`). No clone is configured, so the schema starts empty. |
| The schema gets its seed. | `preview.yml` posts to `/api/__test/seed` after the deploy for an app that has `api/src/__test`, and fails the job on any answer but 200 (read). The route is mounted because `PreviewableApp` sets `ALLOW_TEST_SEED=1` on every non-prod stage (measured in the synthesised template). The seed neither clones nor wipes, so the step's skip rule does not apply (read). |
| A schema is free. | A new cluster holds no preview schema. The budget script counts `borsouvertures-pr-*` stacks (read). |
| The session cookie crosses from the site host to the API host. | Both hosts are under `borso.fr`, so `SameSite=Strict` still sends it, and `LambdaApi` answers with the site's origin and credentials (read in the knowledge entry). pragma's client sets `credentials: 'include'` (read). Not verified for this app until the preview exists. |
| CI runs the new suites. | `app-tests` runs `--project core` when `package.json` has `test:core`, and `--project back-e2e` when `apps/<app>/api/` exists, with a Postgres service (read in `ci.yml`). No workflow change is needed for that. |
| The teardown removes only the preview stack. | The `destroy` script of 6b. |

The 17 prod logical ids the stack test pins (measured, `logical-ids.mjs`): `SiteBucket978D4AEB`, `SiteBucketPolicy45F6EBA1`, `SiteBucketAutoDeleteObjectsCustomResource6B1A5EC1`, `SiteDistribution390DED28`, `SiteDistributionOrigin1S3OriginAccessControl4F95283E`, `SiteIndexRewriteFunctionF0A2C775`, `SiteAliasA5601B07F`, `SiteAliasAAAAD7B32221`, `SiteDeployAwsCliLayer25DE262D`, `SiteDeployCustomResource512MiB75AAA18F`, `SiteDeployFingerprintedAssetsAwsCliLayer4527917E`, `SiteDeployFingerprintedAssetsCustomResource512MiB78E33AD5`, `CustomCDKBucketDeployment8693BB64968944B69AAFB0CC9EB8756C512MiB6723FB92`, `CustomCDKBucketDeployment8693BB64968944B69AAFB0CC9EB8756C512MiBServiceRoleBA21DBC1`, `CustomCDKBucketDeployment8693BB64968944B69AAFB0CC9EB8756C512MiBServiceRoleDefaultPolicy96C3E726`, `CustomS3AutoDeleteObjectsCustomResourceProviderHandler9D90184F`, `CustomS3AutoDeleteObjectsCustomResourceProviderRole3B1BD092`.

**Verdict.** Slice 6b can break the preview for two reasons a session cannot fix.

1. The cluster creation is refused, by a permission boundary or a quota this session cannot read. `iam:*` is denied to a session (root `CLAUDE.md`).
2. The push of a change under `.github/workflows/` is refused. Every commit that touched a workflow was authored through the operator's merge (read in `git log`), so whether a session's token may push one is unknown.

Neither is expected (inferred from the role's policy and from banana-rush having the same entry point). Both show within one preview run.

**The fallback.** Revert the 6b commit and then the 6a commit with `git revert`, and push. No force-push is involved. Reverting 6b alone is not enough, because of the seed step above. The stack returns to a `StaticSite` with the same 5 logical ids, and CloudFormation removes the API and the schema it had added (inferred). The preview then serves slices 1 to 5 exactly. The evidence that this preview works is that it is today's deploy path with more static files. Two checks on the first preview after slice 1 confirm it. The page loads, and the `.wasm` has its content type. The pull request then says that sync is written, sits in two reverted commits and is not deployed, that `domain/` has one reader (D2), and adds a backlog row naming the refusal. Reverting the two reverts restores the slice once the operator has lifted the refusal.

A cluster that 6b created stays. It is deletion-protected and a closed pull request does not remove it (read in `docs/flows.md`, line 94). An idle cluster costs close to nothing (read in the summary of `docs/knowledge/dsql-serverless-pricing-vs-aurora.md`, price not restated). If ADR-2026-11-12T2359 is not ratified, deleting it is an operator task.

**The merge.** A merge deploys prod (root `CLAUDE.md`). The prod deploy creates nothing new if the preview already made the cluster stack. The app then answers `auth-not-bootstrapped` on sign-in until the operator runs the seed script, and works for everyone as a local trainer (ADR-2026-11-13T0002).

### Operator backlog rows

Slice 6b adds these to `docs/operator-backlog.md`. The first three are the spec's. The spec's fourth is dropped (D19).

| Task | Right it needs | How to check it is done |
|---|---|---|
| Create a Lichess personal API token and store it as `LICHESS_TOKEN` where a session can read it | The operator's Lichess account, a secret | `pnpm --filter @borso-app/borsouvertures run build:move-statistics` writes a file with at least one FEN |
| Run `scripts/seed-operator-credential.sh` once after the merge that ships sync, and again to change the password | The `borso-admin` AWS profile, with `psql` and `node` | A sign-in with a wrong password on `borsouvertures.borso.fr` answers 401 and no longer `auth-not-bootstrapped` |
| Grant `AI-Dev-ReadOnly` invoke on the borsouvertures agent-reader Lambda | IAM | `APP=borsouvertures scripts/db-read.sh "SELECT 1 AS ok"` returns `{"ok":1}` |
| Create the Sentry alert rules for `DeckContentInvalidError`, `SyncRejectedError` and `StockfishIllegalMoveError` (first occurrence in prod), and for `ReviewEventStoreUnavailableError` and `StockfishLoadFailedError` (5 in a day), each filtered on the tag `app:borsouvertures` | The Sentry project | The project lists five rules whose names hold the error names |

## Node 22 here, Node 24 in the repository

- The session has Node 22.23.4 only. The repository wants 24 (`.nvmrc` holds 24.22.3 and the root `package.json` says `>=24`). `ts-fsrs` 6.0.0 declares `>=24` (ADR-2026-11-13T0001).
- Installing here works. `pnpm install --frozen-lockfile --offline` printed `WARN Unsupported engine` and exited 0 (measured). `.npmrc` sets no `engine-strict` (read), so adding `ts-fsrs` warns and does not fail (inferred).
- Running here works. `ts-fsrs` 6.0.0 imported unbundled on Node 22.23.4 and scheduled with the pinned configuration (measured). The whole existing suite, lint, typecheck and build pass on Node 22 (measured, gates table).
- CI and deploys run on Node 24. Every workflow reads `node-version-file: .nvmrc` (read). The Lambdas run Node 24 (read in the subject of commit `f7af31767`).
- What this means. A green run here is a run on Node 22. CI is the first run on the version the dependency declares. A Node 24-only API used in new code would fail here and pass in CI, so a slice agent that meets one keeps it and says so. The reverse case is a difference between the two versions in something the code relies on. The golden scheduler test is the detector, because it compares exact floats.

## How each spec decision becomes code

| Spec ref | Decision | Where it lands | Self-check |
|---|---|---|---|
| Q.O.D. hand-curated lines | Decks are content files with one reader move per position | `content/decks/*/deck.json`, `scripts/decks/deck-build.core.ts` rules 1 to 5 | `build:decks` exits 0, and the rule tests |
| Q.O.D. what groups lines | A glob over `content/decks/*/deck.json` | `scripts/build-decks.setup.ts` | Deleting a deck folder and rebuilding changes no other file |
| Q.O.D. three card kinds | Move and trap cards in their deck, name cards in `opening-names` | `site/src/decks/card.core.ts`, slice 4 | Retention per deck in `retention.core.test.ts` ignores name cards |
| Q.O.D. sign-in precedent | pragma's slice, one credential, no enrolment | `api/src/auth/`, `scripts/seed-operator-credential.sh` | Back e2e, enrol answers 404 |
| Q.O.D. analytics | Counts come from `review_event` | `api/src/review-events/`, `recordProductEvent` | `APP=borsouvertures scripts/db-read.sh` once the reader is granted |
| Q.O.D. launch decks | Five folders | Slices 1 and 2 | `build:decks` prints five decks |
| Q.O.D. line length | 12 to 20 plies by default, `pliesPerLine` to override | `deck-source.core.ts` | Rule 2 test |
| Q.O.D. Vienna, Grand Prix | Two of the five folders | Slice 2 | Same as launch decks |
| Q.O.D. grading | Automatic and binary | `review-machine.utils.ts`, `scheduler.core.ts` | Machine tests, `Rating.Hard` and `Rating.Easy` appear nowhere |
| Q.O.D. new cards per day | 10, a setting from 0 to 30 on the device | `persistedState.utils.ts`, `daily-plan.core.ts`, `NewCardsPerDaySelect.tsx` | Plan test with the limit at 0 and at 30 |
| Q.O.D. day for the streak | The device's calendar day, stamped on the event | `domain/calendar-day.core.ts`, `streak.core.ts` | The time-zone test |
| Q.O.D. event and sync shape | Immutable events, state replayed, fuzz off | `domain/review-event.core.ts`, `scheduler.core.ts`, `review_event` | `grep -rn "cardState" apps/borsouvertures/api` finds no table or column |
| Q.O.D. two devices and a wrong clock | Keep both times, replay on the earlier | `selectReplayInstant` | The clock-ahead test |
| Q.O.D. browser storage | IndexedDB behind one adapter | `review-event-store.adapter.ts` | `package.json` has no `idb` |
| Q.O.D. move statistics | Optional slice, skipped | (out of scope, slice 7) | No `move-statistics.json` in the tree |
| Q.O.D. ideas | One Markdown file per deck and language, keyed by position | `ideas-markdown.core.ts`, D5, D6 | Parity and duplicate-key tests |
| Q.O.D. hand-written chess | Legality plus the Stockfish margin | `deck-build.core.ts`, `engine-gate.core.ts`, the `deck-content` job | `check:decks` exits 0 |
| Q.O.D. engine obligations | Two unmodified files, notices, source link | `site/public/stockfish/`, `stockfish-distribution.core.ts`, `THIRD_PARTY_NOTICES.md`, `CreditsScreen.tsx` | The digest test |
| Q.O.D. opponent strength | 1320 by default, up to 1900, three easier steps | `opponent-strength.core.ts` | Table test, one option family per step |
| Q.O.D. Lichess pin | A commit SHA and a dump date | `build-openings.ts`, `content/traps.json` | `grep -n "refs/heads/master" apps/borsouvertures/scripts` finds nothing |
| Q.O.D. Lichess studies | Not a source | (out of scope) | No importer in `scripts/` |
| Out of scope | Sign-up, passkeys, synced settings, push reminders, a paid LLM, deck editing, endgames, the next decks | (out of scope) | |
| Changes, vocabulary | New nouns, counts fixed | `VOCABULARY.md`, each slice its sections | `scripts/check-vocabulary-paths.sh` |
| Changes, database | Four tables, no clone | `api/src/**/**.schema.ts`, `cdk/lib/stack.ts` | `migrations.audit.test.ts`, the stack test |
| Changes, files, `pawn-structure.core` | Cut (D5) | (out of scope) | |
| Changes, files, `.github/path-filters.yml` | No change needed | (unchanged) | `scripts/check-app-registration.sh` exits 0 |
| Production, zero-defect | Five named errors with tags | `deck.utils.ts`, `review-event-store.adapter.ts`, `sync.adapter.ts`, `stockfish.adapter.ts`, `deck-game-machine.utils.ts` | Each adapter test asserts the report and its tags |
| Pattern coherence | The app keeps `useSyncExternalStore` stores and machine singletons for local state. TanStack Query enters for the two account calls only (D16). No second store pattern is added. | `review-log.store.ts`, `navigation.store.ts`, `account.queries.ts` | `grep -rn "useQuery\|useMutation" apps/borsouvertures/site/src` matches only `lib/queries/` and the organisms that call it |

## Mount-time contract

| State | External system | Call | When |
|---|---|---|---|
| Settings | localStorage `borsouvertures.v1` | `getItem`, then `setItem` on each change | Module load of `appState.ts`, as today |
| Device id | localStorage `borsouvertures.device-id` | `getItem`, `setItem` once | First review |
| Review log | IndexedDB `borsouvertures-review` | `open`, `getAll` | Start, before Today shows a count |
| Decks | `GET /decks.json` | `fetch` | Start, under `Suspense` |
| Service worker | `registerSW()` | | `main.tsx`, as today |
| Session (slice 6a) | `GET /api/auth/session` | TanStack Query | First render of the top bar |
| Sync (slice 6a) | `POST` and `GET /api/review-events` | `sync.setup.ts` | Start, each appended event, each `online` event, only when signed in |

## Risk register

| Risk | Severity | Mitigation in plan | Detection if it slips |
|---|---|---|---|
| The prod stack replaces its bucket and distribution when it becomes a `PreviewableApp`. | high | Construct id `Default` (D1). | The stack test pins the 17 ids. `STAGE=prod ... run diff` shows no replacement. The prod deploy fails loudly on a name clash. |
| The cluster cannot be created by the preview role. | medium | Push 6a and 6b together, read the first preview run. Fallback is the revert of 6b and 6a. | The `preview` job fails in CloudFormation on `borsouvertures-cluster`. |
| A session cannot push workflow changes. | medium | The `deck-content` job and the two DSN lines are separate hunks. If refused, they become backlog rows and `check:decks` stays a hand-back gate. | The push is rejected with a message naming the workflow scope. |
| The test seed is mounted on prod. | high | `selectTestSeedEnvironment` leaves the flag off on prod (measured). | The stack test, and the back e2e case that the route answers 404 without the flag. |
| An agent writes a line that loses material. | high | `check-decks` at 100 centipawns, ceiling 250. | The `deck-content` job. |
| An agent excuses a bad move with a reason that says nothing. | medium | The ceiling, the stale-exception rule, and the hand-back report listing every exception with its loss. | Review of the report. `/technical-validation` reads each exception. |
| The ideas are wrong chess in fluent prose. | medium | No gate reads prose. Ideas are short and tied to one move. | The operator, on the preview. This is a blind spot and it is stated in the pull request. |
| The `.wasm` is served with a type the browser refuses. | medium | Check the header on the first preview after slice 1. | The `curl -sI` gate of slice 5. `StockfishLoadFailedError` in Sentry. |
| The service worker precaches the engine for every reader. | low | `globIgnores` in slice 1. | The build prints the precache size. It was 1352 KiB for 10 entries before the feature (measured) and must not grow by 1.8 MB. |
| The `no-null-bytes` gate refuses the commit of the `.wasm`. | medium | Slice 1 adds the extension. | The pre-commit hook fails on the first commit. |
| Replaying the whole log at each start becomes slow. | low | None in this pull request. ADR-2026-11-13T0000 names the repair, a disposable cache. | A component test replays 5,000 events and fails over 200 ms. |
| Two app versions disagree on what is due. | low | Accepted (ADR-2026-11-13T0001). | The golden test fails on any library upgrade that moves a date. |
| A `ts-fsrs` behaviour differs between Node 22 and Node 24. | low | Exact pin. | The golden test in CI. |
| The IndexedDB adapter cannot reach 100% coverage. | medium | The factory is an option, so open and write failures are driven by a stub. | G5. |
| Mutation testing leaves survivors in the replay and build cores. | medium | G7 before hand-back. | The `mutation` job of `ci.yml`. |
| Two parallel slices edit the same file. | medium | The ownership table and the insertion anchors. | A merge conflict, resolved by keeping both in slice order. |
| A slice adds a pure module with no caller. | low | The rule is in the agent rules above. | `scripts/check-pure-modules-have-callers.sh` in the pre-commit hook. |
| The preview seed fails and blocks the preview job. | medium | The seed only upserts. Back e2e posts it twice. | The `Auto-seed preview` step prints the status and the body. |
| The cookie is not sent from the preview site to its API. | medium | Copy pragma's cookie and client settings. | The two-profile check on the preview. A 401 on every push, shown as the sign-in link. |
| The operator's reviews made before sign-in are lost. | medium | Sign-in pushes every local event whose `receivedAt` is null. | The sync test that starts with local events and an empty server. |
| A reader's stored settings are reset by the new fields. | low | Accepted once. Slices 1 and 5 ship in one release. | `persistedState.utils.test.ts`. |
| The puzzle dump cannot be streamed in a session. | low | Trap cards are cut and name cards ship. | `build:traps` fails. |
| `infra/cdk` needs a change after all. | medium | The plan changes nothing there. If a slice finds it must, it stops and reports, because that workspace is gated at 100% coverage and redeploys every app. | A diff under `infra/`. |
| A deck card id changes when a line is edited, and its history is orphaned. | low | The id is the position, not the line. Editing later moves keeps earlier ids. A removed position keeps its events unread (spec, edge cases). | None automated. Stated here. |

## Code-quality self-check

- [ ] Type assertions are only `as const` and `as unknown`.
- [ ] No `any`.
- [ ] No abbreviations and no one-letter locals outside loop indices. `uci`, `fen`, `san`, `url` and `id` are domain terms.
- [ ] Magic numbers and strings are named constants. The margin, the ceiling, the depth, the batch limit, the idea length and the plies defaults each have one.
- [ ] No prose comment. `// @FollowsBlueprint <id>` is the only comment added.
- [ ] Function names describe the result. No `handle`, `process`, `manage` or `do`.
- [ ] Commit scopes are `borsouvertures`, `ci` (the workflows), `meta` or `docs` where a root file is the only change.
- [ ] Every pure helper is in a `*.core.ts` or `*.utils.ts` with a sibling test at 100%.
- [ ] No `useEffect`. External values come through `useSyncExternalStore`, with `subscribe` and the snapshot reader at module scope.
- [ ] No condition outside a `*.core.ts` or `*.utils.ts`, beyond a guard that narrows or throws.
- [ ] No `core` or `utils` file imports an adapter.
- [ ] Every visible string is a catalogue key, except ideas and line names (D5, D9, and ADR-2026-11-13T0004).
- [ ] Every layout class is written for 375 px first.
- [ ] The site imports from the API only the router type, `import type { AppRouter } from '@api/app'`.
- [ ] The words banned in `VOCABULARY.md` appear in no identifier.

## Pre-flight gates

Run in order before the pull request opens, on the merged branch.

1. `pnpm --filter @borso-app/borsouvertures build`. Run on `9c208e212`, exit 0 in 5.4 s, precache 10 entries and 1352.39 KiB.
2. `pnpm --filter @borso-app/borsouvertures run build:decks` prints five decks. Needs slice 1. The rules were run on a stub, `example.mjs`, which replayed the worked example to six cards.
3. `pnpm --filter @borso-app/borsouvertures run check:decks` exits 0. Needs slice 1. Run on a stub, `gate-cost.mjs`, 14 moves in 7.4 s with the losses listed under "The Stockfish gate".
4. `pnpm --filter @borso-app/borsouvertures exec vitest run --project core --coverage`. The suite as it stands ran with `exec vitest run`, 340 tests, exit 0 in 13.4 s. Coverage was not run.
5. `pnpm --filter @borso-app/borsouvertures run test:e2e`. Needs slice 6a. Postgres 16 is installed here (measured, `/usr/lib/postgresql/16`). The script was not started.
6. `scripts/mutate-changed.sh origin/main apps/borsouvertures`. Not run. No pure file had changed.
7. `STAGE=prod CDK_DEFAULT_ACCOUNT=123456789012 pnpm --filter @borso-app/borsouvertures run synth`, then the same with `STAGE=preview PR_NUMBER=1`. Needs slice 6b. Run on a stub, `logical-ids-full.mjs`, which synthesised both stages with a `PreviewableApp` and kept every logical id.
8. `scripts/check-app-registration.sh`. Run, exit 0.
9. `pnpm run knip`. Not run.
10. `/technical-validation docs/features/borsouvertures/opening-trainer/spec/spec.md`.
11. On the preview, `curl -sI https://borsouvertures-pr-<n>.preview.borso.fr/stockfish/stockfish-19-lite-single.wasm` shows `content-type: application/wasm`, and `curl -s -o /dev/null -w '%{http_code}' -X POST https://borsouvertures-pr-<n>-api.preview.borso.fr/api/auth/enrol` prints 404.
12. `/visual-validation docs/features/borsouvertures/opening-trainer/spec/spec.md`, once, at the end, on the preview. The validator signs in with `FIXTURE_OPERATOR_PASSWORD`.

## Open questions / unknowns

None blocks. Each was decided above and is listed so the operator can overrule it at review.

- The spec and ADR-2026-11-13T0004 say a deck is one folder and also keep deck names in the catalogues. A sixth deck therefore edits `en.json` and `fr.json` too (D8).
- The spec lists `domain/` under slice 6 and needs its types in slice 1 (D2).
- The spec names rule-derived notes and never defines them (D5).
- The spec gives no place for the new-cards setting, no rule for a same-session second answer, and no rule for a card's first review in retention (slice 1 table, D13, D14).
- The spec's alert thresholds have no owner (D22).
- Unknown until the first run: the number of reader moves in five decks, the CI time of `check-decks`, the size of `decks.json`, the content type of the `.wasm` on the previews bucket, whether a session may push a workflow file, and whether the preview role may create the cluster.
- Not measured: `ts-fsrs` in a real browser, Stockfish in a real browser (ADR-2026-11-13T0001 and ADR-2026-11-13T0003 say the same).

## Missing technical skills

- A skill for content pipelines, a content folder, a build that validates it, and a loader that parses the output. This plan wrote that slice by hand.
- A skill for moving an app from `StaticSite` to `PreviewableApp`. The logical-id trap of D1 is in no document.
- A skill for a browser worker behind an adapter, with its fake for jsdom.
- No `/vite`, `/database` or `/controller` skill exists under `.claude/skills/` (measured, `ls`). Their parts of this plan were written from `docs/standards/` and the blueprints.
