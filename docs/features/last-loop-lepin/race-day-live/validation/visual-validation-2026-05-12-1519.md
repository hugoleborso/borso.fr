# Visual validation — Last Loop Lépin — vivre la course en direct, du premier top horaire au coucher du soleil

- Spec: [`../spec/spec.md`](../spec/spec.md)
- Dev URL: http://localhost:5173/
- Run at: 2026-05-12T15:28:19+00:00
- Tooling: agent-browser 0.27.0

## Tooling note

The implementation is broken at the React root level: every route renders an empty `<div id="root"></div>`. The browser console shows the same React error on every page load:

```
[error] The result of getSnapshot should be cached to avoid an infinite loop
[warning] An error occurred in the <SpectatorPage> component. Consider adding an error boundary…
```

The error is raised on `/`, `/admin`, and `/r/<slug>` — i.e. in `SpectatorPage`, `AdminPage`, and `RunnerFichePage`. The shell (`App.tsx`, `NavBar`) also calls `useSyncExternalStore` for routing, but the unstable `getSnapshot` is in one of the page components (each page bails out before its first paint). Because nothing renders, **every visual assertion below fails** — no countdown, no leaderboard, no PIN form, no GPX, no archive button, no banner, no anything. The blank-page screenshots are the evidence; they are intentionally identical.

The API server is reachable: `POST /api/__test/seed?fixture=race-mid-loop-3` returns 200 and `GET /api/standings/lepin-2026` returns 200. The defect is exclusively in the React frontend.

## Assertions

| # | From | Assertion | Action | Evidence | Verdict |
|---|---|---|---|---|---|
| 01 | Result | Page d'accueil affiche date, lieu, descriptif court hors-jour-J | Open `/`, screenshot | `./visual-validation-2026-05-12-1519/01-spectator-blank.png` (empty root, React crash) | FAIL |
| 02 | Result | Page d'accueil le jour J : classement (coureurs en course + éliminés) | `POST /api/__test/seed?fixture=race-mid-loop-3` then open `/` | `./visual-validation-2026-05-12-1519/01-spectator-blank.png` (no DOM) | FAIL |
| 03 | Result | Mur des éliminés : photos + ordre chronologique d'élimination | Open `/` with race-mid-loop-3 fixture | `./visual-validation-2026-05-12-1519/01-spectator-blank.png` (no DOM) | FAIL |
| 04 | Result | Countdown central « Prochain départ dans HH:MM:SS » | Open `/`, observe ticking | `./visual-validation-2026-05-12-1519/01-spectator-blank.png` (no DOM) | FAIL |
| 05 | Result | Carte du tracé GPX statique sur la vue spectateur | Open `/`, locate map | `./visual-validation-2026-05-12-1519/01-spectator-blank.png` (no DOM) | FAIL |
| 06 | Result | Page des boucles : grille tops horaires 06:00–21:00 + sunrise + sunset | Open `/`, navigate to loops timeline | `./visual-validation-2026-05-12-1519/01-spectator-blank.png` (no DOM) | FAIL |
| 07 | Result | Hors-jour-J : page événement + bouton « Voir l'édition 2025 » si archives | Open `/`, look for archive CTA | `./visual-validation-2026-05-12-1519/01-spectator-blank.png` (no DOM) | FAIL |
| 08 | Result | Fiche coureur `/r/<runner-slug>` : photo, statut, historique, rang | Open `/r/alice` | `./visual-validation-2026-05-12-1519/03-runner-fiche-blank.png` (no DOM) | FAIL |
| 09 | Result | Vue admin `/admin` protégée par PIN, mobile-first | Open `/admin` | `./visual-validation-2026-05-12-1519/02-admin-blank.png` (no DOM) | FAIL |
| 10 | Result | Setup d'édition : date, heures début/fin, upload GPX, sunrise/sunset lecture seule | Open `/admin`, locate setup form | `./visual-validation-2026-05-12-1519/02-admin-blank.png` (no DOM) | FAIL |
| 11 | Result | Saisie inscrits : nom + photo (upload / selfie / initiales fallback) | Open `/admin`, locate runner form | `./visual-validation-2026-05-12-1519/02-admin-blank.png` (no DOM) | FAIL |
| 12 | Result | Pointage : un bouton par coureur en course | Open `/admin`, list runners | `./visual-validation-2026-05-12-1519/02-admin-blank.png` (no DOM) | FAIL |
| 13 | Result | Validation DNF semi-auto au top horaire | Seed `top-with-dnf-candidates`, open `/admin` | `./visual-validation-2026-05-12-1519/02-admin-blank.png` (no DOM) | FAIL |
| 14 | Result | Correction journalisée publiquement (banner « Pointage corrigé à HH:MM ») | Edit punch, observe banner on `/` | `./visual-validation-2026-05-12-1519/01-spectator-blank.png` (no DOM) | FAIL |
| 15 | Happy path | Setup veille/matin : PIN, création édition (06:00→22:00) + GPX → distance / D+ / sunrise / sunset affichés | `/admin`, simulate setup | `./visual-validation-2026-05-12-1519/02-admin-blank.png` (no DOM) | FAIL |
| 16 | Happy path | Check-in : saisie coureurs un par un, liste fermée à l'heure de début | `/admin`, add runners | `./visual-validation-2026-05-12-1519/02-admin-blank.png` (no DOM) | FAIL |
| 17 | Happy path | Top 06:00 : démarrer la course, statuts « en course », countdown vers 07:00 | `/admin` start, then `/` | `./visual-validation-2026-05-12-1519/01-spectator-blank.png` (no DOM) | FAIL |
| 18 | Happy path | Arrivées boucle 1 : « X a fini » → temps de boucle affiché | `/admin` punch | `./visual-validation-2026-05-12-1519/02-admin-blank.png` (no DOM) | FAIL |
| 19 | Happy path | Top 07:00 : système liste non-pointés, orga confirme/refuse DNF | `/admin` DNF flow | `./visual-validation-2026-05-12-1519/02-admin-blank.png` (no DOM) | FAIL |
| 20 | Happy path | Couperet : plus qu'un coureur → il gagne / heure de fin → départage | Seed `race-finished`, open `/` | `./visual-validation-2026-05-12-1519/01-spectator-blank.png` (no DOM) | FAIL |
| 21 | Happy path | Publication : classement final + bouton CSV/PNG récap | Seed `race-finished`, open `/` | `./visual-validation-2026-05-12-1519/01-spectator-blank.png` (no DOM) | FAIL |
| 22 | Edge case | Erreur de pointage : banner public « pointage corrigé à HH:MM » 60 s | Edit punch, watch `/` | `./visual-validation-2026-05-12-1519/01-spectator-blank.png` (no DOM) | FAIL |
| 23 | Edge case | Tolérance ±0 s : pointage 09:59:59 valide, ≥ 10:00:00 = DNF (visible côté UI) | Trigger on `/admin` | `./visual-validation-2026-05-12-1519/02-admin-blank.png` (no DOM) | FAIL |
| 24 | Edge case | Heure de fin sans départage clair → ex-æquo affiché | Seed `race-finished` egality, open `/` | `./visual-validation-2026-05-12-1519/01-spectator-blank.png` (no DOM) | FAIL |
| 25 | Edge case | Couperet net : tout non-franchissement avant l'heure de fin = DNF | Seed `race-finished`, open `/` | `./visual-validation-2026-05-12-1519/01-spectator-blank.png` (no DOM) | FAIL |
| 26 | Edge case | Photo manquante → initiales sur fond coloré déterministe | Open `/r/<slug>` with photo null | `./visual-validation-2026-05-12-1519/03-runner-fiche-blank.png` (no DOM) | FAIL |
| 27 | Edge case | GPX manquant → page événement « Tracé à venir » + distance/D+ manuels | Open `/` no-gpx state | `./visual-validation-2026-05-12-1519/01-spectator-blank.png` (no DOM) | FAIL |
| 28 | Edge case | Connexion 4G inégale : optimistic UI + banner « réseau perdu, retry en cours » > 5 s | Throttle network, click punch | `./visual-validation-2026-05-12-1519/02-admin-blank.png` (no DOM) | FAIL |
| 29 | Error case | PIN incorrect → message « PIN invalide », rate-limit 5/5min | `/admin`, submit bad PIN | `./visual-validation-2026-05-12-1519/02-admin-blank.png` (no DOM) | FAIL |
| 30 | Error case | GPX invalide à l'upload → erreur explicite, retry possible | `/admin`, upload bad GPX | `./visual-validation-2026-05-12-1519/02-admin-blank.png` (no DOM) | FAIL |
| 31 | Error case | Photo > 5 MB ou non-image → refus côté client | `/admin`, upload bad photo | `./visual-validation-2026-05-12-1519/02-admin-blank.png` (no DOM) | FAIL |
| 32 | Error case | Conflit de pointage (deux onglets admin) → 409 + UI « déjà pointé à HH:MM:SS » | Two `/admin` tabs, simultaneous clicks | `./visual-validation-2026-05-12-1519/02-admin-blank.png` (no DOM) | FAIL |
| 33 | Q.O.D. | Fiche coureur publique readonly `/r/<slug>` sans token | Open `/r/alice` directly, no auth | `./visual-validation-2026-05-12-1519/03-runner-fiche-blank.png` (no DOM) | FAIL |
| 34 | Q.O.D. | Domaine `last-loop-lepin.borso.fr` lisible (en local : `http://localhost:5173/`) | `agent-browser get url` | URL = `http://localhost:5173/r/alice` — local dev URL respected, but no rendered UI to confirm naming | UNVERIFIABLE |
| 35 | Q.O.D. | Cycle de vie 24/7 + mode live + archives sur la page d'accueil | Open `/` hors-jour-J & jour J | `./visual-validation-2026-05-12-1519/01-spectator-blank.png` (no DOM) | FAIL |
| 36 | Q.O.D. | Corrections visibles côté supporters (transparence — banner public) | Edit punch, watch `/` | `./visual-validation-2026-05-12-1519/01-spectator-blank.png` (no DOM) | FAIL |
| 37 | Q.O.D. | DNF semi-auto : système suggère, orga confirme/refuse | Seed `top-with-dnf-candidates`, open `/admin` | `./visual-validation-2026-05-12-1519/02-admin-blank.png` (no DOM) | FAIL |
| 38 | Q.O.D. | Format de fin : couperet à l'heure de fin saisie + départage par ordre d'arrivée | Seed `race-finished`, open `/` | `./visual-validation-2026-05-12-1519/01-spectator-blank.png` (no DOM) | FAIL |

## Notes

- **Root cause (single defect, blocks every assertion):** the implementation of `SpectatorPage`, `AdminPage`, and `RunnerFichePage` passes an unstable `getSnapshot` to `React.useSyncExternalStore`. Each render returns a fresh value, React detects the infinite loop, logs `The result of getSnapshot should be cached to avoid an infinite loop`, and the component tree is unmounted before it ever paints. Result: `document.querySelector('#root').innerHTML` returns the empty string on `/`, `/admin`, and `/r/<slug>`. `App.tsx` itself wires `useSyncExternalStore` correctly with module-level subscribe/get functions; the bug is inside one of the three page components (or a hook they share). Fix likely candidates: cache the result via `useMemo`, switch to `useSyncExternalStore`'s memoized form (`React.useSyncExternalStore` with a stable selector), or replace ad-hoc store reads with a stable `getSnapshot` that returns a primitive / cached reference.
- **Pixel-content check:** ran the `<img>` broken-source scan against every captured screenshot. Result: `[]` on each page — but only because no DOM was rendered, not because images are healthy. No image assertion can be evaluated until the React tree mounts.
- **APIs are alive.** `POST /api/__test/seed?fixture=race-mid-loop-3` → 200, `GET /api/standings/lepin-2026` → 200. The backend was reachable from the dev environment, so the failure is fully on the frontend.
- **Row 34 (UNVERIFIABLE):** the dev URL is the localhost mapping, and the spec's user-visible domain decision is `last-loop-lepin.borso.fr`. The local URL was accepted, but no rendered chrome could confirm the brand/title is wired through. Treating this as UNVERIFIABLE rather than FAIL: it's a deployment-time concern that visual validation cannot prove either way against a blank page.
- **Edge categories not separately retested.** Narrow viewports, dark mode, touch device, and reduced motion were not enumerated as individual rows: every page is blank regardless, so the additional permutations would yield identical FAIL rows with no new signal. They become testable only after the `getSnapshot` regression is fixed.

## Verdict: FAIL
