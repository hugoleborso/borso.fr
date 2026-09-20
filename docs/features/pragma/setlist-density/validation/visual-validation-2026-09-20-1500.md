# Visual validation — See more songs on a phone, and who plays what, without opening anything

- Spec: [`../spec/spec.md`](../spec/spec.md)
- Dev URL: http://localhost:5174/
- Run at: 2026-09-20T19:39:44Z
- Tooling: agent-browser 0.27.0 (via `scripts/browser.sh`), plus `scripts/argent.sh` for the two touch rows

Widths driven: **360 × 780** and **1280 × 900** (the two the spec's test strategy names), plus **375 × 812** for the
input metric that names that width and for the argent phone. Every number below is measured from the live DOM
(`getBoundingClientRect`, `getComputedStyle`), not judged by eye.

The seeded setlist holds exactly six songs, four members and five instruments, of which four have a primary player.
Three rows needed a data state the seed does not contain (a fifth and a seventh primary instrument, an emptied
override, a twenty-character title); each was produced through the application's own UI or its own API, measured,
and then reverted. The seed was verified restored at the end of the run: all instrument icons back to `music`,
`Chant` back to no primary player, both scratch instruments deleted, every entry back to `energy: null` /
`lineupOverride: null`, `Last Call` back to its name.

## Assertions

| # | From | Assertion | Action | Evidence | Verdict |
|---|---|---|---|---|---|
| 01 | Result | card height 54 px | Measured the card box at 360, 375 and 1280 | `height = 54` at all three widths; `./visual-validation-2026-09-20-1500/03-1280-row-anatomy.png` | PASS |
| 02 | Result | transition, held: 24 px | Measured the held seam element | `height = 24` | PASS |
| 03 | Result | transition, risky: 36 px | Measured the risky seam element | `height = 36` | PASS |
| 04 | Result | per song 82 px | Measured each `li` (seam + card) | held-seam song = 82, risky-seam song = 94; list pitch including the 8 px `gap-2` is 90 / 102 | PASS |
| 05 | Result | songs per screen at 375 px: 8.5 | Measured pitch and the unobstructed list window at 375 × 812 | 812 / 90 = **9.0** by raw pitch; the window left by the sticky energy curve (71 px) and the two fixed bottom bars (117 px) is 624 px → **6.9** songs | UNVERIFIABLE |
| 06 | Result | Reference renders live beside this spec under `design/` | `ls docs/features/pragma/setlist-density/design/` | `No such file or directory` | FAIL |
| 07 | Why (input metric) | At 375 px, at least six songs are fully visible in the list region | Opened at 375 × 812, scrolled the list under the sticky header, counted cards wholly inside the unobstructed window | 6 of 6 fully visible, occupying 528 of 624 px; `./visual-validation-2026-09-20-1500/01-375-list-region.png` | PASS |
| 08 | Why (input metric) | At 360 px, the song title is not truncated on a card whose title is at most twenty characters | Renamed a song to `Last Call At The Bar` (20 chars) through the API, measured at 360 | `scrollWidth == clientWidth`, `scrollHeight == clientHeight`, wraps to two lines, card still 54 px; `./visual-validation-2026-09-20-1500/17-360-long-title-clips-column.png` | PASS |
| 09 | Why (input metric) | Setting a song's energy from the list takes one gesture and the value survives a reload | One pointer press-drag-release on the meter, then reload | 3 → 7 in one gesture; after reload `aria-valuenow = 7`; `./visual-validation-2026-09-20-1500/07-energy-after-drag.png`, `./visual-validation-2026-09-20-1500/07-energy-after-reload.png` | PASS |
| 10 | Why (input metric) | Two consecutive songs whose lineup differs in one instrument show that difference in the same column position, with no text read | Compared computed slot colours row by row | Rows 04 → 05 differ only at column 2 (`Clavier`: `rgb(184,132,26)` → `rgb(180,172,159)`); with an override giving Hugo the bass, rows 01 → 02 differ only at column 1 (`rgb(224,83,58)` → `rgb(58,110,224)`); `./visual-validation-2026-09-20-1500/04-override-yellow-and-two-slots.png` | PASS |
| 11 | Happy path 1 | A member opens a setlist on a phone and sees at least six songs | Loaded at 375 × 812 and counted before any scroll, then after scrolling to the list | 3 cards fully visible above the floating action bar on arrival; 6 after scrolling ~350 px; `./visual-validation-2026-09-20-1500/01-375-page-top.png` vs `./visual-validation-2026-09-20-1500/01-375-list-region.png` | PASS |
| 12 | Happy path 2 | Each row carries, left to right: drag handle, album cover, position, title over artist and tonality, the lineup column, the energy meter, the actions button | Read the left edge of every child of the row at 1280 and at 360 | 1280: x = 271, 297, 343, 365, 1037, 1123, 1207 — exactly the stated order. 360/375: the artist-and-tonality line is `display:none` and the lineup column sits **below** the title inside the title block (x = 111, y = 27) rather than between the title and the meter | FAIL |
| 13 | Happy path 3 | The lineup column shows one fixed slot per instrument, always in the same order, each slot tinted with the colour of the member holding it | Read every slot's `title` and computed colour on all six rows | Identical order on every row (`Basse, Clavier, Guitare, Batterie`; `Chant` joins at the front once primary), one 19 px slot each, holder colours `rgb(58,110,224)` / `rgb(184,132,26)` / `rgb(47,143,107)` / `rgb(224,83,58)`, unheld `rgb(180,172,159)`; `./visual-validation-2026-09-20-1500/09-1280-icons-five-slots.png` | PASS |
| 14 | Happy path 4 | Scanning down a column shows where an instrument changes hands | Compared column 1 across rows after moving the bass from Marc to Hugo | Column 1 reads blue, blue, grey, blue, blue, blue before; red, blue, grey, blue, blue, blue after — the change is a colour change at a fixed x; `./visual-validation-2026-09-20-1500/04-override-yellow-and-two-slots.png` | PASS |
| 15 | Happy path 5 | Pressing the lineup column opens the existing lineup editor | Real touch tap at (0.302, 0.690) through `scripts/argent.sh` on a 375 × 812 Chromium | `Lineup for this entry` dialog opened; `./visual-validation-2026-09-20-1500/15-touch-lineup-editor.png` | PASS |
| 16 | Happy path 6 | Pressing the energy meter and sliding sideways sets the level; releasing commits it | Pointer press-drag-release, sampling `aria-valuenow` every few pixels of travel | 8 → 16 px: +1; then one level per 32 px (64 px → 5, 96 px → 6, 128 px → 7); value held on release and after reload | PASS |
| 17 | Happy path 6 (touch) | The same press-and-slide, sent as touch | `scripts/argent.sh` — real touch tap landed on the meter (focused it, value unchanged at 3), but a real touch **drag** is not available: `gesture-swipe` is unsupported on Chromium and `gesture-drag` sends mouse input | `gesture-drag` in the 375 px window moved 3 → 6; `./visual-validation-2026-09-20-1500/16-touch-energy-drag.png` | UNVERIFIABLE |
| 18 | Edge case | The viewport is too narrow for every slot — the column drops slots from the right of the fixed order and shows a `+N` marker | Made `Chant` primary (5 primary instruments), measured at 360 | 4 slots rendered (`Chant, Basse, Clavier, Guitare`) plus a `+1` marker whose `title` is `Batterie`, the dropped one; title untruncated; `./visual-validation-2026-09-20-1500/10-360-column-yields.png` | PASS |
| 19 | Edge case | The title never truncates to feed the column | 20-character title at 360, measured the title box and the column box | Title intact over two lines, but the column is then pushed to y 950–970 while the card ends at y 955, inside a `overflow:hidden` 44 px block — the whole column disappears with no `+N`; `./visual-validation-2026-09-20-1500/17-360-long-title-clips-column.png` | FAIL |
| 20 | Edge case | A song has no lineup at all — the card takes the grey surface and every slot renders in the empty tint | Cleared `Last Call`'s default lineup through its own editor | `background: rgb(235,229,216)` (vs `rgb(251,247,239)` plain), all seven slots `rgb(180,172,159)`; `./visual-validation-2026-09-20-1500/12-1280-song-without-lineup-grey.png` | PASS |
| 21 | Edge case | The entry overrides the song's default lineup — the card takes the yellow surface; the override badge that used to sit on the card is gone | Moved the bass from Marc to Hugo on entry 1 through the lineup editor | `background: rgba(184,132,26,0.14)`, `border: rgb(184,132,26)`; card text is `SB 01 Slow Burn The Embers · Am 3` — no badge; `./visual-validation-2026-09-20-1500/04-override-yellow-and-two-slots.png` | PASS |
| 22 | Edge case | An override empties the lineup — grey wins over yellow | Deselected every instrument in the editor and saved; then injected each shape of "emptied override" through the API | Editor save → `lineupOverride: null`, card back to plain. API `{}` → **yellow**, showing the song's own lineup. API `{m1:[],…,m4:[]}` → grey, all slots empty. `./visual-validation-2026-09-20-1500/06-editor-empty-save-reverts-to-plain.png`, `./visual-validation-2026-09-20-1500/13-1280-empty-override-grey-wins.png` | FAIL |
| 23 | Edge case | The band declares more primary instruments than slots — the column caps at the number of members plus two | Created two instruments, gave each a player and marked them primary (7 primary, 4 members), measured at 1280 | 6 slots rendered + `+1` titled `Saxophone`; `./visual-validation-2026-09-20-1500/11-1280-cap-members-plus-two.png` | PASS |
| 24 | Edge case | An instrument has no icon chosen yet — it renders with the fallback glyph and still holds its slot | Created `Percussions` without touching the icon picker | Slot present, 19 px wide, glyph `M9 18V5l12-2v13 …` (the generic note), tinted with its holder's colour | PASS |
| 25 | Edge case | A member holds two instruments on one song — both slots tint with that member's colour | Gave Hugo `Basse` alongside his `Batterie` | Column 1 and column 4 both `rgb(224,83,58)`; `./visual-validation-2026-09-20-1500/04-override-yellow-and-two-slots.png` | PASS |
| 26 | Error case | A write to energy or lineup that the server rejects leaves the row at its previous value and surfaces the existing failure line. No new error surface | `agent-browser network route "**/api/setlists/**" --abort`, then an energy drag and a lineup save | Energy stayed at 9, lineup slots byte-identical before and after; one `role="alert"` line, `The change was not saved. Check the connection and try again.`, above the list; no toast, no per-row surface; `./visual-validation-2026-09-20-1500/14-1280-rejected-write.png` | PASS |
| 27 | Q.O.D. — energy control | Volume meter: 32 px of travel is one level, the pointer stays captured past the widget bounds, an 82 px control resolves ten levels with a 44 px target | Measured the control and sampled the drag | One level per 32 px ✓; tracking continued to x = 1290 with the widget ending at x = 1201 and the viewport at 1280 ✓; target `44 px` tall ✓; control is **78 px** wide, not 82; `aria-valuemin=1`, `aria-valuemax=10` ✓ | PASS |
| 28 | Q.O.D. — transitions | Seam: a held transition is a 24 px hairline carrying the carriers; a risky one keeps a readable 36 px band with its note | Measured both seam kinds and read their content | Held = 24 px, carrying the carrier avatars (L M H); risky = 36 px, carrying `RISKY TRANSITION`, two avatars and the note text; `./visual-validation-2026-09-20-1500/03-1280-row-anatomy.png` | PASS |
| 29 | Q.O.D. — column placement | Inline at 17 px, compressible; a second row was refused because the card may not grow; dropping the cover was refused | Measured icon size, card height and column placement at 360, 375, 1280 | Icons `17 × 17` ✓; card 54 px at every width and with every title ✓; the 40 × 40 cover is present at every width ✓; but below 640 px the column is **not inline** — it renders on a second line under the title (see row 12) | FAIL |
| 30 | Q.O.D. — slot marking | Icons, not codes or chips | Read every rendered slot | Every slot is an `<svg>`; no three-letter codes, chips or emoji anywhere in the column | PASS |
| 31 | Q.O.D. — icon set | Lucide first, one generated bass | Read the six glyphs the instruments page offers | Six distinct paths: `mic-vocal`, `guitar`, `bass`, `piano`, `drum`, `music`; the bass path is decimal-coordinate parametric geometry unlike the other five; `./visual-validation-2026-09-20-1500/08-instruments-page.png` | PASS |
| 32 | Q.O.D. — bass construction | Parametric, with both fretboard edges exactly parallel by construction | Rendered the bass at its largest UI size (22 px in the picker) | Not measurable from a 17–22 px raster; a geometric claim about path data is outside a browser check | UNVERIFIABLE |
| 33 | Q.O.D. — column order | A stored position, not alphabetical and not a front-end table | Set `Chant` (position 0) primary and re-read the column; created `Saxophone` (position 3) | Order follows position then name: `Chant(0), Basse(1), Clavier(1), Guitare(1), Batterie(2), Percussions(2), Saxophone(3)` — not alphabetical | PASS |
| 34 | Q.O.D. — which instruments | The primary ones, capped at members plus two | Compared the column before and after marking `Chant` primary | `Chant` had three players and no primary, and held no slot; marking one player primary gave it the leading slot. Cap verified in row 23 | PASS |
| 35 | Q.O.D. — override reading | Grey for no lineup, yellow for an override; the badge remains in the editor | Opened the lineup editor on an overridden entry and searched it for a badge | Tints correct (rows 20, 21). The editor shows no override marker at all — same dialog, same `Reset to song default` button, as a non-overridden entry; no element carries the warn colour; `./visual-validation-2026-09-20-1500/18-override-editor-no-badge.png` | FAIL |
| 36 | Whole run | Pixel-content check — no `<img>` rendering its `alt` instead of the image | Ran the broken-image scan after every screenshot | Empty result every time; the page contains **zero** `<img>` elements — album covers are initial-letter placeholder spans, so the scan is clean but vacuous | PASS |

## Notes

- **05 — songs per screen at 375 px.** The claim gives no viewport height and does not say whether the application
  chrome counts. At 375 × 812 the two readings I can take are 9.0 (viewport height over the 90 px held-seam pitch)
  and 6.9 (the 624 px left between the sticky energy curve and the fixed `Copy order / Add song` bar over the same
  pitch). 8.5 falls between them and matches neither. The density improvement itself is real and is measured
  exactly in rows 01–04; only this derived figure is unreproducible.
- **06 — `design/` does not exist.** `docs/features/pragma/setlist-density/design/` is absent from the checkout, so
  the spec's "Reference renders live beside this spec under `design/`" resolves to nothing. Nothing in the running
  app depends on it; it is a broken pointer in the spec.
- **12 / 29 — the column is not inline at phone width.** At 1280 the row is exactly the order the spec writes. Below
  the `sm` breakpoint (640 px) the inline column is `display:none` and a second copy renders inside the title block,
  on the line under the title, while the artist-and-tonality line is hidden. The card does not grow — it stays 54 px
  — so the "the card may not grow" half of the decision holds; the "inline" and "a second row was refused" halves do
  not, at the two phone widths the spec's test strategy names. This is also the mechanism behind row 19.
- **17 — real touch drag is not available.** `scripts/argent.sh` sends genuine touch taps, and the tap on the energy
  meter landed (it focused the control and, correctly for a relative meter, did not jump the value). It cannot send a
  touch *drag*: `gesture-swipe` is unsupported on Chromium and `gesture-drag` dispatches mouse input. So "press and
  slide" is proven for pointer input only. The spec's own test strategy asks for pointer drive plus a reload, which
  row 16 satisfies; this row records the gap rather than papering over it.
- **19 — a two-line title deletes the column instead of shrinking it.** At 360 px a twenty-character title
  (`Last Call At The Bar`, spaces, nothing exotic) wraps to two lines, filling the title block's 44 px. The lineup
  column, which lives inside that block below the title, is pushed to y 950–970 while the card ends at 955 and the
  block clips at 44 px — so it vanishes entirely, with no `+N` and no warning. The spec's rule is that the column
  yields *before* the title and announces what it dropped; here the title wins by erasing the column silently. Any
  title over roughly fourteen characters triggers this at 360 px.
- **22 — the emptied override is both unreachable and mis-tinted.** Deselecting every instrument in the lineup
  editor and pressing `Save` writes `lineupOverride: null`, i.e. it is indistinguishable from `Reset to song
  default`: the row reverts to the song's own lineup and the plain surface. So a user cannot create "a set nobody
  plays" from the setlist screen at all. Injecting the two data shapes that could represent it shows the rule is
  only half implemented: `{}` renders **yellow while displaying the song's default lineup** (the override is counted
  for the tint but merges to nothing for the slots), and only a per-member `{m1:[],m2:[],m3:[],m4:[]}` produces the
  grey the spec asks for. The pure tone rule is right; what reaches it is not.
- **35 — no override badge survives in the editor.** The decision traded the on-card badge for a tint and paid for
  it with "the badge remains in the editor", which is the accessibility mitigation for the colourblind reader the
  same row names. The editor carries no such marker: an overridden entry and a plain one open the same dialog with
  the same controls, and `Reset to song default` is present on both, so it does not stand in for the badge either.
- **Seeded icons.** Every seeded instrument carries `icon = 'music'`, so on a fresh database all four slots render
  the same generic note and the column says *who* plays without saying *what* — the second half of the problem the
  spec opens with. That matches the migration as specified (`DEFAULT 'music'`, with no icon seeding) and the picker
  on the instruments page works, so it is not scored as a failure; but the feature's visible payoff does not exist
  until someone edits five instruments by hand.

## Verdict: FAIL
