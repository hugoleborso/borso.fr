# Design: pragma

The visual world of pragma is **stage paper**: the warm, slightly yellowed sheet a band tapes to the floor next to the pedals, written in black ink, with one blue pen for what you have to do next. The band's own words, the names of its songs and setlists, are set in a serif italic, like handwriting on that sheet. Everything else is a quiet mobile tool: layout, navigation and controls follow the phone's own conventions, because the band uses pragma between other things, on a phone, often standing up.

This file is the target. Today's code does not match it yet: the audit counted 18 font sizes, 45 button and link looks, 61 background colours and 14 dialogs with no shared component (`audit-design-system/findings.md`). The step-by-step move from today's values to these tokens is in [`migration.md`](./migration.md). Where a rule here comes from a design proposal, the proposal id is given (`A5`, `B1` and so on, from `solution-designer/proposals.md`).

## Hard rules

These are not style advice. Each one is meant to become a type, a lint rule or a test, and a pull request that breaks one is refused.

1. **Every button carries an icon. There is no text-only button.** This covers every element drawn as a button: `Button`, `IconButton`, `ButtonLink`, the items of an action bar, the items of a menu, and the actions in a sheet header or footer. The `icon` prop of `Button` is required by its type, so a text-only button does not compile.
2. **An icon-only button has an accessible label.** `IconButton` requires a `label` prop, which becomes its `aria-label`. A button with a visible text needs no extra label; its text is the name.
3. **One scroll container per screen.** The document scrolls. Nothing inside it scrolls in the same direction. While a sheet is open, the sheet body is the only thing that scrolls.
4. **At most one primary button per screen**, and it sits in the action bar at the bottom of the screen, above the tab bar.
5. **Every overlay is a `Sheet`** on the native `<dialog>` element. No other component writes `<dialog>`.
6. **No colour, size, radius or shadow outside the tokens.** No `text-[13px]`, no `bg-[rgba(...)]`, no hex value in a component. The scene views (`/catalog/:id/scene`, `/setlists/:id/scene`) have their own `stage-*` tokens and follow the same rule with them.
7. **Every tap target is at least 44 by 44 px**, measured on the element that receives the tap.

### What counts as a button

The icon rule needs a clear edge, because pragma also has things you tap that are not actions:

| Thing you tap | Is it a button? | Icon |
|---|---|---|
| An action: save, add, delete, record, open the vote, copy, share | Yes | Required, from the verb table below |
| A link drawn as a button (`ButtonLink`) | Yes | Required |
| A menu item | Yes | Required |
| A choice in a `SegmentedControl` or a filter `Chip` | No, it is a choice | The selected option shows the `check` icon. The others show none |
| A list row that opens a record (`ListRow`) | No, it is a row | The row ends with the `chevR` icon, or starts with a cover or an avatar |
| A tab in the tab bar | No, it is navigation | Always an icon above a word |
| A text link inside a sentence | No | None |

The second and third rows are a reading of the operator's rule, not a quotation of it. If the operator wants choices and rows to carry an icon too, the rule extends without changing anything else.

### One icon per verb

The icon rule only stays consistent if the same verb always gets the same icon. This table is the list; a new verb adds a row here first.

| Verb | Icon | Examples today |
|---|---|---|
| Save, apply, confirm, mark as done | `check` | "Enregistrer" (5 forms), "Appliquer", "Révisé" |
| Cancel, close, dismiss | `close` | "Annuler", "Fermer", the "×" text glyph |
| Add, create | `plus` | "Ajouter", "Nouvelle session", "Ajouter des morceaux" |
| Edit | `edit` | "Modifier" |
| Delete, remove | `trash` | "Supprimer", "Retirer", "Détacher" becomes `unlink` (new glyph) |
| Record | `mic` | "Enregistrer une prise" |
| Play, listen | `play` | "Écouter" |
| Copy | `copy` | "Copier le message personnalisé", "Copier l'ordre" |
| Open a vote, close a vote | `vote` | "Ouvrir un vote", "Clôturer le vote" |
| Upload, import | `upload` | Take upload, chart upload |
| Download, export | `download` | Calendar feed, chart file |
| Open outside the app | `external` | Deezer, Spotify, YouTube links |
| Go back | `chevL` | Back links (always naming the parent, C7) |
| Sign in, continue | `arrowR` (new glyph) | "Entrer" |
| Password, passkey | `key` (new glyph) | "Changer de mot de passe", "Ajouter une passkey" |
| More actions | `more` | Row and header menus |
| Full screen, stage mode | `expand` (new glyph) | "Mode scène" (D8) |

## Palette

All colours are tokens in `site/src/styles/tokens.css`, each written once as `light-dark(<light>, <dark>)`, as talos already does. `color-scheme: light dark` on the root picks the side from the phone's setting. This replaces today's second block of dark values under `prefers-color-scheme`, which redefines only 13 of the 31 colours and leaves the status chips, `danger` and every hover colour in their light values at night (finding 18). Declare the block as `@theme static` and start it with `--color-*: initial`, so Tailwind's own palette (`bg-white`, `text-gray-500`) stops generating and a stray colour fails the build instead of shipping. Read `docs/knowledge/tailwind-v4-theme-and-preflight-traps.md` before editing the file.

Light is the practice room, with the lights on. Dark is the stage and the evening at home. Both are first-class.

### Surfaces and text

| Token | Light | Dark | Role |
|---|---|---|---|
| `bg` | `#f4efe6` | `#16130f` | Page ground |
| `surface` | `#fbf7ef` | `#1f1b15` | Cards, list groups, the action bar |
| `raised` | `#fffdf8` | `#29241d` | Sheets and menus, which float above the page |
| `sunk` | `#ebe5d8` | `#100d0a` | Input fields, tracks, the neutral badge |
| `ink` | `#1a1612` | `#f1ece2` | Titles and running text |
| `ink-soft` | `#5c5247` | `#b0a899` | Secondary lines: dates, counts, a song's artist |
| `ink-faint` | `#6f665b` | `#958c7e` | Placeholders, disabled labels. Never the only carrier of information |
| `line` | `#1a16121a` | `#f1ece21a` | Dividers and card borders |
| `line-strong` | `#1a161238` | `#f1ece238` | Input borders, secondary button border |
| `hover` | `#1a16120d` | `#f1ece214` | The one hover and pressed tint, for quiet buttons and rows |
| `scrim` | `#14100c80` | `#000000a6` | Behind an open sheet |

### Meaning

| Token | Light | Dark | Role |
|---|---|---|---|
| `accent` | `#2d5fa0` | `#7fa9df` | The primary action and links. Nothing else is blue |
| `accent-strong` | `#1f4a85` | `#a3c3ec` | Primary button pressed |
| `accent-soft` | `#dfe6ef` | `#1c2738` | Background of an accent badge, focus wash |
| `on-accent` | `#fbf7ef` | `#0f1722` | Text and icon on `accent` |
| `selected` | same as `ink` | same as `ink` | The chosen chip or segment, and "concert ready". Filled ink means "this one" (B3) |
| `on-selected` | same as `bg` | same as `bg` | Text and icon on `selected` |
| `danger` | `#a83a2a` | `#ef8a76` | Destructive actions and errors only |
| `danger-soft` | `#f3dcd5` | `#3a1d17` | Error field and error banner background |
| `on-danger` | `#fbf7ef` | `#1a0d0a` | Text and icon on `danger` |
| `warn` | `#7d5810` | `#e3b55a` | Something needs attention: a risky transition, a song with no lineup |
| `warn-soft` | `#f1e3c3` | `#33270f` | Warn badge background |
| `good` | `#3f6b3a` | `#9cc68f` | Done, rehearsed, saved |
| `good-soft` | `#dde8d4` | `#1e2a19` | Good badge background |
| `focus` | same as `accent` | same as `accent` | The 2px focus ring |

The song statuses stop having their own colours. They map onto the meaning tokens: idea is the neutral badge (`sunk` and `ink-soft`), work in progress is `warn`, rehearsed is `good`, concert ready is `selected`. This removes the six `status-*` tokens, which had no dark values.

### Members

Members choose their colour from eight tokens instead of typing any hex value (finding 21). The avatar text is `on-member`.

| Token | Light | Dark |
|---|---|---|
| `member-1` coral | `#b54e32` | `#e07a5c` |
| `member-2` teal | `#33797a` | `#5fb3b3` |
| `member-3` mustard | `#8a6414` | `#d9a945` |
| `member-4` plum | `#8a4870` | `#c27aa6` |
| `member-5` sage | `#587436` | `#9cbc72` |
| `member-6` blue | `#2d5fa0` | `#7fa9df` |
| `member-7` brown | `#7a5a3a` | `#c49a72` |
| `member-8` indigo | `#5a5f9a` | `#9a9fe0` |
| `on-member` | `#fffefa` | `#1a1814` |

Song covers show the real cover when the music service gave one. Otherwise they show one neutral tile (`sunk` with the initial in `ink-soft`) instead of a generated colour per song, which alone accounted for about 30 of the 61 background colours.

### Stage

The scene views are dark in both themes and keep their four tokens: `stage-bg`, `stage-ink`, `stage-ink-dim`, `stage-chord`. Add `stage-line` (white at 14%) and `stage-hover` (white at 8%) to replace the eight `rgba(255,255,255,…)` values written into the scene components today. Stage mode is low priority; this is only so it stops breaking rule 6.

### Contrast, measured

Computed with the WCAG formula on the values above (`final-contrast.mjs` in this folder). Every pair used for text is at least 4.5:1 in both themes; the lowest is 4.64.

| Pair | Light | Dark |
|---|---|---|
| `ink` on `bg` | 15.71 | 15.73 |
| `ink-soft` on `surface` | 7.14 | 7.27 |
| `ink-faint` on `raised` | 5.54 | 4.64 |
| `accent` on `bg` | 5.63 | 7.62 |
| `on-accent` on `accent` | 6.04 | 7.41 |
| `on-danger` on `danger` | 5.95 | 7.75 |
| `danger` on `danger-soft` | 4.85 | 6.26 |
| `warn` on `warn-soft` | 5.04 | 7.67 |
| `good` on `good-soft` | 4.91 | 7.77 |
| `on-member` on the weakest member colour | 5.01 (`member-2`) | 5.60 (`member-4`) |

The full list of 30 pairs is in `final-contrast.txt`.

### Browser chrome

`theme-color` is `#2d5fa0` today in both themes, so the Android status bar stays blue at night. Use two `theme-color` meta tags with `media="(prefers-color-scheme: …)"`, set to `bg` in each theme, and set the manifest's `background_color` to the light `bg` (`#f4efe6`, today `#f5f1e8`).

## Type

Three families, each with one job:

- **Instrument Serif, italic**: the band's own words only. Song titles, setlist titles, session names, and the page title. Nothing else, not even a section heading.
- **Geist**: everything else, from labels to running text and notes. Notes move out of the monospace font (finding 16).
- **JetBrains Mono, tabular figures**: data only. Keys, capo, tempo, durations, energy values, scores, ChordPro source. Not statuses, not notes.

Six sizes, seven roles. Declare them in `@theme` so Tailwind generates `text-display`, `text-title` and so on, each carrying its line height and weight.

| Role | Family | Size / line height | Weight | Use |
|---|---|---|---|---|
| `display` | Serif italic | 28 / 32 | 400 | The page title, once per screen, inside `PageHeader` only |
| `title` | Serif italic | 20 / 26 | 400 | A song or setlist name wherever it appears: list row, sheet title, card. One look for one song (finding 7) |
| `heading` | Geist | 16 / 22 | 600 | Section headings. One style for every section (finding 11) |
| `body` | Geist | 16 / 24 | 400 | Running text, notes, inputs, button labels (500) |
| `meta` | Geist | 14 / 20 | 400 | Secondary lines, badges, small button labels (500), tab labels |
| `label` | Geist | 12 / 16 | 500, capitals, tracking 0.06em | Field labels and overlines only |
| `brand` | Serif italic | 40 / 40 | 400 | The wordmark on the sign-in and recover screens only |

Why these sizes: 16 is the smallest size at which iOS Safari does not zoom into a focused field, so inputs and body share it and there is no separate input size. 14 replaces today's 12, 12.5, 13 and 13.5 (72% of the text on screen is 12 px today, which is why titles, labels and buttons all look alike). 12 is kept only for capital labels, where the capitals make up the size. 40 exists only because the sign-in screen is the one place the world may lead. Mono text uses the size of the role it sits in. Large numbers (the vote countdown, the streak count) use `display` in mono, not a size of their own. There is no larger page title on a desktop screen: today's 56 px desktop title goes.

The scene views have their own large sizes (today 32 to 56 px) and stay outside this scale, under `stage-*` size tokens.

## Space

A 4 px grid, with six steps. Tailwind's spacing utilities stay, but only these values are used.

| Step | px | Tailwind | Use |
|---|---|---|---|
| 1 | 4 | `1` | Icon to its own text inside a badge; between stacked lines of one row |
| 2 | 8 | `2` | Icon to text in a button; between buttons; between a label and its field |
| 3 | 12 | `3` | Row padding, top and bottom; between fields in a form |
| 4 | 16 | `4` | Page gutter on a phone; card padding; row padding left and right |
| 6 | 24 | `6` | Between sections of a page |
| 8 | 32 | `8` | Above the first section, below the page header |

Half steps (2, 6, 10, 14 px: `0.5`, `1.5`, `2.5`, `3.5`) are retired. Today `gap-1.5` alone is the most used gap in the app (593 elements on screen); it becomes `gap-2`. The one exception is the vertical padding inside a badge, which is 2 px.

## Shape

| Token | px | Use |
|---|---|---|
| `radius-sm` | 4 | Badges, the energy bars, the drag handle |
| `radius-md` | 8 | Buttons, inputs, list rows, menus |
| `radius-lg` | 14 | Cards, list groups, the top corners of a sheet |
| `radius-full` | 9999 | Avatars, chips, segmented controls, the sheet grabber |

These are today's four values, kept so nothing that already looks right moves. `radius-xl` (22 px, 5 uses) and `rounded-2xl` (2 uses) go to `radius-lg`. Square corners on one side (`rounded-l`, `rounded-r`, `rounded-t`) are allowed only on joined segments and the sheet.

**No card inside a card.** A group inside a card is a heading and a 1 px `line`, not a second border. On `/tasks` today, text starts 64 px from the screen edge behind two borders (finding 12).

## Depth

Three levels. Separation on the page is a 1 px `line`, never a shadow.

| Level | Token | What sits there |
|---|---|---|
| Flat | none | The page, cards, list groups, rows |
| Raised | `shadow-raised`: `0 1px 2px` in `shadow-umbra`, plus a 1 px `line` | The action bar, the tab bar, a row while it is being dragged |
| Overlay | `shadow-overlay`: `0 8px 24px -6px` in `shadow-umbra`, plus a 1 px `shadow-edge` | Sheets and menus, on `raised`, over the `scrim` |

`shadow-umbra` is `#1a161233` light and `#000000b3` dark; `shadow-edge` is `#1a16121a` light and `#f1ece214` dark. Shadows are built from these colour tokens so they follow the theme, as in talos. Today's five shadows, among them a `shadow-lg` on the round floating buttons, all map onto these two.

## Icons

- One stroke width (1.6, as today), one 24-unit grid, round caps and joins. All glyphs live in the `Icon` registry; nothing draws its own `<svg>` except the third-party marks in `BrandLogo` and the energy and mastery charts.
- **Three sizes**, given by name, not by number:

  | Size | px | Use |
  |---|---|---|
  | `sm` | 16 | Inside a badge, next to `meta` text, inside a `sm` button |
  | `md` | 20 | Buttons, icon buttons, list row chevrons, menu items, the tab bar |
  | `lg` | 24 | Empty states, the sheet's close button, the primary button in the action bar |

  Today there are eleven sizes on screen (10, 12, 14, 16, 17, 18, 19, 20, 22, 24, 28) and `size={14}` is the most common in the code (44 uses).
- **One icon per destination.** Révisions and Améliorations both use `bolt` today; Améliorations takes a new `bulb` glyph (`star` already marks something in the setlist row). "Bars" (the venues) uses a bar chart today; it takes `beer`, which is already in the registry (finding 14).
- New glyphs this file needs: `arrowR`, `key`, `unlink`, `expand`, `share`, `bulb`. The sheet grabber is a drawn bar, not a glyph.

## Buttons

### Variants

| Variant | Look | When |
|---|---|---|
| `primary` | `accent` fill, `on-accent` text and icon | The one main action of the screen or the sheet. At most one visible at a time |
| `secondary` | `surface` fill, `line-strong` border, `ink` text | Other actions that deserve a box: "Annuler" next to a primary, "Écouter" in a row |
| `quiet` | No fill, no border, `ink` text, `hover` tint on press | Actions in headers and inside rows. Never the main action of a screen (finding 3) |
| `danger` | `danger` fill, `on-danger` text | Only the final confirm of a destructive action, inside the confirm sheet |
| `danger-quiet` | No fill, `danger` text and icon | The delete item in a menu, "Retirer de la setlist" in the entry sheet's menu |
| `stage` | `stage-hover` fill, `stage-line` border, `stage-ink` text | Scene views only |

Today's black `primary` is deleted: filled ink now means "selected", not "do this" (SD-3). Today's `accent` becomes `primary`, today's `default` becomes `secondary`, today's `ghost` becomes `quiet`.

### Sizes

| Size | Height | Label | Icon | Padding | Use |
|---|---|---|---|---|---|
| `md` | 44 | `body` 16, weight 500 | `md` 20 | 16 left and right, 8 between icon and text | The default everywhere |
| `lg` | 52 | `body` 16, weight 600 | `lg` 24 | 20 left and right | The primary button in the action bar and in a sheet footer, full width on a phone |
| `sm` | 36 visible, 44 tappable | `meta` 14, weight 500 | `sm` 16 | 12 left and right | Inside dense rows only, such as a take's "Écouter" or a setlist row's trailing action. A transparent hit area extends it to 44 |

There is no `size="icon"`. Today that name draws the 48 px round floating button, which this design removes (A7).

### The button components

- **`Button`**: `icon` (required), `variant`, `size`, `children` (the visible label). Icon first, then text. Optional `iconPosition="end"` for "Suivant" and the like, where the arrow follows the word.
- **`IconButton`**: `icon` (required), `label` (required, becomes `aria-label` and the tooltip), `variant` (`quiet` by default, or `secondary`), `size` (`md` 44 square, or `sm` 36 visible with a 44 hit area). Replaces the nine hand-written `ghost w-11 px-0` buttons and every "×" text glyph. Use it only where the icon alone is understood; in an action bar, a button with words is preferred (A7).
- **`ButtonLink`**: the same props as `Button`, on a router `Link`. It replaces `Button` inside `Link`, which is invalid HTML and appears in 5 places (finding 15).
- An "on/off" button (a toggle in the setlist header) uses `aria-pressed` and shows "on" one way only: the `selected` fill. Today it shows "on" in two ways (finding 5).

## Atoms

Today's atoms, and what each becomes. "Molecule" means the job moves to a molecule listed further down.

| Atom today | Decision | Becomes |
|---|---|---|
| `Button` | Keep, rewrite | Icon required; variants and sizes above |
| (new) | Create | `IconButton` |
| (new) | Create | `ButtonLink` |
| `Icon` | Keep | `size` takes `sm`, `md` or `lg` instead of a number; new glyphs listed above |
| `InstrumentGlyphs` | Keep | Part of the icon registry, unchanged |
| `BrandLogo` | Keep | The real Deezer and Spotify marks; its two hex colours are brand colours and are the one allowed exception to rule 6 |
| `Badge` | Keep, extend | Something you read. Tones: `neutral`, `accent`, `warn`, `good`, `danger`, `selected`. Takes over the song statuses from `Chip`. Wraps long text with an ellipsis instead of overflowing (finding 17). The `mono` tone is deleted |
| `PointsBadge` | Merge | `Badge` with tone `accent` and tabular figures |
| `Chip` | Keep, change meaning | Something you choose: a filter or a lineup choice. A `<button>` with `aria-pressed`, `radius-full`, 44 tall, `selected` fill and a `check` icon when chosen. Its status tones move to `Badge` |
| `SegmentButton` | Merge | Molecule `SegmentedControl` |
| `Card` | Keep, reduce | Two variants: `default` (`surface`, `line`, 16 padding) and `sunk`. `flat` is deleted (it is only padding). `bare` moves to the `Section` molecule's list group |
| `Crumb` | Merge | The `label` text role, used by `PageHeader` and `Field` |
| `HintText` | Merge | The hint and error slot of the `Field` molecule |
| `StickyFormActions` | Merge | Molecule `ActionBar` |
| `Input` | Keep | `sunk` fill, `line-strong` border, `body` 16, 44 tall. One size (`sm` and `md` differ only by padding today) |
| `AutoGrowTextarea` | Keep | Grows without limit and never scrolls itself; the 55% cap goes (A6) |
| `ScoreInput` | Keep | Mono is right here: it holds a number |
| `Avatar` | Keep | Sizes `sm` 24, `md` 32, `lg` 40. The 22 px size goes. Colour from `member-*` only |
| `AlbumCover` | Keep | Neutral tile fallback instead of a generated colour; `xl` uses `radius-lg` |
| `EnergyMeter` | Keep | The energy slider in the entry sheet |
| `EnergyBar` | Delete | No component imports it outside its own test |
| `PulsingDot` | Keep, change prop | Takes a `tone` (`warn`, `danger`, `good`) instead of a raw colour string |
| `ExternalLink` | Keep | Adds the `external` icon after the address |
| `DocumentFrame`, `OembedFrame`, `PreviewImage` | Keep | Frames for third-party content, `radius-md` |

That leaves 20 atoms, down from 24, and no two that do the same job.

### The molecules this design depends on

These exist so the hard rules have one home each. Most are listed in proposal B4.

| Molecule | Replaces | Owns |
|---|---|---|
| `Sheet` | 14 hand-written dialogs, the More drawer, `ConfirmDialog` | Rule 5. Detail below |
| `ActionBar` | `BottomActionBar`, `StickyFormActions`, the round floating buttons | Rule 4 |
| `SegmentedControl` | `SegmentButton`, `FilterPillGroup`, `MemberFilterPills`, `VoteModeToggle`, `LanguageSwitcher` | One look for "this option is chosen" (finding 8) |
| `ListRow` | The row layout copied in `SongCard`, `SetlistEntryRow`, `PoolSongRow`, `VoteCatalogRow`, `StudyRow`, `TaskRow` | Leading cover or avatar, a `title` line, a `meta` line, one trailing slot. Never a card inside a card |
| `Section` | The section cards and the four heading styles | A `heading`, an optional quiet action with its icon, then content or a list group |
| `PageHeader` | `PageHeader`, `BackLink`, `Crumb`, the 8 page title styles | A back link naming the parent, the `display` title, one `meta` line, one trailing `IconButton` or menu |
| `Field` | `HintText`, the label and error markup in each form | `label`, the control, a hint or an error in `meta` |
| `Menu` | `OverflowMenu` | Every item has an icon; delete is `danger-quiet` and is the last item, after a divider |
| `EmptyState` | Ad hoc empty texts | `lg` icon, one sentence, one `secondary` button |

## Layout

### One scroll container per screen

- The document is the scroll container. `AppShell` already lets `<main>` grow with the document; keep it that way.
- No element inside a page sets `overflow-y: auto` or `scroll`. Text areas grow (A6). The song picker, the lineup editor and the song defaults are sheets, and the sheet body is their one scroll.
- Horizontal strips inside a vertical page are allowed: the filter chips and the transition strip.
- Headers that must stay visible use `position: sticky`, not a second scroll area.
- Enforced by an end-to-end test that opens every route and every sheet at 375x667 and 390x844 and fails on two vertical scroll areas (A6). The coordinator's `count-scroll.js` is the logic.

### Primary action placement

- The primary action of a screen lives in the `ActionBar`: a `surface` bar with `shadow-raised`, fixed just above the tab bar, holding one `primary` `lg` button with an icon and words ("Ajouter des morceaux", "Nouvelle session"). Optional: one `IconButton` with the `more` icon to its left for the screen's secondary actions.
- The bar sits at `bottom: calc(tab bar height + env(safe-area-inset-bottom))` and the page gets the same amount of bottom padding, so the last row is never hidden under it.
- No round floating button. Rare actions such as "Copier l'ordre" go in the header menu, not next to the main action (finding 4).
- In a form (new song, edit song, bar), the `ActionBar` spans the full width of the screen, not the width of the card, and it holds "Enregistrer" (`primary`, `check`) and "Annuler" (`secondary`, `close`). Today the save bar is card-wide and covers the "Origine" field (finding 20).
- Header actions are `quiet`, and there are at most two of them; a third goes in the menu.

### Bottom sheets on the native dialog element

`Sheet` is a molecule on `<dialog>`, opened with `showModal()`, so the browser handles the focus trap, the Escape key, the top layer and `inert` on the page behind. One component, used for every overlay.

- **Shape**: docked to the bottom edge, full width on a phone, at most 34rem wide and centred on a large screen. `raised` background, `radius-lg` top corners, `shadow-overlay`, `scrim` behind it. Height follows the content up to 92% of the screen (`max-height: 92dvh`).
- **Inside, top to bottom**: a grabber (a 36 by 4 px `line-strong` bar, `radius-full`), a header with the `title` text (serif italic when it names a song or setlist, `heading` otherwise) and an `IconButton` with `close` on the right; a body that is the only scroll area; a sticky footer holding the sheet's actions, primary on the right, `lg` on a phone.
- **One way to close**: the `close` button in the header, the Escape key, and a tap on the scrim. No "Annuler" in the header. Today there are four ways (finding 1).
- **One save model per sheet**: either explicit (a `primary` "Enregistrer" with `check` in the footer) or automatic (saves after a short pause, and the footer shows "Enregistré" with the `check` icon in `good`). Never a mix in one sheet, and the entry sheet stops being the only automatic one without saying so (finding 2).
- **Drafts survive**: closing with the scrim keeps what was typed, or asks first if it would be lost (C3).
- **One sheet at a time**: a sheet never opens another sheet. The lineup is edited inside the entry sheet (A5).
- **Confirm** is a `Sheet` with `size="confirm"`: one sentence, `secondary` "Annuler" with `close`, `danger` confirm with `trash`.
- **Preflight resets `<dialog>`**: Tailwind's preflight removes the default margin and size, so `Sheet` sets `margin: auto 0 0`, `width: 100%`, `max-width: 100%` itself. See the knowledge entry on Tailwind v4 traps.
- The page behind stays locked with the existing `html:has(dialog[open]) { overflow: hidden }`.
- Swipe down to close comes later and is written with pointer events, not a library (decision D10). Until then the `close` button and the scrim close the sheet.

### Safe areas

- `viewport-fit=cover` is already set. Every edge that touches the screen edge pads by its inset:
  - `AppShell`: `padding-top: env(safe-area-inset-top)` (C12; it is 0 today with the `default` status bar style, and it protects a future switch to `black-translucent`).
  - Tab bar: `padding-bottom: env(safe-area-inset-bottom)`.
  - `ActionBar`: placed above the tab bar, so above the bottom inset.
  - `Sheet` footer: `padding-bottom: max(16px, env(safe-area-inset-bottom))`, since the sheet sits on the bottom edge.
  - Left and right insets apply in landscape: the page gutter is `max(16px, env(safe-area-inset-left))` and the same on the right.
- Nothing that receives a tap sits in the bottom 20 px of a sheet on iOS, where a swipe goes to the home gesture.

### Widths

Every screen is designed at 375 px first. The page gutter is 16 px. Above `lg` (1024 px) the sidebar replaces the tab bar and the content column is at most 42rem wide.

## Signature move: the band's own words

The serif italic is the one place pragma has a voice. It is used for words the band wrote: song titles, setlist names, session names. On paper this is the hand-written part of the sheet; everything printed around it is Geist. A song looks the same in the catalogue, the picker, the setlist and the entry sheet: same family, same `title` size, so the eye learns it once.

## Where the world may lead

Only the sign-in screen and the empty states. Every other screen is a working screen first.

## Not done yet

- Nothing here was checked on a real phone. The emulator cannot show the software keyboard, so whether it covers a sheet footer is unknown; iOS Safari does not resize the page for the keyboard.
- Moving to `light-dark()` and the new text roles touches almost every component. `migration.md` orders the work so each step ships on its own.
- The rules need their gates: a type that requires `icon`, a lint rule against raw `<button>` and `<dialog>` outside their components, a lint rule against arbitrary values (`text-[`, `bg-[`, `rounded-[`), and the scroll test. Each one must be cited in the matching document under `docs/standards/`, so the enforcement ledger stays true.
- The app icons and the splash colour still need checking against the new dark `bg`.
