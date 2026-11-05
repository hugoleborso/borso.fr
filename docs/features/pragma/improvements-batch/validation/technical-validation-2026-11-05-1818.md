# Technical validation — Pragma improvements batch, November 2026

- Spec: [`../spec/spec.md`](../spec/spec.md)
- Plan: none (`../plan/plan.md` absent; the spec says each fix is local to one component)
- Branch: fix/pragma-improvements-batch
- Base: origin/main
- Run at: 2026-11-05T18:23:45Z
- Round: 1
- Reviewed: 76e5c36b11911e38ae774a979f0095759b1ef0db
- Touched workspaces: @borso-app/pragma (site only)

This spec is in the short form. It has only *Use cases* and *Out of scope*, with no Q.O.D., *Changes* or *Test strategy*. Category A is built from the five use cases, with files taken from the diff. Category D walks the same use cases in order, split per claim. 0 use cases are routed to /visual-validation.

## A. Correctness vs spec

| # | Spec ref | Claim | Code (file:line) | Evidence (quoted) | Verdict |
|---|---|---|---|---|---|
| A00 | Plan | A plan exists for the branch | docs/features/pragma/improvements-batch/plan/plan.md | File absent. The spec states the reason ("There is no plan, because each fix is local to one component"). Files are taken from the diff. | PASS |
| A01 | UC1 | The time is shown in Europe/Paris, 24-hour clock, as `<date> · HH:MM` | apps/pragma/site/src/lib/formatters.utils.ts:18-37 | `timeZone: BAND_TIME_ZONE,` … `hourCycle: 'h23',` … ``return `${dayFormatter.format(date)}${DATE_TIME_SEPARATOR}${hourFormatter.format(date)}`;`` with `const DATE_TIME_SEPARATOR = ' · ';` and `BAND_TIME_ZONE = 'Europe/Paris'` (apps/pragma/domain/band-time-zone.core.ts) | PASS |
| A02 | UC1 | The Sessions list shows the start time | apps/pragma/site/src/routes/sessions/SessionsPage.tsx:174 | `{formatSessionDateTime(session.date, i18n.language)}` | PASS |
| A03 | UC1 | The session detail header shows the start time | apps/pragma/site/src/components/organisms/SessionDetail.tsx:192,257 | `const formattedDate = formatSessionDateTime(session.date, i18n.language);` … `subtitle={[formattedDate, ...sessionFacts].join(' · ')}` | PASS |
| A04 | UC1 | "Wherever … the Home next-session card show a session date, they also show its start time" | apps/pragma/site/src/routes/home/HomePage.tsx:222 and :234 | Line 222 is fixed: `dateLabel={formatSessionDateTime(nextSession.date, i18n.language)}`. Line 234 is not: `dateLabel: formatSessionDate(nextConcert.date, i18n.language),`, and NextSessionCard.tsx:67 renders it inside the same card (`{[props.nextConcert.dateLabel, props.nextConcert.venue]`). Failing case: the next session is a practice and a later concert starts at `2026-11-20T19:00:00Z`. The card's "Next concert" line reads `ven. 20 nov. 2026 · <venue>` with no `20:00`. | FAIL (blocking) |
| A05 | UC2 | An open sheet stays inside the area above the on-screen keyboard | apps/pragma/site/src/components/molecules/Sheet.tsx:28-30,69 | `'fixed inset-x-0 top-0 z-50 flex h-(--visual-viewport-height) flex-col bg-scrim ' + 'pt-[env(safe-area-inset-top)]'` on `ModalOverlay`. react-aria-components sets `--visual-viewport-height` on the overlay, and Sheet.test.tsx:136 confirms that (`expect(scrim?.style.getPropertyValue('--visual-viewport-height')).not.toBe('')`). Every sheet goes through this molecule. | PASS |
| A06 | UC3 | Opening a sheet does not scroll the visual viewport to reveal its first field | apps/pragma/site/src/lib/modal-dialog.adapter.ts:13,20 | `const FOCUS_WITHOUT_SCROLLING: FocusOptions = { preventScroll: true };` … `target?.focus(FOCUS_WITHOUT_SCROLLING);`. No sheet uses `autoFocus` (grep). The one unprotected `field.focus()` (keyboard-reveal.adapter.ts:14) is used only by AddSongForm on AddSongPage, which is a page and not a sheet. | PASS |
| A07 | UC3 | The tab bar and FAB stay at the bottom after a sheet opens and closes | Sheet.tsx:28-30; modal-dialog.adapter.ts:20 | The diff changes only the two mechanisms above. The outcome is iOS Safari runtime. The diff matches the stated cause ("must not scroll the visual viewport"). | PASS |
| A08 | UC4 | Setlist rows show "No lineup yet" with a warning icon instead of an empty gap | apps/pragma/site/src/components/molecules/LineupSlots.tsx:25-32; lineup-slots.core.ts:88; SetlistEntryRow.tsx:88-90 | `if (column.slots.length === 0) { return ( <span className={EMPTY_CLASS}> <Icon name="warn" /> {t('lineup.noLineup')}` and `if (column.slots.length === 0) return 'auto';` for the row's `flexBasis` | PASS |
| A09 | UC4 | Practice mode shows "No lineup yet" with a warning icon | apps/pragma/site/src/components/organisms/PracticeCurrentSong.tsx:46 | `<LineupSlots column={props.lineupColumn} />`. This is the same component and branch as A08. | PASS |
| A10 | UC4 | The song's Lineup tab shows "No lineup yet" **with a warning icon** | apps/pragma/site/src/components/organisms/SongDetailSidebar.tsx:36-38 (rendered as the `lineup` tab at SongDetail.tsx:150) | `{hasLineup ? null : ( <span className="text-meta text-ink-soft italic">{t('lineup.noLineup')}</span> )}`. The text is there, but there is no `<Icon name="warn" />` and the text is soft ink instead of `text-warn`. Failing case: open the Lineup tab of a song with `lineupRows = []`. It shows italic grey "No lineup yet" and no warning icon, where the spec asks for the icon on all three surfaces. | FAIL (blocking) |
| A11 | UC4 | Translations exist in both locales | apps/pragma/site/src/i18n/en.json:346, fr.json:346 | `"noLineup": "No lineup yet",` / `"noLineup": "Pas encore de lineup",` | PASS |
| A12 | UC5 | A saved note reopened fits its text, borders included | apps/pragma/site/src/components/atoms/AutoGrowTextarea.tsx:8-12 | `const borderHeight = element.offsetHeight - element.clientHeight;` `element.style.setProperty('height', \`${String(element.scrollHeight + borderHeight)}px\`);` | PASS |
| A13 | UC5 | The note refits after the display web font finishes loading | apps/pragma/site/src/components/atoms/AutoGrowTextarea.tsx:14-21,32 | `void element.ownerDocument.fonts.ready.then(() => { fitToContent(element); });` wired as `ref={fitNowAndOnceFontsLoad}` | PASS |

## B. Code cleanliness

| # | Rule | Check | Evidence | Verdict |
|---|---|---|---|---|
| B01 | No abbreviations or one-letter locals | read every changed file | none found (`borderHeight`, `dayFormatter`, `hourFormatter`, `fieldFocusOptions`) | PASS |
| B02 | Magic numbers and strings extracted | read every changed file | `DATE_TIME_SEPARATOR`, `FOCUS_WITHOUT_SCROLLING`, `EMPTY_CLASS` and the test constants `BORDER_HEIGHT_PX` and friends are named | PASS |
| B03 | No prose comments | `git diff … \| grep -E '^\+.*(//\|/\*)'` | only `// @FollowsBlueprint test-component-render` (×2) | PASS |
| B04 | Function names describe the result | sample | `formatSessionDateTime`, `fitToContent`, `fitNowAndOnceFontsLoad`, `naturalColumnWidth` | PASS |
| B05 | Type assertions limited to `as const` / `as unknown` | `grep -nE ' as [A-Z]'` on changed files | none | PASS |
| B06 | No `any` | `grep -nP '\bany\b'` on changed files | only the English word in a test title (modal-dialog.adapter.test.ts:48) | PASS |
| B07 | `noUncheckedIndexedAccess` honoured | read | the only new index is `focus.mock.calls[index]?.[0]` (Sheet.test.tsx), guarded | PASS |
| B08 | Lint clean | `pnpm exec oxlint --type-aware <19 changed .ts/.tsx files>` | exit 0, no output | PASS |
| B09 | Dead code | `pnpm exec knip` | exit 0. Only configuration hints. `formatSessionDate` still has 9 callers. | PASS |
| B10 | Typecheck | `pnpm --filter @borso-app/pragma run typecheck` | exit 0 | PASS |
| B11 | `useEffect` is a smell | `grep -nE '\buseEffect\('` on changed files | none | PASS |
| B12 | Standards checklist, 01-naming: "a `build…`, `project…` or `select…` returns what its verb says" / boolean names not negated | read in full | No new verb-prefixed or boolean names besides `hasLineup` (pre-existing) | PASS |
| B13 | Standards checklist, 02-purity: "a limit or a rule written in a site does not restate one the API enforces" | read in full | The band zone is imported from `@domain/band-time-zone.core` (formatters.utils.ts:1), not restated | PASS |
| B14 | Blueprint `molecule-presentational` ("the file holds no user facing string and no conditional") | read LineupSlots.tsx in full against `.claude/skills/blueprint/blueprint-index.md:196` | `if (column.slots.length === 0) {` at apps/pragma/site/src/components/molecules/LineupSlots.tsx:25. The file claims `// @FollowsBlueprint molecule-presentational` and now branches on the column. The empty or filled choice could come from `sliceColumnToWidth` in the covered `lineup-slots.core.ts`. Introduced: this branch. Fix size: one file plus its core. | FAIL (non-blocking) |
| B15 | Standards checklist, 09-i18n: "a key's dotted path names the screen and the element" | read en.json/fr.json hunks | `lineup.noLineup` sits in the shared `lineup` namespace used by three screens | PASS |
| B16 | Standards checklist, 10-testing: "a test name states the behaviour and the condition" | read the 11 new tests | e.g. `'names the Paris day when the hour crosses midnight there'`, `'fits a saved note again once the web font that wraps it finishes loading'` | PASS |
| B17 | Standards checklist, 05-frontend: no new label explaining the interface; no boolean prop family | read in full | no new props. The one new string is a state label. | PASS |
| B18 | Standards checklist, 08-styling: more than two variants go through `cva` | read in full | no new variant sets | PASS |

## C. Tests pass

| # | Workspace | Command | Exit | Verdict |
|---|---|---|---|---|
| C01 | @borso-app/pragma | `pnpm --filter @borso-app/pragma exec vitest run --project core --changed origin/main --reporter=verbose --coverage` | 0. 66 files, 388 tests passed. Coverage summary 100% statements, branches, functions and lines. All 11 new tests appear in the verbose list (formatters.utils.test.ts, lineup-slots.core.test.ts, SetlistEntryRow.test.tsx, SongDetailSidebar.test.tsx, AutoGrowTextarea.test.tsx, Sheet.test.tsx, modal-dialog.adapter.test.ts). | PASS |
| C02 | @borso-app/pragma | `pnpm --filter @borso-app/pragma run test:e2e --changed origin/main` | 0 (no affected back-e2e file; the diff is site-only) | PASS |
| C03 | @borso-app/pragma | `scripts/mutate-changed.sh origin/main` (lineup-slots.core.ts, formatters.utils.ts, modal-dialog.adapter.ts) | 0. 137 mutants, 137 killed, 0 survived, score 100.00. | PASS |
| C04 | @borso-app/pragma | every `*.utils.ts` under site/api/domain has a sibling `*.utils.test.ts` | 60 of 60 present | PASS |

## D. Test coverage of spec

| # | Use case | Covering test | Verdict |
|---|---|---|---|
| D01 | UC1: the time is in Europe/Paris, whatever the reader zone | `it('reads the day and the hour on the band clock in Paris, whatever the reader zone')` at apps/pragma/site/src/lib/formatters.utils.test.ts:87. The assertion is `expect(formatSessionDateTime('2026-11-12T19:00:00.000Z', 'fr')).toBe('jeu. 12 nov. 2026 · 20:00')`. The runner is in UTC (`date +%Z` → UTC), so dropping `timeZone` would give `19:00` and fail. The midnight case is at :101. | PASS |
| D02 | UC1: 24-hour clock | `it('keeps a 24-hour clock in english, as the free slots do')` at formatters.utils.test.ts:93. `toBe('Thu, Nov 12, 2026 · 20:00')` for `'en'` would read `08:00 PM` without `hourCycle: 'h23'`. | PASS |
| D03 | UC1: the Sessions list shows the time | (none found). No test in routes/sessions/SessionsPage.test.tsx asserts a time. Failing case: revert SessionsPage.tsx:174 to `formatSessionDate(...)` and every test still passes. | FAIL (blocking) |
| D04 | UC1: the session detail header shows the time | (none found). No assertion in SessionDetailPage.test.tsx matches `· HH:MM`. Reverting SessionDetail.tsx:192 passes every test. | FAIL (blocking) |
| D05 | UC1: the Home next-session card shows the time | (none found). HomePage.test.tsx:139 `'shows the next session with its place, setlist, song count and total time'` asserts the venue, setlist and duration but not the date label. Reverting HomePage.tsx:222 passes every test. This gap is also why A04 went unseen. | FAIL (blocking) |
| D06 | UC2: the sheet is sized to the visual viewport, above the keyboard | `it('sizes its shadow to the visual viewport, so the keyboard cannot cover the sheet')` at apps/pragma/site/src/components/molecules/Sheet.test.tsx:128. It runs `expect(scrim?.className).toContain('h-(--visual-viewport-height)')` and `expect(scrim?.className).not.toContain('inset-0')`. | PASS |
| D07 | UC3: opening a sheet does not scroll the visual viewport to its first field | `it('focuses its first field on an iPhone without asking the page to scroll it into view')` at Sheet.test.tsx:105 runs `expect(fieldFocusOptions.every((preventScroll) => preventScroll === true)).toBe(true)`. `it('focuses without scrolling the page, …')` at apps/pragma/site/src/lib/modal-dialog.adapter.test.ts:77 runs `expect(focus).toHaveBeenCalledWith({ preventScroll: true })`. | PASS |
| D08 | UC3: the tab bar and FAB stay pinned after open and close on iPhone | **structural:** jsdom has no visual viewport offset. The guarantee is `target?.focus(FOCUS_WITHOUT_SCROLLING);` at modal-dialog.adapter.ts:20, pinned by D07. | PASS |
| D09 | UC4: setlist rows say "No lineup yet" | `it('says the song has no lineup yet instead of leaving its lineup empty')` at apps/pragma/site/src/components/organisms/SetlistEntryRow.test.tsx:81 runs `expect(screen.getByText('No lineup yet')).toBeTruthy();`. The row width is covered by `it('lets an empty column size itself to its no-lineup label')` at lineup-slots.core.test.ts:171, `toBe('auto')`. | PASS |
| D10 | UC4: practice mode says "No lineup yet" | **structural:** PracticeCurrentSong.tsx:46 hands the column unchanged to `<LineupSlots column={props.lineupColumn} />`, whose empty branch D09 exercises | PASS |
| D11 | UC4: the song's Lineup tab says "No lineup yet" | `it('says the song has no lineup yet when nobody plays it')` at apps/pragma/site/src/components/organisms/SongDetailSidebar.test.tsx:12 runs `expect(screen.getByText('No lineup yet')).toBeTruthy();` | PASS |
| D12 | UC4: the placeholder carries a warning icon (rows, practice, Lineup tab) | (none found). No test asserts the icon on any surface. Removing `<Icon name="warn" />` from LineupSlots.tsx:28 passes every test, and the icon missing from SongDetailSidebar (A10) passes too. | FAIL (blocking) |
| D13 | UC5: a reopened note fits its text after the web font loads (no blank space) | `it('fits a saved note again once the web font that wraps it finishes loading')` at apps/pragma/site/src/components/atoms/AutoGrowTextarea.test.tsx:50 runs `expect(notes.style.height).toBe(\`${String(WEB_FONT_TEXT_HEIGHT_PX + BORDER_HEIGHT_PX)}px\`)` after the height shrinks from 168 to 120 | PASS |
| D14 | UC5: borders included, no clipped lines | Same test, first assertion at :54, `FALLBACK_FONT_TEXT_HEIGHT_PX + BORDER_HEIGHT_PX`. Growth on typing is covered by `it('grows with what the member types')` at :62. | PASS |

## E. Scale

| # | Write path or state | Question | Failing case, or the key or test that holds it | Verdict |
|---|---|---|---|---|
| E01 | none | Write paths, per-process state, concurrent proof | `git diff origin/main...HEAD --name-only \| grep -E '\.(service\|repository\|controller)\.ts$'` → no match. `grep -E '^\+(let\|const) [a-zA-Z]+ = new (Map\|Set)\|^\+let '` on the diff → no match. The only new module-level values are constant strings and options objects (`EMPTY_CLASS`, `DATE_TIME_SEPARATOR`, `FOCUS_WITHOUT_SCROLLING`). The diff is site-only and writes nothing. | PASS |

## Blocking findings

- A04: the Home next-session card's "Next concert" line still uses `formatSessionDate` (HomePage.tsx:234), so that session date shows no start time.
- A10: the song's Lineup tab shows "No lineup yet" without the warning icon the spec requires (SongDetailSidebar.tsx:37).
- D03: no test pins the start time on the Sessions list.
- D04: no test pins the start time in the session detail header.
- D05: no test pins the start time on the Home next-session card.
- D12: no test asserts the warning icon on any no-lineup surface.

## Non-blocking findings

- B14: LineupSlots.tsx:25 adds a conditional to a file that follows `molecule-presentational`, whose blueprint has no conditional. The empty or filled choice could live in `lineup-slots.core.ts`.

## Notes

- The plan is absent by design (short-form spec). No row depended on it.
- Should SessionSetlistPreview.tsx:78-82 reuse the new LineupSlots empty state? It already renders the same placeholder (`<Icon name="warn" />{t('sessions.noLineup')}` in `text-warn`) under a second key, `sessions.noLineup`, with the same text as the new `lineup.noLineup`. Two keys and two copies of the markup now say one thing.
- Does `document.fonts.ready`, read after the first `fitToContent` in AutoGrowTextarea.tsx:18, always cover a font whose load starts only when the textarea is laid out? The order (measure, which forces layout, then read `ready`) suggests yes. No failing case was found.
- A08 to A10 and D06 to D08 are layout and iOS runtime behaviour. The short-form spec routes nothing to /visual-validation, so they are graded here from the code and the jsdom tests. The real iPhone outcome is unchecked here.

## Verdict: FAIL
