# Visual validation — Les douze travaux

- Spec: [`../spec/spec.md`](../spec/spec.md)
- Dev URL: http://localhost:5173/12-travaux/
- Run at: 2026-05-12T15:35:00Z
- Tooling: agent-browser 0.27.0

## Assertions

| # | From | Assertion | Action | Evidence | Verdict |
|---|---|---|---|---|---|
| 01 | Result | Masthead has `borso.fr` link (back to home) | Inspected anchor; href is `http://localhost:5173/` | `masthead_href = http://localhost:5173/`; `./visual-validation-2026-05-12-1529/01-initial-load.png` | PASS |
| 02 | Result | Year switcher has one button per year in `data.ts` (2025, 2026) | Snapshot lists buttons "2025" and "2026" | `year_buttons = ["2025", "2026"]`; `./visual-validation-2026-05-12-1529/01-initial-load.png` | PASS |
| 03 | Result | Title block "Les douze travaux." Instrument Serif italic, accent dot in saffron | Inspected `h1` outer HTML: font-family Instrument Serif, italic, accent dot `<span style="color: rgb(232, 90, 37)">.</span>` | `./visual-validation-2026-05-12-1529/01-initial-load.png` | PASS |
| 04 | Result | Hero year as a 220px numeral | `getComputedStyle(h2[0]).fontSize === "220px"` for "2026" | `heroYearSize = 220px`; `./visual-validation-2026-05-12-1529/01-initial-load.png` | PASS |
| 05 | Result | Year title/subtitle present | DOM text contains "ÉDITION", "2026", "Deuxième édition.", "Plus structuré..." | `./visual-validation-2026-05-12-1529/01-initial-load.png` | PASS |
| 06 | Result | Year-progress bar present | Found a 467×10px `<div>` with bg `rgb(214, 205, 184)` containing a fill div at 32.5% width with bg `rgb(23, 20, 16)` | `./visual-validation-2026-05-12-1529/01-initial-load.png` | PASS |
| 07 | Result | 3 mini-stats (quotidiens / ponctuels / restants) | DOM text matches `QUOTIDIENS / 6`, `PONCTUELS / 13`, `RESTANTS / 11` | `./visual-validation-2026-05-12-1529/01-initial-load.png` | PASS |
| 08 | Result | Featured month: striped image slot + month name as 108px numeral | Featured "Mai." heading present in `h2`; month chapter and image slot rendered | `./visual-validation-2026-05-12-1529/01-initial-load.png` | PASS |
| 09 | Result | Per-challenge rows: numbered, with status tag, kind label | Janvier 2026 shows "1. Mois de la positivité — ... RÉUSSI QUOTIDIEN", "2. Sport tous les jours RÉUSSI QUOTIDIEN" | `./visual-validation-2026-05-12-1529/05-no-note-no-empty-quote.png` | PASS |
| 10 | Result | Optional note (« » quote) renders only when present | Janvier 2026 challenge 1 (no note) renders no « character; Février 2026 renders « ... » quotes on three challenges that have notes | `hasQuoteChar = false` on Janvier 2026; quotes present on Février | PASS |
| 11 | Result | Optional proof chips renders only when present | Janvier 2026 challenge 1 (no proofs) renders no proof row; challenge 2 (Sport tous les jours) renders 4 proof chips (Jours, Temps, Distance, Dénivelé) | `./visual-validation-2026-05-12-1529/05-no-note-no-empty-quote.png` | PASS |
| 12 | Result | Filmstrip: 12 cards in one row, one per month | Snapshot lists 12 buttons e8..e19 labelled `01 Janvier` through `12 Décembre` | `cardCount = 12`; `./visual-validation-2026-05-12-1529/01-initial-load.png` | PASS |
| 13 | Result | Footer rule: minimal "borso.fr · les 12 travaux" line | Body text ends with `borso.fr · les 12 travaux` | `./visual-validation-2026-05-12-1529/01-initial-load.png` | PASS |
| 14 | Happy 1 | Homepage nav link "Les 12 travaux de Borso" points to `/12-travaux/`, not Rickroll | Opened `/`; link `Les 12 travaux de Borso` href is `http://localhost:5173/12-travaux/`; not Rickroll URL | `href = http://localhost:5173/12-travaux/`; `./visual-validation-2026-05-12-1529/09-homepage-nav.png` | PASS |
| 15 | Happy 2 | Page renders with current year (latest in `data.ts`) | Hero year "2026" displayed on initial load; 2026 is the latest year in data.ts | `./visual-validation-2026-05-12-1529/01-initial-load.png` | PASS |
| 16 | Happy 3 | Featured month panel shows current month if current year selected; else month 1 of selected year | Initial load shows MAI 2026 = current month per today=2026-05-12 (clock-sensitive observation, but it matched) | `./visual-validation-2026-05-12-1529/01-initial-load.png` | PASS |
| 17 | Happy 4 | Clicking year 2025 → year switches, featured resets to Janvier 2025, hero updates | After clicking 2025: hero `h2` = "2025"; featured `h2` = "Janvier."; focus label `MOIS EN FOCUS · 01/2025` | `./visual-validation-2026-05-12-1529/02-year-2025-january.png` | PASS |
| 18 | Happy 5 | Clicking Mars filmstrip card re-renders featured to March; March card inverts (dark fill) | After clicking Mars 2025: focus label `MOIS EN FOCUS · 03/2025`, hero=Mars.; March card bg = rgb(23, 20, 16), light text; all other cards transparent | `./visual-validation-2026-05-12-1529/03-mars-2025-active.png` | PASS |
| 19 | Happy 6 | Clicking back current year shows current month (clock-dependent) | Switched 2025 → 2026, featured returned to MAI (current month, May 2026); behaviour observed but per spec, clock-sensitive | `./visual-validation-2026-05-12-1529/04-doing-saffron-fill.png` | PASS |
| 20 | Happy 7 | Clicking `borso.fr` masthead returns to homepage | Clicked @e2 BORSO.FR; URL became `http://localhost:5173/` | `get url = http://localhost:5173/` | PASS |
| 21 | Edge | A month with **zero challenges** renders empty card / "0 sur 0 aboutis" | No zero-challenge month exists in current `data.ts` (all months have ≥1 challenge across both years). Branch not exercisable from running data. | Inspected all 12 cards × 2 years; minimum score = `0/1` | UNVERIFIABLE |
| 22 | Edge | Challenge without a note renders only title + status tag + kind label (no empty « ») | Janvier 2026 challenge 1 has no `note`: rendered text shows no `«` character anywhere in body | `hasQuoteChar = false`; `./visual-validation-2026-05-12-1529/05-no-note-no-empty-quote.png` | PASS |
| 23 | Edge | Challenge without proofs renders no proof-chip container | Janvier 2026 challenge 1 (no proofs) renders no `#` proof marker between its rows; only challenge 2 does | `./visual-validation-2026-05-12-1529/05-no-note-no-empty-quote.png` | PASS |
| 24 | Edge | `status: 'doing'` is only status with **filled saffron** background tag; all others bordered-only | EN COURS span: bg `rgb(232, 90, 37)` (saffron), color `rgb(244, 237, 225)` (light); RÉUSSI/PARTIEL/ABANDONNÉ: bg transparent with bordered status colour | `./visual-validation-2026-05-12-1529/04-doing-saffron-fill.png`, `./visual-validation-2026-05-12-1529/06-fevrier-statuses.png` | PASS |
| 25 | Edge | Viewport ≤ 760px: filmstrip scrolls horizontally; each card ≥ 160px | `gridTemplateColumns = 160px × 12`; `overflowX = auto`; min card width 160px | `./visual-validation-2026-05-12-1529/07-viewport-760.png` | PASS |
| 26 | Edge | Viewport ≤ 760px: hero / featured / masthead collapse to single column | Layout collapses at 760px (full-page screenshot confirms vertical stacking) | `./visual-validation-2026-05-12-1529/07-viewport-760.png` | PASS |
| 27 | Edge | Viewport ≤ 900px: hero year font drops to 140px, title to 96px | At 900px: hero h2 fontSize `140px`, h1 fontSize `96px`; baseline 1280px: hero `220px`, h1 `148px` | `./visual-validation-2026-05-12-1529/08-viewport-900.png` | PASS |
| 28 | Edge | If today not in `data.ts`, page renders with latest year; no current-month dot | Today (2026-05-12) is in `data.ts`; the negative branch cannot be triggered without modifying data | n/a — not exercisable from running data | UNVERIFIABLE |
| 29 | Q.O.D. | Year-switch behaviour: switching to non-current year features month 1 | Verified at row 17 — clicking 2025 (non-current relative to today 2026) features Janvier 2025 | `./visual-validation-2026-05-12-1529/02-year-2025-january.png` | PASS |
| 30 | Q.O.D. | "+ ajouter une preuve" button dropped | No add-proof button found in DOM (no matching button text); only filmstrip card buttons present | snapshot enumerates only 12 month buttons + 2 year buttons + 1 masthead link | PASS |
| 31 | Q.O.D. | "chronique mensuelle · n° X" / "Reprise de la mesure le 1er de chaque mois." chrome dropped | DOM body text contains neither phrase | inspected `body.innerText` — only "MOIS EN FOCUS · MM/YYYY" framing remains | PASS |
| 32 | Q.O.D. | Striped image placeholders kept (not real photos) | Featured month renders a striped image slot in v0 layout | `./visual-validation-2026-05-12-1529/01-initial-load.png` (left side of featured panel) | PASS |
| 33 | Test strategy | Page renders without console errors | No JS errors reported; broken-image scan returns empty array on initial load, after each interaction, and at every viewport | `brokenImgs = 0`; no error overlays observed | PASS |
| 34 | Result | Current month carries a saffron dot in filmstrip | Mai 2026 card contains a 6×6 span with bg `rgb(232, 90, 37)` (saffron); clock-sensitive observation matched today=2026-05-12 | `./visual-validation-2026-05-12-1529/01-initial-load.png` | PASS |

## Notes

- Row 21 (zero-challenge month): the data.ts shipped at this revision contains at least 1 challenge for every month across both 2025 and 2026 (smallest observed score is `0/1`). The edge case is implemented in the component (the spec describes `0 sur 0 aboutis` text + empty bars) but cannot be exercised without mutating data.ts; marked UNVERIFIABLE per the standard rather than implicit PASS.
- Row 28 (today outside `data.ts`): the validator cannot mock `Date.now()` from agent-browser, and today (2026-05-12) falls within the 2026 dataset, so the fallback branch ("today not in data") cannot be triggered from the running app. Marked UNVERIFIABLE rather than skipped, per the standard.
- Clock-sensitive observations (rows 16, 19, 34) are not used as the basis for FAIL — per spec Test strategy, the page reads real `new Date()` and these assertions are explicitly excluded from /visual-validation. They are reported as PASS only because the observed state happened to match the deterministic shape of the assertion at this run-time (May 2026 in 2026 dataset, with saffron dot on Mai).

## Verdict: PASS_EXCEPT_UNVERIFIABLE
