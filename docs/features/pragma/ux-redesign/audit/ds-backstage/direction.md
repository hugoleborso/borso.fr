# Backstage: a design system direction for pragma

## The idea

The chrome is quiet and near black, and the album covers carry the colour, the way a music app shows your library. One electric yellow green, called volt, marks the single thing to do next on each screen, and nothing else in the interface uses it.

Dark is the default because the band opens pragma in rehearsal rooms and on stage, where a white screen is the brightest thing in the room. Light mode keeps the same type, the same pills and the same volt, so it reads as the same product in daylight.

## Files in this folder

| File | What it is |
|---|---|
| `tokens.css` | The full Tailwind v4 `@theme static` block: colours for light and dark (as `light-dark()`), six type sizes, spacing, radii, elevation, motion |
| `specimen.png`, `specimen-dark.png` | Colour, type, every button, chips, badges, inputs, song rows, the tab bar and a bottom sheet |
| `add-songs-study.png` | Four treatments of the Add songs action, side by side, with the pick |
| `screen-setlist.png`, `screen-setlist-dark.png` | The setlist, Songs view, at 390x844 |
| `screen-lineup.png` | The setlist, Lineup view |
| `screen-song.png` | The song page: listen, takes, your part, chords above words |
| `src/` | The HTML sources. `build/build.py` turns `tokens.css` into plain CSS and inlines the icons; `build/render.sh` takes the screenshots with `scripts/browser.sh` |
| `fonts/`, `icons/`, `covers/` | The self-hosted fonts, the Lucide icons used, and real album covers fetched from the Deezer API, as the app does |

## What it borrows, and from where

These come from the public interfaces of these apps, as anyone can see them. I did not measure them this session.

| App | What Backstage takes | What it leaves |
|---|---|---|
| Spotify | Covers lead every row. A playlist shows a mosaic of four covers. The page behind an album takes a wash of the cover's colour. Selected filter chips invert. The tab bar is a blurred strip with no box around the icons | The green, and the big round play button as the main action of every page |
| Linear (dark) | Near-black surfaces separated by 1 px lines and slight changes of grey, not by shadows. One accent used sparingly. A floating pill for the main action on mobile | The density of a desktop issue tracker |
| Ableton Live and Splice | The energy of a music tool: a saturated signal colour on dark, monospace for musical data (keys, times, chords), instrument and member colours that you learn to read at a glance | The tiny controls, which a phone cannot take |

## Type

| Family | Source | Licence | Job |
|---|---|---|---|
| Archivo (variable: weight 100 to 900, width 62% to 125%) | Omnibus-Type, on Google Fonts and as `@fontsource-variable/archivo` | SIL Open Font License 1.1 | Everything. Page and song titles use it expanded (width 125%) at weight 800; running text uses it at normal width |
| JetBrains Mono (variable) | JetBrains, on Google Fonts and as `@fontsource-variable/jetbrains-mono`, already a dependency of pragma | SIL Open Font License 1.1 | Musical data only: keys, capo, durations, tempo, chord names, picking numbers |

One family with a width axis gives a strong contrast between a title and a line of text without pairing two faces that might not agree. The expanded heavy titles feel like a gig poster; the normal width text stays easy to read at 14 and 16 px.

Six sizes, no more:

| Role | Size and line height | Weight and width | Use |
|---|---|---|---|
| `hero` | 40 / 40 | 800, width 125% | Sign in, and nowhere else in the app |
| `display` | 28 / 32 | 800, width 125% | The page title, once per screen: a setlist name, a song name |
| `title` | 20 / 24 | 700, width 112% | Section headings and sheet titles |
| `body` | 16 / 22 | 400, and 600 for a song name in a row | Text, inputs, button labels |
| `meta` | 14 / 18 | 400 | Artists, dates, notes on a row, small buttons |
| `label` | 12 / 16 | 600, capitals | Field labels, the tab bar labels, section labels like "Verse" |

## Colour

- **Surfaces are neutral grey.** No tint, so a cover never fights the background. Dark: `bg #0a0a0b`, `surface #141416`, `raised #1c1c1f`. Light: `bg #f5f5f2`, `surface` and `raised` white.
- **Controls are filled, not outlined.** `fill` is white at 7% on dark and black at 5% on light. That one tint makes every secondary button, chip, input and segmented control.
- **Volt** (`accent`, `#d4f84a` dark, `#c6f03c` light) fills the primary button and the picking numbers. Black text sits on it in both themes, at 15:1 or more. Where volt has to be text on a light background (a chord name, a link), it becomes `accent-ink #4b6600`, at 6:1.
- **A chosen option turns ink, never volt.** A selected chip is white on dark and black on light. Volt means "do", ink means "this one".
- **Meaning colours** (`danger`, `warn`, `good`) each have a text colour and a `-fill` tint for badges. Song statuses map onto them: idea is neutral, in progress is `warn`, rehearsed and concert ready are `good`.
- **Eight member colours**, brighter in dark and deeper in light, used for avatars and for the instrument icons in the lineup grid.
- Every text pair passes 4.5:1 in both themes. `build/contrast.py` computes them from `tokens.css`; the lowest is `warn` on `warn-fill` in light, at 4.77.

## Rules

### Buttons

- **Every button is a pill and carries an icon.** Full radius, filled, no border at rest. The icon sits left of the label, 8 px apart. The operator's two complaints about the last set (a blue 8 px rectangle, and a white box with a grey border) are answered by removing both: no border, no square corners, no box around a group of buttons.
- **Four variants.** `primary` is volt with black text. `secondary` is the `fill` tint with ink text. `quiet` has no fill until pressed. `danger` is the `danger-fill` tint with red text; a solid red button exists only for the final confirm of a deletion.
- **Three sizes.** `md` is 44 px tall, the default. `sm` is 36 px drawn, with a 44 px hit area, inside rows. `lg` is 52 px, for the floating action and a sheet's main button.
- **Pressed** darkens the fill and scales the button to 97% for 90 ms. **Disabled** drops to the plain `fill` with faint text, so a disabled primary never looks like a muddy volt.
- **Icon only** is a 44 px circle with an accessible name. Where the action is not obvious from the glyph (Vote, Stage), use the tile with a label under the circle instead.

### Icons

- Lucide, at stroke 2 (2.5 inside a volt button, so it holds against the bright fill). pragma's instrument glyphs in `InstrumentGlyphs.tsx` are already Lucide paths (the `mic-vocal` path matches Lucide's exactly); `bass` stays the app's own glyph because Lucide has none. Deezer and Spotify use their official marks from `BrandLogo.tsx`.
- Three sizes: 16, 20, 24. One icon per verb, as in DESIGN.md's verb table, with the Lucide names: `list-plus` for adding songs, `arrow-up-down` for ordering, `mic` for recording.

### Where actions go

- **The screen's main action floats** above the tab bar, centred, as a `lg` pill with a shadow. It has no bar behind it. The list fades into the background under it over 28 px, and gets that much padding at its end so the last row can scroll clear.
- **A second action may float beside it** as a "glass" pill: the raised colour at 82% with a blur, so it reads as quieter than volt. Never more than two.
- **The top bar** holds the back link, which names the parent ("Le Petit Bain"), and at most two icon buttons (edit, more). Nothing a person needs every time goes there.
- **The song page's main action is Record a take**, in the same floating spot as Add songs on the setlist, so the band learns one place.

### Lists

- Every song row starts with its cover, 48 px, 6 px radius, with a small shadow. A song with no cover gets a neutral tile with its initials, never a generated colour.
- The song name is `body` at weight 600; the artist and data are `meta` in `ink-soft`; keys and times are mono. Rows are separated by space, not by lines, on the page; inside a `surface` panel they get a 1 px `line`.
- Transitions sit between two rows, indented to the title column, with `corner-down-right` (or `triangle-alert` in `warn` for a risky one). An empty transition shows a faint "Note this transition" with `plus`.
- On the Songs view the lineup is not repeated on each row. A badge appears only when the lineup departs from the band's usual one ("Sarah sings only"). The full picture is the Lineup view, which the operator asked for.

### Sheets

- Every overlay is a bottom sheet on `<dialog>`, on `raised`, 20 px top corners, a grabber, a title in `title` and a close icon button. The sheet body is the only thing that scrolls. Its main button is a full width `lg` primary at the bottom, on the sheet itself, with no bar or border above it.
- The Add songs sheet picks several songs: each tap shows a volt picking number; songs already in the set are dimmed with a check.

### Navigation

- Four tabs, as in proposal A1: Home, Sessions, Songs, Band. A blurred strip of the background colour with a 1 px line on top. The active tab is ink with a heavier stroke; the others are faint. No volt in the tab bar, no pill behind the active icon.
- A segmented control (Songs, Lineup, My part) switches views of one setlist. Its selected segment is a raised pill, so it does not look like a filter chip.

## The Add songs study

`add-songs-study.png` shows four treatments on the same setlist:

| | Treatment | Verdict |
|---|---|---|
| A | One floating Add songs button at the bottom right, Order in the top bar | Clean, but Order moves out of reach, and the button covers the duration column |
| B | A row of buttons under the title, as on a Spotify playlist | Nothing floats, but the buttons sit at a quarter of the screen height and scroll away |
| C | A row at the end of the list, shaped like a song row | The quietest, but 2.5 screens down on a 20-song set |
| D | Two floating pills, centred above the tab bar, no bar behind them | **The pick** |

D wins because both actions stay on screen at every scroll position, both sit in the thumb zone (centre at 0.85 of the screen height), and there is no container at all: the volt pill is the only colour on the chrome. C is kept as the empty state: a setlist with no songs shows the end of list row in the middle of the screen.

## What it costs to migrate

Measured against `design-system/migration.md`, Backstage changes the same components as the Notebook target, plus these:

- **Tokens and fonts.** `site/src/styles/tokens.css` is rewritten (step 1 of migration.md, same shape). Geist and Instrument Serif leave `package.json`; `@fontsource-variable/archivo` arrives. That is a new dependency, which is an ADR trigger; it replaces two (Geist and Instrument Serif), so pragma goes from three font families to two.
- **Icons.** The hand-drawn glyphs in `atoms/Icon.tsx` are replaced by Lucide paths, through `lucide-react` or by copying the paths into the registry as `InstrumentGlyphs.tsx` already does. Copying keeps the registry and adds no dependency; I recommend that.
- **Buttons.** `atoms/button.variants.ts` gets pill radius, the fill based secondary and the new sizes; the call sites listed in migration.md step 3 change the same way. Nothing extra.
- **Action placement.** Migration.md step 5 plans an `ActionBar`, a boxed bar at the bottom. Backstage replaces it with a `FloatingActions` molecule (one or two pills over a fade). Same callers: `CatalogPage`, `SetlistsPage`, `SessionsPage`, `SetlistEditor`, `SongEditForm`, `BarForm`, `QuickAddForm`. Forms keep their save button in the sheet footer instead.
- **Covers.** `atoms/AlbumCover.tsx` and `album-cover.variants.ts` get the 6 px radius and the shadow; the setlist header needs a new `CoverMosaic` molecule; the song page needs the cover wash in `SongDetailHeader.tsx`.
- **Rows.** `SetlistEntryRow.tsx` loses the lineup strip (the Lineup view takes it), which removes work rather than adding it.
- **Dark first.** Every screen has to be checked in dark as the main case. Today's dark values cover 13 of 31 colours (finding 18), so this is a full pass over every screen, not a tweak.

## Weaknesses

- **Volt is loud.** On a light background a volt pill is the brightest thing on the screen, brighter than most covers. That is its job, but a person who dislikes it will dislike every screen.
- **Volt cannot be text on light.** It needs a second colour (`accent-ink`, a dark olive) for chord names and links in light mode, so the "one accent" is really two values.
- **Covers decide the mood.** A setlist of black and white covers looks grey; a page of loud covers looks busy. The design gives up control of colour to the band's taste in music.
- **Floating pills cover content.** The last 70 px of every list sit under the fade. The audit already removed one floating button because it overlapped content; this design brings floating back, with padding as the fix. That padding has to be right on every list, or the last row hides.
- **Expanded titles are wide.** "Seven Nation Army" at 28 px expanded does not fit next to a cover at 390 px; long names wrap to two lines. Titles in rows stay at normal width for that reason.
- **It looks like Spotify.** That is part of the appeal for a band, but pragma could read as a music player rather than a tool for preparing a concert.
- **Dark first doubles the checking.** Every screen needs a dark and a light pass, and the light pass will be the one that gets forgotten.
- **Not tested on a phone.** These are static mockups rendered in Chromium. Blur behind the tab bar and the pills costs some battery and frame rate on older iPhones, which this session cannot measure.
