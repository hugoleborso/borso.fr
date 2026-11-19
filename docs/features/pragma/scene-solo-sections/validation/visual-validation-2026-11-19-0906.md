# Visual validation — A solo stands out in Scene Mode and carries its notes

- Spec: [`../spec/spec.md`](../spec/spec.md)
- Dev URL: http://localhost:5174/
- Run at: 2026-11-19T09:12:00Z
- Tooling: agent-browser 0.41.2. Touch swipes were sent as CDP `Input.dispatchTouchEvent` (touchStart, ten touchMove 60 ms apart, touchEnd) at a 375 x 812 mobile viewport with touch emulation on. They went to the `phone` session's CDP port, from a scratchpad script built on `scripts/browser/cdp-session.ts`. Swipe start points sit 420 px down the viewport, inside the chart.

Test data: the charts of "Midnight Drive" (implicit `{comment: ...solo...}` cases) and "Lightning" (explicit `{start_of_solo}` cases) in the seeded setlist "Set principal" were replaced through `PUT /api/songs/:id`. They were restored to their seeded text after the run. The Midnight Drive chart under test:

```
{start_of_verse} ... {end_of_verse}

{comment: Guitar Solo}
{comment: Hugo takes it}
{comment: Two rounds}
[Am] [F] [C] [G]
[Am] [F] [C] [G]

Am F#m Cmaj7 | x3 (guitar)
| [Dm] | [G] |


[C] [G]
[C]Back to the [Am]lyrics now
[F]Driving all [G]night

{c: Outro solo}
Cm7 Fm7 then the bridge chords

[C]Lyric line after the outro

{comment: solo}
[F] [G]
{comment: Back to verse}
[C]Last [G]line

{start_of_chorus}
{comment: Solo}
[F]Drive, [G]drive, [C]let the city [Am]blur
{end_of_chorus}
```

Lightning held `{start_of_solo: Guitar solo}` with `{comment: Marc, 4 rounds}`, a chord row, `{comment: Last round half time}`, a chord row and `{end_of_solo}`, followed by an unlabelled `{start_of_solo}` ... `{end_of_solo}`.

## Assertions

| # | From | Assertion | Action | Evidence | Verdict |
|---|---|---|---|---|---|
| 01 | Result | A solo renders as a framed block with a "Solo" badge, in Scene Mode | Scene Mode, song 02, scroll to the first solo | `./visual-validation-2026-11-19-0906/01-implicit-solo-block-scene.png` shows a block with a left border and a filled background, badged "GUITAR SOLO" | PASS |
| 02 | Result | ...and on the song page, since both use the same chart viewer | `/catalog/<id>?tab=chords` for Midnight Drive | `./visual-validation-2026-11-19-0906/04-song-page-solo-block.png` shows the same three framed blocks | PASS |
| 03 | Result | The block holds the solo's chord rows | Same as 01 | `01-...png`: both `Am F C G` rows sit inside the frame | PASS |
| 04 | Result | Notes on the solo render inside the block in full-strength text, not dim italic | Computed style of "Hugo takes it" against a plain `{comment: Solo}` line | Note: `color rgb(241,233,216)` (text-stage-ink), `font-style normal`, weight 500. Plain comment: `rgb(184,174,154)` (text-stage-ink-dim), `italic`. Song page note: `rgb(29,25,20)`, normal. Visible in `01-...png` and `04-...png` | PASS |
| 05 | Result, form 1 | `{comment: Solo}` (or `{c: Outro solo}`, any comment containing "solo") followed by chord rows makes a solo | `{comment: Guitar Solo}`, `{c: Outro solo}` and lower-case `{comment: solo}` in one chart | `02-implicit-ends-at-directive-and-chorus-comment.png`: blocks "GUITAR SOLO", "OUTRO SOLO 2" and "SOLO 3" | PASS |
| 06 | Result, form 1 | Any `{comment: ...}` directly under it, before the first chord row, is a note on the solo | Two comments under `{comment: Guitar Solo}` | `01-...png`: "Hugo takes it" and "Two rounds" render as notes inside the frame, above the chords | PASS |
| 07 | Result, form 2 | `{start_of_solo: Guitar solo}` ... `{end_of_solo}` makes a labelled solo, and every `{comment: ...}` inside is a note | Scene Mode, song 03 (Lightning) | `03-explicit-solo-blocks-scene.png`: "GUITAR SOLO" block holding the note "Marc, 4 rounds", a chord row, the note "Last round half time" (after a chord row, still inside) and a chord row | PASS |
| 08 | Result, form 2 | `{start_of_solo}` without a label also makes a solo | Same page | `03-...png`: second block badged "SOLO 2" | PASS |
| 09 | Where the implicit solo ends | Ends at any directive after the first chord row (another comment, a section start or end) | `{comment: solo}` + `[F] [G]` + `{comment: Back to verse}` | `02-...png`: "SOLO 3" frame holds only `F G`. "Back to verse" renders below it as a dim italic plain comment | PASS |
| 10 | Where the implicit solo ends | Ends at a paragraph holding lyrics after a blank line, even when it opens on a chords-only row | Paragraph `[C] [G]` / `[C]Back to the [Am]lyrics now` after the solo | `01-...png`: the frame ends above `C G`, and the lyric paragraph renders outside it | PASS |
| 11 | Where the implicit solo ends | Bar lines, `x3`, `(guitar)` and bare chord names such as `Am F#m Cmaj7` are not lyrics | Second paragraph `Am F#m Cmaj7 \| x3 (guitar)` / `\| [Dm] \| [G] \|` | `01-...png`: both rows stay inside the "GUITAR SOLO" frame | PASS |
| 12 | Where the implicit solo ends | The first paragraph after the heading always belongs to the solo, even prose such as "Cm7 Fm7 then the bridge chords" | `{c: Outro solo}` + that prose line | `02-...png`: the prose is inside the "OUTRO SOLO 2" frame, and the next lyric paragraph is outside | PASS |
| 13 | Where the implicit solo ends | A solo drops its trailing blank lines, and every other section keeps its own | DOM measure of each solo `<section>` | Every solo block's last child is its last content row ("\|  \|  \|", "Cm7 Fm7 ...", "F  G"). The gap after each block is 20 px, its `mb-5`, including the first solo, which was followed by two blank lines in the source. The plain lyric paragraphs keep their blank-line gap (`02-...png`, the larger space under "Lyric line after the outro") | PASS |
| 14 | Where the implicit solo ends | `{comment: Solo}` inside a chorus, verse, bridge or tab stays a plain comment line | `{comment: Solo}` inside `{start_of_chorus}` | `02-...png`: under "CHORUS", "Solo" is a dim italic line with no frame | PASS |
| 15 | Swiping | A swipe to the left on the chart opens the next song, a swipe to the right the previous one | Touch swipe dx -120, then +120, on song 02 | Midnight Drive to Lightning, then back to Midnight Drive (CDP read of `h2` before and after) | PASS |
| 16 | Swiping | A swipe counts at 64 px sideways or more | dx -60, -63, -66, +66 | -60 and -63 held. -66 moved to the next song and +66 back | PASS |
| 17 | Swiping | ...and only at 1.5 times as far sideways as down, so scrolling never changes the song | (dx, dy) = (-100, 70), (-100, -70), (-100, 60), (0, -200) | Ratio 1.43 held both ways, ratio 1.67 moved to the next song, and the vertical drag held | PASS |
| 18 | Swiping | A swipe that starts inside a tab block never changes the song | Afterglow (song 04), swipes of ±150 px starting inside the `{start_of_tab}` block (`elementFromPoint` confirmed inside it); control swipe from outside the tab | `06-swipe-from-tab-block-holds.png`. Both swipes inside the tab held on Afterglow. The control swipe moved to Runaway Sun | PASS |
| 19 | Swiping | The first and last songs hold | Swipe +150 on song 01, -150 on song 06; control -150 on song 01 | Slow Burn held on +150. Last Call held on -150. Slow Burn moved to Midnight Drive on -150 (`07-after-swipe-left-from-song-1.png`) | PASS |
| 20 | Edge: 375 px | Solo block at phone width | Scene Mode at 375 x 812, song 02 | `05-solo-block-375px.png`: the frame, badge and notes fit. `scrollWidth` 375 = `innerWidth`, so nothing overflows | PASS |
| 21 | Edge: dark scheme | Solo block on the song page under `prefers-color-scheme: dark` | `set media dark`, song page Chords tab | `08-song-page-solo-dark.png`: frame, badge and notes stay legible | PASS |

Broken-image scan: an empty array after each of the eight screenshots.

## Notes

- No FAIL or UNVERIFIABLE rows.
- Observation, not a failure, on rows 01 and 05. The badge shows the member's own label, upper-cased ("GUITAR SOLO", "OUTRO SOLO 2"), not the literal word "Solo". From the second solo of a chart on, it adds an ordinal ("OUTRO SOLO 2", "SOLO 3", and "SOLO 2" for the second explicit solo). The spec asks for a "Solo" badge and says nothing about ordinals. "OUTRO SOLO 2" can read as a second outro solo when it is the first.
- Observation on row 09. Any later comment containing the word "solo" opens a new solo, for example `{comment: Back to verse after the short solo}`. A first test chart used that line and it rendered as a fourth solo block. This follows the spec's "any comment containing the word solo" rule.
- Row 13 is measured from the DOM. The spec gives no earlier render to compare "every other section keeps its own as before" against, so that half rests on the plain sections still showing a blank-line gap.
- Rows 16 and 17 test values a few pixels either side of the thresholds (63 and 66 px, ratios 1.43 and 1.67), not the exact 64 px or 1.5 boundary.
- Headless Chromium does not scroll from touch-source gestures (`docs/knowledge/real-touch-gestures-over-cdp.md`). Rows 17 and 18 prove that the song did not change, not that the chart or the tab scrolled.
- Out of scope, not tested: `[Solo]` and bare "Solo" lines, and editing notes from Scene Mode.

## Verdict: PASS
