# Technical validation — Several calendars per member

- Spec: [`../spec/spec.md`](../spec/spec.md)
- Plan: [`../plan/plan.md`](../plan/plan.md)
- Branch: claude/beautiful-planck-b486wd
- Base: origin/main
- Run at: 2026-10-29T14:58:33Z
- Round: 2
- Reviewed: 17c3d348ce00ae6cb285ae819a71217fd66fcc62
- Touched workspaces: @borso-app/pragma (api, site, domain)

Scope. The previous round reviewed `1f8c003e`. This round reads the branch's own commits since then, `e0513542` (`.gitignore`, one line) and `1dfe16e5` (the fix round). The merge `17c3d348` brought `bff04a95` from `origin/main`. Its only conflict was the generated `docs/standards/blueprint-subjects.json`, so it adds no code of this branch and is not reviewed.

## A. Correctness vs spec

No spec decision changed in this round. The fix touches the save path, which round 1 already graded against the spec. The new `member-gone` outcome is checked under E.

| # | Spec ref | Claim | Code (file:line) | Evidence (quoted) | Verdict |
|---|---|---|---|---|---|
| A01 | Rules, cap of ten | The cap is still enforced at save, now through a core decision | api/src/calendar-feeds/feed-cap.core.ts:4-5, calendar-feeds.repository.ts:49-50 | `return heldFeeds < CALENDAR_FEEDS_PER_MEMBER_MAX;` and `const hasRoom = hasRoomForAnotherFeed(existing?.total ?? 0); if (!hasRoom) return 'too-many';` | PASS |

## Round-1 findings (round 2 only)

| # | Round-1 row | Fixed by | Verdict |
|---|---|---|---|
| R01 | D02, unnamed calendars listed last | `1dfe16e5` api/src/free-slots/free-slots.controller.test.ts:125 `'lists unnamed calendars last, and two calendars of one name by id'`. It stores a named feed, two `Twin` feeds and one unnamed feed, then asserts `.toStrictEqual(['Band', 'Twin', 'Twin', null])`. A `NULLS FIRST` order puts `null` first and fails it. | PASS |
| R02 | D03, tie-break by id | `1dfe16e5` same test, :146 `expect((firstTwin?.id ?? '') < (secondTwin?.id ?? '')).toBe(true);`. The test sets up the condition, two feeds of one name. Its strength is graded in D01. | PASS |
| R03 | D12, re-save refreshes the name | `1dfe16e5` free-slots.controller.test.ts:149 `'refreshes the name when the same address is saved again'`. The first save answers `Work`, the second answers `X-WR-CALNAME:Renamed`, and :157 asserts `.toStrictEqual(['Renamed'])`. Dropping `name: feed.name` from the `.set(...)` at calendar-feeds.repository.ts:40 leaves `Work` and fails it. | PASS |
| R04 | E01, no concurrent proof of the cap and of one copy per address | `1dfe16e5` free-slots.controller.test.ts:160 and :177. Both fire two `POST /api/me/calendar-feeds` through `Promise.all` inside `runWithWritesToTableHeld('calendar_feed', 2, …)`, which holds `LOCK TABLE "calendar_feed" IN SHARE MODE` and waits until two sessions are in `wait_event_type = 'Lock'` (test/database-utils.ts:63-86, 108-126). So the requests do overlap. The cap test asserts `[200, 409]` (:173) and `toHaveLength(CALENDAR_FEEDS_PER_MEMBER_MAX)` (:174). The same-address test asserts `[200, 200]` (:185) and `toHaveLength(1)` (:186). Without `didClaimMemberRow`, both requests read 9 under the SHARE lock and both insert, giving 11 rows (inferred from the lock modes, not run). | PASS |

## B. Code cleanliness

| # | Rule | Check | Evidence | Verdict |
|---|---|---|---|---|
| B01 | Lint clean | `pnpm exec oxlint --type-aware` on the 11 changed `.ts`/`.tsx` files | exit 0, no output | PASS |
| B02 | No `any` | `grep -nP '\bany\b'` on the changed files | none found | PASS |
| B03 | `useEffect` is a smell | `grep -nE '\buseEffect\('` on the changed files | none found | PASS |
| B04 | Names carry intent | sampled `didClaimMemberRow`, `isMemberClaimed`, `hasRoomForAnotherFeed`, `heldFeeds`, `CALENDAR_FEED_ADDRESS_MAX_LENGTH`, `postFeed` | none at fault | PASS |
| B05 | Round-1 B11 (derived types) | read calendar-feeds.types.ts in full | `export type CalendarFeedSummary = Readonly<Pick<CalendarFeedRow, 'id' \| 'name'>>;` at :10. Now derived from `typeof calendarFeedTable.$inferSelect` (calendar-feeds.schema.ts:25). | PASS |
| B06 | Round-1 B12 (limit restated in the site) | read CalendarFeedForm.tsx and calendar-feeds.schema.ts | Both read `CALENDAR_FEED_ADDRESS_MAX_LENGTH` from `@domain/input-limits.core` (input-limits.core.ts:45, CalendarFeedForm.tsx:3, calendar-feeds.schema.ts:3). | PASS |
| B07 | A change keeps the behaviour of the code it touches (`SetlistSongPicker`, the round-1 C04 fix) | read SetlistSongPicker.tsx in full; ran a jsdom probe of the same pattern against the app's React 19.3.0 | `ref={() => publishSearchedTitle.cancel}` at apps/pragma/site/src/components/organisms/SetlistSongPicker.tsx:199. The arrow is a new function on every render. React 19 therefore runs the previous ref's cleanup, which is `cancel`, on every commit. `changeQuery` (:127-130) calls `setQuery(nextQuery)` and then `publishSearchedTitle(nextQuery.trim())`, so the re-render that follows each keystroke cancels the debounce it just armed. Failing case: open the Add songs sheet, type a title that no catalogue song matches, wait past `SEARCH_DEBOUNCE_MS`. `setSearchedTitle` never runs, `searchedTitle` stays `''`, and `useSongSearch(isSearchingService ? searchedTitle : '')` (:99) never searches the music service. The probe (a component with `ref: () => debounced.cancel` whose state setter also calls the debounced function) printed `debounced callback fired: 0 cancel calls: 1`. No test covers the service search after typing, so core passes. Introduced: this branch (`1dfe16e5`). Fix size: one file (cancel on unmount through a stable cleanup, such as `useEffect(() => publishSearchedTitle.cancel, [publishSearchedTitle])`, which subscribes to a timer and is legitimate, or a ref callback memoised with `useCallback`). Add a test that types a title and asserts the service search runs. | FAIL (blocking) |

## C. Tests pass

| # | Workspace | Command | Exit | Verdict |
|---|---|---|---|---|
| C01 | @borso-app/pragma (core) | `pnpm --filter @borso-app/pragma exec vitest run --project core --changed 1f8c003e` | 0. 54 files, 415 tests | PASS |
| C02 | @borso-app/pragma (e2e) | `pnpm --filter @borso-app/pragma run test:e2e --changed 1f8c003e` | 0. 41 files, 391 tests | PASS |
| C03 | `*.utils.ts` coverage | the round touches no `*.utils.ts`. The new pure file is `feed-cap.core.ts`, with `feed-cap.core.test.ts` beside it. | n/a | PASS |

## D. Test coverage of spec

Only the rows this round's tests touch. The spec still has no *Use cases / edge cases* section (round-1 D00, non-blocking), so 0 use cases are routed to /visual-validation.

| # | Use case | Covering test | Verdict |
|---|---|---|---|
| D01 | Calendars of equal name are ordered by id (strength of the R02 test) | free-slots.controller.test.ts:146. `id` is `uuid('id').primaryKey().defaultRandom()` (calendar-feeds.schema.ts:9), so `twin-a` and `twin-b` get random ids. Drop `asc(calendarFeedTable.id)` from calendar-feeds.repository.ts:68 and two equal names come back in the order the sort leaves them, most likely insertion order. The assertion then fails only when `twin-b`'s random id sorts below `twin-a`'s, about one run in two (inferred from the random ids, not run). The regression is caught, but not every time. Fix: insert both rows through `testDatabase` with fixed ids, the higher id first. | FAIL (non-blocking) |
| D02 | The cap holds under two saves at once | free-slots.controller.test.ts:160, asserts at :173-174 | PASS |
| D03 | One address saved twice at once keeps one copy | free-slots.controller.test.ts:177, asserts at :185-186 | PASS |
| D04 | `hasRoomForAnotherFeed` at 0, at cap minus one and at the cap | feed-cap.core.test.ts:7 `'lets a member add calendars up to the cap, and not one more'`, :10 `expect(hasRoomForAnotherFeed(CALENDAR_FEEDS_PER_MEMBER_MAX)).toBe(false);` | PASS |

## E. Scale

| # | Write path or state | Question | Failing case, or the key or test that holds it | Verdict |
|---|---|---|---|---|
| E01 | `upsertCalendarFeed`, cap and one copy per address (calendar-feeds.repository.ts:27-58) | Check-then-write | Held by the `member` primary-key row lock, `.for('update')` at :23, taken before the count at :34-37. On DSQL a competing commit aborts and `retryingConflictAborts` (:29) reruns it. Proven by the concurrent tests at free-slots.controller.test.ts:160 and :177 (R04). | PASS |
| E02 | `upsertCalendarFeed` for a deleted member (round-1 Notes question) | Check-then-write against `deleteMemberWithLinks` | `if (!isMemberClaimed) return 'member-gone';` at :33. A save that starts after the member row is gone writes nothing. Test at free-slots.controller.test.ts:189 asserts `toBe('member-gone')` and `toStrictEqual([])`. A save already holding the lock when the delete starts is covered by the delete waiting on that lock. | PASS |
| E03 | Module-level state | `grep -nE '^(let\|const) [a-zA-Z]+ = new (Map\|Set)\|^let '` on the changed api files | none found | PASS |

## Blocking findings

- B07: `ref={() => publishSearchedTitle.cancel}` (SetlistSongPicker.tsx:199) cancels the search debounce on every re-render, so typing a title never searches the music service. Measured with a jsdom probe on React 19.3.0.

## Non-blocking findings

- D01: the id tie-break test relies on random uuids and catches its regression about half the time.

## Notes

- calendar-feeds.types.ts:8 puts `import type { CalendarFeedRow } from './calendar-feeds.schema';` below two declarations. Imports are hoisted, so nothing breaks, and no lint rule or standards bullet flags it. Should it move to the top of the file?
- The new `404 { error: 'unknown-member' }` branch at me.controller.ts:70 has no HTTP test. Only the repository outcome is tested (:189). A request reaches it only when a session outlives its member. Is a controller test wanted for that window?
- Round-1 Notes on the migration deploy window, the unnamed failing calendar's label and the `free_slots_computed` metric's `excluded` field are not addressed by this round. They remain open questions, not findings.

## Verdict: FAIL
