# Three design system directions for pragma, compared

Author: ds-critic. Method: the critique and Operate mode guidance of the vendored impeccable skill (`.claude/skills/impeccable/reference/critique.md` and `mode-operate.md`), applied to the 21 PNGs, the three `direction.md` files and the three `tokens.css` files. Contrast figures were computed this session from each `tokens.css` with `contrast.py` (kept in the audit scratchpad, not copied here), with translucent fills laid over the surface they sit on. They are token values, not measured pixels.

## The short answer

**Pick Notebook as the base, and replace its buttons with Backstage's.** Notebook is the cheapest to ship, it is the only direction that keeps every operator rule, every text pair in it passes AA in both modes, and it keeps the warm paper and blue that the operator called "great" in the first specimen. Its weak point is exactly the one the operator complained about: its primary and secondary buttons are still a blue rounded rectangle next to a white bordered rectangle, the shape that was rejected. Backstage has the best buttons and the best answer to "Add songs", and those parts move across cleanly. The grafts are listed at the end.

If the operator wants a clear break from today's look rather than a fix of it, Backstage is the alternative to show. Studio should not be the choice: it is the most polished and the easiest to read, but it is the generic grey and one accent look that the impeccable method calls "the category default", and it is the only one with a failing text pair.

## Scores

1 is poor, 5 is excellent. One sentence of evidence per cell.

| Criterion | Studio | Backstage | Notebook |
| --- | --- | --- | --- |
| Top tasks (setlist preparation, then learning songs) | **4.** The setlist shows covers, who plays, transitions, notes and the lineup change in one list, but the multi-select Add songs sheet is never drawn. | **4.** The best song page for learning (Deezer, Spotify and YouTube in one row, band takes, your part with a progress bar, a transpose stepper) and an empty "Note this transition" line on the setlist. | **4.** The setlist carries notes, pencil transitions and tonight's changes in a highlighter, and the Add songs sheet picks several at once; the song page has no link to the reference recording. |
| Readability of dense setlist and lineup screens | **5.** The lineup grid fits six members at 390 px with the title on its own line above the icons, and rows use 17 px text in inset groups. | **3.** Key badges, capo badges and mono durations on every setlist row add noise, and in the lineup most cells are tinted green, so the "changed" signal is lost. | **4.** Sparse yellow highlight makes changed cells easy to find, but serif titles truncate sooner, the margin numerals take 44 px per row, and the grid fits five members only. |
| Operator rules | **4.** Icons on every button, covers everywhere, key only on the song page; adding several songs at once is not shown. | **3.** Keys and capo appear on every setlist row under a session ("Ebm", "E capo 2", "Eb→F"), which the operator asked not to show, and a "Stage" action sits in the specimen. | **5.** Every rule is kept and written down, including "key and tonality are not shown on the setlist or the session". |
| Contrast, light and dark | **3.** Secondary buttons (indigo text on `accent-soft`) fall to **4.22:1 in dark**, below AA for 17 px text; the segmented control's `ink-soft` on `fill` is 4.48:1 in dark; placeholders sit at 1.73 to 2.21:1. | **4.** Every text pair passes (lowest 4.77, `warn` on `warn-fill`), but the volt pill is **1.21:1 against the light page**, so in light mode its edge comes only from its shadow, and placeholders on `fill` are 4.36:1. | **5.** Every pair passes in both modes; the lowest is `ink-faint` on paper at 5.00:1, primary label on blue is 6.34 (light) and 8.34 (dark). |
| Coherence (specimen matches screens) | **5.** The floating capsule, inset groups, segmented control and labelled round actions look the same in the specimen and on the three screens. | **4.** Specimen and screens agree; only the study's "thumb zone" annotation collides with the row durations. | **3.** The specimen's "Rules in one place" says screen actions go "in the navigation bar as quiet buttons", while `direction.md` and every screen put them on a line above the tabs. |
| Buttons | **4.** Borderless capsules with a tinted secondary are clean and native, but they look like every iOS app. | **5.** Volt pills with black text, a 2.5 px icon stroke inside the fill, and a disabled state that drops to grey instead of a muddy volt: the most finished button set of the three. | **2.** A 10 px rounded blue rectangle next to a white bordered rectangle ("Play demo" and "Takes" on the song page, "Order" in the specimen) is the shape the operator called ugly. |
| The Add songs treatment | **4.** One floating indigo capsule in the thumb zone, no bar and no box, but it sits over the avatars of the row beneath it. | **5.** Two pills centred above the tab bar, Add songs in volt and Order in glass, over a fade and with no container; both stay reachable at every scroll position. | **3.** Removes the box completely (blue words on paper), but with no fill it reads as a link, and "Order" is set in ink while "Add songs" is blue, so the two do not look like a pair. |
| Migration cost | **3.** New palette, new manifest colours (the splash turns grey), Inter replaces two fonts, Lucide paths in `Icon.tsx`, plus a new `FloatingAction` molecule. | **2.** New font with its ADR, Lucide paths, a cover mosaic and cover wash, and dark first, which means a full dark pass of every screen when only 13 of 31 colours have dark values today. | **4.** The light accent and paper stay, so the manifest does not change; one font swap (Newsreader, ADR) and a lighter `BottomActions` molecule. |
| How distinct it is | **2.** Grey, white and one indigo accent; with the name covered it reads as any iOS app, as its own weaknesses section admits. | **5.** Near-black chrome, covers as the only colour, volt for "do", expanded heavy titles: the only one with an unmistakable signature. | **4.** The margin numerals, rust pencil transitions and highlighter are a real signature, at some risk of turning into a costume (the ruled note field is already one). |
| **Total (out of 45)** | **34** | **35** | **34** |

The totals are close, so the totals should not decide. The operator's order of priorities should: the setlist first, the buttons as the explicit complaint, and one developer paying for the migration. That points to Notebook's structure and cost with Backstage's buttons.

## What is best in each

**Studio**
- The lineup grid. Six members fit at 390 px because the song title sits on its own line and the icons run underneath, aligned to the member columns. This is the best answer to "lineup varies a lot per song and needs its own view".
- The song page's four round actions with a label under each (Listen, Record, Practised, Notes). Every icon has its word, which honours the icon rule without crowding.
- A note for tonight shows under the song in the setlist, so nobody opens a sheet to read it.

**Backstage**
- The buttons, and the floating pair for Add songs and Order. This is the most convincing answer to "the button is ugly and the box is worse".
- "A chosen option turns ink, never volt." One rule that separates "do this" from "this one is selected", applied to chips and the segmented control.
- The song page for learning: listening links, band takes with play buttons, your part with a progress bar, chords with a transpose stepper and a full-screen button.
- The empty transition line, "Note this transition", which makes task 5 discoverable.
- The cover mosaic in the setlist header.

**Notebook**
- Pencil for transitions and a highlighter for what changed tonight. These are the most readable way to show the two kinds of annotation the band writes, and they do not compete with the blue used for actions.
- Ink italic for notes the band wrote, sans for the tools: the type says who wrote a line.
- The Add songs sheet: "Not in this set" as the default filter, check boxes on rows with covers, "Add 3 songs" in the footer.
- The only direction that wrote every operator rule into its rules.

## Rendered screens that look broken

None of the 21 PNGs is broken in layout. These are the defects worth fixing before the operator sees them again:

| File | What is wrong |
| --- | --- |
| `ds-backstage/add-songs-study.png` | The dashed "thumb zone" line and its label run through the Wonderwall row in treatments A and D, striking through the duration. It is an annotation, but it reads as a rendering fault. |
| `ds-backstage/screen-song.png` | The floating "Record a take" pill sits on top of the third chord line, so the chord sheet, the main thing a learner reads, is cut under the fade. |
| `ds-backstage/screen-lineup.png` | Cells with two instruments ("Dreams", "Psycho Killer", "Valerie") squeeze two glyphs into one cell, and the legend swatch looks like an unchecked box. |
| `ds-studio/screen-setlist.png` | The Add songs capsule hides Mr. Brightside's avatars. The direction knows this and plans bottom padding, but padding only helps the last row, not the ones scrolling under it. |
| `ds-notebook/specimen.png` | The "Action placement" rule contradicts the screens (see Coherence). The labels under the icon-only buttons are set in the mono face for some ("More actions", "Play take") and the sans face for others ("Record"). |

## The recommendation: Notebook, with these grafts

1. **Buttons from Backstage, in Notebook's blue.** Full pill radius, filled, no border at rest. Primary: blue fill (`accent`) with paper text, which already measures 6.34 and 8.34. Secondary: the translucent `fill` tint with ink text and a blue icon, no hairline. Keep Backstage's sizes (36, 44, 52), its 97% press scale, and its disabled state that drops to the plain fill. This removes the rectangle and the bordered white box, which are the two shapes the operator rejected.
2. **The Add songs pair from Backstage, placed where Notebook already reserves room.** On the line above the tab bar, put Add songs as a 52 px filled blue pill and Order as a glass pill beside it, over Notebook's 20 px paper fade, with no bar and no border. Because Notebook already gives that strip 52 px of list height, the pills do not cover rows the way Studio's and Backstage's do. Keep Notebook's blank numbered last line ("13, Add songs") as the end of the list and the empty state.
3. **The lineup grid layout from Studio.** Title on its own line, icons on the line below aligned to member columns, covers on the left. That lets Notebook fit six members at 375 px instead of five, and removes the serif truncation in the grid.
4. **The song page for learning from Backstage.** Add the row of listening links (Deezer, Spotify and YouTube with their official marks from `BrandLogo.tsx`), the band takes list with play buttons, and the transpose stepper on chords. Keep Notebook's "Your part" with its highlighter.
5. **"A chosen option turns ink, never blue" from Backstage.** Notebook's chips already do this; make it a written rule so blue stays reserved for actions, which is what Notebook's bottom line depends on.
6. **The empty transition line from Backstage**, set in Notebook's pencil style: a faint "Note this transition" with a plus icon between two songs that have none.
7. **Labelled round actions from Studio** for the song page's secondary actions (Record, Practised, Notes), so icon-only controls always show their word.
8. **Drop from Notebook:** the ruled lines in the note field (the impeccable Operate guidance calls ruled paper standing in for a control a costume), and fix the specimen's action placement rule so it matches the screens.

What this costs on top of Notebook's own migration: the button variants change shape in `button.variants.ts` only, `BottomActions` holds pills instead of text buttons, and the song page gains the listening row and the transpose stepper. No new dependency beyond Notebook's Newsreader, which already needs its ADR.

## Contrast figures used above

Computed from the `tokens.css` values; light, then dark.

| Pair | Studio | Backstage | Notebook |
| --- | --- | --- | --- |
| Body text on page | 17.60 / 21.00 | 17.90 / 17.96 | 15.51 / 15.60 |
| Secondary text on page | 4.67 / 7.33 | 6.78 / 8.16 | 6.69 / 8.63 |
| Faint text on page | 2.21 / 2.84 (on surface) | 4.85 / 5.77 | 5.00 / 5.58 |
| Accent as text on page | 5.06 / 6.10 | 6.01 (`accent-ink`) / 16.33 | 5.72 / 8.50 |
| Primary button label | 5.65 / 5.06 | 15.01 / 16.33 | 6.34 / 8.34 |
| Secondary button label | 4.83 / **4.22** | 16.09 / 15.57 | 6.34 / 7.25 (blue on raised) |
| Danger text on its tint | 4.71 / 5.46 | 5.05 / 6.16 | 5.57 / 6.52 |
| Warn text on its tint | 4.84 / 7.75 | 4.77 / 9.25 | 5.17 / 8.13 |
| Primary fill against page (non-text) | 5.06 / 4.15 | **1.21** / 16.33 | not measured |

The bold figures are the two that matter: Studio's secondary button label fails AA in dark mode, and Backstage's volt pill is nearly invisible as a shape on its light page. Neither problem carries over to the recommended mix, because the grafted buttons use Notebook's blue.
