# Visual validation — Chords above the lyrics

- Spec: [`../spec/spec.md`](../spec/spec.md)
- Dev URL: http://localhost:5174/
- Run at: 2026-11-16T11:24:34Z
- Tooling: agent-browser 0.41.2

Surfaces checked: song page chart tab (`/catalog/<slow-burn>?tab=chords`), song scene (`/catalog/<slow-burn>/scene`), setlist scene (`/setlists/<set>/scene`), and the edit-form preview (`/catalog/<slow-burn>/edit`, Music tab). Edge-case charts were typed into the edit-form textarea and never saved; the song page afterwards still showed the seeded chart.

## Assertions

| # | From | Assertion | Action | Evidence | Verdict |
|---|---|---|---|---|---|
| 01 | Assertions 1 | No chord on a chart line shows square brackets. | Read `innerText` of the chart on all four surfaces, test `/[\[\]]/` | `./visual-validation-2026-11-16-1135/01-song-chart-1280.png`, `08-song-scene-1280.png`, `09-setlist-scene-1280.png`, `02-edit-preview-1280.png`; `brackets: false` on each | PASS |
| 02 | Assertions 2 | Each chord sits on a row directly above the word that follows it in the source, left aligned with the start of that word. | Rebuild `[chord]text` from the DOM cells and compare with the 16 source lyric lines; measure chord `::before` (`position:absolute; top:0; left:0`) against the first glyph of its cell | `./visual-validation-2026-11-16-1135/01-song-chart-1280.png`; 16/16 lines match the source, glyph offset from chord left = 0 px for every chord | PASS |
| 03 | Assertions 3 | A word with no chord has an empty space above it, and its lyric stays on the same baseline as the words that carry a chord. | Per line, compare text-range bottoms and `padding-top` of every cell; check non-chord cells' `::before` is empty | `./visual-validation-2026-11-16-1135/01-song-chart-1280.png`; 16 lines checked, 0 baseline or padding differences | PASS |
| 04 | Assertions 4 | Read as page text, a lyric line keeps single spaces between its words. Nothing is added between two words that carry no chord. | Read each line's `innerText`, search for double spaces; compare with the source minus chords | `./visual-validation-2026-11-16-1135/01-song-chart-1280.png`; e.g. `"Lights go down, the room turns amber"`, no double space in 21 lines | PASS |
| 05 | Assertions 5 | A line made only of chords shows its chords on one row, with no empty lyric row below them. | Typed `[Am] [F] [C] [G]` in the edit preview | `./visual-validation-2026-11-16-1135/03-edge-chart-preview-1280.png`, `04-edge-chart-preview-375.png` (single row `Am F C G`, next line follows directly) | PASS |
| 06 | Assertions 6 | At 375 px wide, a line too long for the screen wraps between two words, each chord staying above its word, and the wrapped part is indented. The page does not scroll sideways. | 375 × 812; long line in edit preview; seeded chart on song page and setlist scene; a line with a mid-word chord `be[F]comes` | `./visual-validation-2026-11-16-1135/05-midword-chord-wrap-375.png` shows `…more x be` / `comes an answer` with `F` on the second row | FAIL |
| 07 | Assertions 7 | At 1280 px wide, every line of the seeded chart fits on one row of chords over one row of lyrics. | 1280 × 900; count distinct cell tops per line on song page, song scene and setlist scene | `./visual-validation-2026-11-16-1135/01-song-chart-1280.png`, `08-song-scene-1280.png`, `09-setlist-scene-1280.png`; 21/21 lines on 1 row on each | PASS |
| 08 | Assertions 8 | Transposing up by one semitone changes every chord shown above the lyrics, and the lyrics stay in place. | Song page at 1280, snapshot all 84 cells, click "Transpose up", snapshot again | `./visual-validation-2026-11-16-1135/07-transpose-up-1.png`; Am→A#m, C→C#, Dm→D#m, E7→F7, F→F#, G→G#, 0 unchanged chords, 0 lyric cells changed text or position | PASS |
| 09 | Assertions 9 | Section headings (verse, chorus), the title and comment directives look as they did before. | Screenshot title, `{key}`, `{comment}` and section badges; `git diff origin/main...HEAD` of `ChordChartViewer.tsx` | `./visual-validation-2026-11-16-1135/03-edge-chart-preview-1280.png`; diff touches only the lyric-line branch of `renderLine`, title/comment/heading branches unchanged | PASS |
| 10 | Assertions 10 | Tab blocks still show their staff lines on one unbroken line that scrolls sideways. | Typed a two-string `{start_of_tab}` block, measured at 375 | `./visual-validation-2026-11-16-1135/04-edge-chart-preview-375.png`; each staff line 24 px high (one line), container `overflow-x: auto`, `scrollWidth 714 > clientWidth 259` | PASS |
| 11 | Where it shows | Every place that draws a ChordPro chart (song page, song scene, setlist scene, edit preview) draws chords above lyrics. | Opened each surface; compared the (chord, text) cell sequence with the song page | `./visual-validation-2026-11-16-1135/01-song-chart-1280.png`, `02-edit-preview-1280.png`, `08-song-scene-1280.png`, `09-setlist-scene-1280.png`; 84/84 cells identical on both scenes | PASS |

## Notes

- Row 06 FAIL. A chord placed inside a word (`be[F]comes`, which the seeded "Slow Burn" chart itself contains) splits the word in two cells. The browser can break the line between those two cells, so the word wraps mid-word. Measured in the edit preview at 375 px with `[Am]Half a word and some more x be[F]comes an answer`: `be` sits on row top 507 and `comes` on row top 555, rendered as `be` at the end of one row and an indented `comes` under `F` on the next. The same split happens on the seeded chart in the setlist scene at 320 px wide (`be|comes`), not at 340, 360, 375, 390 or 414 px (measured). The other parts of row 06 hold: the long line wraps with a 24 px indent on every continuation row, each chord stays above its word, and `document.scrollWidth - clientWidth = 0` on the song page, edit preview and setlist scene at 375 px (`./visual-validation-2026-11-16-1135/04-edge-chart-preview-375.png`, `06-song-chart-375.png`, `10-setlist-scene-375.png`).
- Observed but not asserted: when a line wraps, a continuation row with no chord still reserves an empty chord row above it (`04-edge-chart-preview-375.png`, `turns amber and the long`).
- Full-page screenshots `02` and `06` show sticky header and bottom nav stitched mid-page. That comes from the capture, not from the app.
- Pixel-content check returned `[]` after every screenshot. `agent-browser errors` reported no console errors.

## Verdict: FAIL
