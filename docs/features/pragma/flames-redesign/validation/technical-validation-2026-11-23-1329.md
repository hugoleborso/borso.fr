# Technical validation — The flames show what a member gained, what a missed day costs, and the band's scores

- Spec: [`../spec/spec.md`](../spec/spec.md)
- Plan: none (routed Tier 1, spec only)
- Branch: claude/nifty-johnson-26tf87
- Base: 3cdbc03b424d2865147efcb150cd98b05b4a9fa3
- Run at: 2026-11-23T13:42:39Z
- Round: 1
- Reviewed: ba48d93daa473c1ebd59f4ef1005fd47368ac85e
- Touched workspaces: @borso-app/pragma (api, domain, site), `.claude/hooks`

The branch moved during the review. HEAD became `3cba8ad5c` ("drop the week cell variant type nothing reads"), which removes the unused `WeekCellVariantProps` export from `flame-week.variants.ts` and nothing else. This report reads `ba48d93da` and checks that one commit only for knip (row B13). The core tests finished before that commit landed. The commit changes no runtime code, so the e2e and mutation runs that finished after it hold for both SHAs.

A merge of PR #394's head sits above the base (`2fb3d1e2a`). The file list is the first-parent, no-merge list: 34 files.

The spec is the short form plus *Changes* and *Test strategy*. It has no "UI behavioural assertions" subsection. Ten use-case claims are routed to /visual-validation and are out of scope for this report. They are the colour and border tokens of the active, joker, missed and future cells, the joker caption's ink and weight, the pip styles, the ink-soft "not yet today", the full width of the jokers card, the rule before the band hero, and the sheet fitting 812 px at 375 px.

## A. Correctness vs spec

| # | Spec ref | Claim | Code (file:line) | Evidence (quoted) | Verdict |
|---|---|---|---|---|---|
| A00 | Plan | plan absent; files taken from the diff | — | Tier 1 route, no `plan/` folder | UNVERIFIABLE (non-blocking) |
| A01 | Q.O.D. Home layout | Variant A, one chip with both flames | apps/pragma/site/src/routes/home/HomePage.tsx:190-200 | `<FlameChip mineDays={streaks.mine.days} … bandDays={streaks.band.days} … label={t('streaks.chipLabel', {` | PASS |
| A02 | Q.O.D. Nudge | Not built | StreakSheet.tsx, en.json | `grep -niE 'relancer\|nudge\|milestone'` returns nothing | PASS |
| A03 | Q.O.D. Moment of the day, milestones | Not built | StreakSheet.tsx:30-38 | The sheet renders only `FlameHero`, `FlameWeek`, `JokersCard`, `<hr>`, `FlameHero`, then the member list | PASS |
| A04 | Q.O.D. Sheet order | Personal flame, timeline and jokers, then the band, then every member | apps/pragma/site/src/components/organisms/StreakSheet.tsx:30-40 | `<FlameHero scope="personal" …/>` / `<FlameWeek cells={buildWeekCells(view.mine.week, …)} />` / `<JokersCard` / `<hr …/>` / `<FlameHero scope="band" …/>` / `{sortMembersByFlame(view.members).map(` | PASS |
| A05 | Changes, Types | `FlameDayState`, `FlameWeekDay`, `PersonalFlame.week` | apps/pragma/domain/practice-flame.core.ts:9-22 | `export type FlameDayState = 'active' \| 'joker' \| 'missed' \| 'open' \| 'future';` … `readonly week: readonly FlameWeekDay[];` | PASS |
| A06 | Changes, Types | `computePersonalFlame` takes the session days so `isSessionDay` is known | practice-flame.core.ts:114-126 | `const activeDays = new Set([...presenceDays, ...sessionDays]);` … `week: buildWeek(activeDays, sessionDays, today, walk.bridgedDays),` | PASS |
| A07 | Changes, Types | A `joker` day is one the walk bridged. A missed, unbridged day before today is `missed` | practice-flame.core.ts:84-93 | `if (day > today) return 'future'; if (activeDays.has(day)) return 'active'; if (bridgedDays.has(day)) return 'joker'; return day === today ? 'open' : 'missed';` | PASS |
| A08 | Changes | `GET /api/streaks` returns `mine.week`, and each member's flame carries it | apps/pragma/api/src/streaks/streaks.core.ts:68-71 | `return computePersonalFlame(ownDays, input.sessionDays, input.today);` (used for `mine` and every member) | PASS |
| A09 | Changes / Assistant read | `projectStreaksForTool` leaves the week out | streaks.core.ts:98-110 | `mine: { days: view.mine.days, isTodayCounted: …, jokersLeftThisWeek: … }` and members keep `firstName, days, isTodayCounted` | PASS |
| A10 | Database changes | None | diff | No `*.schema.ts` or migration in the diff | PASS |
| A11 | 20:00 push | `streak-at-risk` with `days` and `jokersAfter = jokersLeftThisWeek - 1`. With no joker left, `streak-at-risk-last` | apps/pragma/api/src/streaks/streak-reminder.core.ts:61-68; apps/pragma/site/public/sw-notifications.js:30-31, 44-46 | `if (flame.jokersLeftThisWeek === NO_JOKER_LEFT) { return { messageKey: 'streak-at-risk-last', parameters: { days } }; }` … `'streak-at-risk': 'Your {days}-day flame is waiting'` | PASS |
| A12 | Changes, `GET /api/streaks` returns `mine.week` | Every reader of the response gets the new shape | apps/pragma/site/src/lib/query-client.setup.ts:18 (unchanged); StreakSheet.tsx:31 | `const PERSISTED_CACHE_SHAPE_VERSION = '2';` is not bumped. `docs/knowledge/a-pragma-response-shape-change-needs-the-cache-buster.md` says "An added field is `undefined` in restored data until the refetch, so bump for it too unless every reader accepts its absence". `StreakSheet` does not accept it. **Failing case:** a member reads Home on the old build, which persists `streaks` without `week`. The deploy lands, and the member reloads within `DEFAULT_STALE_TIME_MS` (300 s), or opens the PWA offline within seven days. The restored query counts as fresh and is not refetched. A tap on the flame chip renders `buildWeekCells(view.mine.week /* undefined */, …)`, and `week.map` throws `TypeError: Cannot read properties of undefined (reading 'map')` instead of opening the sheet. Probed (measured): a throwaway core test rendered `StreakSheet` with the JSON of a pre-change view (`mine` without `week`), and `expect(() => render(…)).toThrow(/map/)` passed. The probe file is deleted. Introduced: this branch. Fix size: one line. | FAIL (blocking) |

## B. Code cleanliness

| # | Rule | Check | Evidence | Verdict |
|---|---|---|---|---|
| B01 | No abbreviations or 1-letter locals | read each changed source file | none found (`weekDay`, `jokersAfter`, `bridgedDays`, `spentInWeek`, `first`/`second` in the comparator) | PASS |
| B02 | Magic numbers and strings named | read in full | `DAYS_PER_WEEK = 7`, `NO_JOKER_LEFT = 0`, `JOKER_SPENT_TONIGHT = 1`, `UTC_TIME_ZONE = 'UTC'`, `JOKERS_PER_WEEK` imported from domain | PASS |
| B03 | No prose comments | read in full | none in `apps/`. The `.claude/hooks/pretool-mockup-reads-visual-rules.sh` header comment is shell, outside the rule's scope | PASS |
| B04 | No `any` | `grep -nP '\bany\b'` on changed non-test files | no match | PASS |
| B05 | Type assertions only `as const` / `as unknown` | `grep -nE ' as [A-Z{]'` | no match | PASS |
| B06 | `noUncheckedIndexedAccess` | read in full | Lookups are on total `Record`s (`DAY_TONE[weekDay.state]`, `FLAME_HERO[scope]`, `JOKER_PIP_CLASS[pip.kind]`). `jokersSpentWithGap.get(week) ?? 0` | PASS |
| B07 | Lint clean | `pnpm exec oxlint --type-aware <33 changed .ts/.tsx/.js files>` | exit 0, no output | PASS |
| B08 | `useEffect` smell | `grep -nE '\buseEffect\('` on changed files | no match | PASS |
| B09 | Standards 01: an `INVARIANTS.md` rule is still true and a promise carries `Held by:` | read apps/pragma/domain/INVARIANTS.md and api/src/streaks/INVARIANTS.md in full | The new week rule and the at-risk rule each carry `Held by:` lines naming tests that exist and pass (`marks each day of today’s week…`, `warns a member with no joker left…`, `keeps both flames and each member’s count, without ids or colours`) | PASS |
| B10 | Standards 01: `build…`/`select…` return what the verb says; booleans not negated | read in full | `buildWeekCells`, `buildJokerPips`, `selectDayState`, `selectAtRiskMessage`, `sortMembersByFlame` return what their names say. Booleans: `isToday`, `isSessionDay` | PASS |
| B11 | Standards 01: "a file name says what the file holds" | read in full | `import type { JokerPip } from './flame-week.core';` at apps/pragma/site/src/components/molecules/JokersCard.tsx:6. `buildJokerPips` and `JokerPip` live in `flame-week.core.ts:75-100`, and `JOKER_PIP_CLASS` lives in `flame-week.variants.ts`, so a reader looking for the jokers card's logic would not find it by file name. Introduced: this branch. Fix size: one file | FAIL (non-blocking) |
| B12 | Standards 02: no site rule restating an API rule; `.core` vs `.utils` | read in full | The site imports `JOKERS_PER_WEEK` from `@domain/practice-flame.core` (StreakSheet.tsx:3). The joker/day state comes from the API's `week`. `.core` is right for band terms (flame, joker) | PASS |
| B13 | knip clean | `pnpm exec knip --workspace apps/pragma` at HEAD `3cba8ad5c` | exit 0. At the reviewed SHA `export type WeekCellVariantProps` in flame-week.variants.ts was unused, and `3cba8ad5c` removes it | PASS |
| B14 | Standards 03: derived types are derived | read in full | `type ReminderFlame = Pick<PersonalFlame, 'days' \| 'isTodayCounted' \| 'jokersLeftThisWeek'>` (streak-reminder.core.ts:31). The site reads `StreaksView = InferResponseType<…>` | PASS |
| B15 | Standards 05: no family of booleans in a prop set; no explanatory labels | read in full | `FlameChipProps` is `mineDays, mineTone, bandDays, bandTone, label, onPress`. The spec names "Back on Monday" | PASS |
| B16 | Standards 08: more than two visual variants go through `cva` or a lookup | read flame-week.variants.ts | `weekCellVariants = cva(…, { variants: { state: {…5}, isToday: {…} } })`, plus `CAPTION_CLASS` and `JOKER_PIP_CLASS` records | PASS |
| B17 | Standards 09: key path names the screen and the element | en.json / fr.json | `streaks.caption.joker`, `streaks.dayState.missed`, `streaks.jokersTitle`, `streaks.chipLabel` | PASS |
| B18 | Standards 10: test names state behaviour and condition | read changed tests | e.g. `warns a member with no joker left that the flame goes out at midnight`, `shows only this week’s days of a bridged gap that crosses the Monday` | PASS |

## C. Tests pass

| # | Workspace | Command | Exit | Verdict |
|---|---|---|---|---|
| C01 | @borso-app/pragma core | `pnpm --filter @borso-app/pragma exec vitest run --project core --changed 3cdbc03b424d2865147efcb150cd98b05b4a9fa3 --coverage --reporter=verbose` | 0. 88 files, 591 tests, including domain/practice-flame.core.test.ts, api/src/streaks/streak-reminder.core.test.ts, streaks.core.test.ts, site flame-week.core.test.ts, streak-sheet.core.test.ts, StreakSheet.test.tsx, FlameChip.test.tsx, HomePage.test.tsx, sw/service-worker.test.ts, i18n-parity.core.test.ts. Coverage 100% statements, branches, functions and lines on every changed gated file | PASS |
| C02 | @borso-app/pragma e2e | `pnpm --filter @borso-app/pragma run test:e2e --changed 3cdbc03b424d2865147efcb150cd98b05b4a9fa3 --reporter=verbose` | 0. 52 files, 498 tests, including streaks.controller.test.ts, streak-reminder.service.test.ts, me-tools.controller.test.ts | PASS |
| C03 | @borso-app/pragma mutation | `scripts/mutate-changed.sh 3cdbc03b… <the 7 changed .core.ts files>` | 0. Score 100.00, 368 killed, 11 timed out, 0 survived | PASS |
| C04 | `*.utils.ts` | the diff changes no `*.utils.ts` | none in the file list | PASS |

## D. Test coverage of spec

| # | Use case | Covering test | Verdict |
|---|---|---|---|
| D01 | Home chip: one `FlameChip` replaces the two | `puts one chip with both flames on the title line, and a tap opens the streak sheet` HomePage.test.tsx:231. `expect(within(header).getAllByRole('button', { name: /flame/ })).toHaveLength(1);` | PASS |
| D02 | Each mark keeps its tone rule | FlameChip.test.tsx `keeps the band bonfire still while %s`: `expect(bonfire?.dataset.tone).toBe(tone);`. HomePage passes `selectFlameTone(streaks.mine)` / `(streaks.band)`, held by flame-tone.core.test.ts `selectFlameTone` | PASS |
| D03 | The visible numbers are the two day counts, no unit | FlameChip.test.tsx `carries the blaze and my days, a rule, then the bonfire and the band’s days`: `expect(chip.textContent).toBe('512');` | PASS |
| D04 | Accessible name "Your flame, N days. Band flame, M days." | HomePage.test.tsx:236 `findByRole('button', { name: 'Your flame, 12 days. Band flame, 4 days.' })` | PASS |
| D05 | The chip name has plural forms ("1 day") | (none found). No test renders the chip label with a count of 1, so if `streaks.mineChip_one` or `bandChip_one` were deleted or misspelt, `t('streaks.mineChip', { count: 1 })` would return a broken label and no test would fail. The keys exist today (en.json `"mineChip_one": "Your flame, {{count}} day."`) | FAIL (non-blocking) |
| D06 | Personal hero: Blaze at `lg`, overline "Your flame", "N days" | StreakSheet.test.tsx `shows my flame with its unit, then the band’s, as two large marks`: `expect(mine.textContent).toBe('Your flame5 days');` and `expect(marks.map((mark) => mark?.getAttribute('width'))).toEqual(['40', '40']);` | PASS |
| D07 | "N days" pluralised ("1 day", "0 days") | StreakSheet.test.tsx `pluralises one day`: `.toBe('The band1 day')`. Member rows `'Marcnot yet today00 days'` | PASS |
| D08 | "today counted" and the jokers sentence are gone | same test: `expect(mine.textContent).toBe('Your flame5 days');` (exact text) | PASS |
| D09 | Seven cells, Monday to Sunday of today's week | practice-flame.core.test.ts `marks each day of today’s week active, joker, open or future, and the session days`: `['2026-10-26', …]` to `['2026-11-01', 'future', false]` with today a Saturday | PASS |
| D10 | One-letter weekday in the locale | flame-week.core.test.ts `writes the weekday letter and full name in the reader’s locale`: `.toEqual(['L','M','M','J','V','S','D'])` | PASS |
| D11 | `active`: present, or a session dated that day | practice-flame.core.test.ts week test: `2026-10-26` is only in the session set, and the test expects `['2026-10-26', 'active', true]`. StreakSheet.test.tsx: `days[0]?.querySelector('svg')?.getAttribute('data-tone')).toBe('counted')` | PASS |
| D12 | `joker`: missed and bridged; Blaze `out`; caption "joker" | practice-flame.core.test.ts `[WEDNESDAY, 'joker', false]`. StreakSheet.test.tsx `days[2]?.querySelector('svg')?.getAttribute('data-tone')).toBe('out')` and textContent `'Wednesday, saved by a jokerWjoker'` | PASS |
| D13 | `missed`: missed and not bridged; empty cell | practice-flame.core.test.ts `leaves the days of a gap it could not bridge missed`: `['active','missed',…,'open']`. StreakSheet.test.tsx `expect(days[3]?.querySelector('svg')).toBeNull();` | PASS |
| D14 | `open`: today, not yet active; Blaze `open` | practice-flame.core.test.ts `[saturday, 'open', false]`. StreakSheet.test.tsx `expect(today?.querySelector('svg')?.getAttribute('data-tone')).toBe('open');` | PASS |
| D15 | `future`: after today, empty, no caption | practice-flame.core.test.ts `['2026-11-01', 'future', false]`. StreakSheet.test.tsx `expect(days[6]?.querySelector('svg')).toBeNull();` and textContent `'Sunday, still to comeS'` | PASS |
| D16 | Today's cell has the `accent` border and the caption "today" | StreakSheet.test.tsx `expect(today?.getAttribute('class')).toContain('border-accent');` and `'Saturday, not yet todayStoday'` | PASS |
| D17 | Caption "session" on a session day, unless joker or today | flame-week.core.test.ts row 0 `'streaks.caption.session'`. `captions today rather than its session`: `expect(cell?.captionKey).toBe('streaks.caption.today');`. Joker over session is **structural**: a session day is always active, `practice-flame.core.ts:119` `new Set([...presenceDays, ...sessionDays])` with `if (activeDays.has(day)) return 'active';` before `joker` at :91 | PASS |
| D18 | Each cell's accessible name says the weekday and its state | StreakSheet.test.tsx `draws the seven days…`: `'Monday, countedM'`, `'Thursday, missedT'` (sr-only text) | PASS |
| D19 | Card titled "Jokers · L of 3" | StreakSheet.test.tsx `getByRole('group', { name: 'Jokers · 2 of 3' })`, and French `'Jokers · 2 sur 3'` | PASS |
| D20 | A dashed pip per joker spent, oldest first, labelled with the short weekday it saved | flame-week.core.test.ts `puts each spent joker first, oldest first, named by the short weekday it saved`: `{ id: '2026-10-28', kind: 'spent', weekdayName: 'Wed' }, { id: '2026-10-29', … 'Thu' }` | PASS |
| D21 | Then a filled pip per joker left | same test `{ id: 'left-0', kind: 'left', weekdayName: null }`. StreakSheet.test.tsx `['left', ''], ['left', '']` | PASS |
| D22 | The card ends with "Back on Monday" | StreakSheet.test.tsx `expect(within(card).getByText('Back on Monday')).toBeTruthy();` | PASS |
| D23 | The pips and the timeline always agree | practice-flame.core.test.ts `shows only this week’s days of a bridged gap that crosses the Monday`: `expect(flame.week.filter((weekDay) => weekDay.state === 'joker')).toHaveLength(3 - flame.jokersLeftThisWeek);`. `buildJokerPips` reads the same `week` (flame-week.core.ts:82-90) | PASS |
| D24 | No milestone, no record | **structural:** StreakSheet.tsx:30-38 renders no milestone element, and en.json has no milestone key | PASS |
| D25 | Band hero: Bonfire at `lg`, overline "The band", "N days" | StreakSheet.test.tsx `expect(band.textContent).toBe('The band12 days');` with bonfire `width` `'40'` | PASS |
| D26 | One list of every current member including the reader | StreakSheet.test.tsx `lists every member under the band…` lists all four view members. api streaks.core.test.ts `buildMemberFlames` lists every member | PASS |
| D27 | Sorted by days descending, then by first name | streak-sheet.core.test.ts `puts the longest flame first, then orders a tie by first name`: Sarah 3 and Léa 3 come out `['Hugo','Léa','Sarah','Marc']` | PASS |
| D28 | Row: dot, first name, "not yet today" when not counted, Blaze in member tone with the count | StreakSheet.test.tsx `'Sarahnot yet today33 days'`, `'Léa11 day'`, and `.toEqual(['counted','open','counted','out'])`, with the dot `backgroundColor` `RENDERED_NAVY` | PASS |
| D29 | Rows at least 44 px tall | StreakSheet.test.tsx `expect(rows[0]?.getAttribute('class')).toContain('min-h-11');` | PASS |
| D30 | At-risk push with jokers left: title, body, `J = jokersLeftThisWeek - 1` | streak-reminder.core.test.ts `warns a member whose open flame is above 2 days that tonight costs a joker`: `parameters: { days: '3', jokersAfter: '1' }` from 2 left. service-worker.test.ts: `'Your 12-day flame is waiting'`, `'Come by before midnight, or a joker goes. You will have 2 left.'` | PASS |
| D31 | No joker left: `streak-at-risk-last` title and body | streak-reminder.core.test.ts `['streak-at-risk-last', { days: '9' }]`. service-worker.test.ts `'Your 12-day flame goes out at midnight'`, `'No joker left this week. Open Pragma before midnight.'` in both languages | PASS |
| D32 | Band-count pushes unchanged | service-worker.test.ts expectations for `streak-band-count` and `-one` are unchanged lines in the diff | PASS |
| D33 | `get_me` does not gain the week | streaks.core.test.ts `keeps both flames and each member’s count, without ids or colours`: `mine: { days: 1, isTodayCounted: true, jokersLeftThisWeek: 3 }` with exact `toEqual` | PASS |
| D34 | `GET /api/streaks` returns `mine.week` (Changes) | streaks.controller.test.ts `week: z.array(flameWeekDaySchema).length(7)` in a `.strict()` schema, and `expect(streaks.mine.week).toContainEqual({ day: streaks.today, state: 'active', isSessionDay: true })` | PASS |

## E. Scale

| # | Write path or state | Question | Failing case, or the key or test that holds it | Verdict |
|---|---|---|---|---|
| E01 | Write paths | Check-then-write | `git diff base...ba48d93 -- apps/pragma/api \| grep -E '^\+.*(insert\(\|update\(\|delete\(\|onConflict\|transaction\()'` finds nothing. The 20:00 reminder's existing claim on `streak:<memberId>:<day>` is untouched. The diff changes only which message key is chosen | PASS |
| E02 | Module-level state | Per-process state | The only new module values are `const NO_DAY = new Set<CalendarDay>();` (streaks.core.ts:53), passed as `ReadonlySet` to `computePersonalFlame`, which copies it (`new Set([...presenceDays, ...sessionDays])`), and constant lookups. None holds a rule across requests | PASS |

## Blocking findings

- A12. `PERSISTED_CACHE_SHAPE_VERSION` was not bumped for the new `week` field. A restored pre-deploy `streaks` cache (fresh within 300 s, or offline within seven days) crashes `StreakSheet` on `view.mine.week.map` when the member taps the chip.

## Non-blocking findings

- B11. The joker pip logic (`buildJokerPips`, `JokerPip`, `JOKER_PIP_CLASS`) lives in files named `flame-week.*`.
- D05. No test pins the singular form of the Home chip's accessible name.

## Notes

- A00. The plan is absent by design (Tier 1). The files were taken from the diff.
- The `.claude/hooks/pretool-mockup-reads-visual-rules.sh` change came in with the spec commit and the PR #394 merge. No spec claim covers it, and it was not graded.
- `formatWeekday` builds a new `Intl.DateTimeFormat` for each call, which is 14 per sheet render plus one per spent joker. Is that worth caching per locale, or is it negligible at seven cells?
- The spent pips' visible weekday ("Wed") is not `aria-hidden` and carries no context, so a screen reader reads a bare "Wed" inside the card. Should the spent pip carry a label like "Wednesday, saved by a joker"?
- HEAD moved to `3cba8ad5c` during the review. Round 2 should diff from `ba48d93da`.

## Verdict: FAIL
