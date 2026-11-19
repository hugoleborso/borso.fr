# Visual validation — A solo stands out in Scene Mode and carries its notes

- Spec: [`../spec/spec.md`](../spec/spec.md)
- Dev URL: http://localhost:5174/
- Run at: 2026-11-19T14:11:12Z
- Tooling: agent-browser 0.41.2. Touch swipes were sent as CDP `Input.dispatchTouchEvent` (touchStart, ten touchMove 60 ms apart, touchEnd) at a 375 x 812 mobile viewport with touch emulation on, on the `phone` session's CDP port. The driver was a scratchpad script built on `scripts/browser/cdp-session.ts`, because `scripts/phone.sh drag` only goes from one element to another and cannot hold a swipe to a set number of pixels.

Test data, all restored after the run and checked equal to the saved copies:

- The charts of "Midnight Drive" (implicit `{comment: ...solo...}` cases) and "Lightning" (explicit `{start_of_solo}` cases) in the seeded setlist "Set principal" were replaced through `PUT /api/songs/:id`. Midnight Drive held the implicit chart of the 0906 run plus `{comment: Solo}` inside a verse, a bridge and a `{start_of_tab}` block wider than the phone. Lightning held `{start_of_solo: Guitar solo}` with `{comment: Marc, 4 rounds}`, a chord row, `{comment: Last round half time}`, a chord row and `{end_of_solo}`, then an unlabelled `{start_of_solo}` ... `{end_of_solo}`.
- The transition note from Midnight Drive to Lightning was lengthened to 213 characters through `PUT /api/transition-comments/:a/:b` for rows 27 and 28, then set back to "Léa annonce le titre pendant que Marc change de basse."

Seeded lineups, read from `/api/songs` in setlist order, which the transition rows are checked against:

| Song | Hugo | Léa | Marc | Sarah |
|---|---|---|---|---|
| 01 Slow Burn | drums, voice | guitar | bass | keys |
| 02 Midnight Drive | drums | guitar, voice | keys | bass |
| 03 Lightning | drums | voice | (none) | voice |
| 04 Afterglow | drums, voice | guitar, backing vocals | bass | keys, voice |

## Assertions

| # | From | Assertion | Action | Evidence | Verdict |
|---|---|---|---|---|---|
| 01 | Result | A solo renders as a framed block with a "Solo" badge, in Scene Mode | Scene Mode, song 02, scroll to the first solo | `./visual-validation-2026-11-19-1402/09-implicit-solo-block-scene.png`: block with a left border and a filled background, badged "GUITAR SOLO" | PASS |
| 02 | Result | ...and on the song page, since both use the same chart viewer | `/catalog/<Midnight Drive id>?tab=chords` | `./visual-validation-2026-11-19-1402/13-song-page-solo-block.png`: the same three framed blocks, "GUITAR SOLO", "OUTRO SOLO 2", "SOLO 3" | PASS |
| 03 | Result | The block holds the solo's chord rows | Same as 01 | `09-...png`: both `Am F C G` rows sit inside the frame | PASS |
| 04 | Result | Notes on the solo render inside the block in full-strength text, not dim italic | Computed style of the notes against a plain comment | Scene notes "Hugo takes it", "Two rounds", "Last round half time": `rgb(241,233,216)`, `normal`, weight 500. Plain comment "Back to verse": `rgb(184,174,154)`, `italic`, weight 400. Song page note: `rgb(29,25,20)`, `normal`. Visible in `09-...png` and `13-...png` | PASS |
| 05 | Result, form 1 | `{comment: Solo}` (or `{c: Outro solo}`, any comment containing "solo") followed by chord rows makes a solo | `{comment: Guitar Solo}`, `{c: Outro solo}` and lower-case `{comment: solo}` in one chart | `10-implicit-solo-ends-and-chorus-comment.png`: blocks "OUTRO SOLO 2" and "SOLO 3"; `09-...png`: "GUITAR SOLO" | PASS |
| 06 | Result, form 1 | Any `{comment: ...}` directly under it, before the first chord row, is a note on the solo | Two comments under `{comment: Guitar Solo}` | `09-...png`: "Hugo takes it" and "Two rounds" are inside the frame, above the chords | PASS |
| 07 | Result, form 2 | `{start_of_solo: Guitar solo}` ... `{end_of_solo}`, and every `{comment: ...}` inside is a note | Scene Mode, song 03 (Lightning) | `12-explicit-solo-blocks-scene.png`: "GUITAR SOLO" block holds "Marc, 4 rounds", a chord row, "Last round half time" (after a chord row, still inside, full-strength) and a chord row | PASS |
| 08 | Result, form 2 | `{start_of_solo}` without a label also makes a solo | Same page | `12-...png`: second block badged "SOLO 2" | PASS |
| 09 | Where the implicit solo ends | Ends at any directive after the first chord row | `{comment: solo}` + `[F] [G]` + `{comment: Back to verse}` | `10-...png`: "SOLO 3" holds only `F G`, and "Back to verse" is a dim italic line below the frame | PASS |
| 10 | Where the implicit solo ends | Ends at a paragraph holding lyrics after a blank line, even when it opens on a chords-only row | Paragraph `[C] [G]` / `[C]Back to the [Am]lyrics now` after the solo | `09-...png`: the frame ends above `C G`, and the lyric paragraph is outside it | PASS |
| 11 | Where the implicit solo ends | Bar lines, `x3`, `(guitar)` and bare chord names such as `Am F#m Cmaj7` are not lyrics | Second paragraph `Am F#m Cmaj7 \| x3 (guitar)` / `\| [Dm] \| [G] \|` | `09-...png`: both rows stay inside "GUITAR SOLO" | PASS |
| 12 | Where the implicit solo ends | The first paragraph after the heading always belongs to the solo, even prose | `{c: Outro solo}` + "Cm7 Fm7 then the bridge chords" | `10-...png`: the prose is inside "OUTRO SOLO 2", and the next lyric paragraph is outside | PASS |
| 13 | Where the implicit solo ends | A solo drops its trailing blank lines, and every other section keeps its own | DOM measure of each solo `<section>` | Each solo's last child is its last content row (`"\|  \|  \|"`, `"Cm7 Fm7 then the bridge chords"`, `"F  G "`). The gap to the next block is 20 px for all three, including the first solo, which had two blank lines after it in the source. Plain paragraphs keep a larger blank-line gap (`10-...png`, under "Lyric line after the outro" and "Last line") | PASS |
| 14 | Where the implicit solo ends | `{comment: Solo}` inside a chorus, verse, bridge or tab stays a plain comment line | `{comment: Solo}` inside each of the four | `10-...png` (chorus) and `11-solo-comment-in-verse-bridge-tab-stays-plain.png` (verse, bridge, tab): "Solo" is a dim italic line with no frame. Computed: all four `rgb(184,174,154)`, `italic`, outside any solo frame | PASS |
| 15 | Swiping | A swipe to the left opens the next song, to the right the previous one | Touch swipe dx -120, then +120, on song 02 | Midnight Drive to Lightning, then back to Midnight Drive (read of `h2` before and after) | PASS |
| 16 | Swiping | A swipe counts at 64 px sideways or more | dx -60, -63, -64, +64 | -60 and -63 held. -64 moved to Lightning and +64 back | PASS |
| 17 | Swiping | ...and only at 1.5 times as far sideways as down, so scrolling never changes the song | (dx, dy) = (-100, 70), (-100, -70), (-96, 64), (-100, 60), (+100, 60), (0, -200) | Ratio 1.43 held both ways. Ratio exactly 1.5 (-96, 64) moved. Ratio 1.67 moved both ways. The vertical drag held | PASS |
| 18 | Swiping | A swipe that starts inside a tab block never changes the song | Midnight Drive at 375 px, swipes of -150 and +150 starting at the centre of the tab's `overflow-x-auto` box (hit test confirmed inside it). Control: -150 from outside the tab at the same scroll position | `15-swipe-inside-tab-holds.png`. Both swipes inside the tab held on Midnight Drive. The control moved to Lightning | PASS |
| 19 | Swiping | The first and last songs hold | +150 on song 01, -150 on song 06, controls -150 on 01 and +150 on 06 | Slow Burn held on +150 and moved to Midnight Drive on -150. Last Call held on -150 and moved to Runaway Sun on +150 | PASS |
| 20 | Transition | A strip above the transport names the next song, its key, its lineup as icons and the start of the transition note | Scene Mode, song 02, 1280 x 900 | `01-strip-risky-midnight-drive.png`: "THEN Lightning F#", four lineup groups, the note. The strip's bottom (839 px) meets the transport's top | PASS |
| 21 | Transition | Each member shows as their avatar followed by instrument glyphs, never as words | Read each lineup `<li>` | Visible text of each `<li>` is only the avatar initial ("H", "L", "M", "S"). Instruments are SVG glyphs. Names exist only in `aria-label` (`17-strip-covered-slow-burn.png`, `04-strip-member-joins-lightning.png`) | PASS |
| 22 | Transition | A member who keeps an instrument shows the avatar and that glyph | Midnight Drive to Lightning, Hugo drums to drums | `01-...png`: "H" then the drum glyph, no arrow. `aria-label` "Hugo: Batterie" | PASS |
| 23 | Transition | A member who changes shows the avatar, the glyphs they put down, an arrow, and the glyphs they pick up | Slow Burn to Midnight Drive, Marc bass to keys and Sarah keys to bass | `17-...png`: "M" bass → keys, "S" keys → bass | PASS |
| 24 | Transition | Same rule, for a member who keeps one instrument and drops or adds another | Slow Burn to Midnight Drive: Hugo drums + voice to drums, Léa guitar to guitar + voice. Lightning to Afterglow: Hugo drums to drums + voice | `17-...png` and `04-...png`: Hugo shows voice, drums → drums. Léa shows guitar → voice, guitar. On Lightning, Hugo shows drums → voice, drums. The drums and the guitar are drawn on the put-down side, though neither is put down | FAIL |
| 25 | Transition | A member who joins shows the avatar, an arrow and the glyphs they pick up | Lightning to Afterglow, Marc not in Lightning | `04-...png`: "M" → bass. `data-transition-move="joins"`, children avatar, arrow, one glyph | PASS |
| 26 | Transition | When nobody keeps an instrument across the gap, as the setlist editor's risky flag says, the strip shows the warn icon and its "risky" label | Compare the strip with the setlist editor for each pair | Editor flags 02 to 03 and 03 to 04 as risky, the others not (`05-setlist-editor-risky-flags.png`). Scene strip shows the warn icon and "RISKY TRANSITION" on songs 02 and 03 (`01-...png`, `04-...png`) and nothing on song 01 (`17-...png`) | PASS |
| 27 | Transition | Once the reader scrolls to the end, the same content shows as a card below the last line, with the full note, and the strip hides | Scroll the chart to its end, on song 02 at 1280 px and at 375 px with a 213-character note | `02-card-at-chart-end-strip-hidden.png` and `08-card-375px-full-note.png`: the card under the last chart line holds the same title, key, risky flag, lineup and the whole note on five lines. The strip button is gone from the DOM | PASS |
| 28 | Transition | The strip shows only the start of the note | Song 02 at 375 px with the 213-character note | `07-strip-375px-note-truncated.png`: one line ending in an ellipsis. Note span `scrollWidth` 1233 against `clientWidth` 343, `text-overflow: ellipsis`, `white-space: nowrap`. Page `scrollWidth` 375 | PASS |
| 29 | Transition | Scrolling back up shows the strip again | From the end, `scrollTop` 700, 400, 0 | Strip absent at 700 (card still in view), present at 400 and 0. `03-strip-back-after-scroll-up.png` | PASS |
| 30 | Transition | The last song of the setlist has no strip and no card | Song 06, scrolled to its end | `06-last-song-no-strip-no-card.png`. Zero elements labelled "Show the transition..." | PASS |
| 31 | Edge: 375 px | Solo block and strip at phone width | Scene Mode at 375 x 812 | `16-solo-block-375px.png` and `07-...png`: frame, badge, notes and strip fit. Page `scrollWidth` 375 = `innerWidth` | PASS |
| 32 | Edge: dark scheme | Solo block on the song page under `prefers-color-scheme: dark` | `set media dark`, song page Chords tab | `14-song-page-solo-dark.png`: frame, badge and notes stay legible | PASS |

Broken-image scan: an empty array after each of the 17 screenshots.

## Notes

- Row 24, FAIL. The spec says a member who changes shows "the glyphs they put down, an arrow, and the glyphs they pick up", and a member who keeps an instrument shows "the avatar and that glyph". When a member keeps one instrument and drops or adds another, the strip shows everything they hold now, an arrow, then everything they hold next. Hugo from Slow Burn to Midnight Drive reads voice, drums → drums (`aria-label` "Hugo: Chant, Batterie → Batterie"). On stage that says he puts the drums down, and he does not. Léa reads guitar → voice, guitar ("Léa: Guitare → Chant, Guitare"). A member with the same set on both songs shows as "keeps" (row 22), and a full swap shows correctly (row 23). The seeded set hits this case three times on three pairs. The fix is either in the render (put down only what is released, pick up only what is new, and show the kept glyph without an arrow) or in the spec sentence, if before → after is the intended reading. That is a product call.
- Observation on rows 01 and 05, as in the 0906 run. The badge shows the member's own label, upper-cased ("GUITAR SOLO", "OUTRO SOLO 2"), not the word "Solo". From the second solo on it adds an ordinal, so "OUTRO SOLO 2" can read as a second outro solo when it is the first.
- Observation, outside the spec. A transition note written through the API did not reach Scene Mode after a reload. The persisted `pragma.query-cache` in `localStorage` served the old note and no `transition-comments` request left the page. Clearing that key showed the new note. A note edited on another member's phone may therefore show stale in Scene Mode until that cache expires. It is not tested further here.
- Row 29: the strip hides as soon as the card scrolls into view, not only at the very last pixel. At `scrollTop` 700 of 845 the card's top was in the viewport and the strip was gone.
- Row 27 at 1280 px on Lightning: the chart is short enough that the card is in view without scrolling, and the strip never shows (`12-...png`). That follows from the rule.
- Headless Chromium does not scroll from touch gestures. Rows 17 and 18 prove the song did not change, not that the chart or the tab scrolled.
- Out of scope, not tested: `[Solo]` and bare "Solo" lines, editing a note or a transition note from Scene Mode, and a member who plays the current song and not the next (Marc, Midnight Drive to Lightning, does show nothing in `01-...png`).

## Verdict: FAIL
