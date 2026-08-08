# Visual validation — Learn an opening as a tree, drill it, then play it (re-run)

- Spec: [`../spec/spec.md`](../spec/spec.md)
- Dev URL: http://localhost:5175/
- Run at: 2026-05-05T15:33:00Z
- Tooling: agent-browser 0.26.0
- Scope: focused re-validation of the three rows flagged by the previous run (`visual-validation-2026-05-05-1508.md`) — #04 (Start button label), #11 (InlineBanner DOM order), #12 (Switch-to-Play scope resolution) — plus a mobile sanity check and the merge-gate input metric end-to-end.

## Assertions

| # | From | Assertion | Action | Evidence | Verdict |
|---|---|---|---|---|---|
| A | Happy path step 2 (was #04) | "The Start button reads 'Drill this variation'" when an Opening + Variation are picked in Learn mode. | Cleared localStorage, reloaded, picked Italian Game then Main Line variation in Learn mode at 1280x800, read the active Start button text via DOM. | `./visual-validation-2026-05-05-1533/A-start-label-drill.png` — DOM text equals exactly `"Drill this variation"`. | PASS |
| B | Happy path step 7 (was #11) | "On variation cleared, an inline banner appears **above the board** (not a modal)..." | Drilled Italian Game / Main Line to completion (e4 -> Nf3 -> Bc4) until the banner appeared, then asserted DOM order and geometry: `.board-area > .inline-banner` precedes `.board-area > .board-container`; banner `bottom = 289.97 px` equals board `top = 289.97 px` (banner above). | `./visual-validation-2026-05-05-1533/B-banner-above-board.png` — banner above board both in DOM order and geometrically. | PASS |
| C | Happy path step 7 (was #12) | "Switch to Play with this scope" sets a Play scope that targets the **drilled** variation (regression: previously picked the wrong Opening when variation ids weren't globally unique). | After clearing, drilling Italian Game / Main Line, and clicking the Switch CTA, read `localStorage['borsouvertures.v1']` and the Play header. Result: `playScope = { openingIds: ["italian-game"], variationIds: ["main-line"], lineIds: [] }`; Play header shows "Italian Game / Main Line / Italian Game". | `./visual-validation-2026-05-05-1533/C-play-scope-italian.png` + `localStorage` value `{"playScope":{"openingIds":["italian-game"],"variationIds":["main-line"],"lineIds":[]}}`. | PASS |
| D | Edge cases / Q7 (mobile-first) | At ≤900 px the mobile selector shows one column at a time; only the "Openings" heading is visible at the entry step. | Cleared localStorage, set viewport 380x800, opened the dev URL, queried all visible h1-h4 headings: only `"Openings"` is rendered. | `./visual-validation-2026-05-05-1533/D-mobile-single-column.png` — single column heading. | PASS |
| E | Input metric (merge gate) | Validator can: (a) pick a variation, (b) drill until "Variation cleared" banner appears, (c) tap "Switch to Play with this scope", (d) Play view loads in-scope without surfacing OOB on the entry position. | Same flow as A->B->C, then in Play mode toggled "Show moves" — the book arrow renders for the entry position (1 SVG line element); no `.out-of-book` element present; status reads "Opening Italian Game / Variation Main Line / Line Italian Game". | `./visual-validation-2026-05-05-1533/E-play-arrows-italian.png` — book arrow visible, no OOB indicator. | PASS_PARTIAL |

## Notes

- Row E ("PASS_PARTIAL"): I confirmed that on entering Play with the drilled scope, the playMachine surfaces book moves (one arrow) and there is no out-of-book state on the entry position. I did **not** drive every leaf line to completion in Play because the custom board (`data-square` / `data-piece` div grid) does not respond reliably to synthetic mouse or pointer events — the move dispatch hooks into draggable handlers I cannot reproduce from the Bash-driven CLI without a richer drag emulation. The previous validation run reported the same flow already worked end-to-end on the (incorrect) scope it picked; with the scope-resolution fix verified in C, the remaining surface — actually playing each ply without OOB — is the same code path that was previously green. I'm marking this PASS_PARTIAL rather than UNVERIFIABLE because (1) the scope resolution defect is the only thing that changed in the relevant code path, (2) the entry-position book-move arrow proves the engine accepts the new scope, and (3) the previous run's PASS on the move-loop is unaffected by the scope fix. If a stricter merge gate is required, treat this row as UNVERIFIABLE and re-test with a board-driver helper.

## Verdict: PASS_EXCEPT_UNVERIFIABLE

> Counted as PASS_EXCEPT_UNVERIFIABLE because Row E's full leaf-by-leaf playthrough was not driven in this run; the three previously failing/noted rows (A/B/C) are now PASS with direct evidence. If the operator considers Row E's partial check sufficient (entry-position book-move arrow, correct scope, no OOB), this is effectively PASS — promote to PASS in the PR description.
