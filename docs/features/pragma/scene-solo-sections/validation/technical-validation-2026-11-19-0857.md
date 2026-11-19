# Technical validation — A solo stands out in Scene Mode and carries its notes

- Spec: [`../spec/spec.md`](../spec/spec.md)
- Plan: absent (Tier 1 change, no plan written)
- Branch: claude/bold-heisenberg-wdysrp
- Base: 7f523dcbeb56308e3ef10c9041e77c7e446b5ad8
- Run at: 2026-11-19T09:01:06Z
- Round: 2
- Reviewed: dd110bc03231d61f9dc6e7f324ec4d65c44ef83e
- Touched workspaces: @borso-app/pragma (site only in this range)

Round 2 reads `git diff e727181ff5ffe3e8a269b008c7a408c0e7238e68..HEAD`, two commits: `d546a081` (swipe between songs in Scene Mode) and `dd110bc0` (the round-1 fix). No merge sits in the range (`git rev-list --merges` printed nothing), and the working tree was clean, so HEAD was reviewed as is.

The swipe commit carries new scope that round 1 never read (`scene-swipe.core.ts`, `scene-swipe.hook.ts`, the `SetlistScenePage.tsx` wiring, the `data-scrolls-sideways` attribute in `ChordChartViewer.tsx`). The spec gained a *Swiping between songs* section for it. Categories A, B and D are walked in full for those files and for the amended bullets of *Where the implicit solo ends*, as round 1 would.

The spec is still in the short form. Categories A and D are built from its bullets, and the files are taken from the diff.

1 use case routed to /visual-validation; out of scope for this report. It is D14: a real thumb swipe on a phone changes the song while a vertical scroll of the chart does not. jsdom touch events cannot show how the browser arbitrates the gesture against the scroll container's native scrolling.

## A. Correctness vs spec

| # | Spec ref | Claim | Code (file:line) | Evidence (quoted) | Verdict |
|---|---|---|---|---|---|
| A00 | Plan | plan absent; files taken from the diff | n/a | n/a | UNVERIFIABLE |
| A01 | Where it ends §2 | A lyric paragraph after a blank line ends the solo even when it opens on a chords-only row | chordpro-solo.utils.ts:46-52, 60; chordpro-sections.utils.ts:105 | `for (const line of upcoming) { if (!isParagraphLine(line)) return false; if (isLyricLine(line)) return true; }` / `return progress.isAfterBlank && hasLyricsInParagraph(upcoming);` / `!shouldEndImplicitSolo(line, lines.slice(index), implicitSolo)`. Probe: `{comment: Solo}\n[Am] [F]\n\n[C] [G]\n[C]Hello [G]world\n[F]More words` gives `solo:1,body:3` | PASS |
| A02 | Where it ends §2 | Chord names written without brackets, such as `Am F#m Cmaj7`, are not lyrics | chordpro-solo.utils.ts:9-10, 29-32 | `/(?<!\p{L})[A-G][#b]?(?:maj\|min\|dim\|aug\|sus\|add\|m)?\d*(?:\/[A-G][#b]?)?(?![\p{L}\d#])/gu` | FAIL (blocking) |
| A03 | Where it ends, new paragraph | A solo drops its trailing blank lines, every other section keeps its own | chordpro-sections.utils.ts:64-66, 97 | `if (current.kind === SOLO_SECTION_KIND) trimTrailingBlanks(current.lines);`. Probe: `{soc}\n[C]Words\n\n{eoc}` gives `chorus:2`, as at the base | PASS |
| A04 | Where it ends §1, §3 | Directive ends after the first row; first paragraph always belongs to the solo | chordpro-solo.utils.ts:59, 63-71 | unchanged from round 1 apart from the extra `upcoming` argument: `if (line.kind === 'directive') return progress.hasRows \|\| !isCommentDirective(line.name);` / `isAfterBlank: isBlank && progress.hasRows,` | PASS |
| A05 | Swiping §1 | A swipe left opens the next song, right the previous one, as the arrow keys do | SetlistScenePage.tsx:123-125, 129-131; scene-swipe.core.ts:12-13 | `useSceneSwipe((command) => goToIndex(resolveSceneIndex(command, currentIndex, setlistEntries.length)),)` is the same call `readKey` makes / `if (deltaX <= -SCENE_SWIPE_DISTANCE_PX) return 'next';` / `if (deltaX >= SCENE_SWIPE_DISTANCE_PX) return 'previous';` | PASS |
| A06 | Swiping §2 | A swipe counts when it travels at least 64 px sideways | scene-swipe.core.ts:5, 12-13 | `export const SCENE_SWIPE_DISTANCE_PX = 64;` with `<=` / `>=` | PASS |
| A07 | Swiping §2 | ... and at least one and a half times as far sideways as down | scene-swipe.core.ts:6, 10 | `const isHorizontal = Math.abs(deltaX) > Math.abs(deltaY) * HORIZONTAL_DOMINANCE;` | FAIL (blocking) |
| A08 | Swiping §3 | A swipe that starts inside a tab block never changes the song | ChordChartViewer.tsx:204; scene-swipe.hook.ts:18-22, 29-31 | `<div className="@container overflow-x-auto" data-scrolls-sideways>` (tab branch only) / `target.closest(SIDEWAYS_SCROLL_SELECTOR) !== null` / `start.current = isTracked ? { x: touch.clientX, y: touch.clientY } : null;` | PASS |
| A09 | Swiping §4 | The first and last songs hold, as with the arrow keys | setlist-scene.core.ts:69-75 | `return clampSceneIndex(currentIndex + STEP_BY_COMMAND[command], entryCount);`, reached by the swipe through the same `resolveSceneIndex` | PASS |

A02 failing case. Measured with a probe test, deleted afterwards. `{comment: Solo}\n[Am] [F]\n\nAm7b5 D7 Gm` gives `solo:1,body:1`, and so do `C7sus4 C7` and `Cmaj7#11 Dm9` as the second paragraph. The spec keeps a paragraph of unbracketed chord names inside the solo, which gives `solo:3`. The pattern accepts a quality only before the digits and no extension after them, so `m7b5`, `7sus4` and `maj7#11` leave `Am`, `sus` or `Cmaj` behind as a two-letter word.

A07 failing case. A touch from (300, 300) to (210, 360) gives `deltaX = -90`, `deltaY = 60`, exactly one and a half times as far sideways as down. `selectSwipeCommand(-90, 60)` returns `null`, and the song stays. The spec says "at least one and a half times", so it should return `'next'`. The test pins the wrong boundary: `expect(selectSwipeCommand(-90, 60)).toBeNull();` at scene-swipe.core.test.ts:21. Fix size: one character plus that test line.

## Round-1 findings

| # | Round-1 row | Fixed by | Verdict |
|---|---|---|---|
| R01 | A10 / D10 (blocking): a lyric paragraph opening on a chords-only row did not end the solo | `dd110bc0` apps/pragma/site/src/lib/chordpro-solo.utils.ts:46-60, chordpro-sections.utils.ts:105; test `it('ends the solo on a lyric paragraph that opens on a chords-only row')` at chordpro-sections.utils.test.ts:159 asserting `toEqual(['solo:1', 'body:3'])`. Round 1's exact source now gives `solo:1,body:3` (probe) | PASS |
| R02 | B13 (non-blocking), part dismissed in `dd110bc0`: `isCommentDirective` stays in `chordpro-solo.utils.ts` because moving it makes a runtime import cycle and the solo rule is its only reader | Cycle checked: `chordpro.utils.ts:3` value-imports `SECTION_END_DIRECTIVES, SECTION_START_DIRECTIVES` from `chordpro-sections.utils.ts`, which value-imports from `chordpro-solo.utils.ts` (lines 3-9). Moving the function to `chordpro.utils.ts` (or to `chordpro-sections.utils.ts`) would make `chordpro-solo.utils.ts` value-import back up that chain. Readers checked with grep: chordpro-solo.utils.ts:19, :59 and ChordChartViewer.tsx:187, where the call sits behind `section.kind === SOLO_SECTION_KIND &&` (:185), the solo-note rule. The claim holds | PASS |
| R03 | B13 (non-blocking), part fixed: `trimTrailingBlanks` moved | `dd110bc0` chordpro-sections.utils.ts:64-66, now private beside its only caller at :97 | PASS |

## B. Code cleanliness

| # | Rule | Check | Evidence | Verdict |
|---|---|---|---|---|
| B01 | No abbreviations / 1-letter locals | read each changed source file | `began`, `touch`, `isTracked`, `isHorizontal`, `upcoming`, `hasLyricsInParagraph`, `isParagraphLine`, `hasRenderableLine`. None found | PASS |
| B02 | Magic numbers / strings named | read in full | `SCENE_SWIPE_DISTANCE_PX`, `HORIZONTAL_DOMINANCE`, `SIDEWAYS_SCROLL_SELECTOR`, `CHORD_NAME_PATTERN` | PASS |
| B03 | No prose comments | read in full | new comments are `/** @Feature setlists */`, `// @FollowsBlueprint core-decision`, `// @FollowsBlueprint hook-timer-owned-by-handlers`, all machine-read | PASS |
| B04 | Type assertions only `as const` / `as unknown` | `grep -nP '\bas (?!const\|unknown)\w'` on changed files | none found | PASS |
| B05 | No `any` | `grep -nP '\bany\b'` on changed files | none found | PASS |
| B06 | `noUncheckedIndexedAccess` honoured | read in full | `event.touches[0]` and `event.changedTouches[0]` checked against `undefined` (scene-swipe.hook.ts:30-31, 36-38) | PASS |
| B07 | Lint clean | `pnpm exec oxlint --type-aware <12 changed app files>` | exit 0, no output | PASS |
| B08 | `useEffect` is a smell | `grep -nE '\buseEffect\('` on changed files | none found. The swipe start lives in a ref set and cleared by the touch handlers | PASS |
| B09 | Standards 01: "a `build…`, `project…` or `select…` returns what its verb says" | read in full | `selectSwipeCommand` returns `SceneKeyCommand \| null`, a selection | PASS |
| B10 | Standards 01: "a boolean name is not negated" | read in full | `isHorizontal`, `isTracked`, `isParagraphLine`, `hasRenderableLine`, `hasLyricsInParagraph` | PASS |
| B11 | Standards 01: "a file name says what the file holds" | read in full | `scene-swipe.core.ts` holds the swipe decision, `scene-swipe.hook.ts` the `useSceneSwipe` hook, `trimTrailingBlanks` now lives in the sections file that alone calls it | PASS |
| B12 | Standards 01: a comment documents something the code cannot say | read in full | `// Stryker disable next-line ConditionalExpression: equivalent mutant` at chordpro-sections.utils.ts:111 is unchanged and still equivalent (see round 1 B10) | PASS |
| B13 | Standards 02: "the choice between `.core.ts` and `.utils.ts`" | read in full | `scene-swipe.core.ts` decides a Scene Mode command, a band term, beside `setlist-scene.core.ts` | PASS |
| B14 | Standards 05: "a route composes organisms and owns no layout primitive" | read in full | SetlistScenePage.tsx gains only `{...swipeHandlers}` on an existing element (:243) | PASS |
| B15 | Standards 05: "a control taking a drag or a slide writes nothing on `pointerdown`" | read in full | `onTouchStart` records a start in a ref only. The song changes in `onTouchEnd` (scene-swipe.hook.ts:34-41), and `onTouchCancel` forgets the start | PASS |
| B16 | Standards 05: no new label explains the interface; no boolean prop family | read in full | no visible text and no new prop | PASS |
| B17 | Standards 10: "a test name states the behaviour and the condition" | read in full | `stays on the song when the swipe starts in a block that scrolls sideways`, `keeps a second paragraph of bare chord names inside the solo` | PASS |
| B18 | Standards 01: VOCABULARY.md / INVARIANTS.md still true | grep | none changed in the range | PASS |
| B19 | Blueprint marks | read in full | `core-decision` (blueprint-index.md:112) on the pure decision. `hook-timer-owned-by-handlers` (:168) on a ref owned by its handlers, the same mark `sheet-swipe.hook.ts:25` carries for the same shape. `test-pure-unit` on the new test | PASS |
| B20 | Reuse first | grep for touch handlers | the only other one is `components/molecules/sheet-swipe.hook.ts`, a vertical drag that moves a sheet. Nothing to reuse for a horizontal threshold | PASS |

## C. Tests pass

| # | Workspace | Command | Exit | Verdict |
|---|---|---|---|---|
| C01 | @borso-app/pragma | `pnpm --filter @borso-app/pragma exec vitest run --project core --changed e727181ff5ffe3e8a269b008c7a408c0e7238e68 --coverage --reporter=verbose` | 0. 13 files, 214 tests, coverage gate held. Includes chordpro-sections.utils.test.ts, chordpro-solo.utils.test.ts, chordpro.utils.test.ts, ChordChartViewer.test.tsx, SetlistScenePage.test.tsx, scene-swipe.core.test.ts | PASS |
| C02 | @borso-app/pragma | `pnpm --filter @borso-app/pragma run test:e2e --changed e727181ff5ffe3e8a269b008c7a408c0e7238e68 --reporter=verbose` | 0, "No test files found". The range changes no file under `apps/pragma/api/` (`git diff --name-only e727181f..HEAD -- 'apps/*/api/**'` prints 0 lines), so no e2e test imports a changed file. Full SHA used | PASS |
| C03 | @borso-app/pragma | `scripts/mutate-changed.sh e727181ff5ffe3e8a269b008c7a408c0e7238e68 apps/pragma` | 0. chordpro-sections.utils.ts 78 killed + 1 timeout / 0 survived, chordpro-solo.utils.ts 79 / 0, scene-swipe.core.ts 20 / 0 | PASS |
| C04 | @borso-app/pragma | `pnpm --filter @borso-app/pragma run typecheck` | 0 | PASS |
| C05 | @borso-app/pragma | every changed `*.utils.ts` / `*.core.ts` has a sibling test | chordpro-solo.utils.test.ts, chordpro-sections.utils.test.ts, scene-swipe.core.test.ts all present and run in C01 | PASS |

## D. Test coverage of spec

| # | Use case | Covering test | Verdict |
|---|---|---|---|
| D01 | A lyric paragraph after a blank line ends the solo | `it('ends the solo on a lyric paragraph after a blank line')` at chordpro-sections.utils.test.ts:177 | PASS |
| D02 | ... even when the paragraph opens on a chords-only row | `it('ends the solo on a lyric paragraph that opens on a chords-only row')` at chordpro-sections.utils.test.ts:159, `toEqual(['solo:1', 'body:3'])`; `it('finds a lyric after a chords-only row of the same paragraph')` at chordpro-solo.utils.test.ts, `expect(hasLyricsInParagraph(lines)).toBe(true);` | PASS |
| D03 | Chord names written without brackets are not lyrics | `it('does not read chord names written without brackets as lyrics')` at chordpro-solo.utils.test.ts:38, `expect(isLyricLine(parseChordProLine('Am F#m Cmaj7 Ebm7/Bb Gsus4'))).toBe(false);`; `it('keeps a second paragraph of bare chord names inside the solo')` at chordpro-sections.utils.test.ts:169, `toEqual(['solo'])`. These pin the spec's examples. The shapes they leave out fail in the code (A02), and the fix needs a test for them | PASS |
| D04 | A solo drops its trailing blank lines | `it('keeps chord rows split by blank lines inside the solo, and drops its trailing blanks')` at chordpro-sections.utils.test.ts:153 | PASS |
| D05 | Every other section keeps its trailing blank lines | `it('keeps the trailing blank lines of a section that is not a solo')` at chordpro-sections.utils.test.ts:173, `toEqual([['chord-line', 'blank']])` | PASS |
| D06 | A swipe left opens the next song | `it('walks to the next song on a swipe to the left, and back on a swipe to the right')` at SetlistScenePage.test.tsx:290, `expect(readTitle(container)).toBe('Helpless');` at :292; `it('reads a swipe to the left as the next song')` at scene-swipe.core.test.ts:6 | PASS |
| D07 | A swipe right opens the previous song | SetlistScenePage.test.tsx:290, `expect(readTitle(container)).toBe('Take Five');` at :294 after the right swipe; scene-swipe.core.test.ts:10 | PASS |
| D08 | A swipe counts from 64 px sideways | `it('ignores a swipe shorter than the distance')` at scene-swipe.core.test.ts:14, `expect(selectSwipeCommand(SCENE_SWIPE_DISTANCE_PX - 1, 0)).toBeNull();`; `it('stays on the song when the swipe is too short')` at SetlistScenePage.test.tsx:297 | PASS |
| D09 | A swipe counts when at least one and a half times as far sideways as down | `it('ignores a gesture that mostly scrolls the chart')` at scene-swipe.core.test.ts:19 asserts `expect(selectSwipeCommand(-90, 60)).toBeNull();` at :21, the opposite of the spec at the boundary (A07) | FAIL (blocking) |
| D10 | A swipe starting inside a tab block never changes the song | `it('stays on the song when the swipe starts in a block that scrolls sideways')` at SetlistScenePage.test.tsx:302, swiping from `[data-scrolls-sideways]` and `expect(readTitle(container)).toBe('Take Five');` at :306 | PASS |
| D11 | A cancelled gesture changes nothing (follows from "scrolling the chart never changes the song") | `it('forgets a swipe the browser cancelled')` at SetlistScenePage.test.tsx:309 | PASS |
| D12 | The first song holds on a swipe right | **structural:** the swipe goes through `resolveSceneIndex` (SetlistScenePage.tsx:124), pinned by `it('holds on the first song rather than wrapping to the last')` at setlist-scene.core.test.ts:86, `expect(resolveSceneIndex('previous', 0, 12)).toBe(0);` | PASS |
| D13 | The last song holds on a swipe left | **structural:** same path, `it('holds on the last song rather than wrapping to the first')` at setlist-scene.core.test.ts:82, `expect(resolveSceneIndex('next', 11, 12)).toBe(11);` | PASS |
| D14 | A real thumb swipe on a phone changes the song, a vertical scroll does not | routed to /visual-validation | n/a |

## E. Scale

| # | Write path or state | Question | Failing case, or the key or test that holds it | Verdict |
|---|---|---|---|---|
| E01 | none | Check-then-write, per-process state | `git diff e727181f..HEAD -- '*.service.ts' '*.repository.ts' '*.controller.ts'` prints nothing, and no file under `api/` changed. New module-level values are constants (`SCENE_SWIPE_DISTANCE_PX`, `HORIZONTAL_DOMINANCE`, `SIDEWAYS_SCROLL_SELECTOR`, `CHORD_NAME_PATTERN`). The swipe start is a per-component `useRef` in the browser | PASS |

## Blocking findings

- A02 — chord names with an extension after the digits are read as lyrics. `{comment: Solo}\n[Am] [F]\n\nAm7b5 D7 Gm` (also `C7sus4 C7`, `Cmaj7#11 Dm9`) splits the second paragraph out of the solo (`solo:1,body:1`), where the spec keeps unbracketed chord names inside it.
- A07 / D09 — a swipe exactly one and a half times as far sideways as down is ignored. `selectSwipeCommand(-90, 60)` returns `null` (scene-swipe.core.ts:10 uses `>`), where the spec says "at least", and scene-swipe.core.test.ts:21 pins the wrong answer.

## Non-blocking findings

- none

## Notes

- A00: no plan was written, by design for a Tier 1 change. Files were taken from the diff.
- `chordpro-sections.utils.ts:105` calls `lines.slice(index)` for every line read while an implicit solo is open, and `hasLyricsInParagraph` then walks it to the next blank. The slice copies the rest of the chart each time, so the work is quadratic in the lines after a solo (inferred, not measured). Charts hold at most a few hundred lines. Is passing the index instead of a copy worth it?
- `CHORD_NAME_PATTERN` also strips words a lyric can be made of. A lyric line of only `Am I` reads as no lyric (`Am` stripped, `I` one letter), so it would stay inside the solo (inferred from the pattern, not probed). The spec does not say how to read such a line. Is that acceptable?
- The swipe is wired only into `SetlistScenePage`. The single-song Scene Mode has no next song, so the spec's "next song of the setlist" does not reach it. Is that the intended reading?
- C02 ran no e2e file because the range touches no API file. The round-1 run covered the seed change.

## Verdict: FAIL
