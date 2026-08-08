# Visual validation — Redesign de la front page borso.fr — galaxie WebGL + Major Mono Display (re-validation)

- Spec: [`../spec/spec.md`](../spec/spec.md)
- Dev URL: http://localhost:5173/
- Run at: 2026-05-14T13:10:00Z
- Tooling: agent-browser 0.27.0
- Scope: targeted re-check of the previously-failing row #12 (mobile menu fills viewport) after commit 7dacc07 added `left: 0` to the `.menu` rule inside `@media (max-width: 640px)` in `apps/borso-fr/site/style.css`. Plus smoke checks confirming no regression on the other rows that PASS'd in the 12:57Z run.

## Assertions

| # | From | Assertion | Action | Evidence | Verdict |
|---|---|---|---|---|---|
| 12 | Result / Edge | Mobile (≤ 640 px) — menu when open fills the screen, backdrop blur, font-size 22 px | Set viewport 360×640, open menu via burger, read `.menu` rect + computed style + screenshot | `rect = {left:0, right:360, top:0, bottom:640, width:360, height:640}` at viewport 360×640. `fillsViewportX:true`, `fillsViewportY:true`. CSS `left:0px, right:0px, top:0px, bottom:0px, position:fixed`. `backdropFilter: "blur(12px)"`, link `font-size: 22px`. Screenshot shows the full-screen dark blurred overlay with the 5 menu links centered — no galaxy strip on the left, no title bleed-through. `./visual-validation-2026-05-14T1310Z/02-mobile-menu-open.png` | PASS |
| S1 | Smoke / Q.O.D. | Burger menu fermé par défaut au chargement | Load page at mobile viewport, read initial state | `bodyClasses:"animate-in"` (no `menu-open`), `menuClass:"menu"` (no `is-open`), `menuAriaHidden:"true"`, `burgerAriaExpanded:"false"`. `./visual-validation-2026-05-14T1310Z/01-mobile-default.png` | PASS |
| S2 | Smoke / Result | Title `borso.fr` uses Major Mono Display | Read computed font-family + textContent on `.title` | `titleText:"borso.fr"`, `titleFont:"\"Major Mono Display\", ui-monospace, monospace"` (mobile + desktop). `./visual-validation-2026-05-14T1310Z/03-desktop-smoke.png` | PASS |
| S3 | Smoke / Happy 4 | Click burger opens menu — body gains `menu-open`, `.menu` gains `is-open` | Click `@e1` then re-read state | `bodyClasses:"animate-in menu-open"`, `menuClass:"menu is-open"`. `./visual-validation-2026-05-14T1310Z/02-mobile-menu-open.png` | PASS |
| S4 | Smoke / Use case K2 | Escape closes the menu | `agent-browser press Escape` from open state, re-read | `bodyClasses:"animate-in"`, `menuClass:"menu"`, `ariaHidden:"true"`. | PASS |
| S5 | Smoke / Result | Galaxy WebGL canvas renders on desktop | Inspect `#bg-canvas-wrap canvas` after desktop reload | `hasCanvas:true`. `./visual-validation-2026-05-14T1310Z/03-desktop-smoke.png` | PASS |
| S6 | Validator standard | Broken-image scan returns empty on every captured page | Run the standard scan after each screenshot | `[]` on `01-mobile-default.png`, `02-mobile-menu-open.png`, and `03-desktop-smoke.png`. No `<img>` elements in the page (icons are inline SVG). | PASS |

## Notes

> No FAIL or UNVERIFIABLE rows.

- The CSS fix is confirmed at `apps/borso-fr/site/style.css:175` — inside the `@media (max-width: 640px)` block, the `.menu` rule now includes `left: 0;` alongside the pre-existing `right: 0`. This forces `width = 100vw` on the fixed-positioned menu at mobile breakpoints, closing the ~74 px galaxy strip that the prior run flagged.
- The smoke-test rows (S1–S6) re-cover the previously-PASSing assertions enough to confirm the fix didn't regress the burger toggle, body-class plumbing, font choice, WebGL canvas, or image hygiene. Rows that were already PASS in the 12:57Z run and that aren't touched by this CSS-only change (reduced-motion frozen frame, exhaustive link list, stage opacity/scale, stagger delays, grain overlay) were not re-screenshotted — see the prior report.

## Verdict: PASS

