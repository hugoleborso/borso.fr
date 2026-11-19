# Visual validation — Friction inventory of PRs #380 and #381

- Spec: [`../inventory.md`](../inventory.md), round 2, after `cd1f627ee` reverted the close-on-detach in `openDialogOnAttach` (inventory row 27 is now a `knowledge:` decision)
- Dev URL: http://localhost:5174/ (Vite dev server, React `StrictMode` on). Every row ran on the dev server this round; no production build was used
- Run at: 2026-11-19T22:08:51Z
- Tooling: agent-browser 0.41.2, `scripts/phone.sh touch` for the phone rows

The inventory has no Result or use-case sections. The rows below are its `fixed:` and `knowledge:` decisions that change what pragma shows or does: rows 15, 18 and 19, and the Scene Mode popup behaviour row 27 records. Rows 07, 08, 13, 14, 16 and 22 change tooling, skills or test setup, not pragma, and are left to the technical review. Row 07's `text=` target was still exercised by rows 17 and 18 below.

## Assertions

| # | From | Assertion | Action | Evidence | Verdict |
|---|---|---|---|---|---|
| 01 | Row 15 | `POST /api/__test/seed?practice=today` adds a practice dated today with three songs | Reseed with the parameter, sign in as hugo at 375 px, read the home | `./visual-validation-2026-11-19-2240/01-home-practice-today.png`. Next session reads "PRACTICE, Thu, Nov 19, 2026 · 23:05", "Répète du jour, 3 songs", part list Runaway Sun, Last Call, Lightning | PASS |
| 02 | Row 15 | That practice shows the crowded action row | Open the practice at 375 px and measure the action row | `./visual-validation-2026-11-19-2240/02-practice-crowded-row-375.png`. Three actions at y 704: "Start the practice" (64 to 255 px), "Order songs" (263 to 307), "Choose songs" (315 to 359). `scrollWidth` = 375 | PASS |
| 03 | Row 15 | The practice is opt-in, so a plain seed writes none | Reseed with no parameter, sign in as lea, read the home and `GET /api/sessions` | `./visual-validation-2026-11-19-2240/17-home-default-seed-no-practice.png`. Next session is the concert of Nov 26. `/api/sessions` kinds = `["concert"]`, against `["practice","concert"]` after the opt-in seed | PASS |
| 04 | Rows 15, 35 | A practice today lights every member's flame | Signed in as lea, `GET /api/streaks` after each seed | Plain seed: Marc `[0,false]`, Sarah `[0,false]`. `practice=today`: Marc `[1,true]`, Sarah `[1,true]` | PASS |
| 05 | Row 15 | The practice would erase Hugo's seeded open-today flame | Signed in as lea, not hugo, so Hugo's own sign-in records no presence. `GET /api/streaks` after each seed | Plain seed: Hugo `{days:4, isTodayCounted:false}`, an open flame. `practice=today`: Hugo `{days:5, isTodayCounted:true}`, no longer open | PASS |
| 06 | Row 18 | The seed writes one inspiration with no author, and its card reads "former member" | Open `/inspirations` at 375 px | `./visual-validation-2026-11-19-2240/03-inspiration-former-member.png`. "Call Me Maybe" reads "former member · in 0 sketches" | PASS |
| 07 | Row 19 | The rename keeps the home "My part" list working | Read the home part list, its glyph labels and links | `./visual-validation-2026-11-19-2240/04-home-my-part.png`. Rows Runaway Sun `[Batterie]`, Last Call `[Batterie, Chant]`, Lightning `[Batterie]`, each linking to `/setlists/<id>?member=<id>` | PASS |
| 08 | Row 19 | The URL value `?view=part` stays, since old links use it | Open `/?view=tasks`, then `/?view=part`, then pick "My tasks" | `./visual-validation-2026-11-19-2240/07-home-view-part.png`. `?view=part` selects "My part" (`aria-selected=true`). `?view=tasks` selects "My tasks". The tab writes `?view=tasks` back | PASS |
| 09 | Row 19 | The setlist member filter and lineup grid render after the rename | Follow the home link, then the Lineup and My part tabs | `./visual-validation-2026-11-19-2240/05-setlist-member-filter.png`, `./visual-validation-2026-11-19-2240/06-setlist-lineup-tab.png`. Member link selects "My part" with glyphs per song. Tabs write `?view=lineup` and `?view=my-part`. Cell labels read "Runaway Sun: Hugo plays Batterie." and so on. `scrollWidth` = 375 | PASS |
| 10 | Row 19 | i18n values stay, such as "Show the part of Bruno" | Read the lineup grid's member buttons | Buttons read "Show the part of Hugo", "… Léa", "… Marc", "… Sarah" | PASS |
| 11 | Row 19 | Song cards draw the held-instrument glyphs | Open `/catalog?filter=learning` at 375 px, read each card's `role=img` labels | `./visual-validation-2026-11-19-2240/09-catalog-to-learn-glyphs.png`. Afterglow `[Chant, Batterie]`, Last Call `[Chant, Batterie]`, Lightning, Midnight Drive and Runaway Sun `[Batterie]`, Slow Burn `[Chant, Batterie]`. The default view (`08-catalog-song-cards.png`) draws no held-instrument glyph, see Notes | PASS |
| 12 | Row 27 | The transition popup over Scene Mode opens | Dev URL at 1280 px, Scene Mode on "Set principal", MutationObserver plus capture `close` listener, click "Show the transition to Midnight Drive" | `./visual-validation-2026-11-19-2240/10-dev-transition-popup-open.png`. Trace `[["added",31,"Transition to Midnight Drive"]]`, no `close` event, no removal. Open dialogs "Scene Mode" and "Transition to Midnight Drive". Focus on "Close". Card shows each member's glyph move | PASS |
| 13 | Row 27 | The popup stays open on a second opening | Leave and re-enter Scene Mode, open the popup again | `./visual-validation-2026-11-19-2240/13-dev-popup-before-close.png`. Both dialogs open | PASS |
| 14 | Row 27 | Escape on the popup closes the popup and the stage stays | Popup open, press Escape | `./visual-validation-2026-11-19-2240/12-dev-escape-closes-popup-only.png`. URL still `…/scene`, only "Scene Mode" open, focus on "Show the transition to Midnight Drive" | PASS |
| 15 | Row 27 | After Close, the arrow keys change song | Open the popup, click Close, press ArrowRight three times | `./visual-validation-2026-11-19-2240/14-dev-arrows-after-close.png`. Focus back on the opener after Close. Titles read Midnight Drive, Lightning, Afterglow, focus on "Scene Mode" | PASS |
| 16 | Row 27 | Every arrow press changes song, not only the first | As row 15 | Three presses gave three distinct songs | PASS |
| 17 | Row 27 | On a phone, a tap opens the popup | Phone session signed in as hugo, `scripts/phone.sh touch 'text=Show the transition to Midnight Drive'` at 375 × 812 | `./visual-validation-2026-11-19-2240/15-dev-phone-popup-open.png`. Exit 0, `isRealTouch:true`, `isCoarsePointer:true`. Both dialogs open | PASS |
| 18 | Row 27 | On a phone, a tap on Close leaves the stage | `scripts/phone.sh touch 'text=Close'` | `./visual-validation-2026-11-19-2240/16-dev-phone-popup-closed.png`. Exit 0, `isRealTouch:true`. URL still `…/scene`, title "Slow Burn", only "Scene Mode" open | PASS |
| 19 | Row 27 | Escape on the bare stage still leaves Scene Mode | After row 15, no popup open, press Escape | URL = `http://localhost:5174/setlists/ef1bc724-c2a8-46c6-a499-141ecd191c93`, no dialog open | PASS |

Every screenshot was followed by the broken-image scan. All returned `[]`.

## Notes

- **Round 1's row 12 FAIL is resolved.** With `openDialogOnAttach` back to returning nothing (`apps/pragma/site/src/lib/modal-dialog.adapter.ts`), the popup opens and stays open under the dev server's `StrictMode` (row 12 trace, measured). Rows 13 to 19 were run on the dev server this round, where round 1 needed a production build.
- **Round 1's row 05 UNVERIFIABLE is resolved.** Reading the flames while signed in as lea leaves Hugo's presence untouched. The seed gives Hugo presences 2 to 5 days ago and none today (`apps/pragma/api/src/__test/test-seed-presences.core.ts`), so his flame reads open on a plain seed and counted with `practice=today`.
- **Round 1's row 11 checked the wrong icon.** The default catalog view passes no instruments to `SongCard` (`apps/pragma/site/src/routes/catalog/CatalogPage.tsx`, the non-learning branch), so the mark beside each status is the chart-kind tag, not a held-instrument glyph. The glyphs render under the "To learn" filter, which this round checked by label. The verdict on row 19's rename is unchanged.
- The run reseeded the shared dev database three times through `POST /api/__test/seed` and ended on a plain seed. Sign-ins as lea and hugo after it recorded presences today, so Hugo's flame now reads counted on that database.

## Verdict: PASS
