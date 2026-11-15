# Technical validation — Lineup grid transitions

- Spec: [`../spec/spec.md`](../spec/spec.md)
- Plan: absent (Tier 1 change, the spec carries the data shape)
- Branch: claude/eloquent-babbage-j0ff1a
- Base: origin/main (`cdc5437258c3a215b37770187ef0f1b1145414a6`)
- Run at: 2026-11-15T06:29:35Z
- Round: 1
- Reviewed: 36bc59f49c6b77acc3f05dc017fad661dfbf6b3c
- Touched workspaces: @borso-app/pragma (site, scripts/task-metrics, VOCABULARY.md); `.claude/skills/specification/SKILL.md` (meta, no code)

No merge commit sits above the base (`git rev-list --merges origin/main..HEAD` is empty). 3 use-case claims are routed to `/visual-validation` and are out of scope for this report: the stable lanes read pale and continuous at 375 px, the changed cells stand out on screen, and the page has no horizontal scroll (spec *Test strategy*, "Visual validation" bullet).

## A. Correctness vs spec

| # | Spec ref | Claim | Code (file:line) | Evidence (quoted) | Verdict |
|---|---|---|---|---|---|
| A00 | Plan | plan absent; files taken from the diff | — | `docs/features/pragma/lineup-grid-transitions/` holds `spec/` only | UNVERIFIABLE (non-blocking) |
| A01 | Q.O.D. "Does a voice change count?" → ignore every `vocal` instrument | Vocal-family instruments are dropped before two songs are compared | site/src/components/organisms/lineup-grid.core.ts:162-165, 124 | `.filter((instrument) => instrument.family === VOCAL_FAMILY)` … `hands: held.filter((instrumentId) => !vocalIds.has(instrumentId))` | PASS |
| A02 | Changes, `isChanged` | "playing, not the first row, and the set of non-vocal instruments differs from the entry before" | lineup-grid.core.ts:141-143 | `if (previous === undefined \|\| current.held.length === 0) return NO_CHANGE;` `if (isSameInstrumentSet(current.hands, previous.hands)) return NO_CHANGE;` | PASS |
| A03 | Changes, `previousGlyphs` | Hand instruments held on the entry before, set only when `isChanged` | lineup-grid.core.ts:102, 143 | `const NO_CHANGE: LineupChange = { isChanged: false, previousGlyphs: [] };` `return { isChanged: true, previousGlyphs: orderGlyphs(previous.hands, orderedInstruments) };` | PASS |
| A04 | Changes, `joinsPrevious` / `joinsNext` | "both playing with the same non-vocal set, or both voice only" | lineup-grid.core.ts:127-133, 182-183 | `current.held.length > 0 && other.held.length > 0 && isSameInstrumentSet(current.hands, other.hands)`; `joinsPrevious: isSameRun(current, previous), joinsNext: isSameRun(current, next)` | PASS |
| A05 | Changes, `LineupGridRow` | `changeCount`, and `isCompact` = not the first row and `changeCount === 0` | lineup-grid.core.ts:186, 193 | `const changeCount = cells.filter((cell) => cell.isChanged).length;` `isCompact: index > 0 && changeCount === 0,` | PASS |
| A06 | Changes, `LineupGridInstrument` | Carries `family: InstrumentFamily` | lineup-grid.core.ts:19; SetlistEditor.tsx:151 | `readonly family: InstrumentFamily;`; the caller passes `instruments` from `useInstrumentsList()` and `pnpm --filter @borso-app/pragma run typecheck` exits 0 | PASS |
| A07 | Changes, "No API, schema or domain change" | Diff touches no `api/` or `domain/` file | `git diff --name-status` | 11 paths, none under `apps/pragma/api/` or `apps/pragma/domain/` | PASS |
| A08 | Result, row title column | Position, title on one truncated line, badge under it when the row has changes ("⇄ 2") | SetlistLineupGrid.tsx:151-171 | `const isBadgeShown = hasLineupChanges(row);` `<span className="truncate font-medium">{row.title}</span>` `<Icon name="swap" className="size-3" /> <span aria-hidden="true">{row.changeCount}</span>` | PASS |
| A09 | Result + Q.O.D. "How should a change be shown?" | A joined cell is a pale tint of the member colour with faint glyphs; a run-start or changed cell is full colour and holds the new glyphs, with the previous ones small and faded under them | SetlistLineupGrid.tsx:102-123; MemberMark.tsx:20-22 | `shape="lane"` … `<GlyphLine glyphs={cell.glyphs} className={JOINED_GLYPHS_CLASS} />`; `shape="cell"` … `className={PREVIOUS_GLYPHS_CLASS} iconClassName={PREVIOUS_ICON_CLASS}`; lane = `color-mix(in srgb, ${color} 18%, var(--color-paper))` | PASS |
| A10 | Result, "A row with no change at all is compact" | Compact rows get a shorter cell | SetlistLineupGrid.tsx:38-39, 140 | `row.isCompact ? COMPACT_CELL_CLASS : FULL_CELL_CLASS` with `'min-h-7'` / `'min-h-11'` | PASS |
| A11 | Result, sit-out | A sit-out cell is empty and breaks the lane | SetlistLineupGrid.tsx:144; lineup-grid.core.ts:130-131 | `{cell.isPlaying ? <PlayingMark cell={cell} /> : null}`; `current.held.length > 0 && other.held.length > 0` | PASS |
| A12 | Q.O.D. "What does colour mean?" → member only (for cells) | No cell fill uses a hue other than the member's colour | SetlistLineupGrid.tsx:104-114 | both marks take `color={cell.color}`; no `bg-highlight` or ink tick left on a cell (the removed highlighter bar was at origin/main SetlistLineupGrid.tsx:69). The badge is discussed in Notes | PASS |
| A13 | Use cases 2 and 3 | A tap on a cell opens the entry, a tap on a header opens the member's part, as today | SetlistLineupGrid.tsx:137, 193, 216 | `onClick={onOpen}`; `onClick={() => onOpenMember(column.memberId)}`; `onOpen={() => onOpenCell(row.entryId)}` | PASS |
| A14 | Why, input metric | On Alliance 3, Marcia baila (13) shows zero changes, and Take on me (15) exactly two, on Arn and Borso | lineup-grid.core.ts:151 | Measured: production rows read with `APP=pragma scripts/db-read.sh` (setlist_entry, song, member, instrument), fed to `buildLineupGrid` through `normalizeLineup` and `resolveInstrumentFamily`: `13 Marcia baila 0`, `15 Take on me 2 Borso:Piano->Basse Arn:Basse->Piano` | PASS |
| A15 | Result, accessible text | A changed cell names what was held before; the badge has a pluralised label in both languages | SetlistLineupGrid.tsx:90-94, 168; en.json:666-668; fr.json:666-668 | `t('setlist.lineupCellPlayedBefore', { instrumentNames: namesOf(cell.previousGlyphs) })`; `"lineupRowChanges_one"` / `"lineupRowChanges_other"` in both catalogues; i18n parity test passes | PASS |
| A16 | slice-3 task-metrics measure (follows the redesign) | The probe reads run starts and joined cells instead of the removed `data-lineup-lane` columns | page-probes.setup.ts:446-448; slice-three-measures.setup.ts:174-184 | `joinsPrevious: cell.getAttribute('data-lineup-joins-previous') === 'true'`; `const runStarts = grid.cells.filter((cell) => cell.isPlaying && !cell.joinsPrevious);`; the grid emits `data-lineup-joins-previous={cell.joinsPrevious}` (SetlistLineupGrid.tsx:136) | PASS |

## B. Code cleanliness

| # | Rule | Check | Evidence | Verdict |
|---|---|---|---|---|
| B01 | No abbreviations / 1-letter locals | read the 4 changed source files in full | none found; locals are `current`, `previous`, `next`, `columnIndex`, `orderedInstruments`, `vocalIds` | PASS |
| B02 | Magic numbers / strings extracted | read in full | class strings named (`COMPACT_CELL_CLASS`, `JOINED_CELL_CLASS`, `PREVIOUS_ICON_CLASS`, …), `POSITION_DIGITS = 2`, `VOCAL_FAMILY` | PASS |
| B03 | No prose comments | grep `//` and `/*` in changed sources | only `/** @Feature setlists */` and `// @FollowsBlueprint …`, both machine-read | PASS |
| B04 | Function names describe the result | sample | `describeHold`, `describeChange`, `isSameRun`, `orderGlyphs`, `hasLineupChanges`, `buildLineupGrid` (returns the grid it names) | PASS |
| B05 | Type assertions only `as const` / `as unknown` | `grep -nE ' as [A-Z]'` on changed files | none found; tests use `as const` only | PASS |
| B06 | No `any` | `grep -nP '\bany\b'` on changed files | none found | PASS |
| B07 | `noUncheckedIndexedAccess` honoured | read in full | `holds[index - 1]?.[columnIndex]`, `holds[index + 1]?.[columnIndex]`, `input.songsById[entry.songId]?.title ?? ''`, `COLUMNS_CLASS_BY_COUNT[count - 1] ?? WIDEST_COLUMNS_CLASS` | PASS |
| B08 | Lint clean | `pnpm exec oxlint --type-aware` on the 6 changed `.ts`/`.tsx` files | exit 0, no output | PASS |
| B09 | Typecheck | `pnpm --filter @borso-app/pragma run typecheck` | exit 0 | PASS |
| B10 | knip | `pnpm knip` | exit 0; only pre-existing configuration hints; `hasLineupChanges` is used at SetlistLineupGrid.tsx:151 | PASS |
| B11 | `useEffect` is a smell | `grep -nE '\buseEffect\('` on changed files | none found | PASS |
| B12 | Standards checklist (01): "a definition in a `VOCABULARY.md` is still true" | read the *Lineup grid* and *Member* sections in full | `- On every screen, colour means a member and nothing else. An instrument, a state or a change never gets its own hue.` at apps/pragma/VOCABULARY.md:759-760, while this diff's change badge is `rounded-pill bg-highlight … text-on-highlight` at SetlistLineupGrid.tsx:163, and other screens mark changes the same way: `const CHANGE_CLASS = 'self-start rounded-sm bg-highlight …'` at SetlistEntryRow.tsx:14, `const CHANGED_MARK_CLASS = 'rounded-sm bg-highlight …'` at InlineLineupEditor.tsx:36. The definition says "every screen" and five components give a change the highlight hue. Introduced: this branch (the sentence and the badge); Fix size: one line (narrow the sentence to member marks, or drop the badge's fill) | FAIL (non-blocking) |
| B13 | Standards checklist (01): "an invariant promising behaviour carries a `Held by:` line" | read the *Lineup grid* section | 10 `Held by:` lines; each names a test that exists and passes (verbose run, C01). The vocal rule, runs, sit-out, first row, badge and compaction each have one | PASS |
| B14 | Standards checklist (01): verb table (`build…` returns what it says), boolean names not negated, file name says what it holds | read in full | `buildLineupGrid(input): LineupGrid`; booleans `isPlaying`, `isChanged`, `joinsPrevious`, `joinsNext`, `isCompact`, `isBadgeShown`, none negated | PASS |
| B15 | Standards checklist (02): `.core.ts` vs `.utils.ts` | read | `lineup-grid.core.ts` holds band rules (who changes instrument between songs), a domain name the band would recognise | PASS |
| B16 | Standards checklist (03): untrusted input parsed with Zod | read the task-metrics scripts | `gridSchema.parse(await driver.session.evaluate(READ_LINEUP_GRID))` at slice-three-measures.setup.ts:172, schema extended with `joinsPrevious`, `style`, `family: z.enum(INSTRUMENT_FAMILIES)` | PASS |
| B17 | Standards checklist (05): no family of booleans where one variant string belongs (props) | read | `SetlistLineupGridProps` unchanged; the four booleans live on the `LineupGridCell` data shape the spec names, each independent (a cell can join both above and below) | PASS |
| B18 | Standards checklist (05): no new label explaining the interface | read | the new strings are a screen-reader badge label and a cell's spoken change; nothing visible explains the grid | PASS |
| B19 | Standards checklist (08): more than two visual variants go through `cva` or a lookup | read | the mark has two shapes (`cell`, `lane`) chosen by one `if` and drawn through `MemberMark`'s `STYLE_BY_SHAPE` lookup and `memberMarkVariants` | PASS |
| B20 | Standards checklist (08): a visual effect is made of what the screen already renders | read | the lane tint reuses `MemberMark shape="lane"` (MemberMark.tsx:20) and the previous glyphs reuse `GlyphLine`/`Icon` | PASS |
| B21 | Standards checklist (09): key path names screen and element | read en.json:666-668 | `setlist.lineupCellPlayedBefore`, `setlist.lineupRowChanges_*` sit beside the existing `setlist.lineupCell*` keys | PASS |
| B22 | Standards checklist (10): test names state behaviour and condition | read both test files | e.g. "counts putting a hand instrument down to only sing as a change", "falls back to a plain change sentence when the member sat out the song before" | PASS |
| B23 | Standards checklist (04, 06, 07, 11, 12, 14) | not applicable | no repository, mutation, effect, multi-table write, disable comment or pre-commit check in the diff | PASS |

## C. Tests pass

| # | Workspace | Command | Exit | Verdict |
|---|---|---|---|---|
| C01 | @borso-app/pragma | `pnpm --filter @borso-app/pragma exec vitest run --project core --changed cdc5437258c3a215b37770187ef0f1b1145414a6 --reporter=verbose --coverage` | 0; 66 files, 366 tests passed, including all 14 of `lineup-grid.core.test.ts` and 8 of `SetlistLineupGrid.test.tsx`; coverage of the gated changed files 100% statements, branches, functions and lines | PASS |
| C02 | @borso-app/pragma | `pnpm --filter @borso-app/pragma run test:e2e --changed cdc5437258c3a215b37770187ef0f1b1145414a6` | 0; "No test files found": the diff reaches no `api/` file, so no back-e2e test is affected | PASS |
| C03 | @borso-app/pragma | `scripts/mutate-changed.sh cdc5437258c3a215b37770187ef0f1b1145414a6 apps/pragma` | 0; `lineup-grid.core.ts` 106 mutants, 106 killed, 0 survived, score 100.00 | PASS |
| C04 | @borso-app/pragma | every `*.utils.ts` has a sibling test | 59 `*.utils.ts` files, none missing a `*.utils.test.ts(x)`; the diff changes none | PASS |

## D. Test coverage of spec

| # | Use case | Covering test | Verdict |
|---|---|---|---|
| D01 | UC1: a row with changes carries a badge with the count | `it('badges a row with its change count and keeps a row with none compact and bare')` at SetlistLineupGrid.test.tsx:146; fails if false: `expect(badge?.textContent).toBe('11 change from the song before');` | PASS |
| D02 | UC1: the changed cells are in full colour | `it('fills a changed cell in full and shows what the member held before under it')` at SetlistLineupGrid.test.tsx:125; `expect(mark?.style.backgroundColor).toBe(CORAL_RGB);` | PASS |
| D03 | UC1: the stable lanes are pale | `it('tints a cell that joins the run above, pulled up over the row gap, with faint glyphs')` at SetlistLineupGrid.test.tsx:114; `expect(mark?.style.backgroundColor).toBe('color-mix(in srgb, #e07a5f 18%, var(--color-paper))');` | PASS |
| D04 | UC2: tapping any cell opens the entry | `it('opens the entry when a cell is tapped, and a member’s part from the column head')` at SetlistLineupGrid.test.tsx:160; `expect(onOpenCell).toHaveBeenCalledExactlyOnceWith('entry-4');` (a sit-out cell, so "any cell" is exercised) | PASS |
| D05 | UC3: tapping a column header opens the member's part | same test; `expect(onOpenMember).toHaveBeenCalledExactlyOnceWith('bruno');` | PASS |
| D06 | Edge: voice is never a change (a vocal instrument is ignored in the comparison) | `it('ignores a Chœurs added then dropped, so the lane stays one run and the rows are compact')` at lineup-grid.core.test.ts:147; `[0, true, false, true, true]` for the row that adds `choir` (family `vocal`). The code keys on family (lineup-grid.core.ts:164), so Chant takes the same path | PASS |
| D07 | Edge: a voice-only member keeps a joined lane from Chœurs to Chant | `it('joins a member who only sings, from Chœurs to Chant')` at lineup-grid.core.test.ts:175; `toMatchObject({ isChanged: false, joinsPrevious: true, previousGlyphs: [] })` | PASS |
| D08 | Edge: the first row's cells are full colour | `it('fills the cell that starts a run with its member’s stored colour …')` at SetlistLineupGrid.test.tsx:96 on entry-1; `expect(cell.querySelector('span')?.style.backgroundColor).toBe(CORAL_RGB);` with `joinsPrevious` false, and the core test below asserts the first row never joins | PASS |
| D09 | Edge: the first row has no change mark | `it('starts the first row with full cells and no change, no badge and no compaction')` at lineup-grid.core.test.ts:136; `[cell.isChanged, cell.joinsPrevious, cell.previousGlyphs]` equal `[false, false, []]` for both cells while INPUT's first row has players | PASS |
| D10 | Edge: the first row has no badge | same test, `expect(first).toMatchObject({ changeCount: 0, isCompact: false });`; component: `expect(rowOf(container, 'entry-1')?.querySelector('[data-lineup-change-badge]')).toBeNull();` at SetlistLineupGrid.test.tsx:149 | PASS |
| D11 | Edge: sit out then play starts a new run in full colour | `it('breaks a run where the member sits out, and a voice-only return is no change')` at lineup-grid.core.test.ts:228; rows 3-4 `[false, false, false]` (no join across the sit-out); component full fill for a run start after a sit-out: `falls back to a plain change sentence …` at SetlistLineupGrid.test.tsx:137, `toBe(TEAL_RGB)` | PASS |
| D12 | Edge: that return counts as a change when it holds a hand instrument | `it('marks a played cell whose hand instruments differ from the entry before, and only that')` at lineup-grid.core.test.ts:84; Bruno sits out entry-2 (`lineupOverride: { bruno: [] }`) and plays Bass on entry-3: `[true, true]` | PASS |
| D13 | Edge: that return is no change when it holds only voice | lineup-grid.core.test.ts:228, Anna sits out `rest` then holds `voice` on `sings`: row 4 `[false, false, false]` (isChanged false) | PASS |
| D14 | Edge: play then hold only a vocal instrument counts as a change | `it('counts putting a hand instrument down to only sing as a change')` at lineup-grid.core.test.ts:209; `isChanged: true, joinsPrevious: false` | PASS |
| D15 | Edge: the previous glyphs show what they put down | same test; `previousGlyphs: [GUITAR_GLYPH]`; rendered small and faded: SetlistLineupGrid.test.tsx:133-134 `expect(previous?.className).toContain('opacity-60');` | PASS |

## E. Scale

| # | Write path or state | Question | Failing case, or the key or test that holds it | Verdict |
|---|---|---|---|---|
| E01 | none | Does the diff write to a database or keep state? | `git diff origin/main...HEAD \| grep -E '^\+.*(insert\(\|update\(\|delete\(\|onConflict\|transaction\()'` prints nothing; the module-level grep `^\+(let\|const) [a-zA-Z]+ = new (Map\|Set)\|^\+let ` prints nothing. The new `vocalIds` Set is a local of `buildLineupGrid` (lineup-grid.core.ts:162), a pure projection on the client | PASS |

## Blocking findings

- none

## Non-blocking findings

- B12 — VOCABULARY.md:759-760 says no screen gives a change its own hue, but the new change badge (SetlistLineupGrid.tsx:163) and the change marks of SetlistEntryRow.tsx:14 and InlineLineupEditor.tsx:36 use `bg-highlight`.

## Notes

- A00 is UNVERIFIABLE because no plan exists. The brief names this a Tier 1 change whose spec carries the data shape, so the file list was taken from the diff and checked against the spec's *Changes* section.
- Is the change badge's highlight fill what Variant I of the canvas shows? The spec's colour decision reads "A change is shown by intensity and text, never by another hue", and the badge (SetlistLineupGrid.tsx:163) shows a change on the highlight hue. The canvas link is a claude.ai artifact this validator cannot open, so `/visual-validation` or the operator should compare the two.
- Is a compact row still tappable on a phone? Its cell is `min-h-7` (28 px, overriding ListRow's `min-h-11` through `tailwind-merge`) with an `after:-inset-y-1` hit extension, about 36 px against the 44 px the slice-1 task metric counts as the floor (inferred from the classes; the old cell was `min-h-9` plus the same extension). A joined cell is also pulled up by `-mt-1`, so its hit area overlaps the one above. Only `scripts/phone.sh touch` can settle which cell a tap lands on; it belongs to `/visual-validation`.
- `buildLineupGrid` calls `describeHold` for every cell twice, once into `holds` (lineup-grid.core.ts:167-169) and again at line 172, where `holds[index]?.[columnIndex]` already holds the same value. No standard covers it and the output is the same.

## Verdict: PASS_EXCEPT_UNVERIFIABLE
