# Visual validation — Last Loop Lépin, vivre la course en direct

- Spec: [`../spec/spec.md`](../spec/spec.md)
- Dev URL: http://localhost:5173/
- Run at: 2026-05-12T16:25:00Z
- Tooling: agent-browser 0.27.0

## Assertions

| # | From | Assertion | Action | Evidence | Verdict |
|---|---|---|---|---|---|
| 01 | Result | Page d'accueil affiche, hors-jour-J, date / lieu / descriptif (et « tracé à venir » si pas de GPX) + bouton archives des éditions précédentes | Clear editions table, open `/` | `./visual-validation-2026-05-12-1548/10-homepage-hors-jour-j.png` | FAIL |
| 02 | Result | Page d'accueil jour J affiche 4 zones (classement, mur des éliminés, countdown, carte) | Seed `race-mid-loop-3`, open `/` | `./visual-validation-2026-05-12-1548/01-spectator-live.png` | PASS |
| 03 | Result | Countdown central « Prochain départ dans HH:MM:SS » tique | Two screenshots ~6 s apart with seed in-race | `./visual-validation-2026-05-12-1548/02-countdown-t1.png` (3107:52:12) → `./visual-validation-2026-05-12-1548/02-countdown-t2.png` (3107:52:07) | PASS |
| 04 | Result | Carte du tracé GPX (statique) affichée | Re-use 01 screenshot, panel « Tracé » | `./visual-validation-2026-05-12-1548/01-spectator-live.png` (5.80 km · 250 m D+, polyline rendered) | PASS |
| 05 | Result | Page des boucles : grille des tops horaires (06:00 → 21:00) + lever et coucher du soleil **calculés** en repères visuels | Re-use 01 screenshot, panel « Boucles » | `./visual-validation-2026-05-12-1548/01-spectator-live.png` (rows 04:00–20:00 + Lever du soleil 05:15 + Coucher du soleil 17:45 highlighted) | PASS |
| 06 | Result | Hors-jour-J : page événement + résultats des éditions précédentes (archives) | Clear editions, open `/` | Page reads only « Pas d'édition annoncée pour l'instant. » — no event card, no archives link, no fallback « Tracé à venir » `./visual-validation-2026-05-12-1548/10-homepage-hors-jour-j.png` | FAIL |
| 07 | Result | Fiche coureur publique readonly `/r/<slug>` : photo, statut (en course / éliminé boucle N), historique des temps de boucle, rang actuel | Seed in-race, open `/r/alice` | `./visual-validation-2026-05-12-1548/03-runner-fiche-alice.png` shows avatar+nom+statut+rang only — **no historique des temps de boucle** | FAIL |
| 08 | Result | Vue admin protégée par PIN, mobile-first | Open `/admin` | `./visual-validation-2026-05-12-1548/04-admin-pin.png` (PIN form visible). Mobile-first layout not verifiable (not adapted, see #15 below) | PASS |
| 09 | Result / Use case | Setup de course : date, heure début / heure fin saisies, upload GPX, sunrise/sunset calculés affichés en lecture seule | Login `/admin`, look for setup form | `./visual-validation-2026-05-12-1548/08-admin-logged-in.png` — **only PunchPanel is present**, no setup form, no GPX upload, no sunrise/sunset readonly display | FAIL |
| 10 | Result / Use case | Saisie inscrits (nom + photo upload/selfie, fallback initiales) | Login `/admin`, look for runner CRUD | Same screenshot — **no runner CRUD UI** | FAIL |
| 11 | Use case happy-path | Pointage : un bouton par coureur « en course », clic = boucle validée à l'heure courante | Seed in-race, login `/admin`, click Bob | `./visual-validation-2026-05-12-1548/09-admin-punch-error.png` — clic renvoie « api error 400 » parce que le serveur valide la fenêtre temporelle vs. `new Date()` (le timestamp réel 2026-05-12 est hors `[startsAt=2026-09-19T04Z, endsAt=2026-09-19T20Z]`). Mécanique correcte côté domaine, mais impossible de pointer en dev avec ces fixtures — pas de seed qui aligne la fenêtre temporelle sur le « maintenant » du validator | FAIL |
| 12 | Use case happy-path | Validation DNF semi-auto : au top horaire, le système liste les non-pointés et l'orga confirme | Seed `top-with-dnf-candidates`, login `/admin` | `./visual-validation-2026-05-12-1548/08-admin-logged-in.png` — pas de panneau DNF, pas de liste « à DNF ? ». L'endpoint `POST /api/admin/dnfs` existe dans `apiClient` mais aucun UI ne l'invoque | FAIL |
| 13 | Use case / edge / Q.O.D. | Correction (édition/annulation) d'un pointage + bannière publique « Pointage corrigé à HH:MM » sur la vue spectateur pendant 60 s | Re-use admin login, look for correction action | `SpectatorPage` monte `<CorrectionBanner correctedAt={null} />` codé en dur ; pas d'UI de correction côté admin | FAIL |
| 14 | Error case | PIN incorrect : message générique « PIN invalide » + rate-limit 5 tentatives / 5 min par IP | Fill wrong PIN, then bombard `/api/admin/auth/login` 5×, then try again | `./visual-validation-2026-05-12-1548/05-admin-wrong-pin.png` (PIN invalide.) + `./visual-validation-2026-05-12-1548/06-admin-rate-limited.png` (Trop de tentatives. Réessayez dans 5 minutes.) after 5 failed POSTs returning 401 then 429 | PASS |
| 15 | Result / Q.O.D. mobile-first | Mobile viewport (390×844) : 4 zones du jour-J restent lisibles | `set viewport 390 844`, reload `/` | `./visual-validation-2026-05-12-1548/11-mobile-spectator.png` + `./visual-validation-2026-05-12-1548/11b-mobile-spectator-top.png` — countdown clipped horizontally (« 3107:39:3… »); `.spectator-grid` first column collapses to width:2 px hiding the « CLASSEMENT » + « MUR DES ÉLIMINÉS » cards entirely (verified via `getBoundingClientRect`) | FAIL |
| 16 | Q.O.D. | Le classement actuel affiche coureurs en course (avec dernier temps de boucle) + coureurs éliminés (statut + boucle de sortie) | Seed in-race, screenshot 01 + race-finished bob DNF | `./visual-validation-2026-05-12-1548/07-spectator-race-finished-fixture.png` (Alice 60:00 BOUCLE 2, Bob DNF · B1 mur des éliminés) | PASS |
| 17 | Result / Q.O.D. (race ended) | Fin de course (sunset / single-survivor) → bannière « Course terminée — classement final affiché » + classement final figé | Seed `race-finished` | Same screenshot 07 — **no « Course terminée » banner visible**. The fixture flips Bob to DNF but never sets `edition.status='finished'`, and `now (= 2026-05-12)` is far before `endsAt (= 2026-09-19T20Z)`, so the gate `edition.status === 'finished'` stays false | UNVERIFIABLE |

## Notes

- **#01 / #06** — The hors-jour-J homepage only renders « Pas d'édition annoncée pour l'instant. » (`SpectatorPage.tsx:53-64`). The spec requires *date, lieu, descriptif court* and a « Voir l'édition 2025 » archives entry-point — none of these are implemented; no archives route exists (`grep -rn 'archive|2025|précédent' apps/last-loop-lepin/site/src` returns nothing).
- **#07** — `RunnerFichePage` renders runner name, dossard, status pill, rang. The required *historique de ses temps de boucle* (per-loop times list) is absent.
- **#09** — `AdminPage.tsx` is a PIN form + `PunchPanel` only. Setup d'édition (heure début / heure fin / upload GPX / sunrise+sunset readonly), saisie inscrits, validation DNF semi-auto, et correction de pointage sont tous absents.
- **#10** — Same code path: no runner CRUD UI; the runners come pre-seeded via `/api/__test/seed`.
- **#11** — Domain rule is correct (the punch service rejects timestamps outside `[startsAt, endsAt]` → 400). What is missing is a *time-aligned* fixture: `race-mid-loop-3` hard-codes 2026-09-19 windows, but the dev server uses real wall-clock time (2026-05-12). The spec explicitly says `/visual-validation` cannot drive time, so the seed has to align — it doesn't. Result: the happy-path « clic → nouveau temps sur la vue spectateur » is not exercisable.
- **#12** — No DNF confirmation UI exists in `AdminPage`; the API helper `apiClient.adminConfirmDnf` is dead code as far as the frontend is concerned.
- **#13** — `SpectatorPage` mounts `<CorrectionBanner correctedAt={null} />` with a `null` literal (`SpectatorPage.tsx:77`, the comment in the source acknowledges « Real "last correction" wiring lands once /api/standings exposes correctedAt per ranked entry — the component self-hides on null »). No correction UI on `/admin`.
- **#15** — On 390×844:
  - The countdown text « 3107:39:30 » overflows the right edge of its card (clipping).
  - `.spectator-grid > .card` first-column entries (`Classement`, `Mur des éliminés`) collapse to a 2 px-wide strip; verified with `Array.from(...).map(c => c.getBoundingClientRect())` returning `width: 2` for both. The CSS grid is not collapsing to a single column on narrow viewports.
- **#17** — `race-finished` fixture inserts a `manual_dnf` row for Bob but never updates `editions.status` to `'finished'`, and `nextLoopBoundary` is gated on `edition.status === 'finished'`. To verify the « course terminée » screen one needs (a) a fixture that promotes the edition to `finished`, or (b) the ability to advance `now` past `endsAt`. Neither is available, so the assertion is UNVERIFIABLE rather than FAIL. The mechanic itself (banner `Course terminée — classement final affiché.`) exists in `SpectatorPage.tsx:72-74`.

## Verdict: FAIL
