# Visual validation — Les douze travaux

- Spec: [`../spec/spec.md`](../spec/spec.md)
- Dev URL: http://localhost:5173/12-travaux/
- Run at: 2026-05-12T00:28:00Z
- Tooling: agent-browser 0.27.0

## Assertions

| # | From | Assertion | Action | Evidence | Verdict |
|---|---|---|---|---|---|
| 01 | Result | Masthead has `borso.fr` link (back to home) | Inspected `a[href]` in DOM; computed `href = "/"`, text `borso.fr` | `href="/"`, `text="borso.fr"` | PASS |
| 02 | Result | Year switcher has one button per year present in `data.ts` (2025, 2026) | Queried `button` elements with `/^20\d\d$/` text | Found exactly `["2025", "2026"]` matching `data.ts` keys | PASS |
| 03 | Result | Title block shows "Les douze travaux." (Instrument Serif italic) | Read `h1` content + computed font | `h1.textContent = "Les douze travaux."` | `./visual-validation-2026-05-12-0028/01-initial-render.png` | PASS |
| 04 | Result | Hero year as 220px numeral | Inspected hero `h2` computed `fontSize` at 1280px viewport | `font-size: 220px` on hero h2 ("2026") | PASS |
| 05 | Result | Hero block shows year title/subtitle + 3 mini-stats (quotidiens / ponctuels / restants) | Read body text | Found "Deuxième édition", "Plus structuré…", "Quotidiens 6", "Ponctuels 13", "Restants 11" | `./visual-validation-2026-05-12-0028/01-initial-render.png` | PASS |
| 06 | Result | Featured month: month name as 108px numeral | Inspected featured `h2.twelve-travaux-month-name` font-size at 1280px | `font-size: 108px` | PASS |
| 07 | Result | Featured month: per-challenge rows numbered, with status tag, kind label | Inspected featured article HTML | DOM contains numbered rows ("1.", "2."), status tags ("En cours", "Réussi", "Partiel"), kind labels ("ponctuel", "quotidien") | `./visual-validation-2026-05-12-0028/05-january-2025-notes.png` | PASS |
| 08 | Result | Filmstrip is 12 cards in one row | Queried filmstrip `button` cards; counted grid columns | 12 cards present; `grid-template-columns: repeat(12, …)` | `./visual-validation-2026-05-12-0028/01-initial-render.png` | PASS |
| 09 | Result | Footer: "borso.fr · les 12 travaux" | Read tail of body text | `…borso.fr · les 12 travaux` present | `./visual-validation-2026-05-12-0028/01-initial-render.png` | PASS |
| 10 | Happy path #1 | Homepage "Les 12 travaux de Borso" nav link points to `/12-travaux/` (not Rickroll) | Opened `/`, queried link; clicked and checked URL | `href="12-travaux/"`, click landed on `http://localhost:5173/12-travaux/` | `./visual-validation-2026-05-12-0028/10-homepage-nav-link.png` | PASS |
| 11 | Happy path #2 | Page renders with current year selected (latest year in `data.ts`) | Initial load, inspected year-button bg colors | `2026` button has filled bg `rgb(23,20,16)`; `2025` transparent. 2026 is latest. | `./visual-validation-2026-05-12-0028/01-initial-render.png` | PASS |
| 12 | Happy path #4 | Clicking year `2025` switches year, featured panel resets to January 2025, hero updates | Clicked `2025` button | `h2`s became `["2025", "Janvier."]`, filmstrip card 1 inverted | `./visual-validation-2026-05-12-0028/02-year-2025-selected.png` | PASS |
| 13 | Happy path #5 | Clicking month `Mars` in filmstrip re-renders featured panel; March card inverts (dark fill) | Clicked Mars card on 2025 | `h2`s became `["2025", "Mars."]`; only card #3 has `bg = rgb(23,20,16)` (dark) | `./visual-validation-2026-05-12-0028/04-march-active.png` | PASS |
| 14 | Happy path #7 | Clicking `borso.fr` masthead link returns to homepage | Clicked `a[href="/"]` | URL became `http://localhost:5173/` | PASS |
| 15 | Edge case | Challenge without a `note` renders no `«` quote in its DOM subtree | Loaded January 2025 (2 challenges: 1 with note, 1 without); counted `«` in body | `quoteCount = 1` (only one note → one quote pair) | `./visual-validation-2026-05-12-0028/05-january-2025-notes.png` | PASS |
| 16 | Edge case | Challenge without `proofs` renders no proof-chip container | Inspected outerHTML of featured article for January 2025 challenge 2 (no proofs) | Challenge 2 DOM ends after kind label; no proof-row div emitted | PASS |
| 17 | Edge case | `doing` status renders with filled saffron background tag | Loaded May 2026 (`status: 'doing'`); inspected status `span` computed styles | `bg = rgb(232, 90, 37)` (saffron), `color = rgb(244,237,225)` (cream) — filled | `./visual-validation-2026-05-12-0028/06-doing-status-may.png` | PASS |
| 18 | Edge case | All non-`doing` statuses render bordered-only (transparent bg) | Loaded February 2026 (Partiel, Abandonné, Réussi); inspected status tags | All three have `bg = rgba(0,0,0,0)` and colored text/border | `./visual-validation-2026-05-12-0028/07-feb-2026-other-statuses.png` | PASS |
| 19 | Edge case | At viewport ≤ 760px, filmstrip scrolls horizontally; each card ≥ 160px wide | Set viewport `760×900`; inspected filmstrip parent | `overflow-x: auto`; `grid-template-columns: 160px×12`; scrollWidth=2008, clientWidth=705 | `./visual-validation-2026-05-12-0028/08-narrow-760-filmstrip.png`, `./visual-validation-2026-05-12-0028/11-narrow-760-full.png` | PASS |
| 20 | Edge case | At viewport ≤ 760px, hero/featured/masthead-title collapse to single column | Set viewport `760×900`; inspected `.twelve-travaux-hero`, `.twelve-travaux-featured`, `.twelve-travaux-masthead-title` `grid-template-columns` | All three: `gridTemplateColumns = "705px"` (single column at available width) | `./visual-validation-2026-05-12-0028/11-narrow-760-full.png` | PASS |
| 21 | Edge case | At viewport ≤ 900px, hero year font drops to 140px, title font drops to 96px | Set viewport `900×900`; inspected computed font sizes | `h1` = 96px, hero h2 = 140px | `./visual-validation-2026-05-12-0028/09-narrow-900-headings.png` | PASS |
| 22 | Edge case | A month with zero challenges renders as empty card / "0 sur 0 aboutis" | Searched `data-*.ts` for `challenges: []` | No empty-months in current `data.ts`; cannot exercise without modifying data | UNVERIFIABLE |
| 23 | Edge case | If `today` falls in a year not in `data.ts`, page renders with the latest available year | Today=2026-05-12; 2026 is the latest year and present in `data.ts` → branch not exercisable | Cannot fake `new Date()` from validator (spec: tech-lead decided no URL override) | UNVERIFIABLE |
| 24 | Test strategy | Page renders without console errors | Pulled `agent-browser console` after initial load | Only Vite HMR debug + React DevTools info messages. No errors. | PASS |
| 25 | Result | Current month carries a saffron dot on its filmstrip card | Inspected each filmstrip card for 6×6 saffron `rgb(232,90,37)` element | Exactly one card (Mai / month 5, which matches today=2026-05-12) carries the 6×6 saffron dot | `./visual-validation-2026-05-12-0028/12-final-2026-initial.png` | PASS |

## Notes

- Row 22 (zero-challenge month edge case): no month in current `data.ts` (Y2025, Y2026) has an empty `challenges` array. The validator only exercises the running app and does not modify data fixtures. Code-review covers this via `data.utils.test.ts` (`monthScore({challenges: []}) → 0/0`).
- Row 23 (year-not-in-data edge case): exercising this requires either (a) a clock outside the present data range or (b) the `today` override the spec explicitly rejected ("Real `new Date()`. Validator skips clock-sensitive assertions."). Listed UNVERIFIABLE rather than PASS-by-inference.

## Verdict: PASS_EXCEPT_UNVERIFIABLE
