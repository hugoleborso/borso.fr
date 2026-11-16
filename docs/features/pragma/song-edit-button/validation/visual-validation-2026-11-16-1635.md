# Visual validation — A song is edited in one tap from its page

- Spec: [`../spec/spec.md`](../spec/spec.md)
- Dev URL: http://localhost:5174/
- Run at: 2026-11-16T16:38:06Z
- Tooling: agent-browser 0.41.2

The spec is in the short form. One row per bullet of *Behaviour* and *Acceptance* that a browser can show. *Out of scope* (the edit form itself) has no row. Desktop rows ran signed in as hugo at 1280 × 800. Phone rows ran signed in as lea in the `phone` session at 375 × 812 with touch emulation, through `scripts/phone.sh`. The locale was switched with the FR / EN buttons under Account > Language.

## Assertions

| # | From | Assertion | Action | Evidence | Verdict |
|---|---|---|---|---|---|
| 01 | Behaviour 1 | The song page header shows a button labelled "Edit" in English, with a pencil icon, right of the title. | Open `/catalog/cfdcfaea-…` (Midnight Drive) in EN at 1280 px, screenshot, measure the `h1` and the link | `./visual-validation-2026-11-16-1635/01-header-edit-button-en-desktop.png`. Link text `Edit`, holds an `<svg>` pencil path `M14 4l6 6L8 22H2v-6L14 4z`. Link left 890.7 px > title right 878.7 px, same top (72 px) | PASS |
| 02 | Behaviour 1 | The same button is labelled "Modifier" in French. | Switch to FR in Account > Language, reopen the song page, screenshot | `./visual-validation-2026-11-16-1635/01b-header-edit-button-fr-desktop.png`. `html[lang]=fr`, header link text `Modifier` with an `<svg>` | PASS |
| 03 | Behaviour 2 | Tapping it opens `/catalog/<song id>/edit`, the song edit form. | `scripts/phone.sh touch 'a[href$="/edit"]'` at 375 px, then read the URL and the snapshot | `./visual-validation-2026-11-16-1635/04-tap-header-edit-opens-song-form.png`. Touch verdict `isRealTouch: true`, events pointerdown, touchstart, touchend, click all on target. URL = `http://localhost:5174/catalog/cfdcfaea-d889-4a52-9898-00f72717262c/edit`, form shows TITRE, INTERPRÈTE, STATUT, ORIGINE, Enregistrer | PASS |
| 04 | Behaviour 3 | The header has no "..." menu any more. | List every `button` on the song page, count `[aria-haspopup]`, search the header and main text for "…" / "..." | `./visual-validation-2026-11-16-1635/01-header-edit-button-en-desktop.png`. Buttons on the page = `Edit` (lineup), `Record a take`. `[aria-haspopup]` count = 0 on all six seeded songs at 375 px and on Midnight Drive at 1280 px. No ellipsis in header or main text | PASS |
| 05 | Behaviour 4 | The lineup keeps its own "Modifier" button beside the lineup chips, which opens the lineup editor. | Desktop: click the button in the `Default lineup` section. Phone (FR): `scripts/phone.sh touch 'section[aria-label] button'` | `./visual-validation-2026-11-16-1635/03-lineup-edit-opens-lineup-editor.png` (dialog "Default lineup" with role chips per member). `./visual-validation-2026-11-16-1635/05-tap-lineup-modifier-opens-lineup-editor-375px.png` (sheet "Lineup par défaut"). URL stays on the song page. Touch verdict `isRealTouch: true` | PASS |
| 06 | Behaviour 5 | At 375 px the header button, the title, the artist and the status chip all show without overlapping or a sideways scroll (EN). | Phone session at 375 px, screenshot, measure the four boxes and the scroll widths | `./visual-validation-2026-11-16-1635/02-header-375px-en.png`. title 108–274, button 286–359, artist 108–184, chip 108–205 (x px). Overlaps = none, none off screen. `documentElement`, `body`, `main`, `header` scrollWidth = 375 | PASS |
| 07 | Behaviour 5 | Same at 375 px in French, where the label is wider. | Same measurement on all six seeded songs in FR | `./visual-validation-2026-11-16-1635/02b-header-375px-fr.png`, `./visual-validation-2026-11-16-1635/02c-header-375px-fr-runaway-sun.png`. Midnight Drive: title 108–245, button 257–359, chip 108–185. Afterglow, Last Call, Lightning, Runaway Sun, Slow Burn, Midnight Drive all report no overlap and scrollWidth = 375 | PASS |
| 08 | Acceptance | On a song page, one tap on the header Edit button shows the song edit form. | Same single real touch as row 03 | `./visual-validation-2026-11-16-1635/04-tap-header-edit-opens-song-form.png`. One `touch` call, URL ends `/edit`, form rendered | PASS |

The broken-image scan returned `[]` after every screenshot. `agent-browser errors` reported no console error in either session.

## Notes

- No FAIL or UNVERIFIABLE row.
- Seeded titles are at most two words ("Midnight Drive", "Runaway Sun"). Both wrap to two lines at 375 px and still clear the button. A much longer title was not tested, because the spec makes no claim about one and creating a song would change the seeded data.
- In the lineup tap of row 05, `scripts/phone.sh touch` reported a real touch on target, then exited 1. The page had been left 1280 px wide after the tap. The viewport was set back to 375 px before the screenshot was taken. This is a problem with the tooling, not with the app, and it is logged to the kaizen log.

## Verdict: PASS
