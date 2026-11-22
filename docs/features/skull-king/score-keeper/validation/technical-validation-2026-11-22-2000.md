# Technical validation — Skull King score keeper

- Spec: [`../spec/spec.md`](../spec/spec.md)
- Plan: [`../plan/plan.md`](../plan/plan.md)
- Branch: claude/adoring-feynman-vfakdj
- Base: 4955c343bc0250f6f445fae833a892921647985a
- Run at: 2026-11-22T20:11:22Z
- Round: 2
- Reviewed: 368616fc0a34e499f3ac0c2509b0e8315c610433
- Touched workspaces: `@borso-app/skull-king`, `@borso-app/pragma` (`package.json` only, `@tanstack/react-table` moved to the catalog at the same 8.21.3), root tooling (`scripts/mockup/mockup-copy.core.test.ts`), `pnpm-workspace.yaml`, `pnpm-lock.yaml`

Round 2 reads `git diff a8e0cfb8cd42367b8b33b04bf623e6e0f3740970..HEAD` (two commits, 58 files) and re-checks each blocking finding of the round-1 report. No merge sits above the base or the reviewed SHA (`git rev-list --merges` printed nothing). HEAD stayed at the reviewed SHA for every run, and `git status --short` was empty at the end.

No commit after the reviewed SHA dismisses a round-1 finding. The fix commit's message names fixes only (`git log a8e0cfb8..HEAD --format=%B`).

The fix commit also amends the spec (*Data shape* `revision`, the three accepted phase moves, the serialised write, the pending-edit cache in *Sync*) and the plan was not updated. Category A therefore has one row per claim of that amendment, with files taken from the diff, and one row naming the gap. Categories A and D were walked for the one file round 1 never read, `site/src/lib/game-cache.core.ts`.

0 use cases of this round routed to /visual-validation; the 14 routed in round 1 stay out of scope for this report.

## A. Correctness vs spec

| # | Spec ref | Claim | Code (file:line) | Evidence (quoted) | Verdict |
|---|---|---|---|---|---|
| A01 | Spec amendment in 368616fc | spec amended after the plan; files taken from the diff | docs/features/skull-king/score-keeper/plan/plan.md (last changed in a8e0cfb8c) | `grep -i "revision\|pending edit\|game-cache" plan.md` prints nothing | UNVERIFIABLE |
| A02 | Data shape | `GameView.revision: number`, bumped by every write; `game.revision` nullable, every insert writes 0, `null` reads as 0 | api/src/games/games.schema.ts:19; api/src/games/games.repository.ts:60-71, 115; api/src/games/game-view.core.ts:121; migrations/0005_game_revision.sql:1 | `revision: integer('revision'),` … `.set({ revision: sql\`coalesce(${gameTable.revision}, 0) + 1\`, updatedAt: now })` … `revision: INITIAL_REVISION,` … `revision: input.game.revision ?? UNWRITTEN_REVISION,` … `ALTER TABLE "game" ADD COLUMN "revision" integer;` | PASS |
| A03 | API: `PUT /phase` accepts three moves, any other target answers `value-out-of-range` | api/src/games/game-write.core.ts:147-181 | `if (!isWithin && !isNextRound(current, target) && !isClosingLastRound(current, target)) { return 'value-out-of-range'; }`, with `isNextRound` = `target.round === current.round + 1 && target.phase === 'bidding'` and `isClosingLastRound` = `current.round === ROUND_COUNT && current.phase === 'scoring' && target.round === ROUND_COUNT` | PASS |
| A04 | API: `bids-missing` for scoring with a missing bid; `tricks-unbalanced` for the next round or finishing while a played round does not balance | api/src/games/game-write.core.ts:176-179 | `if (target.phase === 'scoring' && !areBidsPlaced(facts.rounds, target.round)) { return 'bids-missing'; }` `if (!isWithin && !facts.rounds.every(isBalanced)) return 'tricks-unbalanced';` | PASS |
| A05 | API: every write to a game runs in one transaction that bumps `game.revision` first, then reads what it checks, then writes; a DSQL abort retries the whole write up to three more times | api/src/games/games.service.ts:90-120; api/src/helpers/persistence/conflict-abort.core.ts:29-41 | `await runInOneTransaction(async (executor) => { const game = await takeGameTurn(executor, joinCode, visit.now); const after = await write(executor, game); …` with `CONFLICT_RETRIES = 3`; `if (retries > 0 && isConflictAbort(error)) { return await retryOnConflictAbort(operation, retries - 1); }`. `writeEntry`, `writeRound`, `movePhase`, `changePlayer`, `claimSeat` and `startRematch` all go through `writeGame` | PASS |
| A06 | Sync: each broadcast, a write's own answer and a read go through one comparison (higher `revision`, or same revision and later `readAt`), always, even while a write is in flight | site/src/lib/game-cache.core.ts:13-27; site/src/lib/game-socket.hook.ts:30-32; site/src/lib/queries/game.queries.ts:70, 141 | `if (incoming.revision > cached.revision) return true; if (incoming.revision < cached.revision) return false; return Date.parse(incoming.readAt) >= Date.parse(cached.readAt);`; the socket now calls `queryClient.setQueryData<GameCache>(gameKeys.detail(joinCode), (cache) => receiveBroadcast(cache, event.data, joinCode))` with no pending-write test | PASS |
| A07 | Sync: the taps this phone has not heard back about are kept apart and laid over the newest server view | site/src/lib/game-cache.core.ts:56-58; site/src/lib/queries/game.queries.ts:134-147 | `return cache.pending.reduce((game, pending) => applyGameEdit(game, pending.edit), cache.server);`; `onMutate` calls `addPendingEdit`, `onSettled` calls `dropPendingEdit`; `useGame` reads through `select: selectShownGame` | PASS |
| A08 | API table: `POST /` takes 3 to 8 players (spec corrected from 2 to 8, the round-1 note) | spec.md › API | the spec now reads `(3 to 8)`, matching the enforced minimum round 1 quoted | PASS |
| A09 | Round-1 A29 (non-blocking): `PUT /phase {round: 10, phase: 'finished'}` from round 1 | api/src/games/game-write.core.ts:173-175 | from `{round: 1, phase: 'scoring'}` the target is neither within the round, the next round nor the close of round 10, so it answers `value-out-of-range`; pinned by `it('refuses to finish from an earlier round, from the bids of the last one, or onto another round')` game-write.core.test.ts:341 | PASS |

## Round-1 findings

| # | Round-1 row | Fixed by | Verdict |
|---|---|---|---|
| R01 | A32 / D34 — a broadcast dropped while this phone has a write in flight | `368616fc` site/src/lib/game-socket.hook.ts:30-32 no longer reads `isMutating`; every path goes through `receiveGame` (game-cache.core.ts:25-27), and the optimistic tap lives in `pending`, not in the server view. Round 1's sequence now ends with A holding B's view of the higher revision and A's own pending bid laid over it: `it('writes each broadcast unless the cached view is newer, even while this phone has a write pending')` game-cache.core.test.ts:101, `expect(received?.server).toStrictEqual(fromLea);` and `expect(bidsShown(received)).toEqual([1, 0]);` (:108, :110). A's later answer of a lower revision loses: `it('keeps the cached view when the incoming one is of an earlier revision, even read later')` :80 | PASS |
| R02 | C03 — 33 surviving mutants in 13 gated files of `apps/skull-king` | `368616fc`; `scripts/mutate-changed.sh a8e0cfb8… apps/skull-king` mutated 16 changed gated files, among them every file round 1 named: 956 mutants, 0 survived, score 100.00 (exit 0) | PASS |
| R03 | C05 — 5 surviving mutants in `scripts/mockup/mockup-copy.core.ts` | `368616fc` scripts/mockup/mockup-copy.core.test.ts:19-24 (`'<b>un</b><i>deux</i>'` → 2) and :36 (a screen at exactly the limit); `scripts/mutate-changed.sh a8e0cfb8… scripts/mockup`: 20 mutants, 0 survived, score 100.00 (exit 0) | PASS |
| R04 | D37 — no test refuses a challenge answered after its two minutes | `368616fc` `it('refuses a challenge answered once its two minutes are over')` api/src/accounts/accounts.controller.test.ts:229. It answers at exactly issue time + 120 000 ms (:234) and expects `400` / `passkey-not-verified` (:240-241), and answers a second challenge 1 ms before its end and expects `201` (:237, :242). Changing `now >= stored.expiresAt` (accounts.service.ts:78) to `>` or dropping it fails :240 | PASS |
| R05 | E03 — two phones giving Harry (or Rascal) to two players of one round at once both succeed | `368616fc` the check now runs after the revision bump inside one transaction (games.service.ts:176-195) and applies the write to the round's entries before asking the domain's `isBidAdjustedOnce` / `isRascalBetOnce` (game-write.core.ts:65-71). `it('gives Harry the Giant to the first of two players asking for it at once')` games.controller.test.ts:482 holds the game row until both writers wait on it, then expects `200`, `400` / `value-out-of-range` and one non-zero `bid_adjustment` row (:493-503) | PASS |
| R06 | E05 — a correction that unbalances a round and a phase move sent together both succeed | `368616fc` `movePhase` reads the rounds after the bump in the same transaction (games.service.ts:218-229). `it('refuses to leave a round that a correction sent at the same instant unbalances')` games.controller.test.ts:506 expects `correction` `200`, `move` `409` / `tricks-unbalanced`, and the game still at `[1, 'scoring']` (:517-520) | PASS |
| R07 | E02 — join code claim, no concurrent test | `it('gives a join code to one of two games claiming it at once, and nothing to the other')` games.controller.test.ts:450, both writers held on `join_code_claim`, then one `null`, one `join_code_claim` row, one `game` row and 4 `player` rows (:471-479) | PASS |
| R08 | E08 — seat claim, no concurrent test | `it('gives a seat to the first of two accounts claiming it at the same instant')` accounts.controller.test.ts:378: `200`, `409` / `seat-taken`, and one `player` row linked to Hugo (:392-400) | PASS |
| R09 | E10 — rematch record, no concurrent test | `it('starts one rematch however many phones ask at the same instant')` games.controller.test.ts:545: both `201`, one join code, 2 `game`, 2 `join_code_claim` and 8 `player` rows, so no orphan either (:556-560) | PASS |
| R10 | E13 — one-use challenge, no concurrent test | `it('answers a challenge once when two phones send it at the same instant')` accounts.controller.test.ts:248: statuses `[200, 400]` and `passkey-not-verified` (:266-267) | PASS |
| R11 | E15 — HMAC key claim, no concurrent test | `it('keeps one session key when the first two sign-ins write it at the same instant')` accounts.controller.test.ts:270: both `201`, both cookies read back their own account through `GET /me`, and one `app_secret` row (:290-292) | PASS |

Every concurrent test above goes through `runWritersWhileHeld` (test/database-utils.ts:122-136), which waits until `pg_stat_activity` shows one, then two, sessions waiting on a lock before it releases the hold, and throws `fewer than 2 writers ever waited on …` otherwise. So each test proves the two requests overlapped.

## B. Code cleanliness

| # | Rule | Check | Evidence | Verdict |
|---|---|---|---|---|
| B01 | Lint clean | `git diff --name-only a8e0cfb8..HEAD \| grep -E '\.(ts\|tsx)$' \| xargs pnpm exec oxlint --type-aware` | exit 0, no output | PASS |
| B02 | Types | `pnpm --filter @borso-app/skull-king run typecheck` | exit 0 | PASS |
| B03 | Unused code | `pnpm exec knip --workspace apps/skull-king` | exit 0; two configuration hints only (a redundant `sw/main.worker.ts` entry, `.css` not followed), both from round 1's `knip.json` | PASS |
| B04 | No `any` | `grep -nP '\bany\b'` on changed `.ts`/`.tsx` | only the English word in two JSDoc blueprint descriptions (game-cache.core.ts:23, game.queries.ts:121) | PASS |
| B05 | Type assertions limited to `as const` / `as unknown` | `grep` for `as [A-Z]` in added lines | none found in source; tests use `'skull' as const` | PASS |
| B06 | No prose comments | added `//` lines | only `@FollowsBlueprint` markers and two `eslint-disable-next-line` lines | PASS |
| B07 | Standards checklist (12): "the reason on a disable comment is a claim about that line which a reader can check" | read ScoreGrid.tsx in full | `// eslint-disable-next-line react-hooks/incompatible-library -- @tanstack/react-table's useReactTable returns functions the React Compiler cannot memoize, so it skips compiling this component; …` at site/src/components/molecules/ScoreGrid.tsx:87 names the call and its effect | PASS |
| B08 | `useEffect` is a smell | `grep -nE '\buseEffect\('` on changed `.ts`/`.tsx` | game-socket.hook.ts keeps its one effect, which opens a `WebSocket` (an external system); the diff only changes its message handler | PASS |
| B09 | Round-1 B11 (06): "a form goes through `useForm`" | read HomeScreen.tsx in full | `const nameForm = useForm({ defaultValues: { name: '' }, …` and `const joinForm = useForm({ defaultValues: { code: '' }, …` at site/src/components/organisms/HomeScreen.tsx:53, 62; the remaining `useState` hold which sheet is open and the seated table, not field values | PASS |
| B10 | Round-1 B12 (06): "a grid goes through `useReactTable`" | read ScoreGrid.tsx in full | `const table = useReactTable({ data: playedRounds, columns, getCoreRowModel: getCoreRowModel(), getRowId: … })` at ScoreGrid.tsx:88 | PASS |
| B11 | Round-1 B13 (02): "a limit or a rule written in a site does not restate one the API enforces under another name" | read game-write.core.ts in full | `isUsedByAnother` is gone; the API now asks the domain: `return !isBidAdjustedOnce(after) \|\| !isRascalBetOnce(after);` at api/src/games/game-write.core.ts:70 | PASS |
| B12 | Round-1 B14 (04/11): "a multi-table write is wrapped in one transaction owned by the service" | read accounts.repository.ts, accounts.service.ts, games.repository.ts, games.service.ts in full | the repositories now lend an executor (`runInOneTransaction` accounts.repository.ts:83, games.repository.ts:40), and the services compose the writes: accounts.service.ts:99-115 runs `insertAccount` then `insertPasskey`; games.service.ts:107-120 runs every game write | PASS |
| B13 | Standards checklist (01): "a `find…` returns `null` … a `get…` throws … a `select…` returns what its verb says" | read the new names | `getGameOrRefuse` throws `game-not-found` (games.service.ts:84-88); `findGameByJoinCode` returns `GameRow \| null`; `selectShownGame` returns a `GameView`; `decideSeatClaim` returns a `SeatClaim` | PASS |
| B14 | Standards checklist (01): "a definition in a `VOCABULARY.md` and a rule in an `INVARIANTS.md` are still true" | read the changed sections of VOCABULARY.md, api/src/games/INVARIANTS.md, api/src/accounts/INVARIANTS.md against the code | *Revision*, *Pending edit*, *Phase*, *Join code*, *Rematch*, *Bid adjustment*, *Rascal bet*, *Seat* and *View* each match the code quoted in A02 to A07 and R05 to R11. The round-1 note that VOCABULARY › Phase was false until E05 was fixed is closed by R06 | PASS |
| B15 | Standards checklist (01): "an invariant promising behaviour carries a `Held by:` line" | read the changed INVARIANTS sections | each new promise names its test (for example `Held by: … › gives Harry the Giant to the first of two players asking for it at once`), and every named test exists (grep of each `it(` text) | PASS |
| B16 | Standards checklist (10): "a test name states the behaviour and the condition, and a service test asserts on what the database holds" | read the new tests | the concurrent tests count rows (`countRows('SELECT count(*) FROM round_entry WHERE round_number = 1 AND bid_adjustment <> 0', [])`, games.controller.test.ts:499) rather than spies | PASS |

## C. Tests pass

| # | Workspace | Command | Exit | Verdict |
|---|---|---|---|---|
| C01 | @borso-app/skull-king | `pnpm --filter @borso-app/skull-king exec vitest run --project core --changed a8e0cfb8cd42367b8b33b04bf623e6e0f3740970 --coverage --reporter=verbose` | 0; 20 files, 279 tests; coverage 100 / 100 / 100 / 100 | PASS |
| C02 | @borso-app/skull-king | `pnpm --filter @borso-app/skull-king exec vitest run --project core --reporter=verbose` (no `--changed`, because the lockfile gained two resolved dependencies for this app) | 0; 49 files, 495 tests | PASS |
| C03 | @borso-app/skull-king | `pnpm --filter @borso-app/skull-king run test:e2e --changed a8e0cfb8cd42367b8b33b04bf623e6e0f3740970 --reporter=verbose` | 0; 4 files, 49 tests (games.controller, accounts.controller, app, main.websocket) | PASS |
| C04 | @borso-app/skull-king | `pnpm --filter @borso-app/skull-king run test:e2e --reporter=verbose api/src/database/migrations.audit.test.ts` (the new migration is imported by no test, so `--changed` skipped it) | 0; 1 test | PASS |
| C05 | @borso-app/skull-king | `scripts/mutate-changed.sh a8e0cfb8cd42367b8b33b04bf623e6e0f3740970 apps/skull-king` | 0; 16 files, 956 mutants, 0 survived, score 100.00 | PASS |
| C06 | root tooling | `pnpm exec vitest run --reporter=verbose scripts/mockup/mockup-copy.core.test.ts` | 0; 5 tests | PASS |
| C07 | root tooling | `scripts/mutate-changed.sh a8e0cfb8cd42367b8b33b04bf623e6e0f3740970 scripts/mockup` | 0; 20 mutants, 0 survived, score 100.00 | PASS |
| C08 | @borso-app/pragma | `git diff a8e0cfb8..HEAD -- pnpm-lock.yaml` | pragma's `@tanstack/react-table` resolves to the same `8.21.3(react-dom@19.3.1(react@19.3.1))(react@19.3.1)`; only its specifier moved to `'catalog:'`, so no resolved dependency moved and no full pragma run was needed | PASS |
| C09 | `*.utils.ts` coverage | `session-cookie.utils.ts` is the one changed utility; `session-cookie.utils.test.ts` was changed beside it and is in C01's run | 100% in C01 | PASS |

## D. Test coverage of spec

| # | Use case | Covering test | Verdict |
|---|---|---|---|
| D01 | API: `PUT /phase` refuses a move back across rounds | `it('refuses any other round than the one played and the next one')` api/src/games/game-write.core.test.ts:310; `expect(refusePhaseMove({ current: from, target: { round: 1, phase: 'bidding' }, rounds })).toBe('value-out-of-range');` :313 | PASS |
| D02 | API: `PUT /phase` refuses skipping a round | same test, `target: { round: 4, phase: 'bidding' }` from round 2 → `'value-out-of-range'` :316 | PASS |
| D03 | API: the next round opens only on its bids | `it('opens the next round only on its bids')` :321; `{ round: 3, phase: 'scoring' }` from round 2 → `'value-out-of-range'` :328 | PASS |
| D04 | API: `finished` only from the scoring of round 10 | `it('finishes the game from the scores of the last round')` :331 (`toBeNull()` :338) and `it('refuses to finish from an earlier round, from the bids of the last one, or onto another round')` :341 (`'value-out-of-range'` :346) | PASS |
| D05 | API: going back to the bids of the current round is always allowed | `it('lets the table go back to the bids of the round it plays, balanced or not')` game-write.core.test.ts:300 | PASS |
| D06 | API: every write bumps the revision, and the view carries it | `expect(game.revision).toBe(2);` after two entry writes, games.controller.test.ts:539; `it('carries the revision of the game, and reads a game nobody wrote since its creation as 0')` api/src/games/game-view.core.test.ts | PASS |
| D07 | API: two phones writing different cells both land, the DSQL abort retried | `it('keeps two writes to different cells sent at once, retrying the one the database aborts')` games.controller.test.ts:523; `expect([first.status, second.status]).toEqual([200, 200]);` and `expect(await conflict.countCommitsSeen()).toBe(3);` (:536-537) | PASS |
| D08 | API: retries stop after three | `it('gives up with the conflict once the retries are spent')` api/src/helpers/persistence/conflict-abort.core.test.ts:56 | PASS |
| D09 | API: the one-Harry, one-Rascal, phase, seat and rematch rules hold under concurrent requests | R05 to R11 | PASS |
| D10 | Sync: a broadcast is written unless the cache is newer (higher revision, or same revision and later `readAt`) | `describe('receiveGame', …)` game-cache.core.test.ts:66-95; `expect(receiveGame(cache, aGame(2, LATER))).toBe(cache);` :83 and `expect(receiveGame(cache, aGame(2, EARLIER))).toBe(cache);` :90 | PASS |
| D11 | Sync: … even while this phone has a write in flight | `it('writes each broadcast unless the cached view is newer, even while this phone has a write pending')` game-cache.core.test.ts:101; `expect(received?.server).toStrictEqual(fromLea);` :108. The hook's own line is one `setQueryData(… receiveBroadcast(…))` call with no condition around it (structural: game-socket.hook.ts:30-32) | PASS |
| D12 | Sync: a write's own answer and a read go through the same comparison | structural: `onSuccess: (game) => { settleGame(queryClient, game); }` game.queries.ts:140-142 and `return receiveGame(queryClient.getQueryData<GameCache>(key), fetched);` :70 both call `receiveGame`, pinned by D10 | PASS |
| D13 | Sync: the pending taps are laid over the newest server view, in tap order | `it('shows each pending edit over the newest server view, in the order they were tapped')` game-cache.core.test.ts:134; `expect(bidsShown(cache)).toEqual([1, 0]);` :137 | PASS |
| D14 | Sync: a refused tap leaves the screen | `it('drops a refused edit, so the screen goes back to what the server holds')` :160; `expect(bidsShown(dropPendingEdit(cache, refused))).toEqual([1, 0]);` :165 | PASS |

## E. Scale

| # | Write path or state | Question | Failing case, or the key or test that holds it | Verdict |
|---|---|---|---|---|
| E01 | `writeEntry` (games.service.ts:171-197) | Check-then-write: one Harry and one Rascal per round | The check reads the entries after `bumpGameRevision` (`UPDATE game SET revision = coalesce(revision, 0) + 1 … RETURNING`, games.repository.ts:60-71) in the same transaction. On Postgres the second writer waits on the row lock and its next statement sees the first's commit; on DSQL both write the `game` row, so the second commit aborts and `retryOnConflictAbort` reruns it. Concurrent proof: games.controller.test.ts:482 (R05). Rascal shares `isSecondAbility` and the same transaction; its sequential refusal is `it('records one Rascal of Roatan bet per round, and refuses a second')` :343 | PASS |
| E02 | `movePhase` (games.service.ts:213-230) | Check-then-write: no move past an unbalanced round | Same bump, then `describeGame(executor, …)`; concurrent proof games.controller.test.ts:506 (R06) | PASS |
| E03 | `claimSeat` → `linkSeat` (games.service.ts:245-258) | Check-then-write: one account per seat | `decideSeatClaim` reads the players after the bump; the old conditional `UPDATE … WHERE account_id IS NULL` is replaced by the serialised read. Concurrent proof accounts.controller.test.ts:378 (R08) | PASS |
| E04 | `startRematch` → `seatRematch` → `recordRematch` (games.service.ts:260-286) | Check-then-write: one rematch per game | `if (game.rematchJoinCode !== null) return game;` reads the row the bump returned, so a second request sees the first's code. Concurrent proof games.controller.test.ts:545 (R09), which also counts no orphan game | PASS |
| E05 | `createGame` → `insertGameUnlessCodeTaken` (games.repository.ts:96-122) | Check-then-write: one game per join code | Primary key of `join_code_claim`, `onConflictDoNothing()`, now inside the service's transaction; concurrent proof games.controller.test.ts:450 (R07) | PASS |
| E06 | `writeRound`, `changePlayer` | Check-then-write | `refuseRoundWrite` reads `game.currentRound` from the row the bump returned; `updatePlayer` decides by `RETURNING`. No rule over rows another request writes | PASS |
| E07 | `finishRegistration` → `insertAccount` + `insertPasskey` (accounts.service.ts:99-115) | Check-then-write | No decision read first; both tables keyed by fresh primary keys, now in one service-owned transaction | PASS |
| E08 | `takeChallenge`, `claimHmacKey` | Concurrent proof | accounts.controller.test.ts:248 and :270 (R10, R11) | PASS |
| E09 | Per-process state | `git diff a8e0cfb8..HEAD -- 'apps/skull-king/api/**' 'apps/skull-king/site/**' \| grep -nE '^\+(let\|const) [a-zA-Z]+ = new (Map\|Set)\|^\+let '` | no match (grep exit 1). The cache of pending edits lives in each phone's TanStack Query cache, which is per phone by design | PASS |

## Blocking findings

- None.

## Non-blocking findings

- None.

## Notes

- A01: the fix commit amended the spec (revision, three phase moves, serialised writes, pending edits) and left `plan/plan.md` untouched, so nobody planned that part. The code for each claim is checked in A02 to A07 and D01 to D14. The row is UNVERIFIABLE so the gap reaches the pull request description.
- On DSQL, `CONFLICT_RETRIES = 3` (games.service.ts:51) lets a write survive three aborts. With five or more phones writing one game in the same instant, the fifth could be aborted four times and answer 500 (inferred from the code, not reproduced: no local DSQL). The spec promises "two phones writing different cells both land" and names three retries, so this is in spec. Is a table of up to eight phones writing bids at once expected often enough to want more retries or a backoff?
- `insertGameUnlessCodeTaken` still carries `@FollowsBlueprint repository-owned-transaction-losing-a-race-quietly` (games.repository.ts:95), whose description says it "opens the transaction with the insert that can be refused". It now runs inside a transaction the service opens and, for a rematch, after the old game's revision bump. Should the marker move to the blueprint for a lent executor? No checklist bullet covers it.
- `runInOneTransaction` is written twice, identically, in accounts.repository.ts:83 and games.repository.ts:40. Is one shared helper under `api/src/database/` wanted?
- The round-1 note on rounds kept after moving back across rounds is closed: `refusePhaseMove` now refuses that move (D01). The round-1 note on orphaned rematch games is closed by R09.

## Verdict: PASS_EXCEPT_UNVERIFIABLE
