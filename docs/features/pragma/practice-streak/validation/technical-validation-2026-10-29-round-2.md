# Technical validation — Each member and the band see a practice flame on Home

- Spec: [`../spec/spec.md`](../spec/spec.md)
- Plan: [`../plan/plan.md`](../plan/plan.md)
- Branch: claude/ecstatic-rubin-egofk1
- Base: `origin/claude/pragma-ux-redesign-slice-6` (`63c1ec0f`). Round 2 diffs from `aed1d9b7`, the rebased equivalent of round 1's reviewed `1af12db5`, so the diff is the one fix commit `0febe997` (18 files under `apps/pragma` and the plan, plus the round-1 report).
- Run at: 2026-10-29T13:22:24Z
- Round: 2
- Reviewed: 0febe9979cb92cd4c9b8c48dabc77d835d6cbf81
- Touched workspaces: `@borso-app/pragma` (api, site). No `domain/`, `cdk/` or `infra/` change.

## A. Correctness vs spec

| # | Spec ref | Claim | Code (file:line) | Evidence (quoted) | Verdict |
|---|---|---|---|---|---|
| A01 | Plan D12 (seed gives visual validation a spent joker) | Each past seed lands on its own Paris day, whatever `now` is | apps/pragma/api/src/__test/test-seed-studies.core.ts:22-24; test-seed-studies.service.ts:16 | `const studiedOn = shiftCalendarDay(parisCalendarDay(now), -daysAgo);` · `return new Date(Math.min(now.getTime(), Date.parse(`${studiedOn}${MIDDAY_UTC}`)));` · `now: seedStudyInstant(now, seed.daysAgo),`. Midday UTC is 13:00 or 14:00 Paris, so the instant stays on `studiedOn`; `Math.min` keeps a seed of today from lying in the future. | PASS |
| A02 | Files: `streaks.queries.ts` ("study mutations invalidate it"), plan D8 as amended | After a log or an undo the flames come from the write's answer | apps/pragma/site/src/lib/queries/studies.queries.ts:83-85 | `onSuccess: (response: { readonly streaks: StreaksView }) => { queryClient.setQueryData(streakKeys.all, response.streaks); },`. The spec's wording says invalidate; setting from the answer is the stronger form standards 06 asks for. See Notes. | PASS |
| A03 | Plan D8 as amended | `POST /api/studies` answers `201 { study, streaks }`, undo answers `200 { songId, instrumentId, deleted: true, streaks }` | apps/pragma/api/src/studies/studies.controller.ts:29, 38-42 | `return context.json({ study: outcome.study, streaks: outcome.streaks }, 201);` · `deleted: true, streaks: outcome.streaks,` | PASS |
| A04 | Plan D8 as amended | The member's streaks are read in the write's own transaction | apps/pragma/api/src/studies/studies.service.ts:106-114, 159-166, 170-177 | `const outcome = await logStudyWithin(executor, command); if (outcome.kind !== 'ok') return outcome; return { ...outcome, streaks: await readStreaksWithin(executor, command.memberId, command.now) };` and `readStreaksWithin` lists studies through `listStudiesSinceWithin(executor, firstDay)`. Sessions and members are read on the pool; the write touches neither. | PASS |
| A05 | Database changes (computed on read over 400 days) | The lookback is unchanged after the move to `streaks.core.ts` | apps/pragma/api/src/streaks/streaks.core.ts:9, 55-57 | `export const STREAK_LOOKBACK_DAYS = 400;` · `return shiftCalendarDay(today, -STREAK_LOOKBACK_DAYS);` | PASS |
| A06 | MCP `writeStudyForTool` (unchanged contract) | The tool path keeps `logStudy` / `undoStudy`, each now one transaction | apps/pragma/api/src/studies/studies.service.ts (`logStudy`, `undoStudy`, `writeStudyForTool`) | `return await runInOneStudyTransaction(async (executor) => await logStudyWithin(executor, command));` · `if (command.isUndoing) return await undoStudy(study); return await logStudy(study);` | PASS |
| A07 | Changes "VOCABULARY" | The Flame entry says what the code now does | apps/pragma/VOCABULARY.md (Flame) | `Logging or undoing a study settles it from the flames the write answers, read in the write's own transaction.` and `Held by: … › settles the flames from the answer once a study is logged`. `scripts/check-vocabulary-paths.sh` exits 0. | PASS |

## Round-1 findings (round 2 only)

Round 1 had no blocking finding. Each non-blocking finding and each Notes question the fix commit claims to address is re-checked here.

| # | Round-1 row | Fixed by | Verdict |
|---|---|---|---|
| R01 | A28 (seed shifted 24 h steps; Hugo's flame read 3 on `2026-10-29T22:30:00Z`) | `0febe997` apps/pragma/api/src/__test/test-seed-studies.core.ts:22-24. Pinned by `it('puts each past seed on its own Paris day across the 25 October 2026 clock change')`, `toEqual(['2026-10-27', '2026-10-26', '2026-10-25', '2026-10-24'])`, and end to end by `it('seeds Hugo his planned flame on a late evening after the 25 October clock change')` at test-seed.controller.test.ts:117, `expect(flame.days).toBe(SEEDED_HUGO_FLAME_DAYS);` (4). Both ran green. | PASS |
| R02 | B13 (`listStudyDaysSince` returned rows) | `0febe997` the two passthroughs are gone. `streaks.service.ts` reads `listStudiesOfMemberSince` (re-exported at studies.service.ts:44, the pattern `songs.service.ts:13` and `sessions.service.ts:19` already use) and `readFlameInputs` (studies.service.ts:102). `rg listStudyDays apps/pragma` returns nothing. | PASS |
| R03 | E02 (no concurrent proof of the push claim) | `0febe997` `it('sends one push per open member when two runs fire at the same time')` at apps/pragma/api/src/streaks/streak-reminder.service.test.ts:114, `await Promise.all([runStreakReminder(PARIS_EVENING), runStreakReminder(PARIS_EVENING)]);` then `expect(sentEndpoints.sort()).toEqual([deviceEndpoint('hugo-phone'), deviceEndpoint('tom-phone')]);`. Ran green. | PASS |
| R04 | Notes, B21 (a refetch on another DSQL connection can miss the study) | `0febe997` A02-A04 above. The back-e2e test pins the in-transaction read: on local Postgres a read on another connection before commit would not see the row, and `expect(streaks.mine).toEqual({ days: 1, isTodayCounted: true });` at studies.controller.test.ts:114 passes. | PASS |
| R05 | Notes, D30 (the Home 500 test did not wait for the failed query) | `0febe997` apps/pragma/site/src/routes/home/HomePage.test.tsx:248, `await waitFor(() => expect(queryClient.getQueryState(streakKeys.all)?.status).toBe('error'));` before the absence assertion | PASS |
| R06 | Notes, ADR-202610291139 `Status: proposed` | Not changed; the commit message defers the stamp to `/after-task-kaizen` at merge. `docs/adr/202610291139*.md:3` reads `- **Status:** proposed`. Not a code finding. | PASS |

## B. Code cleanliness

| # | Rule | Check | Evidence | Verdict |
|---|---|---|---|---|
| B01 | No abbreviations or one-letter locals | read the diff; names sampled | `studyOfToday`, `readFlameInputsWith`, `StudiesLister`, `readStreaksWithin`, `logStudyWithin`, `undoStudyWithin`, `seedStudyInstant`, `firstLookbackDay`, `LATE_EVENING_AFTER_CLOCK_CHANGE` | PASS |
| B02 | Magic numbers and strings named | read the diff | `MIDDAY_UTC = 'T12:00:00Z'`, `SEEDED_HUGO_FLAME_DAYS = 4`, `MILLISECONDS_PER_DAY` removed | PASS |
| B03 | Comments say why only | grep of added `//` lines other than blueprint markers | none | PASS |
| B04 | Type assertions only `as const` / `as unknown` | grep of added ` as ` | none | PASS |
| B05 | No `any` | `grep -nP '\bany\b'` on added lines | none | PASS |
| B06 | `noUncheckedIndexedAccess` | typecheck plus read | no new indexed access; `(await listMembers()).find(…)` is checked against `undefined` at test-seed.controller.test.ts:119 | PASS |
| B07 | Lint clean | `pnpm exec oxlint --type-aware <16 changed .ts/.tsx files>` | exit 0, no output | PASS |
| B08 | Typecheck | `pnpm --filter @borso-app/pragma run typecheck` | exit 0 | PASS |
| B09 | Dead code | `pnpm run knip` | exit 0, configuration hints only | PASS |
| B10 | `useEffect` is a smell | grep on added lines | none added | PASS |
| B11 | Standards 01: a `VOCABULARY.md` definition is still true; a promise carries `Held by:` | read the Flame entry against studies.queries.ts:83-85 and studies.service.ts:159-177 | the new sentence matches the code; the renamed `Held by:` names a test that exists (vocabulary check exit 0) | PASS |
| B12 | Standards 01: verb table | read in full | `readFlameInputs`, `readStreaksWithin` return what they read; `logStudyWithStreaks` / `undoStudyWithStreaks` return the outcome plus streaks; no new `find…` / `get…` | PASS |
| B13 | Standards 01: a file name says what the file holds | read in full | `readFlameInputs` (studies.service.ts:102) assembles streak inputs inside `studies.service.ts`. Plan "Files to change" records why: `streaks.service` reads from `studies.service`, which keeps `import/no-cycle` clean. The function still reads studies; not a defect. | PASS |
| B14 | Standards 02: `.core.ts` vs `.utils.ts` | read `test-seed-studies.core.ts` | `seedStudyInstant` dates a band's study, a band word; `.core.ts` with `// @FollowsBlueprint core-projection` | PASS |
| B15 | Standards 03: derived types derived | read `studies.types.ts` | `StudyWriteWithStreaks = (Extract<StudyWriteOutcome, { kind: 'ok' }> & { readonly streaks: StreaksView }) \| Exclude<…>` derives from the existing outcome | PASS |
| B16 | Standards 04: repository returns rows; slice rules | read `studies.repository.ts` | `deleteStudyWithin` returns a count, `listStudiesSinceWithin` returns `StudyRow[]`. `streaks.service` reaches the studies repository only through the `studies.service` re-export, as `songs.service.ts:13` and five others do; `borso/no-cross-slice-repository-imports` is clean (B07). | PASS |
| B17 | Standards 04 and 11: a multi-table write is one transaction owned by the service | read `studies.service.ts` | the log claims `song`, `instrument` and inserts `study` in `runInOneStudyTransaction`; the undo now also runs in one (`undoStudy`, `undoStudyWithStreaks`) | PASS |
| B18 | Standards 06: a mutation whose full result the client holds reconciles from the response | read `studies.queries.ts` | `queryClient.setQueryData(streakKeys.all, response.streaks);` at :84; the refused case leaves the cache alone (streaks.queries.test.tsx:132) | PASS |
| B19 | Standards 10: a test name states behaviour and condition | read the new tests | e.g. "dates a seed of today at midday UTC when now is later, so no seed lies in the future"; "sends one push per open member when two runs fire at the same time" | PASS |
| B20 | Standards 05, 07, 08, 09, 12, 14, 00 | diff | no route, component, effect, style, i18n key, disable comment or `.husky/` change; no new pattern recorded | PASS |
| B21 | Blueprint marker on new code in `apps/` | grep | the one new exported core function carries `// @FollowsBlueprint core-projection` (test-seed-studies.core.ts:21); no new file | PASS |

## C. Tests pass

| # | Workspace | Command | Exit | Verdict |
|---|---|---|---|---|
| C01 | @borso-app/pragma (core) | `pnpm --filter @borso-app/pragma exec vitest run --project core --changed aed1d9b7` | 0 (7 files, 40 tests) | PASS |
| C02 | @borso-app/pragma (back-e2e) | `pnpm --filter @borso-app/pragma run test:e2e --changed aed1d9b7` | 0 (43 files, 395 tests) | PASS |
| C03 | @borso-app/pragma (back-e2e, new tests named) | `pnpm run test:e2e --reporter=verbose api/src/streaks/streak-reminder.service.test.ts api/src/__test/test-seed.controller.test.ts api/src/studies/studies.controller.test.ts` | 0 (3 files, 36 tests; the concurrent run, the clock-change seed and both study answers listed as passed) | PASS |
| C04 | @borso-app/pragma `*.utils.ts` | diff | no `*.utils.ts` added or changed | PASS |

## D. Test coverage of spec

The visual-routed assertions are out of scope, as in round 1. Rows here cover only the behaviours the fix commit changed.

| # | Use case | Covering test | Verdict |
|---|---|---|---|
| D01 | Happy path 4 (non-visual half): a logged study updates the flames | `it('settles the flames from the answer once a study is logged')` at apps/pragma/site/src/lib/queries/streaks.queries.test.tsx:92, `expect(queryClient.getQueryData(streakKeys.all)).toEqual(STREAKS_AFTER_WRITE);` (:107); the API side at studies.controller.test.ts:114, `expect(streaks.mine).toEqual({ days: 1, isTodayCounted: true });` | PASS |
| D02 | Edge: undoing today's study removes today | `it('settles the flames from the answer once a study is undone')` at streaks.queries.test.tsx:111, assertion at :121; API at studies.controller.test.ts:240, `streaks: { mine: { days: 0, isTodayCounted: false } },` | PASS |
| D03 | A refused study leaves the flames alone | `it('leaves the flames alone when the study is refused')`, `expect(queryClient.getQueryData(streakKeys.all)).toEqual(STREAKS);` at streaks.queries.test.tsx:132 | PASS |
| D04 | Error: the job runs twice the same day, each member gets at most one push (now concurrently) | `it('sends one push per open member when two runs fire at the same time')` at streak-reminder.service.test.ts:114, assertion at :120 | PASS |
| D05 | Error: the flame read fails, Home shows no chips | HomePage.test.tsx:248 waits for `status` `'error'`, then `expect(screen.queryByRole('button', { name: /flame/ })).toBe(null);` | PASS |
| D06 | Database changes: 400-day lookback | `it('reads 400 calendar days back from today')` at streaks.core.test.ts:160, `expect(firstLookbackDay(TODAY)).toBe('2025-09-24');` (2026-10-29 minus 400 days, checked by hand) | PASS |

## E. Scale

| # | Write path or state | Question | Failing case, or the key or test that holds it | Verdict |
|---|---|---|---|---|
| E01 | `logStudyWithStreaks` → `insertStudyIfAbsentWithin` (studies.service.ts:159) | Check-then-write | Unchanged rule. The song and instrument are claimed with conditional `UPDATE … RETURNING` (`didClaimSongWithin`, songs.repository.ts:242-247), and the insert is the existing idempotent upsert, all in `runInOneStudyTransaction` with `retryingConflictAborts` (studies.repository.ts:20). The added streak read decides nothing about the write. | PASS |
| E02 | `undoStudyWithStreaks` → `deleteStudyWithin` (studies.service.ts:170) | Check-then-write | A delete keyed on member, song, instrument and day; `deletedCount === 0` is decided by the delete itself, so a second concurrent undo gets `study-not-found` | PASS |
| E03 | Push claim `hasClaimedOnlyDispatch` (notifications.service.ts:130-136) | Concurrent proof | Held by the primary key of `notification_dispatch` (round 1 E01); now fired concurrently by streak-reminder.service.test.ts:114 (`Promise.all` of two runs, exactly two sends). The `isConflictAbort` branch at :134 is DSQL-only and cannot be shown on local Postgres. | PASS |
| E04 | Per-process state | Module-level variables | `grep -E '^\+(let\|const) [a-zA-Z_]+ = new (Map\|Set)\|^\+let '` over the diff under `api/src` and `domain/` returns nothing | PASS |

## Blocking findings

- none

## Non-blocking findings

- none

## Notes

- The spec's Files list still says `streaks.queries.ts` "NEW; study mutations invalidate it" (spec.md:166), while the code now sets the cache from the answer (plan D8 amended). Should the spec line be updated so the two documents agree?
- `setQueryData` does not cancel a `GET /api/streaks` already in flight, unlike the `invalidateQueries` it replaced. Today the only study writer is `SongRoundActions` inside `SongDetail`, and the streaks query is observed only by Home, so no fetch should be in flight when a study is logged. Should `onMutate` call `queryClient.cancelQueries({ queryKey: streakKeys.all })` in case a later screen shows both?
- The log transaction now also reads up to 400 days of the band's studies before it commits, which lengthens the window in which a concurrent write to the same song or instrument claim row makes DSQL abort. `retryingConflictAborts` retries it. Is the added read cost acceptable on the write path, or should only the member's studies be read in the transaction?
- The plan's Files row for `studies.service.ts` still names the blueprint `service-passthrough`, though the passthroughs are gone.
- Stryker and coverage were not run here; they belong to CI (`app-tests`, `mutation`).

## Verdict: PASS
