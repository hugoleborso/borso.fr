# Technical validation — Pragma improvements batch, November 2026

- Spec: [`../spec/spec.md`](../spec/spec.md)
- Plan: none (`../plan/plan.md` absent; the spec says each fix is local to one component)
- Branch: fix/pragma-improvements-batch
- Base: origin/main
- Run at: 2026-11-05T18:35:17Z
- Round: 2
- Reviewed: 4a54c57b376a9ee2fc0bddcc2a47bdea062b600f
- Touched workspaces: @borso-app/pragma (site only)

This round reads `git diff 76e5c36b11911e38ae774a979f0095759b1ef0db..HEAD`: commits `e763d4018` (spec), `cc116768f` (spec amendment, round-1 report, A04 dismissal) and `4a54c57b3` (fixes). The spec is in the short form, as in round 1. 0 use cases are routed to /visual-validation.

## A. Correctness vs spec

| # | Spec ref | Claim | Code (file:line) | Evidence (quoted) | Verdict |
|---|---|---|---|---|---|
| A01 | UC1 (amended in cc116768f) | The time shows wherever the three surfaces show "the session's own date" | docs/features/pragma/improvements-batch/spec/spec.md:7; apps/pragma/site/src/routes/home/HomePage.tsx:222 | The amendment replaces "show a session date" with "show the session's own date". The card's own session reads `dateLabel={formatSessionDateTime(nextSession.date, i18n.language)}`. Spec amended after round 1; no plan section exists for it, files taken from the diff. | PASS |
| A02 | UC4 | The song's Lineup tab shows "No lineup yet" with a warning icon | apps/pragma/site/src/components/organisms/SongDetailSidebar.tsx:37; apps/pragma/site/src/components/molecules/NoLineupNotice.tsx:7-17 | `{hasLineup ? null : <NoLineupNotice />}` and `'inline-flex h-6 shrink-0 items-center gap-1 text-label whitespace-nowrap text-warn'` … `<Icon name="warn" />` `{t('lineup.noLineup')}` | PASS |
| A03 | UC4 | Setlist rows and practice mode keep the notice after the refactor | apps/pragma/site/src/components/molecules/LineupSlots.tsx:51-60; lineup-slots.core.ts:89-91 | `const LINEUP_BY_KIND = { empty: NoLineupNotice, filled: FilledLineupSlots, }` … `const Lineup = LINEUP_BY_KIND[selectLineupColumnKind(column)];` with `return column.slots.length === 0 ? 'empty' : 'filled';` | PASS |
| A04 | UC4 (adjacent surface) | The session setlist preview keeps its no-lineup notice after losing `hasNoLineup` and `sessions.noLineup` | apps/pragma/site/src/components/organisms/SessionSetlistPreview.tsx:77-79 | `<LineupSlots column={buildLineupColumn({ instruments, lineup: row.lineup, members })} />`. An empty lineup builds `{ slots: [] }` (lineup-slots.core.ts:76-87), which renders `NoLineupNotice` with the same icon, `text-warn` and the same text ("No lineup yet" / "Pas encore de lineup") the removed `sessions.noLineup` carried. `grep -rn noLineup apps/pragma/site/src` outside tests finds only `lineup.noLineup`, so no caller of the removed key is left. | PASS |

## Round-1 findings

| # | Round-1 row | Fixed by | Verdict |
|---|---|---|---|
| R01 | A04 (blocking, dismissed) | `cc116768f` spec.md:7 | Dismissal claims (1) the request covers rehearsals and (2) the time truncated the next-concert line at 375 px. Check (1): the spec now reads "show the session's own date", and the "Next concert" line at NextSessionCard.tsx:60-72 names a different session than the card's, so it is outside the amended claim. Check (2): the line's text sits in `<span className="min-w-0 truncate text-ink-soft">` (NextSessionCard.tsx:66) between a `shrink-0` label and a `shrink-0` chevron, so added characters are cut, not wrapped (structural, not measured in a browser). The dismissal holds against the amended spec. PASS |
| R02 | A10 (blocking) | `4a54c57b3` apps/pragma/site/src/components/organisms/SongDetailSidebar.tsx:37 | `{hasLineup ? null : <NoLineupNotice />}` now renders the warn icon in `text-warn`. PASS |
| R03 | D03 (blocking) | `4a54c57b3` apps/pragma/site/src/routes/sessions/SessionsPage.test.tsx:87 | `it('gives each session its start time on the band clock in Paris')` with `date: '2099-11-12T19:00:00.000Z'` asserts `expect(await screen.findByText('Thu, Nov 12, 2099 · 20:00')).toBeTruthy();`. Reverting SessionsPage.tsx:174 to `formatSessionDate` renders `Thu, Nov 12, 2099` only, and the exact-text query fails. PASS |
| R04 | D04 (blocking) | `4a54c57b3` apps/pragma/site/src/routes/sessions/SessionDetailPage.test.tsx:137 | `it('gives the session its start time on the band clock in Paris, under its title')` asserts `findByText(/^Sun, Nov 1, 2026 · 20:00/)` on the fixture `date: '2026-11-01T19:00:00.000Z'` (line 17). Without the time the subtitle reads `Sun, Nov 1, 2026 · <facts>`, which the regex refuses. PASS |
| R05 | D05 (blocking) | `4a54c57b3` apps/pragma/site/src/routes/home/HomePage.test.tsx:154 | `it('gives the next session its start time on the band clock in Paris')` asserts `within(card).getByRole('link', { name: 'Thu, Nov 12, 2099 · 20:00' })` on the card's date link (NextSessionCard.tsx:42-48). PASS |
| R06 | D12 (blocking) | `4a54c57b3` SetlistEntryRow.test.tsx:86; SongDetailSidebar.test.tsx:17 | Both assert `expect(notice.querySelector('svg')).not.toBeNull();` and `expect(notice.className).toContain('text-warn');` on the "No lineup yet" element. Icon renders an `<svg>` (atoms/Icon.tsx:30). Practice mode passes through the same `LineupSlots` (structural, PracticeCurrentSong.tsx:46). PASS |
| R07 | B14 (non-blocking) | `4a54c57b3` LineupSlots.tsx:57-60; blueprint-subjects.json | `LineupSlots` now claims `// @FollowsBlueprint molecule-view-selector` and ends on a table lookup indexed by the covered `selectLineupColumnKind`, the shape blueprint-index.md:198 describes. The conditional is gone from the component. PASS |

## B. Code cleanliness

| # | Rule | Check | Evidence | Verdict |
|---|---|---|---|---|
| B01 | No abbreviations or one-letter locals | read the 13 changed .ts/.tsx files | none found (`Lineup`, `notice`, `EVENING_PRACTICE`, `NOTICE_CLASS`) | PASS |
| B02 | Magic numbers and strings extracted | read | `NOTICE_CLASS`, `LINEUP_BY_KIND`; test dates are named fixtures | PASS |
| B03 | No prose comments | `git diff 76e5c36..HEAD \| grep -E '^\+.*(//\|/\*)'` | only `// @FollowsBlueprint molecule-view-selector`, `// @FollowsBlueprint molecule-presentational` and `/** @Feature setlists */` | PASS |
| B04 | Function names describe the result | sample | `selectLineupColumnKind` returns the kind, `FilledLineupSlots`, `NoLineupNotice` | PASS |
| B05 | Type assertions limited to `as const` / `as unknown` | `grep -nE ' as [A-Z]'` on changed files | none. `LINEUP_BY_KIND` uses `as const satisfies Record<LineupColumnKind, …>` | PASS |
| B06 | No `any` | `grep -nP '\bany\b'` on changed files | none | PASS |
| B07 | `noUncheckedIndexedAccess` honoured | read | `LINEUP_BY_KIND[selectLineupColumnKind(column)]` indexes a closed-union record, so it is total | PASS |
| B08 | Lint clean | `pnpm exec oxlint --type-aware <13 changed .ts/.tsx files>` | exit 0, no output | PASS |
| B09 | Dead code | `pnpm exec knip` | exit 0, configuration hints only. The removed `hasNoLineup` and `sessions.noLineup` leave no caller. | PASS |
| B10 | Typecheck | `pnpm --filter @borso-app/pragma run typecheck` | exit 0 | PASS |
| B11 | `useEffect` is a smell | `grep -nE '\buseEffect\('` on changed files | none | PASS |
| B12 | Standards checklist, 01-naming: "a `build…`, `project…` or `select…` returns what its verb says" | read lineup-slots.core.ts in full | `export function selectLineupColumnKind(column: LineupColumnView): LineupColumnKind` returns a union kind, as the blueprint's `selectRunnerAvatarView` does | PASS |
| B13 | Standards checklist, 01-naming: "a file name says what the file holds" | read NoLineupNotice.tsx in full | the file exports only `NoLineupNotice` | PASS |
| B14 | Blueprint `molecule-presentational` for NoLineupNotice.tsx | read in full against blueprint-index.md:196 | no conditional, no state, no query; the visible string goes through `t('lineup.noLineup')` | PASS |
| B15 | Blueprint `molecule-view-selector` for LineupSlots.tsx | read in full against blueprint-index.md:198 | the exported component carries no conditional; the one local state (`measuredColumn`) lives in `FilledLineupSlots` | PASS |
| B16 | Standards checklist, 10-testing: "a test name states the behaviour and the condition" | read the 8 new or renamed tests | e.g. `'marks the missing lineup with the warning icon, as the setlist rows do'`, `'calls a column nobody holds an instrument in empty'` | PASS |

## C. Tests pass

| # | Workspace | Command | Exit | Verdict |
|---|---|---|---|---|
| C01 | @borso-app/pragma | `pnpm --filter @borso-app/pragma exec vitest run --project core --changed 76e5c36b11911e38ae774a979f0095759b1ef0db --reporter=verbose --coverage` | 0. 63 files, 378 tests passed. Coverage summary 100% statements (68/68), branches (41/41), functions (27/27), lines (56/56). All 8 new or renamed tests appear in the verbose list. | PASS |
| C02 | @borso-app/pragma | `pnpm --filter @borso-app/pragma run test:e2e --changed 76e5c36b11911e38ae774a979f0095759b1ef0db` | 0, "No test files found" (site-only diff) | PASS |
| C03 | @borso-app/pragma | `scripts/mutate-changed.sh 76e5c36b11911e38ae774a979f0095759b1ef0db` (lineup-slots.core.ts, session-page.core.ts) | 0. 236 killed, 0 survived, score 100.00 | PASS |

## D. Test coverage of spec

| # | Use case | Covering test | Verdict |
|---|---|---|---|
| D01 | UC4: the empty-or-filled choice for a lineup column | `it('calls a column nobody holds an instrument in empty')` and `it('calls a column with one held instrument filled')` at apps/pragma/site/src/components/molecules/lineup-slots.core.test.ts:168,172: `expect(selectLineupColumnKind({ slots: [] })).toBe('empty');`, `expect(selectLineupColumnKind(columnOf('Voice'))).toBe('filled');` | PASS |
| D02 | UC4: a song nobody plays gets an empty lineup in the session preview (feeds the notice) | `it('empties the lineup of a song nobody plays, …')` at apps/pragma/site/src/routes/sessions/session-page.core.test.ts:118: `expect(preview.rows.map((row) => row.lineup)).toEqual([{}, {}]);` | PASS |

The UC1 and UC4 rows round 1 failed (D03, D04, D05, D12) are re-graded in R03 to R06.

## E. Scale

| # | Write path or state | Question | Failing case, or the key or test that holds it | Verdict |
|---|---|---|---|---|
| E01 | none | Write paths, per-process state, concurrent proof | `git diff --name-only 76e5c36..HEAD \| grep -E '\.(service\|repository\|controller)\.ts$'` → no match. The only new module-level values are `NOTICE_CLASS` (a string) and `LINEUP_BY_KIND` (a frozen component table). Site-only, writes nothing. | PASS |

## Blocking findings

- none

## Non-blocking findings

- none

## Notes

- The A04 dismissal rests on a spec amendment the implementer made in `cc116768f` ("a session date" became "the session's own date"). It narrows the operator's scope. Should the operator confirm that the "Next concert" line on the Home card stays date-only?
- The 375 px truncation claim in the A04 dismissal was checked from the `truncate` class only, not measured with `agent-browser`. /visual-validation can confirm it.
- SessionSetlistPreview now shows "No lineup yet" while the members or instruments queries are still loading, because `buildLineupColumn` returns no slots until both arrive. Round 1 LineupSlots already did this on the other surfaces. Is a brief notice flash during load acceptable, or should the preview wait for both queries?

## Verdict: PASS
