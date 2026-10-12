# Design — talos

The visual world of talos is **Figures rouges**: Attic red-figure and black-figure pottery, where the black slip is incised with fine lines, read through the discipline of a metro diagram, where a line turns only at right angles. The Greek key is that same line. The world lends the app its palette, its display face and one signature move; layout, navigation and controls stay those of a mobile productivity app.

The product facts this serves are in [`PRODUCT.md`](./PRODUCT.md). The three directions explored before this one, and why this one won, are in the pull request that introduced it.

## Palette

All colours are tokens in `site/src/styles/tokens.css`. Token names predate this world and are kept so no component had to be renamed; the table says what each one is now.

| Token | Light (fired clay) | Dark (black glaze) | Role |
|---|---|---|---|
| `bg` | `#ecd6bb` | `#111614` | Page ground |
| `surface` | `#f5e6d1` | `#1a201d` | Cards and rows |
| `ink` | `#1c1712` | `#efdfc8` | Text, black slip or pale clay |
| `bronze` | `#1c1712` | `#e3814a` | Primary action: black slip by day, terracotta by night |
| `patina` | `#9c4319` | `#e3814a` | Secondary accent, terracotta |
| `danger` | `#7c1d2c` | `#ef7166` | Overdue and errors, the added red of the vases |
| `shell` | `#d47c44` | `#0c100e` | Tab bar and the browser chrome (`theme-color`) |
| `meander` / `meander-now` | `#a9825f` / `#b4561f` | `#6e604f` / `#e3814a` | The agenda line, ahead and now |
| `tondo` / `on-tondo` | `#d47c44` / `#17120e` | `#e3814a` / `#14110e` | The sign-in roundel |

Light is the daytime scene, outdoors; dark is the morning scene, in bed. Neither is a default: both are first-class.

## Type

- Display, interface and body: **Atkinson Hyperlegible Next**, one family throughout. Titles and the date are set in bold, tracked slightly tight. The world comes from the palette and the meander line, not from the lettering; a Greek display face (GFS Neohellenic) was tried first and dropped for a plainer, more professional voice.
- Data: **Atkinson Hyperlegible Mono**, tabular figures.

## Depth

No drop shadows on surfaces (`shadow-1` is `none`). Separation is a 1px line, like an incision through slip. `shadow-2` remains only for overlays that float above the page, such as the action sheet.

## Signature move: the meander line

On the Today screen, the agenda is one continuous line down the left of the list. It turns at a right angle on every row, so it reads as a stretched Greek key. Each todo is a station on it:

- an open circle is a todo to do, a filled one is done;
- a terracotta ring marks a todo due today, a red ring one that is overdue;
- the stretch of line through overdue and today is terracotta (`meander-now`), the rest is quiet (`meander`).

The rules (which lane a row takes, which tone a bucket gets, which ring a station wears) are pure functions in `site/src/components/organisms/today-agenda.core.ts`. The drawing is the `MeanderRail` atom; the station is the `Checkbox` atom, round everywhere in the app.

The same line, a few millimetres long, marks the active tab in the tab bar.

## Where the world may lead

Only the sign-in screen. It carries a tondo, the round painted centre of a drinking cup: a terracotta disc in a graduated rim, the name in display capitals and a short meander under it (`Tondo` atom). Every other screen is a working screen first.

## Not done yet

- The knowledge graph keeps its force layout. Redrawing it as a transit diagram (edges at 0, 45 and 90 degrees, station shapes per page type) is part of the explored direction and was left out of the first change.
- The app icons in `site/public/icons/` are still the bronze mark of the previous world.
