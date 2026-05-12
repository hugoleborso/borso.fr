# Last Loop Lépin — vivre la course en direct, du premier top horaire au coucher du soleil

## Perspectives confronted

- [x] **Client / business** — L'organisateur (Hugo + équipe Lépin) confirmé comme client : 1 édition / an, ≤ 20 coureurs, format backyard "qui a une fin" maison. Output metric "X minutes économisées vs. papier" validé.
- [x] **Product** — Format de fin (couperet sunset + départage à l'ordre d'arrivée sur la dernière boucle commune), audience triple (orga / coureur / spectateur), drama backyard (mur des éliminés + photos) discutés et arrêtés.
- [x] **Tech-lead** — Stack alignée sur le pattern repo (Vite + React + DSQL via `DsqlCluster`/`DsqlSchema` + `StaticSite` + `LambdaApi`), sous-domaine `last-loop-lepin.borso.fr`, persistance DSQL retenue (scale-to-zero d'Aurora DSQL → 0 € à vide entre éditions).
- [x] **Developer** — Helpers purs isolés dans `*.utils.ts` à 100 % couverture (parsing GPX, calcul classement, projection DNF au prochain top, départage). Auth orga par PIN partagé (pas de Cognito), corrections journalisées publiquement.
- [x] **Designer** — Hand-off explicite à Claude Design après ce spec ; les contraintes visibles (vue spectateur multi-zones : classement / mur des éliminés / countdown / carte ; **fiche coureur** publique readonly via `/r/<slug>` ; page des boucles affichant heures de lever/coucher de soleil et tops horaires) sont fixées comme cahier des charges du design.

> ℹ️ **Hand-off design avant `/technical-conception`.** Ce spec est volontairement arrêté à ce stade. L'utilisateur enchaîne avec Claude Design (maquettes/wireframes des trois vues) puis revient avec les artefacts visuels avant de lancer `/technical-conception`. Ne pas auto-chaîner.

## Why

**Valeur.** L'organisateur d'une backyard "qui a une fin" (boucle de ~5,8 km / +250 m de D+, heure de début saisie avant le lever du soleil, heure de fin saisie après le coucher) a besoin d'un système qui (1) **libère l'orga du pointage manuel pour qu'il puisse lui-même participer à la course**, (2) tient le drama du format en direct pour les supporters sur place et à distance, et (3) génère un classement final correct sans contestation. Aujourd'hui c'est papier + feuille Excel le soir : un membre orga doit rester à la ligne d'arrivée toute la journée et ~1 h de saisie/recoupement post-course.

**Output metric (laggante, mesurée hors-CI).** *L'orga participe lui-même à la course.* Mesure binaire la première édition : au moins un membre orga court ≥ 1 boucle de l'édition tout en gérant l'événement via le site. Mesurée par retour orga la semaine suivant l'événement. Cible : **oui**. Cette métrique n'est **pas** asserted par `/visual-validation`.

**Input metrics (leading, instrumentées).**
- `loop_punched` — événement émis à chaque pointage ; volume attendu ≈ N_coureurs × N_boucles (typ. 20 × 8 = 160) avec p90 < 2 s entre clic admin et apparition sur la vue spectateur (mesurable via timestamps client).
- `dnf_validated` — événement émis quand l'orga confirme un DNF semi-auto au top horaire ; permet de tracer la friction *suggestion système ↔ confirmation humain*.
- `correction_applied` — chaque édition/annulation post-pointage. Un volume anormalement élevé révèle une UX de pointage défaillante.
- `gpx_uploaded` — événement de setup ; tracé valide (distance, D+ extraits) sans intervention manuelle.

**Gemba.** Backyard amicale 2025 (référence), gestion papier + Excel : un membre orga immobilisé toute la journée à la ligne d'arrivée + ~1 h post-course de saisie ; supporters frustrés de ne pas voir le classement live pendant la course. Source : retour direct de l'orga (Hugo).

## Result

Site **`last-loop-lepin.borso.fr`** servi par CloudFront, en ligne 24/7 toute l'année.

**Trois vues utilisateur :**

1. **Page d'accueil / vue spectateur (`/`)** — Date, lieu, descriptif court. Le jour J, bascule automatiquement en mode "live" :
   - Classement actuel : coureurs en course (avec leur dernier temps de boucle) + coureurs éliminés (statut + boucle de sortie).
   - Mur des éliminés : photos + ordre chronologique d'élimination (le drama).
   - Countdown central : « Prochain départ dans HH:MM:SS ».
   - Carte du tracé GPX (statique, pas de tracking GPS live des coureurs).
   - **Page des boucles** : la grille des tops horaires (06:00, 07:00, …, 21:00) avec l'heure de lever du soleil et l'heure de coucher du soleil **calculées** affichées en repères visuels sur la timeline.
   - Hors-jour-J : page événement + résultats des éditions précédentes archivés.

2. **Fiche coureur (`/r/<runner-slug>`)** — Page publique readonly sur un coureur : photo, statut (en course / éliminé boucle N), historique de ses temps de boucle, son rang actuel. Pas de token, accessible à n'importe quel visiteur.

3. **Vue admin (`/admin`)** — Protégée par PIN partagé, mobile-first (l'orga pointe avec son téléphone à la ligne d'arrivée, idéalement entre deux boucles qu'il court lui-même). Permet :
   - Setup de course : date, **heure de début saisie** (avant lever de soleil), **heure de fin saisie** (après coucher de soleil), upload GPX (extrait distance/D+/tracé/coordonnées de départ). Sunrise/sunset sont **calculés** depuis les coordonnées du premier point GPX + la date et affichés en lecture seule pour information.
   - Saisie inscrits : nom, photo (upload pré-course OU selfie live le jour J ; fallback initiales).
   - Pointage : un bouton par coureur "en course", clic = boucle validée à l'heure courante.
   - Validation DNF semi-auto : au top horaire, le système liste les coureurs non pointés et l'orga confirme.
   - Correction : édition/annulation d'un pointage, journalisée publiquement (banner sur la vue spectateur : « Pointage corrigé à 14h03 »).

Mockups → produits par Claude Design dans un round suivant, déposés sous `docs/features/last-loop-lepin/race-day-live/spec/mockups/`.

## Use cases / edge cases

### Diagramme de séquence — boucle horaire type

```
Top horaire T          T+0min            T+~50min           T+1h (top T+1)
   |                     |                  |                   |
   ▶ orga clique         coureurs           orga clique         système liste
   "Départ boucle N"  →  partent      →    chaque arrivée  →   les non-pointés
   (group start)         (terrain)         "X a fini N"        comme "à DNF ?"
                                                                ↓
                                                            orga confirme/refuse
                                                                ↓
                                                          ▶ Top T+1 démarre
```

### Happy path (jour J)

1. **Setup veille / matin** — Orga ouvre `/admin`, entre le PIN, crée l'édition : heure de début 06:00, heure de fin 22:00, upload GPX. Distance, D+, sunrise (calculé) et sunset (calculé) apparaissent automatiquement.
2. **Check-in** — Orga saisit les coureurs un par un (nom + photo selfie au choix). Liste fermée à l'heure de début.
3. **Top 06:00** — Orga clique « Démarrer la course ». Tous les coureurs passent en statut « en course », countdown vers 07:00 démarre sur toutes les vues. La page des boucles affiche les tops horaires 06:00 → 22:00 avec sunrise et sunset positionnés visuellement.
4. **Arrivées boucle 1** — Pour chaque coureur arrivé avant 07:00, l'orga clique « X a fini ». Le temps de boucle s'affiche.
5. **Top 07:00** — Système liste les coureurs non pointés. Orga confirme « DNF » ou « finalement il vient d'arriver, je le pointe ». Les pointés repartent en boucle 2.
6. **Itération** — Étapes 4–5 jusqu'à l'un des deux couperets :
   - Plus qu'un coureur en course → il gagne, course close.
   - **Heure de fin** (22:00) atteinte → fin de course, départage par ordre d'arrivée sur la dernière boucle commune.
7. **Publication** — Le classement final s'affiche automatiquement dès la fin détectée. L'orga peut télécharger un CSV/PNG récap.

### Edge cases

- **Erreur de pointage** : l'orga peut éditer/supprimer un pointage. Une bannière publique « pointage corrigé à HH:MM » apparaît sur la vue spectateur pendant 60 s.
- **Coureur revient *pile* au top suivant** : tolérance arrondie à la seconde côté serveur ; un coureur pointé entre 09:59:30 et 10:00:00 est valide pour la boucle 1 ; après 10:00:00 il est DNF (sauf override admin).
- **Heure de fin atteinte sans départage clair** (deux coureurs ont fini la même boucle exactement au même top) : la règle "ordre d'arrivée sur la dernière boucle commune" tranche au timestamp de pointage (ms). Si égalité parfaite (improbable) → ex-æquo affiché.
- **Couperet net à l'heure de fin** : tout coureur n'ayant pas franchi la ligne avant l'heure de fin saisie (au timestamp serveur près) est DNF, quelle que soit la boucle en cours. Pas de nouveau top horaire ouvert au-delà de l'heure de fin.
- **Photo manquante** : fallback initiales sur fond coloré déterministe (hash du nom).
- **GPX manquant à l'ouverture du site** : page événement affiche « Tracé à venir » + distance/D+ indiqués manuellement.
- **Connexion 4G inégale côté orga** : la vue admin gère la latence (optimistic UI sur le clic « X a fini » avec reconciliation serveur ; banner « réseau perdu, retry en cours » si > 5 s).

### Error cases

- **PIN incorrect** sur `/admin` : message générique « PIN invalide », rate-limit 5 tentatives / 5 min par IP.
- **GPX invalide** à l'upload : message d'erreur explicite, l'orga peut réessayer avec un autre fichier.
- **Photo > 5 MB ou format non-image** : refus côté client + côté Lambda.
- **Conflit de pointage** (deux clics simultanés depuis deux onglets admin) : le serveur applique la première écriture, retourne 409 sur la seconde, l'UI affiche « déjà pointé à HH:MM:SS ».

## Questions, Options and Decisions

| Question | Options | Décision (2026-05-12) |
| --- | --- | --- |
| Format de fin de course | (a) Backyard pure, (b) couperet égalité, (c) couperet + départage au temps, (d) autre | **(c) couperet à l'heure de fin saisie + départage par ordre d'arrivée sur la dernière boucle commune.** Préserve la nature backyard mais garantit la fin à une heure connue. |
| Bornes de course : début / fin | (a) calculées via lib astro autour du sunrise/sunset, (b) toutes deux saisies en dur, (c) début saisi + fin calculée | **(b) saisies en dur**, début avant lever de soleil et fin après coucher de soleil. Évite la dépendance critique à une lib astro pour les bornes ; sunrise et sunset restent **calculés** depuis les coords GPX + date et **affichés** comme repères visuels sur la page des boucles, sans rôle de couperet. |
| Algo de départage | (a) cumul temps, (b) temps de la dernière boucle commune, (c) ordre d'arrivée sur la dernière boucle | **(c)** — cohérent avec l'esprit "ligne d'arrivée" du sport. |
| Élimination DNF | (a) auto au top, (b) semi-auto avec confirmation, (c) 100 % manuel | **(b) semi-auto** — protège des retards de saisie tout en gardant la rigueur du format. |
| Corrections de pointage | (a) libres, (b) libres + journalisées publiquement, (c) append-only | **(b)** — transparence sur la vue spectateur ; pas de zone d'ombre côté supporters. |
| Fiche coureur | (a) pas de fiche dédiée, (b) lien token, (c) plus tard | **`/r/<slug>` publique readonly**, pas de token. Tout le monde peut consulter la fiche de n'importe quel coureur. |
| Persistance | (a) JSON S3, (b) DSQL, (c) DynamoDB | **(b) DSQL** — aligné avec le pattern repo (cluster per-app, construct `DsqlCluster`/`DsqlSchema`). Aurora DSQL scale-to-zero → 0 € à vide entre les éditions, donc pas de tradeoff coût réel. |
| Source du tracé | (a) GPX upload, (b) Strava OAuth, (c) hybride, (d) hardcodé | **(a) GPX upload** — pas de dépendance externe, parsing pur testable à 100 %. |
| Auth orga | (a) lien magique, (b) PIN partagé, (c) Cognito, (d) aucune | **(b) PIN partagé** — proportionné à un événement annuel de 20 coureurs. |
| Domaine | `last-loop-lepin.borso.fr` vs `lastlooplepin.borso.fr` | **`last-loop-lepin.borso.fr`** — lisible, suit le slug. |
| Cycle de vie web | (a) 24/7 + mode live, (b) seulement autour de l'événement, (c) + archives | **(a) + archives.** Le site est en ligne toute l'année avec la fiche événement à venir et les classements des éditions précédentes. |
| Observabilité | (a) Sentry + analytics, (b) Sentry seul, (c) rien | **(a)** — Sentry frontend + 4 events analytics nommés (cf. *Input metrics*). |

**Out of scope (v1).**
- Inscription publique (l'orga saisit tout).
- Paiement.
- Vue coureur protégée par token.
- Tracking GPS live des coureurs sur la carte.
- Notifications push (mail, SMS, WhatsApp).
- Multi-tenant (plusieurs courses gérées en parallèle).
- Strava OAuth.
- Internationalisation : FR uniquement.

## Changes

### Types / domain model

```ts
// apps/last-loop-lepin/site/src/domain/types.ts
type RaceEdition = {
  slug: string;                // 'lepin-2026'
  startsAt: string;            // ISO, saisi, e.g. '2026-09-19T06:00:00+02:00'
  endsAt: string;              // ISO, saisi, couperet net
  intervalMinutes: 60;         // littéral, fixé v1
  gpx: {
    distanceMeters: number;
    elevationGainMeters: number;
    trackJson: GeoJSON;
    startLatLng: { lat: number; lng: number };
  };
  // calculés depuis gpx.startLatLng + date(startsAt), pas saisis
  sunriseAt: string;           // ISO, info contextuelle
  sunsetAt: string;            // ISO, info contextuelle
  status: 'setup' | 'live' | 'finished';
};

type Runner = {
  slug: string;                // 'tartempion'
  displayName: string;
  photoUrl: string | null;     // S3-backed; fallback initiales si null
  bib: number | null;
};

type LoopPunch = {
  runnerSlug: string;
  loopIndex: number;           // 1-based
  finishedAt: string;          // ISO
  correctedAt: string | null;  // marque une correction
  voidedAt: string | null;     // marque une annulation
};

type RunnerStatus =
  | { kind: 'in-race'; lastLoop: number }
  | { kind: 'dnf'; outAtLoop: number; reason: 'late' | 'manual' };

// Helpers purs (100 % coverage requis) — chacun en *.utils.ts dédié
parseGpx(file: ArrayBuffer): { distanceMeters; elevationGainMeters; trackJson; startLatLng };
computeSunriseSunset(latLng, dateIso): { sunriseAt; sunsetAt };
computeLeaderboard(edition, runners, punches): RankedRunner[];
nextHourlyTop(edition, now): Date | null;       // null si après endsAt
isRaceEndReached(edition, now): boolean;        // now ≥ endsAt
projectDnfCandidates(edition, runners, punches, now): Runner[];
resolveTieByLastLoop(rankedRunners): RankedRunner[];
initialsAvatar(displayName): { initials; backgroundColorHex };
```

### Database changes

DSQL schema initial dans `apps/last-loop-lepin/db/schema.sql` (managed par `DsqlSchema` construct) :

```sql
CREATE TABLE editions (
  slug          TEXT PRIMARY KEY,
  starts_at     TIMESTAMPTZ NOT NULL,            -- saisie
  ends_at       TIMESTAMPTZ NOT NULL,            -- saisie, couperet net
  sunrise_at    TIMESTAMPTZ NOT NULL,            -- calculée (info)
  sunset_at     TIMESTAMPTZ NOT NULL,            -- calculée (info)
  interval_min  INT NOT NULL DEFAULT 60,
  gpx           JSONB NOT NULL,
  status        TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE runners (
  edition_slug  TEXT NOT NULL REFERENCES editions(slug),
  slug          TEXT NOT NULL,
  display_name  TEXT NOT NULL,
  photo_key     TEXT,
  bib           INT,
  PRIMARY KEY (edition_slug, slug)
);

CREATE TABLE loop_punches (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  edition_slug  TEXT NOT NULL,
  runner_slug   TEXT NOT NULL,
  loop_index    INT NOT NULL,
  finished_at   TIMESTAMPTZ NOT NULL,
  corrected_at  TIMESTAMPTZ,
  voided_at     TIMESTAMPTZ,
  FOREIGN KEY (edition_slug, runner_slug) REFERENCES runners(edition_slug, slug)
);

CREATE TABLE manual_dnfs (
  edition_slug  TEXT NOT NULL,
  runner_slug   TEXT NOT NULL,
  out_at_loop   INT NOT NULL,
  reason        TEXT NOT NULL,
  decided_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (edition_slug, runner_slug)
);

CREATE INDEX loop_punches_by_runner ON loop_punches (edition_slug, runner_slug, loop_index);
```

### Files to change

```
apps/last-loop-lepin/                                       // NEW workspace
  package.json                                              // NEW: pnpm workspace, scripts dev/build/test/deploy
  site/
    src/main.tsx                                            // NEW: Vite + React entry
    src/routes/SpectatorPage.tsx                            // NEW
    src/routes/RunnerFichePage.tsx                          // NEW (/r/<slug>)
    src/routes/AdminPage.tsx                                // NEW (gated by PIN)
    src/components/Leaderboard.tsx                          // NEW
    src/components/EliminatedWall.tsx                       // NEW
    src/components/Countdown.tsx                            // NEW (uses useSyncExternalStore, no useEffect)
    src/components/CourseMap.tsx                            // NEW
    src/components/LoopsTimeline.tsx                        // NEW (tops horaires + repères sunrise/sunset)
    src/components/CorrectionBanner.tsx                     // NEW
    src/domain/types.ts                                     // NEW
    src/domain/gpx.utils.ts + .test.ts                      // NEW, 100% coverage
    src/domain/sun.utils.ts + .test.ts                      // NEW, 100% coverage (sunrise/sunset depuis latLng + date)
    src/domain/leaderboard.utils.ts + .test.ts              // NEW, 100% coverage
    src/domain/timing.utils.ts + .test.ts                   // NEW (nextHourlyTop, isRaceEndReached, etc.)
    src/domain/dnf.utils.ts + .test.ts                      // NEW
    src/domain/initials.utils.ts + .test.ts                 // NEW (deterministic color from name)
    src/api/client.ts                                       // NEW: fetch wrapper towards Lambda
  api/                                                      // NEW: Lambda handlers
    src/handlers/admin/auth.ts                              // NEW: PIN check + rate-limit
    src/handlers/admin/edition.ts                           // NEW: setup edition
    src/handlers/admin/runner.ts                            // NEW: CRUD runners
    src/handlers/admin/punch.ts                             // NEW: POST/PUT/DELETE pointages
    src/handlers/public/state.ts                            // NEW: GET race-state (cached 2s CloudFront)
    src/utils/gpx-parse.utils.ts + .test.ts                 // NEW (server-side mirror, 100% coverage)
  cdk/
    src/stack.ts                                            // NEW: instancie StaticSite + LambdaApi + DsqlCluster + DsqlSchema
  db/
    schema.sql                                              // NEW (see above)
.github/path-filters.yml                                    // UPDATE: nouveau filter `last-loop-lepin`
.github/workflows/deploy.yml                                // UPDATE: ajouter le job de déploiement
commitlint.config.js (root)                                 // UPDATE: ajouter scope `last-loop-lepin`
CLAUDE.md                                                   // UPDATE: layout mentionne le nouveau workspace
```

### Test strategy

**Unit tests sur utilities pures (100 % coverage, gated par le test runner).**
- `gpx.utils.ts` — parsing GPX (track points, totalisation distance Haversine, D+ avec seuil de bruit, extraction `startLatLng`). Cases : GPX valide minimal, GPX avec multiple tracks, GPX vide, GPX malformé, GPX sans tag d'élévation.
- `sun.utils.ts` — calcul sunrise/sunset depuis `(lat, lng, dateIso)`. Cases : été (jour long), hiver (jour court), latitudes proches du cercle polaire (régression edge), DST transition.
- `leaderboard.utils.ts` — classement (en course → éliminés → ex-æquo), application du départage "ordre d'arrivée sur la dernière boucle commune".
- `timing.utils.ts` — `nextHourlyTop` (renvoie `null` après `endsAt`, gère DST), `isRaceEndReached`, conversion timezone Europe/Paris.
- `dnf.utils.ts` — projection des candidats DNF au top horaire (tolérance ±0 s côté domaine, l'UI applique la marge).
- `initials.utils.ts` — couleur déterministe par hash du nom, génération initiales (1 mot, 2 mots, accents).

**Visual validation (`/visual-validation` après implémentation).** Chaque case ci-dessous = une assertion dans le checklist :
- Page d'accueil hors-jour-J affiche date, lieu, GPX (ou « tracé à venir ») et bouton « Voir l'édition 2025 » si archives.
- Page d'accueil jour J en mode live affiche les 4 zones (classement / mur / countdown / carte) et le countdown décompte effectivement.
- Fiche coureur `/r/<slug>` affiche le runner, ses temps, son statut.
- Vue `/admin` refuse un mauvais PIN avec rate-limit, accepte le bon PIN.
- Setup d'édition : upload GPX, distance/D+/sunrise/sunset affichés en lecture seule, heure de début et heure de fin saisies.
- Page des boucles affiche les tops horaires + repères visuels sunrise et sunset positionnés sur la timeline.
- Pointage : clic « X a fini » → apparition < 2 s sur la vue spectateur (input metric `loop_punched`).
- Top horaire : système liste les non-pointés, orga confirme un DNF.
- Correction : édition d'un pointage → bannière apparaît sur vue spectateur.
- Fin de course : `endsAt` atteint → écran « course terminée » + classement final, tout coureur dehors devient DNF.

**Technical validation (`/technical-validation`).** Lint + knip + typecheck + build + unit-test runner (avec gate 100 % sur `*.utils.ts`) + revue Q.O.D. ligne par ligne.

**Coverage gates infra.** Le stack CDK `apps/last-loop-lepin/cdk/` n'est **pas** sous le gate 100 % de `infra/cdk/**` (il vit sous `apps/`, pas `infra/`). Pas d'impact sur les gates existants.

**Pas de manual sweep.** L'orga fera un dry-run J-7 (cf. *Production strategy → smoke post-deploy*), distinct du gate de spec.

## Production strategy

### Analytics

**Input metrics (instrumentées, gates CI/dashboard).**
- `gpx_uploaded` — émis à chaque upload GPX réussi. Seuil : 1 upload réussi sans intervention manuelle pour confirmer la setup.
- `loop_punched` — émis à chaque clic admin validé serveur. p90 délai client→serveur < 2 s. Volume attendu ≈ 160 sur la journée.
- `dnf_validated` — émis à chaque confirmation orga d'un DNF semi-auto. Permet de tracer le ratio "suggéré / confirmé" (révèle si la fenêtre de tolérance est mal calibrée).
- `correction_applied` — chaque édition/annulation post-pointage. Volume anormalement élevé (> 5 / heure) = signal d'alerte UX.
- `race_finished` — émis une fois en fin de course, payload = nb boucles total + cause de fin (sunset / single survivor).

**Output metric (laggante, mesurée hors-CI).**
- *L'orga court lui-même.* Binaire : oui / non. Mesurée par retour orga la semaine suivant l'événement. Baseline papier = non (un membre orga immobilisé toute la journée). Cible v1 = oui. Bilan annuel par l'orga.

### Zero-defect strategy

Sentry frontend (DSN dans la config Vite). Named error classes :
- `GpxParseError` — GPX malformé. Surface : Sentry tag `domain=gpx`. Alerte si > 0 en prod (la setup est rare).
- `PunchConflictError` — double pointage simultané (409 serveur). Surface : Sentry tag `domain=punch`. Alerte si > 3 / heure le jour J.
- `AuthDeniedError` — PIN invalide ou rate-limit déclenché. Surface : Sentry tag `domain=auth`. Alerte si > 10 / 5 min (potentielle attaque).
- `DsqlUnavailableError` — la BDD ne répond pas. Surface : Sentry tag `domain=infra`. Alerte **immédiate** le jour J.

**Manual smoke après deploy.** L'orga lance un dry-run J-7 (création d'une édition de test, 3 coureurs fictifs, 2 tops horaires, suppression de l'édition test). Ce n'est pas le gate de spec, c'est un belt humain le jour J.
