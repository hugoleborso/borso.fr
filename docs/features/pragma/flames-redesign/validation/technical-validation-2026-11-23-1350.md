# Technical validation — The flames show what a member gained, what a missed day costs, and the band's scores

- Spec: [`../spec/spec.md`](../spec/spec.md)
- Plan: none (routed Tier 1, spec only)
- Branch: claude/nifty-johnson-26tf87
- Base: 3cdbc03b424d2865147efcb150cd98b05b4a9fa3
- Run at: 2026-11-23T13:46:43Z
- Round: 2
- Reviewed: 79fc9da55825cd7a9d1eefbf4f62b3d1c2e377de
- Touched workspaces: @borso-app/pragma (site)

Round 2 reads `git diff ba48d93da..79fc9da55` only. It changes three app files: `query-client.setup.ts` (the buster), `FlameChip.test.tsx` (a new test) and `flame-week.variants.ts` (an unused type removed, already graded in round 1 as B13). It also adds the round-1 report. HEAD did not move during the review. The fix commits carry no new scope, so categories A and D are walked only for the rows the fixes touch.

The routing of round 1 stands. Ten use-case claims are routed to /visual-validation and are out of scope for this report.

## A. Correctness vs spec

| # | Spec ref | Claim | Code (file:line) | Evidence (quoted) | Verdict |
|---|---|---|---|---|---|
| A00 | Plan | plan absent; files taken from the diff | — | Tier 1 route, no `plan/` folder | UNVERIFIABLE (non-blocking) |
| A12 | Changes, `GET /api/streaks` returns `mine.week` | Every reader of the response gets the new shape | apps/pragma/site/src/lib/query-client.setup.ts:18, :50 | `const PERSISTED_CACHE_SHAPE_VERSION = '3';` … `buster: PERSISTED_CACHE_SHAPE_VERSION,`. A `streaks` cache saved under `'2'` is dropped on restore, so `StreakSheet` never receives a view without `week`. The service worker does not cache `/api/` reads: `public/sw.js` routes only navigations, `SHELL_ASSETS` and `/assets/`, `/icons/` paths to its cache, so the buster is the only stored copy | PASS |

## Round-1 findings (round 2 only)

| # | Round-1 row | Fixed by | Verdict |
|---|---|---|---|
| R01 | A12 (blocking): buster not bumped for `week` | `79fc9da55` apps/pragma/site/src/lib/query-client.setup.ts:18 `'2'` → `'3'`. `query-client.setup.test.ts:126` `expect(saved).toMatchObject({ buster: queryCachePersistOptions.buster });` passes | PASS |
| R02 | D05 (non-blocking): no test pins the singular chip name | `79fc9da55` FlameChip.test.tsx:63-76 `says one day in the singular in %s`, asserting `'Your flame, 1 day. Band flame, 1 day.'` and `'Ta flamme, 1 jour. Flamme du groupe, 1 jour.'` | PASS |
| R03 | B11 (non-blocking), dismissed in `79fc9da55`: "buildJokerPips reads the FlameWeekDay list and nothing else, so flame-week.core.ts holds every view derived from one week" | Checked flame-week.core.ts:82-100. `buildJokerPips(week: readonly FlameWeekDay[], jokersLeft: number, locale: string)` derives the spent pips from `week.filter((weekDay) => weekDay.state === 'joker')`. It also reads a count and a locale, but no data source other than the week. The claim holds in substance | PASS |

## B. Code cleanliness

| # | Rule | Check | Evidence | Verdict |
|---|---|---|---|---|
| B01 | No abbreviations or 1-letter locals | read the three changed files | `translate`, `language`, `expected` | PASS |
| B02 | Magic numbers and strings named | read in full | the buster stays a named constant, `PERSISTED_CACHE_SHAPE_VERSION` | PASS |
| B03 | No prose comments | read in full | only `// @FollowsBlueprint test-component-render` (machine-read marker) | PASS |
| B04 | No `any`, type assertions only `as const` / `as unknown`, no `useEffect` | `grep -nP '\bany\b\| as [A-Z{]\|useEffect\('` on the three files | no match | PASS |
| B05 | Lint clean | `pnpm exec oxlint --type-aware <the three changed files>` | exit 0, no output | PASS |
| B06 | knip clean | `pnpm exec knip --workspace apps/pragma` at 79fc9da55 | exit 0 (configuration hints only) | PASS |
| B07 | Standards checklist: a file carrying `// @FollowsBlueprint <id>` copies that blueprint | read FlameChip.test.tsx in full against `test-component-render` in blueprint-index.md:274 | `// @FollowsBlueprint test-component-render` at apps/pragma/site/src/components/molecules/FlameChip.test.tsx:62. The blueprint "Mounts the component for real … and finds each control by its visible text or its accessible name". The block at :63-76 mounts nothing: it calls `i18next.getFixedT(language)` and rebuilds HomePage's `t('streaks.chipLabel', { mine, band })` composition by hand, so the marker names a shape the code does not follow, and a change to how HomePage builds the label (e.g. dropping `bandChip`) would leave this test green. Introduced: this branch. Fix size: one file | FAIL (non-blocking) |

## C. Tests pass

| # | Workspace | Command | Exit | Verdict |
|---|---|---|---|---|
| C01 | @borso-app/pragma core | `pnpm --filter @borso-app/pragma exec vitest run --project core --changed ba48d93daa473c1ebd59f4ef1005fd47368ac85e --coverage --reporter=verbose` | 0. 13 files, 103 tests, including FlameChip.test.tsx (`the flame chip’s name > says one day in the singular in en` / `in fr`), StreakSheet.test.tsx, HomePage.test.tsx, streaks.queries.test.tsx. No gated file changed, so coverage reports 0/0 | PASS |
| C02 | @borso-app/pragma query-client | `pnpm --filter @borso-app/pragma exec vitest run --project core site/src/lib/query-client.setup.test.ts --reporter=verbose` | 0. 13 tests, including `saves the queries under its own key and never a write waiting for the network` | PASS |
| C03 | @borso-app/pragma e2e | `pnpm --filter @borso-app/pragma run test:e2e --changed ba48d93daa473c1ebd59f4ef1005fd47368ac85e --reporter=verbose` | 0. No API file changed in the range, so no back-e2e file is affected. Round 1's e2e run (52 files, 498 tests) covers the API code, which this range does not touch | PASS |
| C04 | mutation | none of the changed files is `.core`, `.utils` or `.adapter` | `mutate-changed.sh` not applicable | PASS |
| C05 | `*.utils.ts` | the range changes no `*.utils.ts` | none | PASS |

## D. Test coverage of spec

| # | Use case | Covering test | Verdict |
|---|---|---|---|
| D05 | The chip name has plural forms ("1 day") | FlameChip.test.tsx:67 `says one day in the singular in %s`: `.toBe(expected)` with `'Your flame, 1 day. Band flame, 1 day.'`. Deleting `mineChip_one` or `bandChip_one` makes i18next fall back to the `_other` form ("1 days"), and this assertion fails. HomePage.test.tsx:236 pins that HomePage composes the label from these keys (`'Your flame, 12 days. Band flame, 4 days.'`) | PASS |

## E. Scale

| # | Write path or state | Question | Failing case, or the key or test that holds it | Verdict |
|---|---|---|---|---|
| E01 | Write paths and module state | Check-then-write, per-process state | `git diff ba48d93da..HEAD -- apps/` holds no `insert(`, `update(`, `delete(`, `onConflict` or `transaction(`, and no API file. The only module-level change is the constant string `PERSISTED_CACHE_SHAPE_VERSION = '3'`, a browser-side literal that holds no rule across requests | PASS |

## Blocking findings

- None.

## Non-blocking findings

- B07. `FlameChip.test.tsx:62` marks the singular-label test `@FollowsBlueprint test-component-render`, but the test mounts no component and rebuilds HomePage's label composition by hand.

## Notes

- A00. The plan is absent by design (Tier 1). The files were taken from the diff.
- The buster is still bumped by hand. Nothing ties it to the response types, so the next added field can miss it as A12 did. Would a test that fails when a persisted query's schema changes without a bump be worth its cost?

## Verdict: PASS_EXCEPT_UNVERIFIABLE
