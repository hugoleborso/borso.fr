# Studio: a design system proposal for pragma

## The idea

Pragma should feel like an app Apple shipped on the phone: grey background, white groups of rows, one indigo accent, and Inter for every word. The band's covers are the only strong colour on screen, and the main action floats as one filled capsule in the thumb zone instead of sitting in a boxed bar.

This is proposal 3 of 3. Backstage is dark first and loud with album art. Notebook keeps pragma's warm paper and blue. Studio is the quiet, native one.

## What it borrows, and from where

| App | What Studio takes | What it leaves |
| --- | --- | --- |
| Apple Music | The song row: cover at 48 px with 6 px corners, title above artist, hairline that starts after the cover. The row of round buttons with a label under each one (Listen, Record, Practised, Notes) on the song page. | The red accent, the full-bleed headers, the blur over the artwork. |
| Things 3 | A single floating add button bottom right, always in reach. Generous space between groups. | Things uses a bare round "+". Studio puts the verb next to the icon, because the operator wants words on buttons. |
| Apple Reminders and Settings | Inset grouped lists on a grey background, form rows with the label on the left and the value on the right, footnote headings above each group. | Reminders' "New Reminder" toolbar. It was tried as treatment D and lost (see below). |
| Apple Notes | The bottom sheet with a grabber, a centred title and a round close button. | Notes' yellow tint. |
| iOS itself | The segmented control, the four-tab bar on a blurred bar material, the back button that names the parent screen, large titles on top screens. | Glass effects anywhere else. |

## Type

**Inter**, one family for everything, by Rasmus Andersson. Licence: SIL Open Font License 1.1. Source: [rsms.me/inter](https://rsms.me/inter/) or the `@fontsource-variable/inter` package (5.1.0 used here). The variable file for Latin is 48 KB (`fonts/inter-latin-wght-normal.woff2`, downloaded from jsDelivr for this mockup), so it self-hosts next to the other assets.

Inter is the closest free face to San Francisco, which is why it suits a native feel. Studio does not pair it with a second face: the hierarchy comes from size and weight. Three alternates are on (`cv05`, `cv08`, `ss03`) to make a lower case l and the digits easier to tell apart on stage.

| Token | Size / line | Weight | Use |
| --- | --- | --- | --- |
| `title` | 30 / 36 | 700 | Page title (large title on a top screen) |
| `headline` | 20 / 25 | 650 | Section title, sheet title |
| `body` | 17 / 22 | 400, 520 for a row title, 600 for a control | Rows, buttons, notes |
| `callout` | 15 / 20 | 400 to 520 | Second line of a row, segmented control |
| `footnote` | 13 / 18 | 400 to 520 | Group headings, meta, transitions |
| `caption` | 11 / 13 | 560 | Tab labels only |

Numbers that line up (durations, counts) use tabular figures. There is no monospace and no serif.

## Colour

Neutral greys taken from iOS's own system colours, so the app sits naturally next to the phone's other apps. One accent: indigo, `#5856d6` in light and `#7d7aff` for text in dark (the fill stays `#5e5ce6` so white text on it keeps 5:1). Indigo was chosen because blue belongs to Notebook, and red, green and amber already mean danger, good and warning here.

Measured contrast: accent text on white 5.65:1, on the grey background 5.06:1; secondary text 5.22:1 on white and 4.67:1 on grey; accent in dark 4.94:1 on the dark surface. `ink-faint` (2.2:1) is for placeholders and empty marks only, never for text a person must read.

Six member colours exist for avatars and nothing else. Status uses soft badges: grey for idea, amber for in progress, green for rehearsed, indigo for concert ready.

Everything is in [`tokens.css`](./tokens.css): one `@theme static` block with `light-dark()` values, so dark mode needs no second block.

## Rules

### Buttons

- Every button has an icon. Every text button also has a verb. An icon-only button always has a name for screen readers, and shows its name under the icon when it sits in a row of actions on a content page.
- The shape is a capsule. There are four looks:
  - **Primary**: indigo fill, white text. One per screen at most.
  - **Secondary**: pale indigo fill, indigo text. For the second action of the screen.
  - **Quiet**: indigo text and icon, no fill. For inline actions such as Edit.
  - **Destructive**: pale red fill, red text. A filled red version exists only inside the confirmation sheet.
- Three heights: 50 px for the main action, 44 px by default, 32 px inside rows and the nav bar (the touch area stays 44 px).
- Neutral grey round buttons (⋯, close) are for chrome, not for actions on content.

This replaces the button the operator found ugly. That one was a flat blue rectangle next to a white bordered rectangle. Studio's buttons have no border at all: the fill or the colour of the text is enough.

### Icons

Lucide, ISC licence, at 2 px stroke (2.2 to 2.6 at small sizes so they hold up next to bold text). Pragma's own bass glyph stays, because Lucide has none. To avoid a new dependency, the Lucide path data is copied into `atoms/Icon.tsx` as ADR-0022 already does for five instrument glyphs; the mockups were generated the same way from the `lucide-react` 1.52.0 package already in the tree.

### Where actions go

- The main action of a screen is a **floating capsule**, bottom right, 16 px above the tab bar, with a soft indigo shadow. One per screen. On the setlist it is "Add songs"; it is hidden on the Lineup and My part segments, which have no add.
- Secondary actions go in the nav bar, top right, as small tinted capsules ("Order"). Rare actions go in the ⋯ menu.
- Destructive actions go in a sheet or behind a swipe, never next to Save.
- The current `ActionBar` (a bordered bar holding two boxed buttons) is not used. That is what the operator called "the box around it".

### Lists

- Inset groups: white rounded blocks (12 px corners) on the grey background, 16 px from the screen edges. No borders and no cards inside cards.
- Song rows always show the cover. Hairlines start after the cover.
- A transition is a thin line inside the group between two songs: an arrow and a footnote. A transition with a comment gets a speech bubble icon in the accent and dark text, so it stands out from the plain ones.
- A note for tonight shows under the song, so nobody has to open the sheet to read it.

### Sheets

Native `<dialog>` with a grabber, a centred headline, and a round close button on the right. Fields sit in grey groups inside the white sheet. The main button is full width at the bottom, the destructive one is quiet red text under it. The sheet rises with `--ease-sheet` over 380 ms; reduced motion turns it into a plain fade.

### Navigation

- Four tabs: Home, Sessions, Songs, Band. Tabs are places, never actions. The bar uses the blurred material with a hairline on top.
- Pushed screens keep the tab bar and show a back button named after the parent ("Le Petit Bain").
- Top screens have a large title; it would collapse into the nav bar on scroll. Each screen has one scroll area: the content under the nav bar.
- The setlist has three views on a segmented control: Songs, Lineup, My part. Order (with the energy curve) is its own screen behind the Order button.

## The add songs study

The operator's complaint was about the blue slab and, worse, the bordered bar around it. Four treatments were drawn in Studio ([`add-songs-study.png`](./add-songs-study.png)):

| | Treatment | Verdict |
| --- | --- | --- |
| A | Small capsule in the nav bar | Calm, but at the top of the screen, far from the thumb, and it crowds the back label. |
| **B** | **Floating capsule** | **The pick.** Always visible, in the thumb zone, no bar and no border. It is the one strong shape on the screen, so you find it without looking for it. Order moves to the nav bar, which suits an action used less often. |
| C | Last row of the list | The lightest, and very native, but with twelve songs you must scroll to the end before you can add. |
| D | Toolbar text with no box | Good reach, but it stacks a second bar on the tab bar and still reads as a strip at the bottom. |

B's cost: it covers the end of the last visible row while scrolling. The list gets bottom padding equal to the capsule's height so the last song can always scroll clear of it.

## The screens

- [`screen-setlist.png`](./screen-setlist.png) and [`screen-setlist-dark.png`](./screen-setlist-dark.png): covers, avatars for who plays, transitions between songs, a note and a lineup change shown inline, Order top right, Add songs floating.
- [`screen-lineup.png`](./screen-lineup.png): one row per song, one column per member, an instrument icon in each cell. Cells changed for tonight are tinted indigo. Titles sit on their own line so they never get cut.
- [`screen-song.png`](./screen-song.png): cover and status, four labelled round actions, the record and the band's take, your part, then chords above the words. The key shows on the song page only, not on the session page.

## What it costs to migrate

Counted against [`design-system/migration.md`](../design-system/migration.md), which is the plan for the first target system. Studio follows the same seven steps, with these differences.

| Step | Same as migration.md | Different in Studio |
| --- | --- | --- |
| 1. Colour | Every rename and every raw colour listed there | Values change to the iOS greys and indigo. `bg-sunk` maps to `fill`. `theme-color` and `background_color` in `index.html` and `manifest.webmanifest` become `#f2f2f7` / `#000000`, so the home screen splash changes from warm paper to grey. |
| 2. Type | Every file listed there with a hand-typed size | Six sizes instead of seven. Instrument Serif and Geist go; one Inter file replaces both. The 46 files using `font-mono` all lose it except ChordPro input. |
| 3. Buttons | `button.variants.ts`, `Button.tsx`, new `IconButton`, `ButtonLink`, every caller (the type checker lists them) | Shapes become capsules. `Icon.tsx` takes Lucide paths for its non-instrument glyphs, so every icon in the app looks slightly different. |
| 4. Sheets | Every dialog listed there moves onto one `Sheet` | Same. |
| 5. Molecules | `SegmentedControl`, `Chip`, `Badge`, `ListRow`, `Section`, `PageHeader`, `Field`, `Menu` | `ActionBar` is not built. A new `FloatingAction` molecule replaces `BottomActionBar` and `StickyFormActions` on `CatalogPage`, `SetlistsPage`, `SessionsPage` and `SetlistEditor`. Forms (`SongEditForm`, `BarForm`, `QuickAddForm`) put Save at the bottom of the form or in the nav bar instead. |
| 6. Shape | All radius and spacing sweeps | Radii are 6, 10, 12, 16 and 24 px. `Section` becomes an inset group. |
| 7. Gates | All gates | One more: a test that no screen renders two floating actions. |

So Studio touches the same components as the first system, plus `Icon.tsx` paths and the four screens that hold a floating action. It removes one molecule (`ActionBar`) rather than adding it.

## Weaknesses, honestly

- **It can look generic.** Grey, white and indigo is close to the default look of many apps. The covers carry the identity, so a song with no cover (a band original without artwork) looks bare. Pragma would need a good placeholder cover for originals.
- **It drops pragma's current identity.** The warm paper and the blue go, and so does the serif. If the band likes the current feel, Notebook keeps it.
- **It imitates iOS on every phone.** On Android it will feel like an iPhone app. The rules are close enough to Material that this is mild, but it is real.
- **The floating capsule hides content.** It sits over the list. Bottom padding fixes the end of the list, not the rows passing under it while scrolling.
- **Indigo is close to the Deezer purple.** On the song page the Deezer tile and the indigo buttons sit near each other. It reads fine in the mockup, but a brand tile next to an accent of the same family is a risk.
- **Body line height is tight for paragraphs.** 22 px on 17 px text is the iOS value and suits rows; long notes read better at 24 px. The impeccable detector flagged this; notes in the mockups use 21 px on 15 px.
- **Not proven on a phone.** Every PNG here is Chromium at 390 x 844. Nothing was tried on a real iPhone or with a large text size, and the blur on the tab bar is not checked on older devices.

## Files

- [`tokens.css`](./tokens.css): the Tailwind v4 `@theme` block.
- [`specimen.png`](./specimen.png), [`specimen-dark.png`](./specimen-dark.png): colour, type, buttons, chips, badges, inputs, rows, tab bar, sheet.
- [`add-songs-study.png`](./add-songs-study.png): the four treatments.
- `screen-*.png`: the three screens, plus the setlist in dark.
- `src/`: the static HTML. `src/build.sh` turns `tokens.css` into plain CSS variables for the mockups, `src/render.sh <page> <png> <w> <h>` renders one, and `src/gen-icons.mjs` builds the icon map from `lucide-react` and pragma's own glyph files.
