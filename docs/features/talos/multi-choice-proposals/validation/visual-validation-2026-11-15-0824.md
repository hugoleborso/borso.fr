# Visual validation — A proposal offers 2 to 4 choices, and its card shows one button per choice

- Spec: [`../spec/spec.md`](../spec/spec.md)
- Dev URL: http://localhost:5180/
- Run at: 2026-11-15T08:29:59Z
- Tooling: agent-browser 0.41.2

## Assertions

| # | From | Assertion | Action | Evidence | Verdict |
|---|---|---|---|---|---|
| 01 | S1.1 | A pending proposal with options shows one button per option, labelled with the option text, in the agent's order, plus Refuse and Comment. It shows no Accept button. | Open `/proposals` at 1280 × 900, scroll to « Caler la séance de course de la semaine », list the card's buttons | `./visual-validation-2026-11-15-0824/01-options-card-desktop.png`; card buttons = Commenter (icon), Refuser, mardi, jeudi, pas cette semaine; seed order is `- mardi / - jeudi / - pas cette semaine`; no Accepter | PASS |
| 02 | S1.2 | A pending proposal without options shows Accept, Refuse and Comment, as before. | Same page, the two cards without options | `./visual-validation-2026-11-15-0824/01-options-card-desktop.png`; snapshot shows Commenter, Refuser, Accepter on « Relancer Alice sur le devis » and « Faits relevés aujourd'hui » | PASS |
| 03 | S1.3 | The buttons wrap onto several lines at 375 px wide, and none is cut. | Viewport 375 × 812, measure each button's box and `scrollWidth` | `./visual-validation-2026-11-15-0824/02-options-card-375.png`; « pas cette semaine » wraps to a second row (top 601 vs 549); every button lies within x 33..342, `scrollWidth == clientWidth` for each; document width 375 | PASS |
| 04 | S1.4 | The same card serves the « Décider » tab and the direct link `/proposals/<slug>`. | Open `/proposals/2026-11-15-seance-course` at 375 px | `./visual-validation-2026-11-15-0824/03-direct-link-375.png`; same buttons Commenter, Refuser, mardi, jeudi, pas cette semaine | PASS |
| 05 | S2.1 / Data shape | Choosing an option records `acceptée (<option>)` and `statut: acceptee`. | On the direct link, tap « jeudi »; read the request and the card | `./visual-validation-2026-11-15-0824/04-after-choice-jeudi-375.png`; request body `{"decision":"acceptee","option":"jeudi"}` → 200; card shows « Acceptée » and line `2026-11-15 09:28 : acceptée (jeudi)` | PASS |
| 06 | Data shape | A chosen option with a comment gives `- <date> : acceptée (<option>) — <comment>`. | On the « Décider » tab, open Commenter, type « plutôt le soir », tap « pas cette semaine » | `./visual-validation-2026-11-15-0824/07-board-choice-with-comment-375.png`; body `{"decision":"acceptee","option":"pas cette semaine","comment":"plutôt le soir"}` → 200; `GET /api/proposals` gives status `acceptee`, last line `2026-11-15 09:29 : acceptée (pas cette semaine) — plutôt le soir` | PASS |
| 07 | S2.4 | Cancelling a decision is unchanged. The card offers the choices again. | After row 05, tap « Revenir sur ma décision » | `./visual-validation-2026-11-15-0824/05-after-cancel-375.png`; card is pending again with Refuser, mardi, jeudi, pas cette semaine; toast « Décision annulée » | PASS |
| 08 | S2.3 | Refuse without `option` works on every proposal. | Tap Refuser on the options card; `POST {"decision":"refusee"}` on the no-option card `2026-11-15-relance-acme` | `./visual-validation-2026-11-15-0824/06-refuse-on-options-375.png`; UI body `{"decision":"refusee"}` → 200, card « Refusée », line `refusée`; curl on the no-option card → 200 | PASS |
| 09 | S2.2 | 400 `Ce choix n'est pas proposé.` and nothing recorded for an unknown option, an option with `refusee`, or `acceptee` without option on a proposal with options. | Three curl POSTs on the pending `2026-11-15-seance-course`, count decision lines before and after; one POST with `option` on the no-option card | All four → 400 `{"error":"Ce choix n'est pas proposé."}`; decision lines 8 before and 8 after; no-option card stays `proposee` with 0 lines | PASS |
| 10 | S3.3 | The seeds carry one fictional proposal with three options, so `pnpm dev` shows the case. | Open `/proposals` on the seeded dev server | `./visual-validation-2026-11-15-0824/01-options-card-desktop.png`; « Caler la séance de course de la semaine » with mardi / jeudi / pas cette semaine | PASS |

## Notes

- No row is FAIL or UNVERIFIABLE. The broken-image scan returned `[]` after every screenshot, and `agent-browser errors` was empty on `/proposals`.
- These bullets were not tested because no browser can show them. S2.1 and S2.1b say the decision fires the routine and the fire text gains `choix: <option>`. The dev server has no `fire-url` secret, so `fireRoutine` returns `skipped` (read in `apps/talos/api/src/helpers/routine/routine-fire.adapter.ts`), and `GET /api/routine/runs` stayed `{"items":[]}`. Those bullets belong to the technical validation's test. S3.1 and S3.2 are document contents.
- The run changed the dev database. The seeded proposal `2026-11-15-seance-course` and `2026-11-15-relance-acme` are back to `proposee`. Their decision history now holds this run's accept, refuse and cancel lines. Two lines dated 08:11 were already there before the run.
- One thing seen outside this feature. The seeded card « Faits relevés aujourd'hui » shows an empty « Pourquoi » heading because its `why` is `""`. That card has no options, so this spec does not cover it.

## Verdict: PASS
