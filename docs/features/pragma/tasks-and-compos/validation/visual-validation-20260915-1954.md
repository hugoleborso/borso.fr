# Visual validation — Tasks and Compos screens (pragma)

- Spec: none; the dispatch brief's 20-row checklist is the spec.
- Dev URL: http://localhost:5174/
- Run at: 2026-09-15T19:54+00:00
- Tooling: agent-browser 0.35.2 (`scripts/browser.sh`), argent (`scripts/argent.sh`, device `chromium-cdp-9222`, 375×812, real touch)
- Evidence folder: [`./visual-validation-20260915-1954/`](./visual-validation-20260915-1954/)

## Assertions

| # | Area | Assertion | Action | Evidence | Verdict |
|---|---|---|---|---|---|
| 01 | Nav | 375 px bottom bar = Catalogue, Sessions, Setlists, Bars, Plus; no Tâches/Compos | viewport 375, snapshot of `nav` | `./visual-validation-20260915-1954/14-tasks-375.png`; 5 `nav` children, labels as listed | PASS |
| 02 | Nav TOUCH | Tap Plus opens slide-over with Atelier (Tâches, Compos) + Administration (Membres, Instruments) | argent `tap 0.9 0.958` | `./visual-validation-20260915-1954/02-plus-panel-touch.png`; describe shows `dialog "More"` with `Workshop` → Tasks, Compositions and `Administration` → Members, Instruments | PASS |
| 03 | Nav TOUCH | From the panel, tapping Tâches navigates to /tasks and the panel closes | from /catalog, argent tap Plus then tap Tasks (0.287, 0.506) | `./visual-validation-20260915-1954/03-after-tap-tasks.png`; describe after tap: no `dialog`, `h1 = "Tasks"` | PASS |
| 04 | Nav | On /tasks at 375 px the Plus tab is accent, not muted | computed styles on `nav` items | Plus `color: rgb(45,95,160)` (`text-accent`); other four `rgb(106,95,83)` (`text-ink-500`) | PASS |
| 05 | Nav | 1280 px sidebar shows Atelier between primary links and Administration | viewport 1280, screenshot | `./visual-validation-20260915-1954/05-sidebar-1280-fr.png` — Catalogue/Sessions/Setlists/Bars, ATELIER (Tâches, Compos), ADMINISTRATION (Membres, Instruments) | PASS |
| 06 | Tasks | One column per member with avatar chip, first name, OPEN-only count; Sarah present and empty | DOM text dump of `main` | Hugo 2, Léa 1 (2 tasks, 1 open), Marc 1, Sarah 0 + "Rien dans cette liste."; chips H/L/M/S — `./visual-validation-20260915-1954/06-tasks-1280.png` | PASS |
| 07 | Tasks | Sixth column "Non assignées" holds "Réserver le camion" | same dump | `"N","Non assignées","1","Réserver le camion","à faire"` | PASS |
| 08 | Tasks | In Hugo's column "Réécrire le pont" (en cours) sorts above "Enregistrer la maquette" (à faire) | DOM order | Réécrire le pont precedes Enregistrer la maquette — `./visual-validation-20260915-1954/06-tasks-1280.png` | PASS |
| 09 | Tasks | "Racheter des cordes" done: checkbox ticked, title struck through and muted | a11y + computed style | checkbox `checked=true`; title `text-decoration-line: line-through`, `color rgb(140,132,120)` (`text-ink-400 line-through`) | PASS |
| 10 | Tasks | "Relancer le Trabendo" (due 2026-09-10) renders in danger; non-overdue does not | computed colours of all dates | `10 sept.` → `rgb(168,58,42)` `text-danger`; `20 sept.` / `5 oct.` → `rgb(106,95,83)` `text-ink-500` | PASS |
| 11 | Tasks | A compo-linked task shows the compo title as a badge — "Réécrire le pont" → "Runaway Sun" | DOM dump + `/api/tasks` + `/api/songs` | Badge rendered, but reads **"Last Call"**. API: task `songId=77eea4e2…` = Last Call. "Trouver une deuxième voix" carries Runaway Sun | **FAIL** |
| 12 | Tasks | Clicking a row loads it into the form: title, assignee, status, compo, date, notes | click "Réécrire le pont", read form state | h3 "Modifier la tâche"; title `Réécrire le pont`, pressed pills `Hugo` + `en cours`, select `77eea4e2…`, date `2026-09-20`, notes `La montée tombe trop tôt.` — `./visual-validation-20260915-1954/12-task-form.png` | PASS |
| 13 | Tasks | Toggling a checkbox flips to done and survives a full reload | click checkbox on "Réserver le camion", reload | after reload: `checked=true`, badge `faite` — `./visual-validation-20260915-1954/13-after-reload.png`. Re-confirmed with a real argent tap (16 px target) which also persisted | PASS |
| 14 | Tasks | 375 px: columns stack, form below, no horizontal page scroll | viewport 375, geometry | `scrollWidth 375 = clientWidth 375`, zero elements past x=376; all six column headers at `left=61`; form heading at y=1057, below last column at y=892 — `./visual-validation-20260915-1954/14-tasks-375.png` | PASS |
| 15 | Compos | List shows only "Last Call" and "Runaway Sun"; no cover | open /compos | exactly two list buttons — `./visual-validation-20260915-1954/16-compos-1280.png` | PASS |
| 16 | Compos | Right panel: Lineup avatars, Notes sections, chord chart **as chords over lyrics (not raw ChordPro brackets)**, Tasks section | select Last Call, read panel | Lineup H/L/M/S, NOTES ET COMMENTAIRES (Structure, Gimmicks), TÂCHES present — but the grid renders literally `[F]Last call, the [Dm]barman counts the till`. `./visual-validation-20260915-1954/16-compos-1280.png` | **FAIL** |
| 17 | Compos | Runaway Sun → "Réécrire le pont" + "Enregistrer la maquette"; Last Call → "Trouver une deuxième voix" | select each compo | Inverted: Last Call lists the first two; Runaway Sun lists "Trouver une deuxième voix" | **FAIL** |
| 18 | Compos | "Ouvrir dans le catalogue" goes to that song's catalogue detail page | click the link | href `/catalog/77eea4e2-720a-4c4d-bb52-470304fd800b`, lands there, h2 = "Last Call" — `./visual-validation-20260915-1954/18-catalog-detail.png` | PASS |
| 19 | Compos | 375 px: list and panel stack, no horizontal overflow, chord chart readable | viewport 375 | `scrollWidth 375 = clientWidth 375`, no element past x=376; chord block `whitespace-pre-wrap`, `scrollWidth 309 = clientWidth 309` — `./visual-validation-20260915-1954/19-compos-375.png` | PASS (layout) |
| 20 | Catalog | "Origine" select beside "Statut" offering reprise/compo; switching a cover to compo makes it appear in /compos after reload | /catalog/new, then edit Lightning | `#song-origin` sits right after `#song-status`, options `cover=reprise`, `original=compo` (`./visual-validation-20260915-1954/20-catalog-new.png`); Lightning saved as compo then appeared in /compos (`./visual-validation-20260915-1954/20-compos-after-origin.png`). Reverted to cover afterwards | PASS |

## Notes

- **11 / 17 — the compo↔task linkage is inverted relative to the checklist.** The UI renders exactly what the API returns: `GET /api/tasks` gives `Réécrire le pont` and `Enregistrer la maquette` `songId = 77eea4e2-720a-4c4d-bb52-470304fd800b`, which `GET /api/songs` names **Last Call**, and `Trouver une deuxième voix` → `4ad93ff3-…` = **Runaway Sun**. So the badge *mechanism* and the compo Tasks section both work; either the seed or the checklist is wrong. Flagged as FAIL because the checklist is the spec here and its two concrete claims are false on screen. Cheapest fix: swap the two `songId`s in the seed.
- **16 — the chord chart is not rendered.** The Grille d'accords block prints the raw ChordPro source inline, brackets included (`[F]Last call, the [Dm]barman counts the till`), in a mono font. Chord tokens are coloured but stay inline between the lyric words rather than being lifted above them. Section headers (COUPLET / REFRAIN / PONT) *are* parsed, so the renderer parses directives but not `[chord]` inline markers. Same defect at 375 px.

### Unasked-for observations

- **Tap targets: the "Marquer comme faite" checkboxes are 16×16 px** on every task row at 375 px (measured; argent's frame box agrees at 0.032×0.024 of 375×812). Far under 44 px, and the row's own 60 px height is not a tap target — only the box itself is. A real argent tap at the exact centre did land, so it is reachable with care, not comfortably. The row delete "×" is 33×53 px — also narrow.
- **Un-ticking a task destroys its status.** Toggling `Réécrire le pont` (en cours) to done and back left it at `à faire`, not `en cours` (confirmed via `/api/tasks`; I restored it through the form). A one-tap mis-tap silently loses the "en cours" state.
- **A done task still shows its due date in danger red**: `Racheter des cordes` (done, due 1 sept.) renders `text-danger font-medium`. Overdue-ness is computed without regard to status.
- **Contrast**: `text-ink-400` `rgb(140,132,120)` on the paper background is **3.34:1**, used at **11 px** for the bar-count number beside each compo name — below WCAG AA (4.5:1) for text that size. `text-ink-500`, `text-danger` and `text-accent` all measure 5.6–5.8:1 and are fine.
- No text overlap or clipping found at 375 px on either screen; zero console errors; zero broken `<img>` (`naturalWidth === 0` scan empty on both screens).
- State touched during the run was restored: `Réserver le camion` back to todo, `Réécrire le pont` back to doing, `Lightning` back to cover.

## Verdict: FAIL
