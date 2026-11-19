# Technical validation — A solo stands out in Scene Mode and carries its notes

- Spec: [`../spec/spec.md`](../spec/spec.md)
- Plan: absent (Tier 1 change, no plan written)
- Branch: claude/bold-heisenberg-wdysrp
- Base: 7f523dcbeb56308e3ef10c9041e77c7e446b5ad8
- Run at: 2026-11-19T08:47:15Z
- Round: 1
- Reviewed: e727181ff5ffe3e8a269b008c7a408c0e7238e68
- Touched workspaces: @borso-app/pragma (site, plus the api test seed)

The spec is in the short form. It has *Why*, *Result*, *Where the implicit solo ends* and *Out of scope*. It has no Q.O.D., *Changes* or *Test strategy*. Categories A and D are built from the bullets of *Result* and *Where the implicit solo ends*, and the files are taken from the diff. No merge of `main` sits above the base (`git rev-list --merges` printed nothing). The branch has one commit, `e727181f`.

The shared working tree held another agent's uncommitted work during this review: `ChordChartViewer.tsx` (one added `data-scrolls-sideways` attribute), `SetlistScenePage.tsx`, `SetlistScenePage.test.tsx` and the untracked `scene-swipe.core.ts`, `scene-swipe.core.test.ts` and `scene-swipe.hook.ts`. Code was read from `git show e727181f:<path>`. The test runs include those files, and none of them changes the code under review.

2 use cases routed to /visual-validation; out of scope for this report. They are D14 and D15: how the frame and badge look in both tones, and whether the note text reads as full strength.

## A. Correctness vs spec

| # | Spec ref | Claim | Code (file:line) | Evidence (quoted) | Verdict |
|---|---|---|---|---|---|
| A00 | Plan | plan absent; files taken from the diff | n/a | n/a | UNVERIFIABLE |
| A01 | Result §1 | A solo renders as a framed block with a "Solo" badge | ChordChartViewer.tsx:50-53, 233-238; ChordProSectionHeading.tsx:11, 19-22, 45-46 | `section.kind === SOLO_SECTION_KIND ? SOLO_FRAME_CLASS_BY_TONE[tone] : undefined` / `solo: 'scene.sectionSolo',` / `kind === SOLO_SECTION_KIND ? SOLO_HEADING_CLASS_BY_TONE[tone] : HEADING_CLASS_BY_TONE[tone]` | PASS |
| A02 | Result §1 | Applies in Scene Mode and on the song page, both through the same viewer | SongScenePage.tsx:131, SetlistScenePage.tsx:258, SongChartPreviews.tsx:83 | `<ChordChartViewer source={chordproText} semitones={semitones} tone="dark" />` / `<ChordChartViewer source={chordProText} semitones={semitones} compact />` | PASS |
| A03 | Result §2 | The block holds the solo's chord rows | chordpro-sections.utils.ts:98-101 | `if (implicitSolo !== null && !shouldEndImplicitSolo(line, implicitSolo)) { implicitSolo = advanceImplicitSolo(implicitSolo, line); current.lines.push(line);` | PASS |
| A04 | Result §2 | Notes render inside the block in full-strength text, not dim italic | ChordChartViewer.tsx:45-48, 165-176, 185-190 | `light: 'text-ink', dark: 'text-stage-ink'` / `'font-sans text-meta font-medium m-0 mb-1 whitespace-pre-wrap'` / `section.kind === SOLO_SECTION_KIND && line.kind === 'directive' && isCommentDirective(line.name)` | PASS |
| A05 | Result, form 1 | `{comment: Solo}`, `{c: Outro solo}` or any comment containing the word "solo" opens a solo | chordpro-solo.utils.ts:5-6, 16-18; chordpro-sections.utils.ts:116-120 | `const SOLO_WORD_PATTERN = /\bsolo\b/i;` / `return isCommentDirective(line.name) && SOLO_WORD_PATTERN.test(line.value);` / `current = openSection(SOLO_SECTION_KIND, line.value);` | PASS |
| A06 | Result, form 1 | A `{comment: ...}` directly under it, before the first chord row, is a note | chordpro-solo.utils.ts:37-39 | `if (line.kind === 'directive') return progress.hasRows \|\| !isCommentDirective(line.name);` | PASS |
| A07 | Result, form 2 | `{start_of_solo}` ... `{end_of_solo}`, optionally labelled | chordpro-sections.utils.ts:44, 56, 108 | `['start_of_solo', 'solo'],` / `'end_of_solo',` / `current = openSection(startedKind, line.value.length > 0 ? line.value : null);` | PASS |
| A08 | Result, form 2 | Every `{comment: ...}` inside an explicit solo is a note | ChordChartViewer.tsx:185-190 | the note branch reads only `section.kind === SOLO_SECTION_KIND`, so it holds for both forms | PASS |
| A09 | Where it ends §1 | The implicit solo ends at any directive after the first chord row | chordpro-solo.utils.ts:38; chordpro-sections.utils.ts:103 | `return progress.hasRows \|\| !isCommentDirective(line.name);` / `if (implicitSolo !== null) closeCurrent();` | PASS |
| A10 | Where it ends §2 | It ends at "a paragraph holding lyrics, after a blank line" | chordpro-solo.utils.ts:39, 47-50 | `return progress.isAfterBlank && isLyricLine(line);` / `isAfterBlank: isBlank && progress.hasRows,` | FAIL (blocking) |
| A11 | Where it ends §2 | A lyric is a run of two letters or more outside chords and parentheses. Bar lines, `x3` and `(guitar)` are not lyrics | chordpro-solo.utils.ts:7-8, 20-28 | `const LYRIC_WORD_PATTERN = /\p{L}{2,}/u;` / `return LYRIC_WORD_PATTERN.test(lyricTextOf(line).replace(PARENTHESISED_PATTERN, ''));` | PASS |
| A12 | Where it ends §3 | The first paragraph after the heading always belongs to the solo, prose included | chordpro-solo.utils.ts:47-50 | `isAfterBlank` stays false until a row has been read and a blank follows it, so no line of the first paragraph can end the solo | PASS |
| A13 | Where it ends §4 | A `{comment: Solo}` inside a chorus, verse, bridge or tab stays a plain comment of that section | chordpro-sections.utils.ts:116 | `if (current.kind === BODY_SECTION_KIND && isSoloComment(line)) {` | PASS |
| A14 | Out of scope | `[Solo]` and a bare "Solo" line keep rendering as today | chordpro-sections.utils.ts:105, 116 | only `line.kind === 'directive'` reaches `isSoloComment`. `[Solo]` parses as a chord token and a bare "Solo" as a plain line, so neither opens a solo | PASS |

A10 failing case. The source `{comment: Solo}\n[Am] [F]\n\n[C] [G]\n[C]Hello [G]world\n[F]More lyrics` groups into `["solo:5"]`, measured with a probe test that was deleted afterwards. The second paragraph holds lyrics, so the spec ends the solo before it, which gives `["solo:1", "body:3"]`. The code checks only the first line after the blank (`isAfterBlank` is cleared by `[C] [G]`), so a verse that opens on a chords-only intro row is swallowed into the solo frame, with its lyric lines.

## B. Code cleanliness

| # | Rule | Check | Evidence | Verdict |
|---|---|---|---|---|
| B01 | No abbreviations / 1-letter locals | read each changed source file | names include `implicitSolo`, `closeCurrent`, `lyricTextOf`, `hasRows`, `isAfterBlank`, `renderSoloNote`, `renderSectionLine`. None found | PASS |
| B02 | Magic numbers / strings named | read in full | `SOLO_SECTION_KIND`, `CHORD_GAP`, `SOLO_WORD_PATTERN`, `LYRIC_WORD_PATTERN`, `PARENTHESISED_PATTERN`, `COMMENT_DIRECTIVE_NAMES` are named. None found | PASS |
| B03 | No prose comments | read in full | the only comments are `/** @Feature songs */`, `// @FollowsBlueprint …` and `// Stryker disable next-line ConditionalExpression: equivalent mutant` (chordpro-sections.utils.ts:104, moved from chordpro.utils.ts), all machine-read | PASS |
| B04 | Function names describe the result | sample | `isLyricLine`, `isSoloComment`, `shouldEndImplicitSolo`, `advanceImplicitSolo`, `trimTrailingBlanks`, `renderSoloNote` | PASS |
| B05 | Type assertions only `as const` / `as unknown` | `grep -nP '\bas (?!const\|unknown)\w'` on changed files | none found | PASS |
| B06 | No `any` | `grep -nP '\bany\b'` on changed files | none found | PASS |
| B07 | `noUncheckedIndexedAccess` honoured | read in full | `lines.at(-1)?.kind` (chordpro-solo.utils.ts:54), `SECTION_START_DIRECTIVES.get(...)` checked against `undefined` (chordpro-sections.utils.ts:106-107). `pnpm run typecheck` exit 0 | PASS |
| B08 | Lint clean | `pnpm exec oxlint --type-aware <11 changed files>` | exit 0, no output | PASS |
| B09 | `useEffect` is a smell | `grep -nE '\buseEffect\('` on changed files | none found | PASS |
| B10 | Standards 01: "a comment documents something the code cannot say" | read in full | `// Stryker disable next-line ConditionalExpression: equivalent mutant` at chordpro-sections.utils.ts:104. Still equivalent: a non-directive line misses both lookups, and `isSoloComment` rejects it because `isCommentDirective` finds no name. Introduced: pre-existing (moved) | PASS |
| B11 | Standards 01: "a boolean name is not negated" | read in full | `hasRows`, `isAfterBlank`, `isBlank`, `hasHeading` | PASS |
| B12 | Standards 01: "a `build…` … returns what its verb says" | read in full | `buildSectionHeading` returns the heading string (chordpro-sections.utils.ts:133-136) | PASS |
| B13 | Standards 01: "a file name says what the file holds" | read in full | `export function trimTrailingBlanks(lines: ChordProLine[]): void {` at chordpro-solo.utils.ts:53 is called on every section kind at chordpro-sections.utils.ts:90 (`trimTrailingBlanks(current.lines);`). `isCommentDirective` at chordpro-solo.utils.ts:12 is generic too. Neither is about solos. Introduced: this branch; Fix size: one file | FAIL (non-blocking) |
| B14 | Standards 02: "the choice between `.core.ts` and `.utils.ts`" | read in full | the modules parse the ChordPro file format, a technical format rather than band vocabulary, as their parent `chordpro.utils.ts` did | PASS |
| B15 | Standards 02: a site rule restating one the API enforces | read in full | the grouping is display-only. The API does not parse sections | PASS |
| B16 | Standards 05: "no new page subtitle, field hint or button label explains the interface" | read in full | the only new visible text is the badge label `"sectionSolo": "Solo"` | PASS |
| B17 | Standards 05: "a prop set has not grown a family of booleans" | read in full | `ChordProSectionHeadingProps` and `ChordChartViewer` props unchanged | PASS |
| B18 | Standards 08: "more than two visual variants go through `cva` or a lookup record" | read in full | two variants each (solo or not), each through a `…_CLASS_BY_TONE` record (ChordProSectionHeading.tsx:19-22, ChordChartViewer.tsx:45-53) | PASS |
| B19 | Standards 08: "a visual effect … made of what that screen already renders" | read in full | reuses `Badge` and existing tokens `accent-soft`, `stage-hover`, `stage-chord`, `on-accent` (all defined in styles/tokens.css) | PASS |
| B20 | Standards 09: "a key's dotted path names the screen and the element" | read in full | `scene.sectionSolo` beside `scene.sectionChorus`, `scene.sectionTab` | PASS |
| B21 | Standards 10: "a test name states the behaviour and the condition" | read in full | e.g. `ends the solo on a lyric paragraph after a blank line`, `leaves a solo comment inside a chorus as a line of that chorus` | PASS |
| B22 | Standards 01: VOCABULARY.md / INVARIANTS.md still true | grep | no `VOCABULARY.md` or `INVARIANTS.md` changed. `apps/pragma/VOCABULARY.md` and `organisms/INVARIANTS.md` say nothing about chart sections | PASS |
| B23 | Blueprint marks | read in full | `// @FollowsBlueprint utils-pure-module` on both new utils files and `// @FollowsBlueprint test-pure-unit` on both new tests. Both ids are in blueprint-index.md (lines 302, 289) | PASS |

## C. Tests pass

| # | Workspace | Command | Exit | Verdict |
|---|---|---|---|---|
| C01 | @borso-app/pragma | `pnpm --filter @borso-app/pragma exec vitest run --project core --changed 7f523dcbeb56308e3ef10c9041e77c7e446b5ad8 --coverage --reporter=verbose` | 0. 83 files, 559 tests. Includes chordpro-sections.utils.test.ts, chordpro-solo.utils.test.ts, chordpro.utils.test.ts, ChordChartViewer.test.tsx, i18n-parity.core.test.ts, test-seed-charts.core.test.ts | PASS |
| C02 | @borso-app/pragma | `pnpm --filter @borso-app/pragma run test:e2e --changed 7f523dcbeb56308e3ef10c9041e77c7e446b5ad8 --reporter=verbose` | 0. 50 files, 490 tests (the seed change pulls the e2e graph) | PASS |
| C03 | @borso-app/pragma | `scripts/mutate-changed.sh 7f523dcbeb56308e3ef10c9041e77c7e446b5ad8 apps/pragma` | 1, but caused only by the untracked file of another agent: survivor `deltaX < 0` → `<=` at `site/src/routes/setlists/scene-swipe.core.ts:12`, a file outside commit e727181f. This branch's files: chordpro-sections.utils.ts 65 killed / 0 survived, chordpro-solo.utils.ts 64 / 0, chordpro.utils.ts 149 killed + 1 timeout / 0, i18n-parity.core.ts 43 / 0 | PASS |
| C04 | @borso-app/pragma | `pnpm run typecheck` | 0 | PASS |
| C05 | @borso-app/pragma | every `*.utils.ts` has a sibling `*.utils.test.ts` | 62 tracked utils files, none missing a test, including both new ones | PASS |

## D. Test coverage of spec

| # | Use case | Covering test | Verdict |
|---|---|---|---|
| D01 | A solo renders as a framed block with a "Solo" badge | `it('frames the solo under its own badge and keeps the rows inside the frame')` at ChordChartViewer.test.tsx:101; `expect(frame.className).toContain('border-stage-chord');` (light tone: `expect(closestElement('Solo', 'section').className).toContain('border-accent');` at :114) | PASS |
| D02 | In Scene Mode and on the song page | **structural:** both mount the same `ChordChartViewer` (SongScenePage.tsx:131, SetlistScenePage.tsx:258, SongChartPreviews.tsx:83) | PASS |
| D03 | The block holds the solo's chord rows, and not the lines around it | ChordChartViewer.test.tsx:101; `expect(frame.textContent).toContain('Am');` and `expect(frame.textContent).not.toContain('Hello');` | PASS |
| D04 | Notes render inside the block, not dim italic | `it('shows a note on the solo in full-strength text, not as a dim comment')` at ChordChartViewer.test.tsx:110; `expect(note.className).not.toContain('italic');`. Inside the block: `it('keeps the comments written right under the solo comment as its notes')` at chordpro-sections.utils.test.ts:132, `toEqual([['directive', 'blank', 'chord-line']])` | PASS |
| D05 | A comment containing "solo" opens a solo (`{comment: Solo}`, `{c: Outro solo}`) | `it('opens a solo on a comment naming it, labelled by that comment')` at chordpro-sections.utils.test.ts:121, `toEqual(['body', 'solo'])`; `it('accepts a comment holding the word solo in any case')` at chordpro-solo.utils.test.ts:55; word boundary at chordpro-sections.utils.test.ts:128 | PASS |
| D06 | A comment directly under the solo comment, before the first chord row, is a note | chordpro-sections.utils.test.ts:132 (above); `it('keeps a comment written before any row, as a note')` at chordpro-solo.utils.test.ts:67 | PASS |
| D07 | `{start_of_solo: Guitar solo}` ... `{end_of_solo}` opens and closes a labelled solo | `it('opens a solo on the explicit marker and keeps its label')` at chordpro-sections.utils.test.ts:112; `expect(sections[0]?.label).toBe('Guitar');` and `toEqual(['solo', 'body'])` | PASS |
| D08 | Every comment inside an explicit solo is a note | chordpro-sections.utils.test.ts:112 keeps `{comment: Hugo}` in the solo (`toHaveLength(2)`). The rendering branch is shared with D04: **structural:** ChordChartViewer.tsx:185-190 reads only `section.kind` | PASS |
| D09 | The implicit solo ends at a directive after the first chord row (another comment, a section start) | `it('ends the solo on the first directive after its rows')` at chordpro-sections.utils.test.ts:138, `toEqual(['solo', 'body'])` and `toEqual(['solo', 'chorus'])` | PASS |
| D10 | It ends at a paragraph holding lyrics, after a blank line | `it('ends the solo on a lyric paragraph after a blank line')` at chordpro-sections.utils.test.ts:159 covers only a paragraph whose **first** line is a lyric. No test sets up a lyric paragraph that opens on a chords-only row, and the code fails that case (A10) | FAIL (blocking) |
| D11 | A lyric is two letters or more outside chords and parentheses. Bar lines, `x3`, `(guitar)` are not lyrics | `it('does not read bar lines, a repeat mark or a parenthesised aside as lyrics')` at chordpro-solo.utils.test.ts:42, `expect(isLyricLine(parseChordProLine('\| [C] [E7] \| x3 (guitar)'))).toBe(false);`; `it('does not join single letters split by chords into a word')` at :34 | PASS |
| D12 | The first paragraph always belongs to the solo, prose included | `it('keeps a lyric written in the first paragraph, which always belongs to the solo')` at chordpro-sections.utils.test.ts:168, `toEqual(['solo'])` | PASS |
| D13 | A `{comment: Solo}` inside a chorus, verse, bridge or tab stays a plain comment | `it('leaves a solo comment inside a chorus as a line of that chorus')` at chordpro-sections.utils.test.ts:176, `toEqual([['directive', 'chord-line']])`. Verse, bridge and tab: **structural:** the single guard `current.kind === BODY_SECTION_KIND` at chordpro-sections.utils.ts:116 | PASS |
| D14 | How the frame and badge look in both tones, at 375 px | routed to /visual-validation | n/a |
| D15 | Whether the note reads as full-strength text against the frame background | routed to /visual-validation | n/a |

## E. Scale

| # | Write path or state | Question | Failing case, or the key or test that holds it | Verdict |
|---|---|---|---|---|
| E01 | none | Check-then-write, per-process state | `git diff <base>...HEAD -- '*.service.ts' '*.repository.ts' '*.controller.ts'` prints nothing. The only new module-level values are read-only lookups (`COMMENT_DIRECTIVE_NAMES`, `SECTION_START_DIRECTIVES`, `SECTION_END_DIRECTIVES`). The seed change is test data. No write path, no mutable state | PASS |

## Blocking findings

- A10 / D10 — a lyric paragraph that opens on a chords-only row does not end the implicit solo. `{comment: Solo}\n[Am] [F]\n\n[C] [G]\n[C]Hello [G]world` puts the verse inside the solo frame, where the spec ends the solo at "a paragraph holding lyrics". The rule should be judged per paragraph, not per first line, with a test for this case.

## Non-blocking findings

- B13 — `trimTrailingBlanks` and `isCommentDirective` live in `chordpro-solo.utils.ts`, yet they apply to every section and every comment. They belong in `chordpro-sections.utils.ts` or `chordpro.utils.ts`.

## Notes

- A00: no plan was written, by design for a Tier 1 change. Files were taken from the diff.
- `closeCurrent` now calls `trimTrailingBlanks` on every section (chordpro-sections.utils.ts:90), not only solos. Measured: `{soc}\n[C]Words\n\n{eoc}` used to give a chorus of 2 lines and now gives 1. A blank line renders as a `h-4` spacer (ChordChartViewer.tsx:87), so every chart loses its trailing spacers before each section. The spec does not ask for this. Is this spacing change on all charts wanted? It is a visible change, so it is a product call.
- `{comment: Solo}\n{start_of_tab}\ne|--5--|\n{end_of_tab}` gives `["solo:0", "tab:1"]` (measured), so a solo badge sits on an empty frame above the tab. The spec does not say what a solo comment followed directly by a section start should do. Should the empty solo be dropped, or should the tab become the solo's content? The production catalogue was not queried for this pattern.
- A second paragraph of bare chord names, such as `Am F C G` after a blank line, counts as lyrics (`Am` is two letters), so it ends the solo (measured: `["solo:1", "body:1"]`). The spec says lyrics are letters "outside chords" without saying whether unbracketed chord names count as chords. Is that intended?
- `const SOLO_SECTION_KIND = 'solo';` is declared three times: ChordProSectionHeading.tsx:24, ChordChartViewer.tsx:55 and chordpro-sections.utils.ts:59. No standards bullet covers this.
- `chordpro.utils.ts:3` imports `SECTION_START_DIRECTIVES` from `chordpro-sections.utils.ts`, which imports the `ChordProLine` type back from `chordpro.utils.ts`. The cycle is type-only at runtime, and lint and typecheck pass.

## Verdict: FAIL
