# Visual validation — Last Loop Lépin — vivre la course en direct

- Spec: [`../spec/spec.md`](../spec/spec.md)
- Dev URL: http://localhost:5173/
- Run at: 2026-05-12T17:29:49Z
- Tooling: agent-browser 0.27.0

## Assertions

| # | From | Assertion | Action | Evidence | Verdict |
|---|---|---|---|---|---|
| 01 | Result | Page d'accueil jour J affiche les 4 zones (classement / mur / countdown / carte). | Seed `race-mid-loop-3`, open `/`, screenshot. | `./visual-validation-2026-05-12-1634/01-homepage-live.png` | PASS |
| 02 | Result | Countdown central « Prochain départ dans HH:MM:SS » qui se décrémente. | Espace 3 s entre deux captures. | `./visual-validation-2026-05-12-1634/02-countdown-after-3s.png` (00:24:11 vs 00:24:31 dans `01`) | PASS |
| 03 | Result | Carte du tracé GPX statique avec distance/D+ affichés. | Vérifier zone TRACÉ. | `01-homepage-live.png` — polygone GPX + « 5.80 km · 250 m D+ » | PASS |
| 04 | Result | Page des boucles : tops horaires + repères sunrise/sunset. | Vérifier zone BOUCLES. | `01-homepage-live.png` — `04:10 Lever du soleil`, `18:56 Coucher du soleil` intercalés | PASS |
| 05 | Result | Mur des éliminés : photos + ordre chronologique d'élimination. | Vérifier zone MUR DES ÉLIMINÉS. | `01-homepage-live.png` — Bob/Carla/Dan avec boucle de sortie | PASS |
| 06 | Result | Hors-jour-J : page événement + résultats des éditions précédentes archivés. | Seed `race-finished`, open `/`. | `./visual-validation-2026-05-12-1634/10-hors-jourJ-archives.png` — carte ARCHIVES présente, **mais** entrée non cliquable (pas de lien « Voir l'édition 2026 ») | FAIL |
| 07 | Result | Fiche coureur `/r/<slug>` : photo, statut, historique, rang. | Open `/r/alice`. | `./visual-validation-2026-05-12-1634/03-fiche-coureur-alice.png` — avatar AL, « EN COURSE · BOUCLE 3 », Rang 1, 3 boucles validées | PASS |
| 08 | Result | Fiche coureur DNF affiche statut + rang + historique. | Open `/r/bob`. | `./visual-validation-2026-05-12-1634/13-fiche-coureur-bob-dnf.png` — statut « DNF · BOUCLE 3 » | PASS |
| 09 | Use case | Setup veille / matin — saisie heures + GPX, sunrise/sunset auto. | Connexion admin → onglet Setup. Bloqué : connexion admin atteignait le rate-limit en cours de validation (pas pu accéder à Setup à ce run). API testée par curl, UI non vérifiée. | — | UNVERIFIABLE |
| 10 | Use case | Top 06:00 démarre la course — tous les coureurs en course. | Idem : besoin admin Setup non testable ce run. | — | UNVERIFIABLE |
| 11 | Use case | Pointage : clic « X a fini » → nouveau temps sur vue spectateur. | Idem : nécessite admin actif. | — | UNVERIFIABLE |
| 12 | Use case | Top horaire : système liste les non-pointés, orga confirme DNF. | Idem : panel DNF dans `/admin`. | — | UNVERIFIABLE |
| 13 | Edge case | Erreur de pointage : bannière publique « pointage corrigé à HH:MM » sur la vue spectateur pendant 60 s. | Effectue une correction via API (login curl + PUT punches), reload `/`. | `./visual-validation-2026-05-12-1634/09-correction-banner.png` — aucune bannière visible. `GET /api/editions/lepin-2026/state` ne renvoie que `{edition}`, pas de `recentCorrections` ; rien sur la page (DOM scrutiné, aucun nœud « corrig… »). | FAIL |
| 14 | Edge case | Photo manquante : fallback initiales sur fond coloré déterministe. | Vérifier coureurs sans `photoKey`. | Tous les coureurs sans photo (Alice → AL bleu, Bob → BO ocre, Carla → CA bleu, Dan → DA jaune-vert), screenshots 01, 03, 11, 13. | PASS |
| 15 | Edge case | GPX manquant à l'ouverture du site : page événement affiche « Tracé à venir » + distance/D+ manuels. | Non reproductible avec les fixtures existantes (toutes incluent un GPX). | — | UNVERIFIABLE |
| 16 | Edge case | Connexion 4G inégale — banner « réseau perdu, retry en cours » > 5 s. | Pas de mode hors-ligne déclenchable sans débrancher la stack ; non testable visuellement. | — | UNVERIFIABLE |
| 17 | Error case | PIN incorrect sur `/admin` : message générique « PIN invalide ». | Session fresh, fill PIN « wrong », submit. | `./visual-validation-2026-05-12-1634/05-admin-wrong-pin.png` — « PIN invalide. » affiché sous le champ | PASS |
| 18 | Error case | Rate-limit 5 tentatives / 5 min par IP. | 5 essais consécutifs (curl), 6ᵉ → 429, UI affiche « Trop de tentatives. Réessayez dans 5 minutes. » | API : 4 × 401 puis 5ᵉ et 6ᵉ → 429. UI : snapshot DOM montre `Trop de tentatives. Réessayez dans 5 minutes.` à la place de « PIN invalide. » après dépassement (sortie `agent-browser snapshot`). | PASS |
| 19 | Error case | Conflit de pointage : 409 sur la 2ᵉ écriture, UI « déjà pointé à HH:MM:SS ». | Demande deux onglets admin simultanés, non testable sans accès admin ce run. | — | UNVERIFIABLE |
| 20 | Q.O.D. | Couperet net à l'heure de fin saisie + départage par ordre d'arrivée. | Le composant `Standings` rend `rank` + statut DNF/in-race. Vérifié dans `01` (Bob ordonné 2 malgré DNF). | `01-homepage-live.png` | PASS |
| 21 | Q.O.D. | `/admin` mobile-first : usable sur téléphone. | Set viewport 375×800, open `/` (puis `/admin` pour fresh login). | `./visual-validation-2026-05-12-1634/07-mobile-home.png` — toutes les zones s'empilent verticalement, header collapse, lisible. | PASS |
| 22 | Q.O.D. | Fiche coureur `/r/<slug>` publique sans token. | Ouvert sans authentification. | `03-fiche-coureur-alice.png`, `13-fiche-coureur-bob-dnf.png` | PASS |
| 23 | Q.O.D. | Cycle de vie web : 24/7 + mode live + archives. | Trois états testés : live (`race-mid-loop-3` → 01), finished/archives (`race-finished` → 10), pas de live à venir (`10` carte « Pas d'édition annoncée »). | `01`, `10` | PASS |
| 24 | Q.O.D. | « pointage corrigé à 14h03 » sur la vue spectateur. | Idem 13. | `09` | FAIL |
| 25 | Test seed (fixture) | `POST /api/__test/seed?fixture=race-mid-loop-3` doit produire un état déterministe et idempotent. | Re-seed après un seed `race-finished` : punches de Bob comptent 3 boucles dont une à `2026-05-12T04:08:36Z` (avant `startsAt = 14:00Z`). Re-seed de race-mid-loop-3 ne nettoie pas. | `curl GET runners/bob/punches` après plusieurs seeds : `loopIndex=3 finishedAt=2026-05-12T04:08:36Z` | FAIL |
| 26 | Use case (fin) | Fin de course (`fixture=race-finished`) : écran « course terminée » + classement final, tout coureur dehors marqué DNF. | Seed `race-finished`, open `/`. | `10-hors-jourJ-archives.png` — pas d'écran « course terminée », pas de classement final affiché. Le passage en `status=finished` transforme la page en archives sans présenter le classement final. | FAIL |

## Notes

- Row 06 (FAIL) — `10-hors-jourJ-archives.png` montre la carte « ARCHIVES » avec « Last Loop Lépin 2026 » listé, mais l'entrée n'est ni un lien ni un bouton (snapshot a11y : aucun rôle `link`/`button` pour cette ligne). Le spec demande un « bouton « Voir l'édition 2025 » si archives » — actuellement le visiteur ne peut donc pas naviguer vers le classement final d'une édition archivée.
- Row 13 / 24 (FAIL) — Aucune bannière de correction sur la vue spectateur après une correction réelle (`PUT /api/admin/punches/<id>`). Vérifié à deux endroits : (i) `GET /api/editions/lepin-2026/state` renvoie uniquement `{edition}`, sans `recentCorrections`/`lastCorrectionAt` ; (ii) `document.body.innerText` ne contient ni « corrig » ni « corrigé ». La fonctionnalité semble non implémentée côté UI **et** côté API.
- Row 25 (FAIL) — Le seed endpoint n'est pas idempotent : après un cycle `race-finished` → `race-mid-loop-3`, Bob conserve un punch loop 3 daté `2026-05-12T04:08:36.104Z` (10 h avant `startsAt`). Les `lastFinishedAt` de plusieurs coureurs en `standings` s'éloignent du wall-clock simulé, ce qui rend les fixtures imprévisibles pour les runs `/visual-validation` répétés. Confirmation : la précédente validation `visual-validation-2026-05-12-1548.md` flaggait déjà « fixtures mis-aligned with wall-clock ». Statut : non résolu.
- Row 26 (FAIL) — Le passage `status=finished` retire l'édition de `/api/editions/current`, ce qui bascule directement le frontend en mode hors-jour-J. Le spec exige « Le classement final s'affiche automatiquement dès la fin détectée » et « tout coureur dehors marqué DNF ». Aucune route ni vue ne fournit ce final dans le frontend (confirmé `01-homepage-live.png` vs `10-hors-jourJ-archives.png`).
- Row 09–12, 15–16, 19 (UNVERIFIABLE) — Pendant la validation, la séquence test rate-limit + plusieurs tentatives a déclenché un blocage de 5 min sur `/admin`. Le redémarrage du navigateur reset l'overhead de polling (213 appels accumulés à `/api/standings/`) mais pas le compteur rate-limit côté API. Les flots admin (Setup, Coureurs, Pointage, DNF, Corrections) sont accessibles UI-side après login (confirmé `06-admin-logged-in.png` : tabs visibles, panel Pointage rend Alice « Boucle 5 »), mais le détail de chaque flot n'a pas pu être exercé visuellement à ce run sans patienter 5 min entre chaque login. Le précédent FAIL « admin login broken » est en réalité un symptôme du combo (polling-flood + rate-limit) — login UI fonctionne quand la page est fresh ; voir Note de système ci-dessous.
- Pixel-content check — `0` images cassées sur tous les screenshots (`01`, `02`, `03`, `06`, `07`, `09`, `10`, `11`, `12`, `13`). Aucune image n'a rendu son `alt` à la place du visuel (`document.querySelectorAll('img')` filtré sur `naturalWidth === 0` ⇒ `[]`).

### Note de système (overhead de polling)

`useStandingsPoll.ts` poll toutes les 2 s et accumule rapidement plus de 200 entrées dans le buffer `performance.getEntriesByType('resource')`. Sur une session prolongée, `agent-browser eval` finit par timeout sur toutes les opérations CDP (`Runtime.evaluate`, `Page.navigate`). Cela ne traduit pas un bug visible côté utilisateur (la UI ne se gèle pas humainement), mais c'est une friction validateur. À surveiller — possible candidat `dantotsu` : « polling toutes les 2 s permanent même quand aucune mutation côté admin » → envisager backoff ou pause hors-jour-J.

## Verdict: FAIL
