# Technical validation — Train my openings every day, and keep my progress on every device

- Spec: [`../spec/spec.md`](../spec/spec.md)
- Plan: [`../plan/plan.md`](../plan/plan.md)
- Branch: claude/tender-pasteur-svwn2z
- Base: origin/main (round 2 diffs from the round-1 `Reviewed:` SHA `92f4c4bc6b289fc39a29f9b568445b767939c784`, passed as the full 40-character SHA to every `--changed` run)
- Run at: 2026-11-13T11:15:00Z
- Round: 2
- Reviewed: d8051b14f4378964ffa0b3a2c66786d74135c9f8
- Touched workspaces: `@borso-app/borsouvertures` (site, api, test helpers, VOCABULARY, DESIGN, PRODUCT), `@borso/infra` (`cf-host-routing-function.code.js`), `@borso/shared-infra` (template snapshot), the `synth` script of `banana-rush`, `borso-fr`, `last-loop-lepin`, `pragma` and `talos`, `knip.json`, `docs/standards/05-frontend-architecture.md`, the spec

Notes on the run.

- Scope is `git diff 92f4c4bc6..HEAD`, 8 commits, 120 files. No merge sits above the reviewed SHA (`git rev-list --merges 92f4c4bc6..HEAD` printed nothing).
- New scope beyond the fixes, walked under categories A, B and D as round 1 would: the Stockfish strength change (`5c0b87233`), the phone-first redesign (`fe7ea69c5`, `d8051b14f`) checked against `apps/borsouvertures/DESIGN.md` and the new standard 05 paragraphs, the preview routing-list fix (`c84b2a196`) and the synth race fix (`2256559bb`). Every new or changed source file under `apps/borsouvertures` was read in full against the reviewer checklist.
- Dismissals. `f30dc9d6e` dismisses round-1 B19 on the claim that the redesign removes the route's layout. That claim was checked (R06).
- Routing. Round 1 routed every numbered step, edge case and error case to `/visual-validation`. The fold rule and the preview rule at 375 × 812 are screen claims and are routed there too. 2 new screen claims routed to /visual-validation; out of scope for this report.
- Mutation testing was not run locally, per the brief. CI's `mutation` job for HEAD (run 43416649117) was still `in_progress` at the end of this review. The row is UNVERIFIABLE.

## A. Correctness vs spec

| # | Spec ref | Claim | Code (file:line) | Evidence (quoted) | Verdict |
|---|---|---|---|---|---|
| A01 | Q.O.D. "How strong is the opponent?" (amended, operator 2026-11-13) | Default 2000 | `site/src/opponent/opponent-strength.core.ts:48` | `export const DEFAULT_OPPONENT_STRENGTH: OpponentStrengthId = 'elo-2000';` | PASS |
| A02 | Same row | Selectable from 1320 to 2500, plus three easier `Skill Level` steps | `site/src/opponent/opponent-strength.core.ts:24-33` | `'elo-1320': { id: 'elo-1320', family: 'rating', level: 1320 },` … `'elo-2500': { id: 'elo-2500', family: 'rating', level: 2500 },` with `skill-0`, `skill-3`, `skill-6` above | PASS |
| A03 | Same row, commit `5c0b87233` "A stored choice is kept" | A persisted strength survives the default change | `site/src/state/persistedState.utils.test.ts:26,39` | `VALID_STATE` stores `opponentStrength: 'skill-3'` and is parsed back unchanged; only a missing or unknown value falls back to `'elo-2000'` (:65-76) | PASS |
| A04 | Database changes (round-1 A27) | The spec's table block matches the migration | `spec.md:188-189` | `CREATE TABLE sign_in_attempt (address_hash text PRIMARY KEY,  -- one atomic counter per address` / `attempt_count integer NOT NULL, window_started_at timestamptz NOT NULL);` | PASS |
| A05 | Result, "**Account.** A sign-in link in the top bar." (spec.md:43) and error case "The session cookie expired. The API answers 401, the app shows the sign-in link" (spec.md:88) | The sign-in link sits in the top bar and reappears on a 401 | `site/src/components/organisms/TopBar.tsx:36-41,58-59` | The top bar now holds only `<IconButton label={t('top-bar.settings')} icon="settings" …/>`, and `<AccountLink view={selectAccountLinkView(session.data)} …/>` renders only inside `{isSettingsOpen ? (<Modal …>`. Failing case: a signed-in device syncs, the API answers 401, `settleFailure` sets the session to `SIGNED_OUT` (`sync.setup.ts:89`). No element on the screen offers sign-in until the reader opens the gear, while the spec says the app shows the sign-in link. `VOCABULARY.md:37` still says "A 401 shows the sign-in link again." The spec was not amended, and `DESIGN.md` records the settings sheet as an agent choice, not as an operator rule. Fix size: one file (put `AccountLink` back in the top bar), or a spec amendment the operator approves | FAIL (blocking) |
| A06 | Use case 8 "the account's events are pulled", with the error case "The browser store cannot open (private mode, quota). The session runs in memory" | A device whose store cannot write still receives every page of the account's events | `site/src/review/sync.setup.ts:74-80` | `const isPulledPageStored = (await mergeIntoReviewLog(pull.events)) === 'stored';` / `if (isPulledPageStored) writeSyncCursor(…)` / `hasMore: isPulledPageStored && pull.hasMore,`. Failing case, introduced by the A35 fix: a signed-in browser with `indexedDB` unavailable (private mode), on an account holding 501 or more events. The first pull answers the oldest 500 events (`REVIEW_EVENT_BATCH_LIMIT`, `review-events.service.ts:49-51`) with `hasMore: true`. `persistReviewEvents` answers `'in-memory-only'`, so the cursor is not written and `hasMore` is forced to `false`, and the run stops. Every later sync starts again from a null cursor and pulls the same 500 oldest events. Events 501 onward, the most recent reviews from the other device, never reach that session, so its plan, streak and retention are wrong. Before the fix this path advanced and looped through every page. Test to write: stub `indexedDB` as `undefined`, answer page 1 with `hasMore: true` and page 2 for page 1's cursor, and assert both pages' events are in `readReviewLog().events`. Fix size: one file, keep an in-memory cursor for the session when the store cannot write | FAIL (blocking) |
| A07 | Operator rule, preview rule (`DESIGN.md`, standard 05) | A named deck, line or opening shows a mini board beside it | `molecules/DeckRow.tsx:32`, `DeckAccuracyRow.tsx:44`, `DeckLineDetails.tsx:24`, `RetentionGrid.tsx:30`, `organisms/DeckPage.tsx:71` | `board={<MiniBoard fen={buildDeckPreviewFen(deck.lines)} boardStyleId={boardStyle} orientation={deck.side} />}`; lines use `buildLineEndFen(line.movesSan)`; Explore's `OpeningsPanel`, `VariationsPanel` and `LinesPanel` already pass `board=`. A name card's choices carry none (`NameCardBody.tsx`), as `DESIGN.md` asks. The screen check is routed to `/visual-validation` | PASS |
| A08 | Operator rule, fold rule (`DESIGN.md` "Applied today") | Today, the deck page, Stats and Credits split into section tabs | `TodayScreen.tsx:31-34`, `DeckPage.tsx:29`, `StatsScreen.tsx:17`, `CreditsScreen.tsx:15-19` | `true: ['session', 'ahead', 'retention'], false: ['session', 'retention'],`; `const DECK_SECTIONS = ['review', 'lines', 'play'] as const`; `const STATS_SECTIONS = ['retention', 'accuracy'] as const`; `'lichess', 'wikipedia', 'stockfish'`. The measurement at 375 × 812 is routed to `/visual-validation` | PASS |
| A09 | Use case 1 "Today shows the due count, the new count, the streak and Start" | All four stay on Today's default tab | `TodayScreen.tsx:104,127-140` | `<TabPanel … tabId="session" isSelected={shownSection === 'session'}>` holds `<DailyCounts …/>`, `<StreakBadge …/>` and the `today.start` button; `useState<TodaySection>('session')` | PASS |
| A10 | Edge case "Nothing due and no new card left. Today says so and offers a deck to review ahead" | The ahead list appears only on an empty plan | `TodayScreen.tsx:31-34,92-95` | `SECTIONS_BY_EMPTY_PLAN` adds `'ahead'` only under `true`, and `AHEAD_PANEL_BY_EMPTY_PLAN` maps `false: EmptySlot`; `NOTHING_LEFT_BY_EMPTY_PLAN` shows `today.nothing-left` on the session tab | PASS |
| A11 | Use case 7 "Stockfish at the chosen strength" | The strength stays choosable before and during a game | `DeckGame.tsx:63`, `TopBar.tsx:49` | `<OpponentStrengthSelect strength={opponentStrength} />` in `DeckGameStart` and in the settings sheet | PASS |
| A12 | Preview deploys (`c84b2a196`) | borsouvertures previews route as a single-page app | `infra/cdk/src/internal/cf-host-routing-function.code.js:5` | `var SINGLE_PAGE_APPS = ['banana-rush', 'borsouvertures', 'last-loop-lepin', 'pragma'];`; the shared snapshot moves by one line | PASS |
| A13 | CI synth race (`2256559bb`) | Each app's synth reuses a current infra dist under a lock | `apps/*/package.json` `synth` | `"synth": "../../scripts/ensure-infra-built.sh && pnpm build && cdk synth --all",` in all five apps that changed; CI `build` job passed at HEAD (run 43416649117) | PASS |

## Round-1 findings (round 2 only)

| # | Round-1 row | Fixed by | Verdict |
|---|---|---|---|
| R01 | A33, an offline deck load reported as `DeckContentInvalidError` | `f30dc9d6e` `site/src/decks/decks-source.adapter.ts:13` `return error instanceof SyntaxError ? ARRIVED_AS_NO_JSON : UNREACHABLE;` and `decks-load.utils.ts:16` `if (fetched.status === 'unreachable') return UNREACHABLE;` (`failure: null`, so `decks-resource.setup.ts:11` reports nothing). Pinned by `OpeningTrainerPage.decks-unreachable.test.tsx:28-31` `expect(sentry.captureException).not.toHaveBeenCalled();` and `decks-source.adapter.test.ts` `answers unreachable on a network failure` | PASS |
| R02 | A35, the sync cursor advanced before the pulled events were stored | `f30dc9d6e` `sync.setup.ts:74-75` writes the cursor only when `mergeIntoReviewLog` answers `'stored'`, and `review-log.store.ts` now awaits `putStoredReviewEvents`. Pinned by `sync.setup.test.ts:37` `toBe(NEXT_CURSOR)` and `sync.setup.unavailable-store.test.ts:30` `toBeNull()`. The round-1 failing case no longer occurs. The fix opens a new failing case on the in-memory path, graded as A06 | PASS |
| R03 | D28, a refused push reaching Sentry had no test | `f30dc9d6e` `sync.setup.rejected-push.test.ts:29-35` `it('reports the refusal to Sentry, tagged with its status and route, and pauses the sync', …)` asserting `expect(sentry.captureException).toHaveBeenCalledWith(expect.objectContaining({ name: 'SyncRejectedError' }), { tags: { status: '422', route: 'POST /api/review-events' } })`. Deleting the `reportTaggedError` call at `sync.setup.ts:87` would fail it | PASS |
| R04 | E02, no concurrent push test | `f30dc9d6e` `review-events.controller.test.ts:92-105` `stores a batch pushed twice at once from two sessions once, …` fires `Promise.all([push(firstCookie, buildEvents(1, 3)), push(secondCookie, buildEvents(1, 3))])` and asserts `expect(second).toEqual(first)` and `expect(await countReviewEvents()).toBe(3)`; passed here (776 ms) | PASS |
| R05 | E04, no concurrent sign-in test | `f30dc9d6e` `auth.controller.test.ts:83-95` fires seven wrong passwords through `Promise.allSettled` and asserts `[401, 401, 401, 401, 401, 429, 429]` and `expect(await listSignInAttemptCounts()).toEqual([7])`; passed here (1548 ms) | PASS |
| R06 | B19 (non-blocking), dismissed in `f30dc9d6e` on the claim that the redesign removes the route's layout | `fe7ea69c5` `site/src/routes/OpeningTrainerPage.tsx` now returns only `<QueryClientProvider client={queryClient}><TrainerShell /></QueryClientProvider>`; the layout `div` lives in the organism `TrainerShell.tsx:20`. The claim holds | PASS |

## B. Code cleanliness

| # | Rule | Check | Evidence | Verdict |
|---|---|---|---|---|
| B01 | No abbreviations or one-letter locals | read in full | none found in the changed files; names such as `isPulledPageStored`, `selectNameCardBoardWidth`, `readBoardPlacement`, `SECTIONS_BY_EMPTY_PLAN`, `ARRIVED_AS_NO_JSON` | PASS |
| B02 | Magic numbers and strings in named constants | read in full | `NAME_CARD_PHONE_BOARD_PX = 288`, `ROOMY_BREAKPOINT_PX = 601`, `RANK_COUNT = 8`, `SQUARE_COLOUR_PERIOD = 2`, `ICON_PIXELS = 24`, `UNPROCESSABLE_STATUS = 422` | PASS |
| B03 | No prose comments | `grep -nE '^\s*(//\|/\*)'` on the 101 changed `.ts`/`.tsx`/`.js` files, minus blueprint and disable markers | two hits, both in hunks this round did not add (`api/src/database/client.ts:1`, `i18n-parity.core.test.ts:6`), and lint passes | PASS |
| B04 | Type assertions limited to `as const` and `as unknown` | grep ` as [A-Z{]` | none found | PASS |
| B05 | No `any` | `grep -nP '\bany\b'` on changed files | none found | PASS |
| B06 | `noUncheckedIndexedAccess` honoured | read in full | `PIECE_CODE_BY_FEN_LETTER[letter]` checked `!== undefined` (`board-placement.utils.ts:32-33`); `const previewLine = lines[0]; return previewLine ? …` (`previews.utils.ts:51-52`); `progress.deckProgress[index]` and `statistics.recentRetention[index]` checked for `undefined` | PASS |
| B07 | Lint clean | `pnpm exec oxlint --type-aware <101 changed files>` | exit 0, no output | PASS |
| B08 | knip (round-1 B05) | `pnpm run knip` | exit 0; the two borsouvertures "Remove redundant entry pattern" hints are gone, the hints left belong to other apps and to `.css` | PASS |
| B09 | `useEffect` is a smell | `grep -nE '\buse(Layout)?Effect\('` on changed files | none found | PASS |
| B10 | Standards 01: "a definition in a `VOCABULARY.md` is still true" | read in full | `- The strength is one of seven steps in` at `apps/borsouvertures/VOCABULARY.md:74`, two lines above `Three easier steps … Seven set UCI_Elo 1320, …, 2500.` The table has ten steps (`opponent-strength.core.ts:24-33,35-47`). Introduced: this branch (`5c0b87233`); Fix size: one line | FAIL (non-blocking) |
| B11 | Standards 01: "a definition in a `VOCABULARY.md` is still true" | read in full | `A 401 shows the sign-in link again.` at `apps/borsouvertures/VOCABULARY.md:37`. Since `fe7ea69c5` the link renders only inside the closed settings sheet (`TopBar.tsx:41,58`). Introduced: this branch; Fix size: one line, or none if A05 is fixed in code | FAIL (non-blocking) |
| B12 | Standards 02: "the choice between `.core.ts` and `.utils.ts`" | read in full | `export function selectShownSection<Section extends string>(` at `site/src/components/organisms/section-tabs.core.ts:2` is a cross-cutting UI helper with no domain meaning, and it sits in the horizontal `components/organisms/` folder, where standard 02 places `.utils.ts` (its sibling `components/atoms/section-tabs.utils.ts` already is one). Introduced: this branch; Fix size: one file rename plus its test and four imports | FAIL (non-blocking) |
| B13 | Standards 08: "a set of more than two visual variants goes through `cva`" | read in full | `const BAND_CLASS_BY_TONE: Record<StatusBandTone, string> = { asking: …, recalled: …, missed: … };` at `site/src/components/atoms/StatusBand.tsx:8`, three variants in a hand-built table. The app has no `class-variance-authority` dependency yet (pragma and banana-rush use it). Introduced: this branch; Fix size: one file plus the dependency | FAIL (non-blocking) |
| B14 | Standards 03: a derived type is derived (round-1 B14) | read in full | `export type StoredReviewEvent = Readonly<ReviewEventRow>;` (`review-events.core.ts:26`); `export type PushReceipt = Readonly<InferResponseType<ApiClient['api']['review-events']['$post'], 200>['accepted'][number]>;` (`sync.core.ts:15-17`) | PASS |
| B15 | Standards 04 and 11: a multi-table write in one transaction owned by the service (round-1 B15) | read in full | `await runInOneSeedTransaction(async (executor) => { await insertSigningKeyUnlessStored(…, executor); await insertOperatorCredentialUnlessStored(…, executor); await storeReviewEventsWithin(executor, …); });` (`test-seed.service.ts:25-39`) | PASS |
| B16 | Standards 02: a site limit does not restate an API one (round-1 B16) | read in full | `"rate-limited": "Too many attempts. Try again later."` (`en.json:49`) no longer restates the 15-minute window | PASS |
| B17 | Standards 01: `Held by:` on behavioural invariants (round-1 B18) | read in full | `Held by: site/src/review/daily-plan.core.test.ts › counts a card on the day of its first review only, whichever device made it` (`VOCABULARY.md:359`) and the Review invariant at :551; both test names exist and ran | PASS |
| B18 | Standards 05: a route composes organisms and owns no layout primitive | read in full | `OpeningTrainerPage.tsx` returns `<TrainerShell />` inside the provider | PASS |
| B19 | Standards 05: no prop set grows a family of booleans | read in full | new props carry one boolean each (`TabPanel.isSelected`) or a variant string (`StatusBand.tone`, `Icon.name`) | PASS |
| B20 | Standards 05: no label explains the interface | read the new `en.json` keys | new labels are short nouns (`"Session"`, `"Ahead"`, `"Read all"`, `"Settings"`, `"2500 rating"`) | PASS |
| B21 | Standards 09: a key's dotted path names the screen and the element | read the new keys | `today.sections.session`, `decks.sections.play`, `stats.sections.accuracy`, `credits.sections.stockfish`, `review.idea.read-all`, `top-bar.close-settings`; parity test passed | PASS |
| B22 | Standards 10: a test name states the behaviour and the condition | read the new tests | e.g. `keeps the cursor where it was, so the next pull fetches the events it could not store`, `answers unreachable when the connection drops while the body streams`, `falls back to the first section once the chosen one is no longer offered` | PASS |

## C. Tests pass

| # | Workspace | Command | Exit | Verdict |
|---|---|---|---|---|
| C01 | @borso-app/borsouvertures, core | `pnpm --filter @borso-app/borsouvertures exec vitest run --project core --changed 92f4c4bc6b289fc39a29f9b568445b767939c784 --coverage --reporter=verbose` | 0. 34 files and 251 tests passed, including the feature's new files `sync.setup.test.ts`, `sync.setup.rejected-push.test.ts`, `sync.setup.unavailable-store.test.ts`, `OpeningTrainerPage.decks-unreachable.test.tsx`, `board-placement.utils.test.ts`, `section-tabs.utils.test.ts`, `section-tabs.core.test.ts`, `review-tone.core.test.ts`. Coverage of the changed gated files 100% statements, branches, functions and lines | PASS |
| C02 | @borso-app/borsouvertures, back e2e | `pnpm --filter @borso-app/borsouvertures run test:e2e --changed 92f4c4bc6b289fc39a29f9b568445b767939c784 --reporter=verbose` | 0. 3 files and 19 tests passed (`test-seed.controller.test.ts`, `auth.controller.test.ts`, `review-events.controller.test.ts`) | PASS |
| C03 | @borso/infra | `pnpm --filter @borso/infra exec vitest run --changed 92f4c4bc6b289fc39a29f9b568445b767939c784` | 0. 36 files and 639 tests passed, including `cf-host-routing-function.test.ts` and the eradication checks | PASS |
| C04 | @borso/shared-infra | `pnpm --filter @borso/shared-infra exec vitest run --changed 92f4c4bc6b289fc39a29f9b568445b767939c784` | 0. 2 files and 42 tests passed (template snapshot) | PASS |
| C05 | `*.utils.ts` have sibling tests | `ls` of the changed `*.utils.ts` | `board-placement.utils.ts`, `section-tabs.utils.ts`, `decks-load.utils.ts`, `viewport.utils.ts`, `previews.utils.ts` each have a `*.utils.test.ts` that ran in C01 | PASS |
| C06 | Mutation on the changed gated files | CI `mutation` job, run 43416649117 at HEAD | `in_progress` when this review ended; not run locally per the brief | UNVERIFIABLE |
| C07 | CI at HEAD | run 43416649117 | `build`, `deck-content` and `app-tests (borsouvertures)` completed with `success` | PASS |

No `pnpm-lock.yaml` or catalog change in this range, so no full suite was owed.

## D. Test coverage of spec

2 new screen claims (the fold rule and the preview rule at 375 × 812) routed to /visual-validation; out of scope for this report. Round 1 routed every numbered step, edge case and error case there as whole rows. The rows below are the round-1 blocking D row and the Vitest-pinnable claims of the new scope.

| # | Use case | Covering test | Verdict |
|---|---|---|---|
| D01 | Error case: a push refused with a 4xx reaches Sentry (round-1 D28) | `sync.setup.rejected-push.test.ts:29` `reports the refusal to Sentry, tagged with its status and route, and pauses the sync`; assertion `expect(sentry.captureException).toHaveBeenCalledWith(expect.objectContaining({ name: 'SyncRejectedError' }), { tags: { status: String(UNPROCESSABLE_STATUS), route: 'POST /api/review-events' } })` and `expect(readSyncStatus()).toBe('paused')` | PASS |
| D02 | Offline deck load reports nothing (round-1 A33) | `OpeningTrainerPage.decks-unreachable.test.tsx:28` `offers a reload and reports nothing, because being offline is not an error`; assertion `expect(sentry.captureException).not.toHaveBeenCalled();` | PASS |
| D03 | A deck file that arrives and does not parse is still reported | `decks-load.utils.test.ts` `fails on a body that arrived and is no deck document, naming no deck`; assertion `expect(selectDecksLoad({ status: 'arrived', body: null }).failure?.deckId).toBe('unknown')`; and `decks-source.adapter.test.ts` `hands over an empty body when the answer arrived and is no JSON`, `toEqual({ status: 'arrived', body: null })` | PASS |
| D04 | Pulled events are stored before the cursor moves (round-1 A35) | `sync.setup.test.ts:32` `stores the pulled events, then moves the cursor past them`; assertion `expect(window.localStorage.getItem(SYNC_CURSOR_STORAGE_KEY)).toBe(NEXT_CURSOR)` after `readReviewLog()` equals `{ events: [LAPTOP_REVIEW], isProgressKept: true }` | PASS |
| D05 | A device whose store cannot write receives every page of the account's events (A06) | (none found). `sync.setup.unavailable-store.test.ts:24` stubs a single page with `hasMore: false` (`sync-setup.test-utils.ts:33`), so the second page is never asked for | FAIL (blocking) |
| D06 | Stockfish default 2000, steps up to 2500 | `opponent-strength.core.test.ts` `defaults to the 2000 step`, `expect(DEFAULT_OPPONENT_STRENGTH).toBe('elo-2000')`; `DeckGame.test.tsx` `offers the game with the 2000 step selected, …` asserting the option list ends `'2000 rating', '2200 rating', '2500 rating'` and the worker receives `'setoption name UCI_Elo value 2000'` | PASS |
| D07 | A chosen section that a screen stops offering falls back to the first | `section-tabs.core.test.ts` `falls back to the first section once the chosen one is no longer offered` | PASS |
| D08 | A mini board reads the FEN placement from the reader's side | `board-placement.utils.test.ts` `turns the board round when Black sits at the bottom`, `colours a1 dark and h1 light, as on every board` | PASS |
| D09 | A name card's board shrinks on a phone so its four choices fit | `viewport.utils.test.ts` `shrinks the board on a phone so the band and the four names fit above the action bar` and `keeps the full board from the roomy breakpoint upwards, …` | PASS |

## E. Scale

| # | Write path or state | Question | Failing case, or the key or test that holds it | Verdict |
|---|---|---|---|---|
| E01 | `seedPreviewFixture` → `runInOneSeedTransaction` (`api/src/__test/test-seed.repository.ts:5-9`, `test-seed.service.ts:25`) | Check-then-write | Each of the three inserts is `onConflictDoNothing` on its primary key (`appConfigTable.id`, `operatorCredentialTable.id`, `reviewEventTable.id`), with no read before it, so two seeds at once insert one row each. Mounted off prod only, called once per deploy (round-1 E07 stands as non-blocking and is not re-raised) | PASS |
| E02 | `storeReviewEventsWithin` → `insertReviewEventsUnlessStored` (`review-events.service.ts:34-42`, `review-events.repository.ts:7-14`) | Check-then-write | Held by the primary key `review_event.id` through `.onConflictDoNothing({ target: reviewEventTable.id })`; concurrent proof in R04 | PASS |
| E03 | Sign-in rate limit (unchanged code, round-1 E04) | Concurrent proof | `auth.controller.test.ts:83-95`, seven at once, two refused, `attempt_count` 7 | PASS |
| E04 | Module-level state added or relied on | Per-process state | `grep -nE '^(let\|const) [a-zA-Z]+ = new (Map\|Set)\|^let '` on the changed api and site files finds `let cachedDatabase` (`database/client.ts:29`, a connection cache, holds no rule) and `const listeners = new Set` (`review-log.store.ts:22`, browser-side). No application rule is held in per-instance state | PASS |

## Blocking findings

- A05 — The sign-in link left the top bar for the settings sheet, so a 401 no longer shows it, against spec.md:43 and :88. Restore it in the top bar, or have the operator amend the spec.
- A06 — On a browser whose store cannot write, sync now pulls only the oldest 500 events forever, because the cursor stays put and `hasMore` is forced to false.
- D05 — No test fires a multi-page pull on a browser whose store cannot write.

## Non-blocking findings

- B10 — `VOCABULARY.md:74` says "one of seven steps"; there are ten.
- B11 — `VOCABULARY.md:37` says a 401 shows the sign-in link again; it is now hidden in the settings sheet.
- B12 — `section-tabs.core.ts` holds a generic UI helper in `components/organisms/`; it is a `.utils.ts`.
- B13 — `StatusBand` has three visual variants in a hand-built table rather than `cva`.

## Notes

- C06: CI's `mutation` job at HEAD was still running. Check run 43416649117 for surviving mutants in `decks-load.utils.ts`, `decks-source.adapter.ts`, `board-placement.utils.ts`, `viewport.utils.ts`, `previews.utils.ts`, `section-tabs.*`, `review-tone.core.ts` and `opponent-strength.core.ts` before merge.
- `decks-source.adapter.ts:10` answers `unreachable` for every non-2xx answer, so a deploy that ships without `/decks.json` (a 404 on prod, where no SPA rewrite applies) would show the reload panel and report nothing. Is a 404 or 5xx from our own origin meant to count as offline?
- `IdeaPanel.tsx` hides the Wikipedia CC BY-SA credit on phones behind *Read all*, while the two-line preview of the idea text stays visible. Does the spec's licence row ("A file based on Wikipedia carries its source") need the credit beside every shown excerpt?
- `Modal.tsx` draws its own close glyph inline although `Icon` gained an identical `close` entry in the same commit. No checklist bullet covers it.
- `DESIGN.md`'s settings-sheet paragraph lists the board theme, the language, Credits and the account, but not the Stockfish strength `d8051b14f` added to it.
- The spec's Result mock still shows Today's retention list under Start. The fold rule the operator recorded moves it to a tab. Should the spec's mock follow, so the next reader does not take it as the contract?

## Verdict: FAIL
