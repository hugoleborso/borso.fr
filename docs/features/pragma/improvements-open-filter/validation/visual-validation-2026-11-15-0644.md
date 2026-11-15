# Visual validation — The improvements list opens on what is still to do

- Spec: [`../spec/spec.md`](../spec/spec.md)
- Dev URL: http://localhost:5174/improvements
- Run at: 2026-11-15T06:47:00Z
- Tooling: agent-browser 0.41.2

Data setup, measured. The seed held no improvement, so the run signed in as `hugo` and created five through `POST /api/improvements` from the signed-in page, one per status (`VV idea item`, `VV planned item`, `VV building item`, `VV shipped item`, `VV declined item`). Each call returned 201. The phone session signed in as `lea` through the login form. French was selected by setting `localStorage['pragma.locale'] = 'fr'`.

## Assertions

| # | From | Assertion | Action | Evidence | Verdict |
|---|---|---|---|---|---|
| 01 | Behaviour 1 | A new filter pill, "Open" in English, comes first and is selected when the page opens. | Open `/improvements` in English at 1280 px and list the `[role=radio]` pills in DOM order | `./visual-validation-2026-11-15-0644/01-default-open-pill.png`. Snapshot shows `radio "Open 3" [checked=true]` first, followed by `All 5`, `idea 1` and the other statuses. | PASS |
| 02 | Behaviour 1 | The pill is "Ouvertes" in French, comes first and is selected when the page opens. | Set locale to `fr`, reload, list the pills in DOM order with `aria-checked` | `./visual-validation-2026-11-15-0644/02-fr-default-ouvertes.png`. Eval returns `0:Ouvertes3:true`, `1:Toutes5:false`, … `6:écartée1:false`. | PASS |
| 03 | Behaviour 1 | Open is selected when the page opens, including after another pill was used. | Select `livrée`, then reopen `/improvements` | The snapshot after the reopen shows `radio "Ouvertes 2" [checked=true]` as the only checked pill. The URL stays `http://localhost:5174/improvements`, so no filter is carried in the URL. | PASS |
| 04 | Behaviour 2 | Open shows the items whose status is idea, planned or building. Shipped and declined items are hidden. | Default view with one item per status | `./visual-validation-2026-11-15-0644/01-default-open-pill.png` and `02-fr-default-ouvertes.png`. The list holds exactly `VV idea item`, `VV planned item` and `VV building item`. The shipped and declined items are absent. | PASS |
| 05 | Behaviour 3 | Its count is the number of open items. | Read the Open pill count with 3 open items. Then change `VV building item` to `livrée` through its edit sheet (Statut select, Enregistrer) | Before the change the pill read `Ouvertes 3` with 3 open items listed. After it, `./visual-validation-2026-11-15-0644/08-count-after-ship.png` shows `Ouvertes 2`, `en cours 0` and `livrée 2`. The building item left the Open list at once. | PASS |
| 06 | Behaviour 4 | Tapping "Toutes" shows the shipped items again. | French, desktop, click `Toutes` | `./visual-validation-2026-11-15-0644/03-fr-toutes-shows-shipped.png`. `Toutes 5` is checked and all five items are listed, `VV shipped item` included. | PASS |
| 07 | Behaviour 4 | Tapping "livrée" shows the shipped items again. | French, desktop, click `livrée` | `./visual-validation-2026-11-15-0644/04-fr-livree-shows-shipped.png`. `livrée 1` is checked and the list holds only `VV shipped item`. | PASS |
| 08 | Behaviour 4 (touch) | Tapping "livrée" or "Toutes" shows the shipped items, with a real tap on a phone. | `scripts/phone.sh touch '[role=radio]:nth-of-type(6)'`, then `nth-of-type(2)`, then `nth-of-type(1)` | `./visual-validation-2026-11-15-0644/07-phone-tap-livree.png`. Each tap reported `isRealTouch: true` with pointerdown, touchstart, touchend and click on the target, and exit 0. After `livrée` the list held `VV shipped item` only. After `Toutes` it held all five. After `Ouvertes` it held the three open items. | PASS |
| 09 | Behaviour 5 | The pill row fits a 375 px screen. | Viewport 375 × 812, measure the document and the pill row | `./visual-validation-2026-11-15-0644/05-fr-375-pill-row.png`. `documentElement.scrollWidth` = 375 = `innerWidth`. The row's right edge is at 359 px. The page does not overflow sideways. | PASS |
| 10 | Behaviour 5 | The pill row scrolls sideways, as before. | At 375 px, read the row's overflow, then set its `scrollLeft` to the end | `./visual-validation-2026-11-15-0644/06-fr-375-pill-row-scrolled.png`. The row has `overflow-x: auto`, `clientWidth` 343 and `scrollWidth` 790. It scrolled to `scrollLeft` 447 and revealed `en cours`, `livrée` and `écartée`. The document width stayed 375. | PASS |
| 11 | Acceptance | On `/improvements`, a shipped item is absent until "livrée" or "Toutes" is tapped. | Combined result of rows 04, 06, 07 and 08 | `VV shipped item` is absent from the default list (01, 02) and present after `Toutes` (03) or `livrée` (04, 07). | PASS |

No screenshot had a broken `<img>`. The scan returned `[]` after each of the eight screenshots. `agent-browser errors` printed no console error for the desktop session.

## Notes

- No row is FAIL or UNVERIFIABLE.
- `07-phone-tap-livree.png` shows the pill row scrolled back to its start, so the checked `livrée` pill is off-screen. Measured, this comes from the tooling and not from the app. `scripts/phone.sh touch` re-applies the 375 px viewport after the tap, and the page passes through 1280 px on the way. At that width the row is `sm:overflow-visible`, so its scroll position resets. Reproduced without a tap: `scrollLeft` 400, then `set viewport 1280` and `set viewport 375`, gave `scrollLeft` 0. A programmatic `click()` on a pill with the row at `scrollLeft` 400 left it at 400. Logged to the friction log.
- The spec's "Out of scope" line (the API still returns every improvement) was not checked, because it is not a visible claim.

## Verdict: PASS
