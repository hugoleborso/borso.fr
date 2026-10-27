# Notebook: a design system direction for pragma

## The idea

Pragma looks like the band's shared notebook: warm paper, blue ink for everything you can tap, and a pencil in the margin for what the band wrote. Song titles are set in a serif like a carefully written setlist, and the tools around them stay in a quiet, modern sans so the page never turns into a costume.

This direction keeps what pragma already owns (the paper `#f5f1e8`, the blue `#2d5fa0`, Geist) and gives it rules. Studio goes native and neutral, Backstage goes dark and album art first; Notebook goes editorial and warm.

## Files

| File | What it shows |
|---|---|
| `tokens.css` | The full Tailwind v4 `@theme static` block, light and dark through `light-dark()` |
| `specimen.png`, `specimen-dark.png` | Colour, type, every button, chips, badges, inputs, a song row, the tab bar, a bottom sheet |
| `add-songs-study.png` | Four places for "Add songs", side by side, with the pick |
| `screen-setlist.png`, `screen-setlist-dark.png` | Setlist, Songs tab, at 390 x 844 |
| `screen-lineup.png` | Lineup across all songs of the setlist |
| `screen-song.png` | Song page: listen, your part, chords above words |
| `contrast.txt` | Contrast of every text pair, light then dark, computed from the token values |
| `src/` | The static HTML, the component CSS and the build and render scripts |

## What it borrows, and from where

| Source | What exactly |
|---|---|
| A paper setlist taped to a monitor | Position numbers in the left margin, in old-style figures. A thin margin rule. Ruled lines between songs instead of cards |
| Apple Reminders | The "New Reminder" control: words and an icon in the accent colour, at the bottom of the list, with no fill and no border. This is the pick for "Add songs" |
| Apple Notes | Paper surfaces that step from sunk to raised by tone, not by borders and shadows |
| BandHelper and forScore (bench-musician, A1) | Add songs from a full height sheet, several at once, with the ones already in the set filtered out |
| OnSong, BandHelper, SongbookPro (bench-musician, C1) | Chords set above the words, in a monospaced face, so a pasted chord sheet looks like itself |
| Kindle and Apple Books highlights | A soft highlighter under text that changed for tonight, instead of a coloured badge or a coloured left border |
| Things 3 (bench-productivity, pattern 4) | One planning action in the thumb zone, and nothing floating over the content |

## Type

| Role | Face | Size / line | Weight | Used for |
|---|---|---|---|---|
| `display` | Newsreader | 30 / 34 | 520 | The page title, once per screen |
| `heading` | Newsreader | 22 / 28 | 520 | Section headings, sheet titles |
| `title` | Newsreader | 19 / 24 | 500 | A song or setlist name in a list |
| `body` | Geist | 16 / 24 | 400 | Running text, button labels at 15 or 16 |
| `meta` | Geist | 14 / 20 | 400 | Artist, dates, counts, hints |
| `label` | Geist | 12 / 16 | 550 | Tab labels, badges, column heads |

That is six sizes. Two styles reuse those sizes and add no new one: the **note** style (Newsreader italic, at `meta` or `body` size) for anything a band member wrote, and the **chord** style (Geist Mono 14, weight 600) for chord symbols only.

Sources and licences:

- **Newsreader**, by Production Type, commissioned by Google Fonts. SIL Open Font License 1.1. Self hosted from `@fontsource-variable/newsreader` 5.3.0 (`newsreader-latin-opsz-normal.woff2` and `-italic`, with weight and optical size axes). It replaces Instrument Serif because Instrument Serif has one weight and is drawn for large display sizes only; Newsreader has an optical size axis, so the same family stays crisp at 15 px in a transition note and at 30 px in a page title.
- **Geist**, by Vercel. SIL Open Font License 1.1. Already in pragma (`@fontsource-variable/geist` 5.3.0).
- **Geist Mono**, by Vercel. SIL Open Font License 1.1. `@fontsource-variable/geist-mono` 5.3.0. It replaces JetBrains Mono so the sans and the mono come from one family. Keeping JetBrains Mono is a fine cheaper choice.

## Colour

All values are in `tokens.css`. The short version:

- **Paper**: `paper` (the page), `leaf` (tab bar), `raised` (sheets, inputs, secondary buttons), `sunk`, plus `rule`, `rule-strong` and `margin` for lines.
- **Ink**: `ink`, `ink-soft`, `ink-faint`. The faint one still passes 4.5:1 on paper in both modes (5.00 light, 5.58 dark), so placeholders are readable.
- **Blue ink**: `accent` is the only colour for things you can tap. Light keeps today's `#2d5fa0`; dark is `#8db2e6`.
- **Annotation**: `pencil` (rust brown) for transitions, `highlight` and `on-highlight` for what changed tonight. These are never used on a control.
- **Status**: `good`, `warn`, `danger`, each with a soft tint for badges.
- **Members**: six colours, each passing 5:1 with `on-member` text.

Every text pair in `contrast.txt` passes 4.5:1 in both modes. The lowest is `ink-faint` on paper in light mode at 5.00.

## Rules

### Buttons

- Every button has an icon and a label. 44 px tall by default, 36 px inside dense rows, 52 px in a sheet footer. Corners are 10 px. The icon is 18 or 20 px, Lucide, 1.75 stroke.
- **Primary**: blue ink fill, paper coloured text, a one pixel highlight on top and a small shadow. One per screen at most, and most list screens have none.
- **Secondary**: raised paper with a hairline, ink text, the icon in blue. For a second choice next to a primary, like "Takes" next to "Play demo".
- **Quiet**: blue text and icon, no fill. This is the default for actions that belong to the screen. It shows a soft blue tint when pressed.
- **Destructive**: red text on a soft red tint. The solid red button exists only as the one primary inside a confirm sheet.
- **Icon only**: a 44 px square with no fill, for More, Close and Play. The name is always on the button as `aria-label`. When an icon button stands alone as a main control (Record, Listen, Share), it sits in a 48 px well with its name written under it.
- Pressed state moves the button down by one pixel and darkens it. Focus draws a 3 px blue ring 2 px outside. Disabled drops to 45% and loses its shadow.

### Icons

- Lucide only, at 1.75 stroke. 16 px next to `meta` text, 18 or 20 px in buttons, 24 px in the tab bar. The active tab icon goes up to 2.1 stroke.
- Brand marks (Deezer, Spotify) stay as today's `BrandLogo`. The bass glyph stays as today's `InstrumentGlyphs`, because Lucide has none.
- No text glyph ever stands in for an icon: no "×", no "+".

### Where actions go

- **Screen actions** (Add songs, Order on a setlist; New song in the catalogue) sit on one line of blue ink just above the tab bar: left aligned for the main one, right aligned for the second, no fill, no border. A 20 px fade of paper above it is the only separation. See `add-songs-study.png`.
- **Lists that can grow** end on a blank numbered line ("13, Add songs") that does the same thing. On an empty setlist it is the empty state.
- **Item actions** (edit a song, more actions) sit in the navigation bar as quiet buttons or an icon button.
- **Sheet actions** sit in the sheet footer as one primary, full width, at the bottom of the screen.
- Nothing floats over the content.

### Lists

- Rows sit directly on paper, separated by full width hairlines. No cards and no rounded boxes around a list.
- A setlist row has the position in the margin (Newsreader italic, old-style figures, faint ink), a thin margin rule, a 48 px cover with 3 px corners and a small print shadow, the title in Newsreader, the artist in Geist, and the lineup avatars on the right.
- An original song with no cover gets an ink tile with its initials in Newsreader italic, so every row still has a picture.
- Notes on an entry are ink italic with a note icon. Transitions are pencil italic with a corner arrow, placed under the song they leave. A lineup change for tonight is highlighted.
- Key and tonality are not shown on the setlist or the session.

### Sheets

- Every overlay is a native `<dialog>` opened as a modal from the bottom, on `raised` paper, with 20 px top corners, a grabber, a Newsreader title and a Close icon button.
- The sheet body is the only scroll area while it is open. The page behind does not scroll.
- Adding songs is one full height sheet: search, filter chips, rows with covers and check boxes, and "Add 3 songs" in the footer.

### Navigation

- Four tabs: Home, Sessions, Songs, Band. The active tab is blue ink with a heavier stroke and a darker label, with no pill behind it.
- The back link names where it goes ("Le Petit Bain"), in blue with a chevron.
- Inside a screen, sections are underlined text tabs with icons (Songs, Lineup, My part), not a pill segmented control. The Order screen holds the energy curve and is reached from the bottom line.
- One scroll container per screen.

### Chips and badges

- A **chip** is a choice: fully round, outlined, filled with ink when on, with a check icon.
- A **badge** is a state you read: 5 px corners, a soft tint, an icon, never tappable.

### Motion

`duration-fast` 120 ms for presses and hovers, `duration-base` 200 ms for tabs and highlights, `duration-slow` 320 ms for sheets, all on an exponential ease out. With reduced motion, everything is instant.

## The "Add songs" question

The operator found the old "Add songs" button ugly and the box around it worse. The study tries four placements with the same tokens:

- **A. In the navigation bar.** Clean, but at the top of the screen, which the audit already flags as hard to reach on today's headers.
- **B. The next blank line.** The most "notebook" of the four, but on a 20 song set it is out of sight until you scroll.
- **C. A floating ink button.** Always reachable, but it sits on top of a row's avatars whatever you scroll, and it is loud for an action you use in bursts.
- **D. A line of blue ink above the tabs.** Reachable with the thumb, and there is no box: two quiet buttons sit on the paper.

**Pick: D, with B as the end of the list.** D puts both planning actions where the thumb already is, as bench-productivity pattern 4 asks, and it removes the box instead of restyling it. B costs nothing more and gives the empty setlist its call to action. The price is 52 px of list height on the setlist and lineup screens.

## What it costs to migrate

The steps in `design-system/migration.md` still hold. Notebook changes them in these places:

1. **Colour tokens (step 1).** Same method: one `@theme static` block of `light-dark()` values, and the `@media (prefers-color-scheme: dark)` block goes. The names differ: `bg` becomes `paper`, `bg-elev` becomes `leaf` or `raised`, `bg-sunk` becomes `sunk`, `ink-900` becomes `ink`, `ink-500` becomes `ink-soft`, `ink-400` becomes `ink-faint`, `line` becomes `rule`. New: `margin`, `pencil`, `highlight`, `on-highlight`. The raw colour table in step 1 applies unchanged. The light accent does not move, so `manifest.webmanifest` and `index.html` keep `#2d5fa0`.
2. **Type (step 2).** Same six role sweep, plus a font swap: `@fontsource/instrument-serif` goes and `@fontsource-variable/newsreader` comes in. That is a new dependency, so it needs an ADR. Instrument Serif is used through `font-display` in 46 files today, all of them in italic; in Notebook titles become upright and italic is kept for the band's own notes. Each of those 46 files changes one class. Swapping JetBrains Mono for Geist Mono is optional.
3. **Buttons (step 3).** Same: `icon` becomes required, `IconButton` and `ButtonLink` arrive. Notebook adds the one pixel press and the blue icon on secondary buttons, which live in `button.variants.ts` only.
4. **Icons.** Today's `atoms/Icon.tsx` holds hand written paths. Notebook uses Lucide. Lucide is ISC licensed and already a dependency of `apps/talos`, but not of pragma. The cheaper path is to copy the needed Lucide path data into `Icon.tsx`, which keeps pragma's dependency list unchanged; taking `lucide-react` instead is an ADR.
5. **One Sheet (step 4).** Unchanged.
6. **Molecules (step 5).** Two changes. The `ActionBar` row becomes a lighter `BottomActions` molecule (two quiet buttons on paper, no surface), which replaces `BottomActionBar`, `StickyFormActions` and the two round buttons in `SetlistEditor`; forms keep their main button in a sheet footer instead. The `SegmentedControl` stays for filters, but the Songs, Lineup, My part switch becomes an underlined `SectionTabs` molecule. `ListRow` gains the margin numeral and the margin rule, which touches `SetlistEntryRow`, `PoolSongRow` and `StandingSongRow`.
7. **Shape (step 6).** Radii change from 4, 8, 14, 22 to 3 (covers), 6, 10, 16, 20 (sheets) and full. Every `rounded-md` button and input moves from 8 to 10 px; this is a token change, not a file sweep.
8. **New screens.** The lineup grid across songs is new work in any direction.

In short, against the first design system, Notebook adds one font swap and its ADR, a lighter bottom action molecule instead of `ActionBar`, and section tabs. Everything else is the same sweep.

## Weaknesses

- **Serif titles in lists cost width.** Newsreader at 19 px is wider than Geist at 17 px. Long titles truncate sooner ("Don't Stop Me No…" in the study), and in the lineup grid titles need two lines.
- **The margin column costs 44 px** on every setlist row. At 375 px wide, five avatars and a long title already compete.
- **Rust pencil and red danger are cousins.** They pass contrast and the pencil is always italic serif with an arrow, but a person with a red and green colour deficiency may read a transition as a warning. The shape cue has to carry it.
- **The bottom line of actions is easy to miss** because it has no fill. It relies on blue ink being reserved for things you can tap. If blue starts appearing as decoration, the line stops reading as buttons.
- **The lineup grid fits five members at 375 px.** A sixth member column pushes the song names down to about 110 px; past six, the grid needs a horizontal scroll on the member columns, which breaks the one scroll rule.
- **52 px of list height** goes to the bottom actions on the setlist and lineup screens.
- **Highlighter yellow is weak in dark mode.** It turns into olive (`#4a3f17`), which reads as "different" but not as "highlighted".
- **The paper metaphor can drift into kitsch.** The specimen stops at a margin rule, ruled lines in the note field and a highlighter. Torn edges, handwriting fonts and paper textures are out, and someone will need to say no to them later.
- **Two new things to host**: Newsreader and Geist Mono, 302 KB of WOFF2 for the latin subset (Newsreader upright and italic with both axes, plus Geist Mono), measured on the files in `fonts/`. Dropping the optical size axis or Geist Mono brings it down.
- The impeccable detector flags the ruled note field as "repeating gradient stripes". In this direction the ruling is deliberate, but it is used in one place only for that reason.

## What I could not prove

- Everything was rendered in headless Chromium at 390 x 844 and 1392 px wide. The setlist and lineup screens were also checked at 375 x 667 and fit without a horizontal scroll. Nothing was tried on an iPhone, and no touch was simulated.
- The contrast figures come from the token values, not from rendered pixels.
- The screens are static HTML, not the app. The lineup data, notes and lyrics are invented ("Slow Burn" is a made-up original, so no real lyrics are reproduced).
