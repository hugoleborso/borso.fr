# ADR-0048: Newsreader replaces Instrument Serif, self-hosted with its weight and optical size axes

- **Status:** accepted
- **Date:** 2026-10-27
- **Ratified:** by the operator in chat on 2026-10-27, with no objection
- **Deciders:** Hugo Borsoni
- **Tags:** pragma, ux-redesign, design-system, dependency, fonts

## Context

[ADR-0047](./0047-pragma-design-system-is-notebook-with-grafts.md) makes the Notebook direction pragma's design system. Notebook sets the band's own words (song, setlist and session names, at 19 to 30 px) in a serif, and anything a member wrote (entry notes, transition comments, at 14 to 16 px) in that serif's italic (`spec/design/notebook/direction.md`). Today pragma loads `@fontsource/instrument-serif` 5.3.0 in one weight, 400 upright and italic (`apps/pragma/site/src/main.tsx`, read this session), and 47 files under `apps/pragma/site/src/` name the `font-display` class: `tokens.css`, which defines it, and 46 components that use it. Instrument Serif is drawn for large display sizes, and Notebook needs the same family to stay readable in a 14 px note and to carry two weights (500 and 520) in titles.

Adding a font package is a new dependency, which is an ADR trigger here. Fonts are self-hosted through Fontsource, as pragma's three current fonts are, because a third-party font host would see every member's address on every page load. Each `@font-face` in a Fontsource stylesheet carries a `unicode-range`, so a browser downloads only the subsets a page uses; for pragma's English and French text that is the `latin` file. The installed PWA's service worker (`apps/pragma/site/public/sw.js`) caches files under `/assets/` when they are first fetched, so a font costs its bytes once per phone and per release.

Sizes below are the `latin` WOFF2 files of each package, measured this session from the npm registry tarballs (`npm pack`, 2026-10-27).

| Package (version, licence) | Upright | Italic | Total |
|---|---|---|---|
| `@fontsource/instrument-serif` 5.3.0, OFL-1.1, today | 21,032 B | 22,128 B | 43,160 B |
| `@fontsource-variable/newsreader` 5.3.0, OFL-1.1, `opsz` files (weight and optical size axes) | 132,000 B | 146,872 B | 278,872 B |
| same, `wght` files (weight axis only) | 58,084 B | 64,520 B | 122,604 B |
| `@fontsource-variable/source-serif-4` 5.3.1, OFL-1.1, `opsz` files | 122,360 B | 130,188 B | 252,548 B |
| `@fontsource-variable/literata` 5.3.0, OFL-1.1, `opsz` files | 110,080 B | 113,180 B | 223,260 B |

The direction's figure of 302 KB included Geist Mono. Spec question Q4 keeps JetBrains Mono, so Geist Mono is not part of this decision.

## Decision

**`@fontsource-variable/newsreader` replaces `@fontsource/instrument-serif`, loaded from its `opsz` stylesheets (upright and italic), latin subset in practice through `unicode-range`.** The optical size axis is the reason Newsreader was chosen in the direction: the same family draws thicker, more open letters at 14 px and finer ones at 30 px, which is exactly the range Notebook asks of it, and every screen the operator ratified was drawn with it. The cost is 235,712 bytes more than today on a phone's first load after the release. The `font-display` class keeps its name and changes its family in `tokens.css`; titles become upright and only notes stay italic, which touches each of the 46 components once.

## Consequences

- `+` One serif family covers display titles, list titles and notes, at two weights, with no faux bold and no faux italic.
- `+` The licence (SIL Open Font License 1.1) and the hosting model are the same as pragma's three current fonts: no new host, no new licence kind.
- `-` The serif costs 278,872 bytes instead of 43,160, once per phone per release. On a slow connection the first screen draws in the fallback serif and swaps (`font-display: swap` in Fontsource's CSS), so titles reflow once.
- `-` Literata or Source Serif 4 would cost 26,000 to 56,000 bytes less with the same axes; Newsreader is kept because the ratified screens were drawn with it, not because it is the lightest.
- `~` If the bytes matter later, switching the import from the `opsz` stylesheets to the `wght` ones drops to 122,604 bytes with no change outside `main.tsx`, at the cost of the optical sizes.

## Alternatives considered

### Option A — Newsreader with weight and optical size axes (chosen)

- **Summary:** As described in *Decision*.
- **Strengths:**
  - Optical sizes for the 14 to 30 px range Notebook uses.
  - The face the operator saw in every ratified screen and specimen.
- **Costs:**
  - 278,872 bytes for upright and italic, 235,712 more than today.
- **Rationale:** It is the only option that matches the ratified screens and gives the optical sizes the direction relies on.

### Option B — Newsreader with the weight axis only (rejected)

- **Summary:** The same family through the `wght` stylesheets: weights 200 to 800, one drawing for every size.
- **Strengths:**
  - 122,604 bytes, less than half of Option A.
  - Same look at the sizes it was drawn for.
- **Costs:**
  - No optical sizes: 14 px notes use the same drawing as 30 px titles, which is the weakness of Instrument Serif this change exists to fix, in a milder form.
- **Rejection rationale:** It loses on small-size readability, weighted high. It becomes the choice if a first-load measurement on a member's phone shows the font bytes matter; the switch is one import.

### Option C — Literata or Source Serif 4 (rejected)

- **Summary:** Two other self-hosted OFL serifs with the same two axes.
- **Strengths:**
  - 223,260 bytes (Literata) or 252,548 bytes (Source Serif 4), lighter than Option A.
- **Costs:**
  - Neither was drawn in any direction. Choosing one means redrawing the specimen and checking the screens again, and the operator ratified the look with Newsreader.
- **Rejection rationale:** It loses on fidelity to the ratified screens. The byte difference with Option A is under 56,000 bytes, which is not enough to reopen a ratified look.

### Option D — Keep Instrument Serif (rejected)

- **Summary:** Do not add a font. Notebook's titles and notes use Instrument Serif 400 as today.
- **Strengths:**
  - No new dependency and no byte change; no file changes its font class.
- **Costs:**
  - One weight only, so the 500 and 520 title weights in the type scale cannot be honoured.
  - Drawn for display sizes, so notes at 14 px stay thin; the direction names this as the reason for the swap.
- **Rejection rationale:** It loses on small-size readability and on the type scale, both needed by the notes that the redesign puts on every setlist row.

### Option E — The phone's own serif (rejected)

- **Summary:** A system font stack such as `ui-serif, Georgia, serif`, with no font file at all.
- **Strengths:**
  - Zero bytes.
- **Costs:**
  - A different face on each member's phone: `ui-serif` resolves to New York on Apple systems and is not supported in Chrome, so Android phones fall back to whatever serif they ship. The screens no longer match from one member to the next.
- **Rejection rationale:** It loses on fidelity, weighted high: the band compares screens across phones during a practice.

## Evaluation rubric

| Criterion | Weight | Why it matters |
|---|---|---|
| Fidelity to the ratified screens | high | The operator ratified Notebook as drawn; a different face changes every title and note. |
| Readability from 14 to 30 px, two weights | high | Notes on setlist rows are 14 to 16 px, titles 19 to 30 px at weights 500 and 520. |
| Bytes on first load | medium | Members install the PWA on their phones and open it on mobile data; the cost is paid once per release. |
| New dependency surface | low | A font package has no runtime code; the licence kind matters more than the count. |

|  | A Newsreader `opsz` | B Newsreader `wght` | C Literata or Source Serif 4 | D Instrument Serif | E System serif |
|---|---|---|---|---|---|
| Fidelity to the ratified screens | ✓ drawn with it | ✓ same family | ✗ never drawn | ✗ the face Notebook replaces | ✗ differs per phone |
| Readability, 14 to 30 px, two weights | ✓ optical sizes, weights 200 to 800 | ✗ one drawing for all sizes | ✓ optical sizes | ✗ one weight, display drawing | ✗ unknown per phone |
| Bytes on first load | ✗ 278,872 B | ✓ 122,604 B | ✗ 223,260 or 252,548 B | ✓ 43,160 B | ✓ 0 B |
| New dependency surface | ✓ OFL, Fontsource, as today | ✓ same | ✓ same | ✓ none | ✓ none |

## Implementation pointers

- Spec: [`docs/features/pragma/ux-redesign/spec/spec.md`](../features/pragma/ux-redesign/spec/spec.md), *Architectural choices* and *Slices* (slice 1)
- Direction: `docs/features/pragma/ux-redesign/spec/design/notebook/direction.md`, type scale and *Fonts*
- Plan: `docs/features/pragma/ux-redesign/plan/plan.md` (to be written by `/technical-conception`)
- Commit: stamped by `/after-task-kaizen` on merge
- Files: `apps/pragma/package.json` (add `@fontsource-variable/newsreader` 5.3.0, remove `@fontsource/instrument-serif`), `apps/pragma/site/src/main.tsx` (the two imports), `apps/pragma/site/src/styles/tokens.css` (the `font-display` family), the 46 components using `font-display`
- Related ADRs: [ADR-0047](./0047-pragma-design-system-is-notebook-with-grafts.md)
