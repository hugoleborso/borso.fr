# Visual validation — A solo stands out in Scene Mode and carries its notes

- Spec: [`../spec/spec.md`](../spec/spec.md)
- Dev URL: http://localhost:5174/
- Run at: 2026-11-19T14:26:06Z
- Tooling: agent-browser 0.41.2. Touch swipes were sent as CDP `Input.dispatchTouchEvent` (touchStart, ten touchMove 60 ms apart, touchEnd) at a 375 x 812 mobile viewport with touch emulation on, on the `phone` session's CDP port. The driver was a scratchpad script built on `scripts/browser/cdp-session.ts`, because `scripts/phone.sh drag` goes from one element to another and cannot hold a swipe to a set number of pixels.

Test data, all restored after the run:

- The charts of "Midnight Drive" (implicit `{comment: ...solo...}` cases) and "Lightning" (explicit `{start_of_solo}` cases) in the seeded setlist "Set principal" were replaced through `PUT /api/songs/:id`. Midnight Drive held `{comment: Solo}` inside a verse, then `{comment: Guitar Solo}` with two note comments, two chord rows, a blank line, `Am F#m Cmaj7 | x3 (guitar)` and `| [Dm] | [G] |`, two blank lines, a paragraph opening on `[C] [G]` followed by lyrics, `{c: Outro solo}` with the prose row "Cm7 Fm7 then the bridge chords", a lyric paragraph, `{comment: solo}` + `[F] [G]` + `{comment: Back to verse}`, `{comment: Keys solo}` + `[Dm] [G]` directly followed by `{start_of_chorus}`, and `{comment: Solo}` inside a chorus, a bridge and a `{start_of_tab}` block wider than the phone. Lightning held `{start_of_solo: Guitar solo}` with `{comment: Marc, 4 rounds}`, a chord row, `{comment: Last round half time}`, a chord row and `{end_of_solo}`, then an unlabelled `{start_of_solo}` ... `{end_of_solo}`. After the restore, both charts read back equal to the copy saved before the run.
- The transition note from Midnight Drive to Lightning was lengthened to 210 characters through `PUT /api/transition-comments/:a/:b`, then set back to "Léa annonce le titre pendant que Marc change de basse." Its `updatedAt` is now the restore time, not the seeded one.

Seeded lineups, read from `/api/songs`, which the transition rows are checked against:

| Song | Hugo | Léa | Marc | Sarah |
|---|---|---|---|---|
| 01 Slow Burn | drums, voice | guitar | bass | keys |
| 02 Midnight Drive | drums | guitar, voice | keys | bass |
| 03 Lightning | drums | voice | (none) | voice |
| 04 Afterglow | drums, voice | guitar, backing vocals | bass | keys, voice |

## Assertions

| # | From | Assertion | Action | Evidence | Verdict |
|---|---|---|---|---|---|
| 01 | Result | A solo renders as a framed block with a "Solo" badge, in Scene Mode | Scene Mode, song 02, scroll to the first solo | `./visual-validation-2026-11-19-1419/03-implicit-solo-block-scene.png`: left border, filled background, badge "GUITAR SOLO" | PASS |
| 02 | Result | ...and on the song page, since both use the same chart viewer | `/catalog/<Midnight Drive id>?tab=chords` | `./visual-validation-2026-11-19-1419/08-song-page-solo-block.png`: four framed blocks, "GUITAR SOLO", "OUTRO SOLO 2", "SOLO 3", "KEYS SOLO 4" | PASS |
| 03 | Result | The block holds the solo's chord rows | Same as 01 | `03-...png`: both `Am F C G` rows sit inside the frame | PASS |
| 04 | Result | Notes on the solo render inside the block in full-strength text, not dim italic | Computed style of notes against plain comments | Scene notes "Hugo takes it", "Two rounds", "Marc, 4 rounds", "Last round half time": `rgb(241,233,216)`, `normal`, 500. Plain "Back to verse": `rgb(184,174,154)`, `italic`, 400. Song page note `rgb(29,25,20)` `normal` against plain `rgb(92,83,72)` `italic` | PASS |
| 05 | Result, form 1 | `{comment: Solo}` (or `{c: Outro solo}`, any comment containing "solo") followed by chord rows makes a solo | `{comment: Guitar Solo}`, `{c: Outro solo}`, `{comment: solo}`, `{comment: Keys solo}` | `03-...png` and `04-implicit-solo-ends-outro-solo3-keys4.png`: four blocks | PASS |
| 06 | Result, form 1 | Any `{comment: ...}` directly under it, before the first chord row, is a note on the solo | Two comments under `{comment: Guitar Solo}` | `03-...png`: "Hugo takes it" and "Two rounds" inside the frame, above the chords | PASS |
| 07 | Result, form 2 | `{start_of_solo: Guitar solo}` ... `{end_of_solo}`, every `{comment: ...}` inside is a note | Scene Mode, song 03 (Lightning) | `06-explicit-solo-blocks-lightning.png`: "GUITAR SOLO" holds "Marc, 4 rounds", a chord row, "Last round half time" (after a chord row, still inside, full strength) and a chord row | PASS |
| 08 | Result, form 2 | `{start_of_solo}` without a label also makes a solo | Same page, DOM text of solo sections | Second block badged "SOLO 2" holding `E A` | PASS |
| 09 | Where the implicit solo ends | Ends at any directive after the first chord row (another comment) | `{comment: solo}` + `[F] [G]` + `{comment: Back to verse}` | `04-...png`: "SOLO 3" holds only `F G`, "Back to verse" is a dim italic line below the frame | PASS |
| 10 | Where the implicit solo ends | Ends at a section start | `{comment: Keys solo}` + `[Dm] [G]` + `{start_of_chorus}` with no blank line | `04-...png` and `05-...png`: "KEYS SOLO 4" holds only `Dm G`; the chorus is outside it | PASS |
| 11 | Where the implicit solo ends | Ends at a paragraph holding lyrics after a blank line, even when it opens on a chords-only row | Paragraph `[C] [G]` / `[C]Back to the [Am]lyrics now` | `03-...png`: the frame ends above `C G`; the lyric paragraph is outside | PASS |
| 12 | Where the implicit solo ends | Bar lines, `x3`, `(guitar)` and bare chord names such as `Am F#m Cmaj7` are not lyrics | Second paragraph `Am F#m Cmaj7 \| x3 (guitar)` / `\| [Dm] \| [G] \|` | `03-...png`: both rows stay inside "GUITAR SOLO" | PASS |
| 13 | Where the implicit solo ends | The first paragraph after the heading always belongs to the solo, even prose | `{c: Outro solo}` + "Cm7 Fm7 then the bridge chords" | `04-...png`: the prose is inside "OUTRO SOLO 2"; the next lyric paragraph is outside | PASS |
| 14 | Where the implicit solo ends | A solo drops its trailing blank lines, and every other section keeps its own | DOM measure of each solo `<section>` | Each solo's last child is its last content row, 8 px (its padding) above the frame's bottom, and the gap to the next block is 20 px for all four, including the first solo with two blank lines after it in the source. Plain paragraphs keep the larger blank-line gap (`03-...png` under "Driving all night") | PASS |
| 15 | Where the implicit solo ends | `{comment: Solo}` inside a chorus, verse, bridge or tab stays a plain comment line | `{comment: Solo}` in each of the four | `02-strip-midnight-drive-to-lightning.png` (verse) and `05-solo-comment-in-chorus-bridge-tab-plain.png` (chorus, bridge, tab): dim italic "Solo", no frame. Computed: all four `rgb(184,174,154)` `italic`, outside any solo frame | PASS |
| 16 | Swiping | A swipe to the left opens the next song, to the right the previous one | Touch swipe dx -120, then +120 | Slow Burn to Midnight Drive, then back (read of `h2` before and after) | PASS |
| 17 | Swiping | A swipe counts at 64 px sideways or more | dx -60, -63, -64, +64 | -60 and -63 held. -64 moved to Midnight Drive and +64 back | PASS |
| 18 | Swiping | ...and at 1.5 times as far sideways as down, so scrolling never changes the song | (dx, dy) = (-100, 70), (-100, -70), (-96, 64), (-100, 60), (+100, 60), (0, -200) | Ratio 1.43 held both ways. Ratio exactly 1.5 moved. Ratio 1.67 moved both ways. The vertical drag held | PASS |
| 19 | Swiping | A swipe that starts inside a tab block never changes the song | Midnight Drive at 375 px, tab `overflow-x-auto` box 835 px wide in 343 px. Swipes of -150 and +150 starting inside it (hit test `DIV.whitespace-pre` of the tab). Control: -150 from the bridge section at the same scroll position | `13-swipe-inside-tab-holds-375.png`. Both swipes inside the tab held on Midnight Drive. The control moved to Lightning | PASS |
| 20 | Swiping | The first and last songs hold, as with the arrow keys | +150 on song 01, -150 on song 06, control +150 on 06 | Slow Burn held on +150. Last Call held on -150 and moved to Runaway Sun on +150. ArrowRight on Last Call also held | PASS |
| 21 | Transition | A strip above the transport names the next song, its key, its lineup as icons and the start of the transition note | Scene Mode, song 02, 1280 x 900 | `02-strip-midnight-drive-to-lightning.png`: "THEN Lightning F#", lineup groups, the note, sitting on top of the transport | PASS |
| 22 | Transition | Each member shows as their avatar followed by instrument glyphs, never as words | Read each lineup `<li>` | Visible text of every `<li>` is only the avatar initial ("H", "L", "M", "S"). Instruments are SVG. Names live only in `aria-label` | PASS |
| 23 | Transition | A member who keeps an instrument shows the avatar and that glyph | Midnight Drive to Lightning, Hugo drums to drums | `02-...png`: "H" then the drum glyph, no arrow. `data-transition-move="keeps"` | PASS |
| 24 | Transition | A member who changes shows the avatar, the glyphs they keep, the glyphs they put down in a dimmer tone, an arrow, and the glyphs they pick up | Slow Burn to Midnight Drive and Lightning to Afterglow. Class of each SVG in order | Marc: dim bass, dim arrow, keys. Sarah (01 to 02): dim keys, arrow, bass. Hugo (01 to 02): drums full, dim voice, arrow. Léa (01 to 02): guitar full, arrow, voice. Léa (03 to 04): dim voice, arrow, backing vocals, guitar. `01-strip-slow-burn-to-midnight-drive.png`, `06-...png` | PASS |
| 25 | Transition | A glyph held on both songs is never drawn on either side of the arrow | Same pairs, kept instruments | Hugo's drums (01 to 02, 03 to 04), Léa's guitar (01 to 02), Léa's voice (02 to 03), Sarah's voice (03 to 04) each show once, full tone, before any dim glyph, and never after the arrow. `aria-label` reads e.g. "Hugo: Batterie (→ Chant)", "Léa: Chant (Guitare →)" | PASS |
| 26 | Transition | A member who joins shows the avatar, an arrow and the glyphs they pick up | Lightning to Afterglow, Marc not in Lightning | `06-...png`: "M" → bass. `data-transition-move="joins"`, SVGs: arrow, one glyph | PASS |
| 27 | Transition | When nobody keeps an instrument across the gap, as the setlist editor's risky flag says, the strip shows the warn icon and its "risky" label | Compare Scene strip with the setlist editor for each pair | Editor flags 02 to 03 and 03 to 04 (`07-setlist-editor-risky-flags.png`). Scene shows the warn icon and "RISKY TRANSITION" on songs 02 and 03 (`02-...png`, `06-...png`), none on 01, 04, 05 (page text read) | PASS |
| 28 | Transition | Once the reader scrolls to the end, the same content shows as a card below the last line, with the full note, and the strip hides | Scroll song 02 to its end at 1280 px and at 375 px with the 210-character note | `10-card-at-chart-end-strip-hidden.png` and `16-card-375-full-note.png`: card under "Final line here" with title, key, risky flag, lineup and the whole note on five lines. Zero strip buttons in the DOM | PASS |
| 29 | Transition | The strip shows the start of the note | Song 02 at 375 px with the 210-character note | `14-strip-375-note-truncated.png`: one line ending in an ellipsis. Note `scrollWidth` 1220 against `clientWidth` 343, `text-overflow: ellipsis`, `white-space: nowrap`. Page `scrollWidth` 375 | PASS |
| 30 | Transition | Scrolling back up shows the strip again | From the end (`scrollTop` 1815), set 1500, 1000, 600, 0 | Strip button present at each step. `11-strip-back-after-scroll-up.png` | PASS |
| 31 | Transition | The last song of the setlist has no strip and no card | Song 06, scrolled to its end | `12-last-song-no-strip-no-card.png`. Zero strip buttons, zero lineup items, no "THEN" text | PASS |
| 32 | Edge: 375 px | Solo block and strip at phone width | Scene Mode at 375 x 812 | `15-solo-block-375.png` and `14-...png`: frame, badge, notes and strip fit. Page `scrollWidth` 375 = `innerWidth` | PASS |
| 33 | Edge: dark scheme | Solo block on the song page under `prefers-color-scheme: dark` | `set media dark`, song page Chords tab | `09-song-page-solo-dark.png`: frame, badge and notes stay legible | PASS |

Broken-image scan: an empty array after each of the 16 screenshots.

## Notes

- Row 24 and 25 read the spec's change rule as: kept glyphs first in full tone, then put-down glyphs dimmed, then the arrow, then picked-up glyphs. The FAIL of the 1402 run (a kept glyph drawn on the put-down side) is gone. When a member only drops an instrument, the arrow stands with nothing after it (Hugo 01 to 02, Léa 02 to 03), which is what the sentence describes.
- Observation on rows 01 and 05, as in the earlier runs. The badge shows the member's own label, upper-cased ("GUITAR SOLO", "KEYS SOLO 4"), not the bare word "Solo". From the second solo on it adds an ordinal, so "OUTRO SOLO 2" can read as a second outro solo when it is the first.
- Rows 30 and 28: the strip hides once the card is in view, not only at the last pixel. On Lightning at 1280 px the card was not in view at the top, so the strip showed there.
- Headless Chromium does not scroll from touch gestures. Rows 18 and 19 prove the song did not change, not that the chart or the tab scrolled.
- `prefers-reduced-motion` was not tested. The spec makes no motion claim.
- Out of scope, not tested: `[Solo]` and bare "Solo" lines, editing a note or a transition note from Scene Mode. A member who plays the current song and not the next (Marc, Midnight Drive to Lightning) does show nothing in `02-...png`.

## Verdict: PASS
