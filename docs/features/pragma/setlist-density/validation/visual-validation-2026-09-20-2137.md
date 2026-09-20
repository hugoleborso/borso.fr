# Visual validation — See more songs on a phone, and who plays what, without opening anything

- Spec: [`../spec/spec.md`](../spec/spec.md)
- Dev URL: http://localhost:5174/ (setlist `Set principal`, `/setlists/d2948223-5904-4412-898c-5283c829f06c`)
- Run at: 2026-09-20T22:06:29+00:00
- Tooling: agent-browser 0.27.0 through `scripts/browser.sh`; real touch through `scripts/argent.sh`

Viewports driven: 360×780, 375×812, 1280×900, 1900×900, plus a phone-shaped
argent Chromium (500×641 CSS px, below `sm`) for real touch.

**Seeded data was changed and restored.** To exercise the overflow, cap,
override, empty-lineup, long-title and icon rows the run wrote through the API
and the admin UI: instrument icons and positions, three throwaway instruments
(`ZZ …`) with primary links on Hugo, a long title on *Afterglow*, entry
overrides and an entry energy, and *Slow Burn*'s default lineup. Every one was
restored at the end and re-read back: all five instruments are `icon=music`
with positions `0,1,1,1,2` and their original primaries, all six entries are
`energy=null, lineupOverride=null`, the six song titles and *Slow Burn*'s
default lineup match the seed, and the three `ZZ` instruments are deleted.

## Assertions

| # | From | Assertion | Action | Evidence | Verdict |
|---|---|---|---|---|---|
| 01 | Result | card height 54 px | measured the card element at 360 and 1280 | `getBoundingClientRect().height = 54` on every row; `./visual-validation-2026-09-20-2137/06-1280-row-anatomy.png` | PASS |
| 02 | Result | transition, held → 24 px | measured the seam in each `li` | seam heights `24` for held transitions (rows 02, 05) | PASS |
| 03 | Result | transition, risky → 36 px | same measurement | seam heights `36` for the two risky transitions | PASS |
| 04 | Result | per song 82 px | measured row-to-row pitch at 360 and 1280 | pitch `90` (held) / `102` (risky); 82 = card 54 + seam 24 + inner gap 4, without the 8 px list gap | PASS |
| 05 | Result | songs per screen at 375 px → 8.5 | measured pitch against the 812 px viewport | 812 / 90 = 9.0 full viewport, (812 − 71 px sticky energy graph) / 90 = 8.2 | PASS |
| 06 | Why (input metric) | at 375 px at least six songs are fully visible in the list region | scrolled the list under the sticky graph at 375×812, counted cards with `top ≥ 71 && bottom ≤ 812` | 6 of 6 seeded songs fully visible; `./visual-validation-2026-09-20-2137/24-375-seeded-default.png` | PASS |
| 07 | Why (input metric) | at 360 px the title is one line and truncates with an ellipsis, so the column keeps its 20 px | gave *Afterglow* a 60-character title, measured the title span and the column at 360 | `white-space: nowrap`, `text-overflow: ellipsis`, height 22 px = one line, `scrollWidth 399 > clientWidth 104`; column kept 4 slots of 19 px (17 px glyph); `./visual-validation-2026-09-20-2137/09-360-long-title-truncates.png` | PASS |
| 08 | Why (input metric) | from `sm` up the title has the whole row and truncates only at the edge | same long title at 1280 | title span 670 px wide, not truncated, artist · tonality on the second line; `./visual-validation-2026-09-20-2137/08-1280-long-title.png` | PASS |
| 09 | Why (input metric) | setting a song's energy from the list takes one gesture and survives a reload | pointer down on the meter, 96 px right, up; then reload | 4 → 7 during the drag, `PUT` persisted (`entries[5].energy = 7`), still 7 after reload; `./visual-validation-2026-09-20-2137/16-1280-energy-drag.png` | PASS |
| 10 | Why (input metric) | two consecutive songs whose lineup differs in one instrument show it in the same column position, with no text read | compared *Midnight Drive* and *Lightning* slot colours | Midnight Drive `Basse #3a6ee0, Clavier #b8841a, Guitare #2f8f6b, Batterie #e0533a`; Lightning `grey, grey, grey, #e0533a` at the identical positions; `./visual-validation-2026-09-20-2137/24-375-seeded-default.png` | PASS |
| 11 | Happy path 1 | a member opens a setlist on a phone and sees at least six songs | 375×812 and 360×780 passes | 6 of 6 fully visible in both; `./visual-validation-2026-09-20-2137/03-360-six-songs.png` | PASS |
| 12 | Happy path 2 | row carries, left to right: drag handle, album cover, position, title over artist and tonality, lineup column, energy meter, actions | read the row's children with their x offsets at 1280 | `271 Drag to reorder → 297 cover → 343 "01" → 365 title/artist·tonality → 1041 Lineup → 1123 Energy → 1207 Actions`; `./visual-validation-2026-09-20-2137/06-1280-row-anatomy.png` | PASS |
| 13 | Happy path 3 | one fixed slot per instrument, always in the same order, tinted with the holder's colour | listed slot titles + computed colour for all six rows | identical order `Basse, Clavier, Guitare, Batterie` on every row; colours equal the holders' member colours | PASS |
| 14 | Happy path 4 | scanning down a column shows where an instrument changes hands | same matrix, seeded data | Clavier column: yellow, yellow, grey, yellow, grey, yellow down the set — the grey rows are the songs Sarah is not on keys for | PASS |
| 15 | Happy path 5 | pressing the lineup column opens the existing lineup editor | clicked it (agent-browser) and tapped it (argent real touch) | dialog *Lineup for this entry* opens on both; `./visual-validation-2026-09-20-2137/11-1280-lineup-editor.png`, `./visual-validation-2026-09-20-2137/21-360-touch-lineup-editor.png` | PASS |
| 16 | Happy path 6 | pressing the energy meter and sliding sideways sets the level; releasing commits | pointer down/move/up across the widget bound | see row 09; value follows the pointer past the widget's right edge and commits on release | PASS |
| 17 | Happy path 6 (touch) | the same slide, driven as a real touch gesture | argent `gesture-custom` / `gesture-swipe` on Chromium | *"Tool 'gesture-custom' is not supported on chromium app"*; a real `gesture-tap` on the meter changed nothing (value stayed 3, no write) | UNVERIFIABLE |
| 18 | Edge case | too narrow for every slot: slots drop from the right of the fixed order, `+N` names them, budget from the measured width | added three primary instruments, then read the column at 360 and at 1280/1900 | at 360: 4 glyphs + `+3` whose `title` reads `ZZ Violon, Batterie, ZZ Trompette` (dropped right-most first), budget = 4 × 19 + 28 = column's 104 px; `./visual-validation-2026-09-20-2137/10-360-overflow-plus-n.png` | PASS |
| 19 | Edge case | a title longer than the row: one line below `sm`, column keeps its 20 px | see rows 07 / 08 | card stayed 54 px, column kept all four 19 px slots | PASS |
| 20 | Edge case | a song with no lineup at all: grey surface, every slot in the empty tint | cleared *Slow Burn*'s `defaultLineup` through the API | card `bg-bg-sunk` (`rgb(235,229,216)`), all four slots `rgb(180,172,159)`; `./visual-validation-2026-09-20-2137/15-1280-song-no-lineup-grey.png` | PASS |
| 21 | Edge case | the entry overrides the song's default lineup: yellow surface, no override badge on the card | added Marc's Clavier through the editor | card `bg-warn-soft` + `border-warn` (`rgba(184,132,26,0.14)` / `rgb(184,132,26)`), no badge in the row; `./visual-validation-2026-09-20-2137/12-1280-override-yellow-two-slots.png`, `./visual-validation-2026-09-20-2137/14-1280-tones-plain-yellow-grey.png` | PASS |
| 22 | Edge case | an override that empties the lineup: grey wins over yellow | wrote `{every member: []}` on the *Last Call* entry | card `bg-bg-sunk`, all slots grey, no yellow; `./visual-validation-2026-09-20-2137/14-1280-tones-plain-yellow-grey.png` (row 06) | PASS |
| 23 | Edge case | more primary instruments than slots: the column caps at members + 2 | 7 primary instruments, 4 members, read at 1280 and 1900 | 6 glyphs + `+1` at both widths, so the drop is the cap and not the width | PASS |
| 24 | Edge case | an instrument with no icon renders the fallback glyph and still holds its slot | the seeded state — every instrument is `icon=music` | four slots, all the Lucide `music` path `M9 18V5l12-2v13`, positions held; `./visual-validation-2026-09-20-2137/24-375-seeded-default.png` | PASS |
| 25 | Edge case | a member holding two instruments tints both slots | gave Marc Basse + Clavier on one entry | both slots `rgb(58,110,224)` (Marc); `./visual-validation-2026-09-20-2137/12-1280-override-yellow-two-slots.png` | PASS |
| 26 | Error case | a rejected energy write leaves the row at its previous value and surfaces the existing failure line | `network route … --abort` on the entries endpoint, then dragged the meter | value snapped back to 7, one line *"The change was not saved. Check the connection and try again."*, no new surface; `./visual-validation-2026-09-20-2137/17-1280-rejected-write.png` | PASS |
| 27 | Error case | same for a rejected lineup write | saved a lineup change with the route still aborted | row kept its previous slots and tone, same single failure line; `./visual-validation-2026-09-20-2137/18-1280-rejected-lineup-write.png` | PASS |
| 28 | Q.O.D. energy control | volume meter: 32 px of travel is one level, pointer captured past the widget, 82 px control with a 44 px target | measured the widget, then a 96 px drag | widget 78 × 44 px; +96 px = +3 levels exactly; the pointer finished 57 px outside the right edge and the value still tracked | PASS |
| 29 | Q.O.D. transitions | seam: held is a 24 px hairline carrying the carriers, risky keeps a 36 px band with its note | measured both kinds | 24 px seams carry the member initials, 36 px bands carry *RISKY TRANSITION* + the note; `./visual-validation-2026-09-20-2137/06-1280-row-anatomy.png` | PASS |
| 30 | Q.O.D. column position | inline at 17 px, compressible; below `sm` it takes the artist line's place under the title | measured the glyph and compared 360 vs 1280 | glyph 17 × 17 px in a 19 px slot; below `sm` the artist and tonality are absent and the column sits under the title; above `sm` it is inline before the meter | PASS |
| 31 | Q.O.D. slot marks | icons, not three-letter codes or chips | read the column's DOM at 17 px | every slot is an inline `svg`, no text node except the `+N` marker; `./visual-validation-2026-09-20-2137/07-1280-slot-icons-closeup.png` | PASS |
| 32 | Q.O.D. icon source | Lucide first, one generated bass | set the five instruments to `mic-vocal / guitar / bass / piano / drum` through the picker and read the rendered paths | five distinct glyphs render (`bass` 6 shapes, `piano` 6, `guitar` 4, `drum` 7, `music` 3) and the picker shows all six; the *provenance* of the path data is not observable in a browser | UNVERIFIABLE |
| 33 | Q.O.D. bass drawing | parametric construction, fretboard edges exactly parallel | inspected the rendered bass glyph at 17 px and at picker size | a bass-shaped glyph renders and is distinct from the guitar; edge parallelism is not judgeable from the render at this size | UNVERIFIABLE |
| 34 | Q.O.D. ordering | the column order comes from a stored position, not a front-end table | reversed the order through `PUT /api/instruments/order`, reloaded | every row's column flipped to `Batterie, Guitare, Clavier, Basse` in lockstep; `./visual-validation-2026-09-20-2137/23-1280-stored-order-reversed.png` | PASS |
| 35 | Q.O.D. which instruments | the primary ones, capped at members plus two | seeded state + the 7-primary state | `Chant` is played by three members but primary for none and gets no slot; the cap is row 23 | PASS |
| 36 | Q.O.D. slot budget | from the width the column actually has, not a breakpoint constant | compared 360 (104 px → 4 + `+3`) with 1280/1900 (136 px → 6 + `+1`) | the count tracks the measured width; the `sm`-only column, hidden at 360, measures 0 px and reports `+4` | PASS |
| 37 | Q.O.D. override reading | tint on the card, badge stays in the editor | opened the editor on an overridden entry | header shows the `⚠ OVERRIDE` badge while the card behind carries only the yellow tint; `./visual-validation-2026-09-20-2137/25-1280-editor-override-badge.png` | PASS |
| 38 | Edge walk | `prefers-color-scheme: dark` | `set media dark`, reloaded at 360 | `matchMedia` true, body `rgb(22,19,15)`; slot tints, the yellow override border and the grey unstaffed card all still separate; `./visual-validation-2026-09-20-2137/19-360-dark-mode.png` | PASS |
| 39 | Edge walk | `prefers-reduced-motion: reduce` | `set media reduced-motion`, reloaded at 360 | `matchMedia` true; the list renders identically, the only transition on a card is `0.15s` on colour; `./visual-validation-2026-09-20-2137/20-360-reduced-motion.png` | PASS |
| 40 | Standard | pixel-content check on every screenshot | ran the broken-`img` scan after each capture | `[]` every time — the rows use inline `svg` and text initials, the page has no `<img>`; `errors` reported no console errors | PASS |

## Notes

- **Row 17 (UNVERIFIABLE).** argent's Chromium transport exposes `gesture-tap`
  only; `gesture-custom` answers *"not supported on chromium app"* and
  `gesture-swipe` is documented as a no-op there, while `gesture-drag` is a
  mouse drag. So the energy slide could not be driven as a real touch gesture.
  What was checked under real touch: a tap on the meter is inert (value stayed
  3, no `PUT` fired), and a tap on the lineup column opens the editor. The
  slide itself is asserted only by pointer drive, which is the method the
  spec's own test strategy names.
- **Rows 32 and 33 (UNVERIFIABLE).** Where the glyphs come from (Lucide ISC
  path data copied into the registry) and how the bass was constructed
  (parametric, parallel edges) are claims about the source, not about the
  render. The browser can say the five glyphs are distinct, legible enough to
  tell apart at 17 px, and reachable from the picker — it cannot say who drew
  them. `docs/knowledge/instrument-icon-provenance.md` is the artefact for that
  and belongs to `/technical-validation`.
- **Seeded databases show four identical glyphs.** The migration defaults
  `instrument.icon` to `'music'` and backfills only `position`, so on the seed
  every slot renders the fallback note and the column distinguishes instruments
  by colour and position alone until someone picks icons on the instruments
  page (`./visual-validation-2026-09-20-2137/24-375-seeded-default.png` versus
  `./visual-validation-2026-09-20-2137/06-1280-row-anatomy.png`, the same list
  after the icons were set). This matches the spec's own text — the edge case
  "an instrument has no icon chosen yet" is the day-one state for every
  instrument — but it is worth knowing that the feature's headline reads as
  four music notes until the band edits its instruments.
- **Row 22 works, but the state is not reachable from the editor.** Saving the
  lineup editor with nothing selected does not store an empty override: it
  clears the override to `null` and the row falls back to the song default and
  the plain surface (verified: `entries[5].lineupOverride` became `null`,
  `./visual-validation-2026-09-20-2137/13-1280-empty-selection-clears-override.png`).
  An override of `{}` sent straight to the API is treated the same way. The
  grey-wins-over-yellow rendering is correct once the state exists — it was
  produced by writing `{member: []}` for each member — so a band that wants to
  mark "nobody plays this one tonight" has no way to say it from this screen.
- **Row 18, what `+N` names.** The marker's names live in a `title` attribute
  (`ZZ Violon, Batterie, ZZ Trompette`). That is a hover tooltip: on the phone,
  which is the viewport where the marker appears, the dropped instruments are
  not readable. The marker itself is present and correct.
- **Row 18 evidence used synthetic data.** Four primary instruments never
  overflow the seeded column, so three throwaway instruments (`ZZ Trompette`,
  `ZZ Violon`, `ZZ Banjo`) were created and marked primary to force both the
  cap and the width overflow. They were deleted afterwards.
- **Row 05, the sticky energy graph.** The list scrolls under a 71 px sticky
  curve, so the honest "songs per screen" at 375 px is 8.2 below it and 9.0 if
  the whole viewport counts; the spec's 8.5 sits between the two. From the top
  of the page, before any scroll, the header pushes the first card to y=432 and
  four songs are visible — the six-song claim is about the list region, which
  is how it was measured here.

## Verdict: PASS_EXCEPT_UNVERIFIABLE
