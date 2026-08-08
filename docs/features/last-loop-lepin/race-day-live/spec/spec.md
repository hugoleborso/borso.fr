# Last Loop Lépin — vivre la course en direct, du premier top horaire au coucher du soleil

## Perspectives confronted

- [x] **Client / business** — L'organisateur (Hugo + équipe Lépin) confirmé comme client : 1 édition / an, ≤ 20 coureurs, format backyard "qui a une fin" maison. Output metric "X minutes économisées vs. papier" validé.
- [x] **Product** — Format de fin (couperet sunset + départage à l'ordre d'arrivée sur la dernière boucle commune), audience triple (orga / coureur / spectateur), drama backyard (mur des éliminés + photos) discutés et arrêtés.
- [x] **Tech-lead** — Stack arrêtée : Vite + React côté `site/`, Hono sur Lambda avec response streaming côté `api/`, Drizzle ORM + postgres-js + DsqlSigner côté `database/`, DSQL via `DsqlCluster`/`DsqlSchema` côté `cdk/`, sous-domaine `last-loop-lepin.borso.fr`. Aurora DSQL scale-to-zero → 0 € à vide entre éditions.
- [x] **Developer** — Architecture back en couches par feature (controller / service / repository / core / schema / types), helpers purs isolés sous `helpers/<topic>/`. Convention de nommage : pas d'abréviation (`repository` plutôt que `repo`, `database` plutôt que `db`, `setup-postgres.ts` plutôt que `setup-pg.ts`) ; acronymes formels conservés (`jwt`, `gpx`, `s3`). Tests back via testcontainers Postgres, deux gates vitest (gate A pure unitaire sur `*.core.ts` ; gate B back end-to-end sur `src/**`). Mock du temps via `vi.setSystemTime()` natif — pas d'interface `Clock` ; le code applicatif appelle `new Date()` librement, sauf la BDD qui n'a pas le droit de fournir `DEFAULT now()` sur les colonnes métier (les services écrivent explicitement le timestamp).
- [x] **Designer** — Hand-off explicite à Claude Design ; les contraintes visibles (vue spectateur multi-zones : classement / mur des éliminés / countdown / carte ; **fiche coureur** publique readonly via `/r/<slug>` ; page des boucles affichant heures de lever/coucher de soleil et tops horaires) sont fixées comme cahier des charges du design. **Les artefacts de Claude Design sont isolés dans `spec/mockups/`** — bundle HTML/CSS/JS + transcripts de chat, à recréer pixel-perfectly dans le `site/` React mais sans copier la structure interne du prototype. Le `README.md` du bundle est la porte d'entrée pour l'agent qui implémente.

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
| Framework HTTP côté `api/` | (a) Lambda handlers Node natifs, (b) Hono, (c) Fastify, (d) Express | **(b) Hono sur Lambda avec `awslambda.streamify`** (2026-05-12). Routing déclaratif compatible streaming, intégration `@hono/zod-validator` pour la validation, `app.request()` testable en process sans HTTP réel. Une seule Lambda monte tout l'`app` ; les routes sont composées dans `api/src/app.ts`. |
| Accès DSQL | (a) `pg` brut, (b) Drizzle ORM sur `postgres-js` + `DsqlSigner`, (c) `aws-sdk` Data API | **(b) Drizzle + postgres-js + DsqlSigner** (2026-05-12). Drizzle expose un schéma TypeScript-first co-localisé par feature (`<feature>.schema.ts`), génère les migrations via `drizzle-kit`, et son query builder reste typé sans runtime overhead notable. `DsqlSigner` fournit le token IAM utilisé comme mot de passe Postgres (rotation horaire gérée côté client). |
| Stratégie de tests back | (a) mocks Postgres (`pg-mem`), (b) testcontainers Postgres réel par test suite, (c) base DSQL preview partagée | **(b) testcontainers Postgres** (2026-05-12). Container Postgres 16 lancé une fois par run vitest, schéma rejoué via `drizzle-kit push`, isolation par schémas Postgres dédiés. Aucune dépendance à DSQL en CI : DSQL parle le wire-protocol Postgres, donc un Postgres local est un substitut suffisant pour les tests d'intégration ; les chemins spécifiques à DSQL (signature IAM, retries) sont couverts par `database/client.test.ts` avec mock du `DsqlSigner`. |
| Stratégie de couverture | (a) un seul gate à 100 % sur tout `src/**`, (b) deux gates vitest projects (`core` rapide sans Docker / `back-e2e` complet avec testcontainers), (c) gate à seuil < 100 % | **(b) deux gates vitest** (2026-05-12). Gate A = `pnpm test:core`, inclut uniquement `**/*.core.test.ts`, exige 100 % sur `**/*.core.ts`, tourne sans Docker (~1 s, boucle de dev). Gate B = `pnpm test`, inclut toutes les suites (testcontainers compris), exige 100 % sur `api/src/**` à l'exclusion des `*.test.ts`, `*.schema.ts` et `main.ts` (~30 s, pre-push + CI). |
| Layout du code back | (a) flat `src/handlers/<verb>/<resource>.ts`, (b) feature folders avec couches (controller / service / repository / core / schema / types), (c) DDD complet avec hexagonal | **(b) feature folders en couches** (2026-05-12). Un dossier par bounded context (`punch/`, `runner/`, `edition/`, `ranking/`, `auth/`, `media/`) contenant `<feature>.{controller,service,repository,core,schema,types}.ts` + tests sibling. Helpers transverses purs sous `helpers/<topic>/`. Singleton infrastructure dans `database/`. Aucun dossier `kernel/` ni `platform/` : les types de domaine partagés (IDs brandés) sont exposés depuis le `<feature>.types.ts` de la feature propriétaire ; les adapters externes sont possédés par la feature qui s'en sert (`auth/auth.jwt.ts`, `media/media.s3.ts`). |
| Calcul du classement | (a) calculé côté frontend depuis `GET /api/state`, (b) endpoint dédié `GET /api/standings/:editionId` server-side, (c) précalculé en BDD via vue matérialisée | **(b) endpoint dédié server-side** (2026-05-12). `ranking.core.ts` est une fonction pure `(punches, runners, edition, now) → RankedRunner[]` ; `ranking.service.ts` orchestre les lectures depuis `punch.repository.ts` et `runner.repository.ts` ; `ranking.controller.ts` expose `GET /api/standings/:editionId`. Le frontend consomme un tableau déjà ordonné, ce qui supprime toute logique métier dans le `site/`. |
| Convention de nommage | (a) abréviations tolérées, (b) mots complets sauf acronymes formels | **(b)** (2026-05-12). `repository` plutôt que `repo`, `database` plutôt que `db`, `setup-postgres.ts` plutôt que `setup-pg.ts`. Acronymes conservés : `jwt`, `gpx`, `s3` (noms propres standardisés, pas des raccourcis). |
| Suffixe des fichiers purs côté `api/` | (a) `*.utils.ts` pour rester strictement aligné sur CLAUDE.md, (b) `*.core.ts` pour marquer la sémantique "cœur métier d'une feature", avec extension du gate `**/*.utils.ts` à `**/*.core.ts` | **(b)** (2026-05-12). Sémantique distincte : `.utils.ts` reste pour les helpers génériques (frontend `site/` notamment), `.core.ts` marque le cœur métier pur d'une feature back. **Implication : CLAUDE.md « Clean code » doit être mis à jour pour gater `**/*.core.ts` à 100 % au même titre que `**/*.utils.ts`** — à porter dans le `plan.md`, pas dans le spec. |
| Mock du temps en test, et rejeu d'une course complète | (a) `Clock` interface injectée partout + `FakeClock` controllable + middleware Hono + header HTTP + flag CDK pour autoriser l'override en preview, (b) `new Date()` directement dans le code, `vi.useFakeTimers()` + `vi.setSystemTime()` côté tests, fixtures de seed côté `/visual-validation` | **(b) primitives vitest natives** (2026-05-12). L'option (a) est sur-conçue pour la valeur apportée. Contrat :<br>• Le code applicatif appelle `new Date()` directement, partout où un timestamp métier est requis. Pas d'interface `Clock`, pas de DI dédiée.<br>• **Aucun timestamp métier n'est généré par la BDD.** Les colonnes `finished_at`, `corrected_at`, `voided_at`, `decided_at` sont écrites explicitement par le service via un `new Date()` côté app. Seules les colonnes purement audit (`created_at`) peuvent garder `DEFAULT now()`. Cette règle est asservie par une assertion vitest qui parcourt le schéma Drizzle : aucun appel à `.defaultNow()` autorisé hors d'une whitelist explicite.<br>• Les tests vitest mockent le temps avec `vi.useFakeTimers({ shouldAdvanceTime: false })` + `vi.setSystemTime(iso)`. Le scénario "course complète" (`test/race-scenarios/race-day-2026.test.ts`) ouvre la session avec une horloge figée au 19 sept. 2026 à 05:30, instancie l'app Hono via `createApp({ db })`, et alterne `vi.setSystemTime()` + `app.request()` pour rejouer la journée en quelques millisecondes.<br>• Côté `site/`, le `Countdown` lit `Date.now()` via `useSyncExternalStore` ; vitest avance les timers avec `vi.advanceTimersByTime()` pour exercer le décompte sans attendre la vraie seconde.<br>• `/visual-validation` ne pilote PAS le temps : pour les écrans dépendants de l'état de course, le validator tape un endpoint `POST /api/__test/seed?fixture=<name>` qui pré-cuit l'état (course-en-cours / course-finished / dnf-au-top-3 / …). Cet endpoint est **uniquement monté si `process.env.LASTLOOP_ALLOW_TEST_SEED === '1'`** ; le flag est posé sur les preview deploys, **explicitement interdit** sur la stack prod par une assertion dans `cdk/src/stack.test.ts`. |

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

Le modèle métier vit côté `api/` dans chaque `<feature>/<feature>.types.ts`. Le `site/` n'en redéclare pas — il importe les types DTO via le client typé `site/src/api/client.ts` (qui exporte `InferRequestType` / `InferResponseType` de Hono).

```ts
// api/src/edition/edition.types.ts
type EditionSlug = string & { readonly _brand: 'EditionSlug' }; // 'lepin-2026'

type RaceEdition = {
  slug: EditionSlug;
  startsAt: Date;              // saisi, e.g. 2026-09-19T06:00:00+02:00
  endsAt: Date;                // saisi, couperet net
  intervalMinutes: 60;         // littéral, fixé v1
  gpx: {
    distanceMeters: number;
    elevationGainMeters: number;
    trackJson: GeoJSON;
    startLatLng: { lat: number; lng: number };
  };
  sunriseAt: Date;             // calculé depuis gpx.startLatLng + date(startsAt)
  sunsetAt: Date;              // calculé depuis gpx.startLatLng + date(startsAt)
  status: 'setup' | 'live' | 'finished';
};

// api/src/runner/runner.types.ts
type RunnerSlug = string & { readonly _brand: 'RunnerSlug' };

type Runner = {
  editionSlug: EditionSlug;
  slug: RunnerSlug;
  displayName: string;
  photoKey: string | null;     // S3 object key ; fallback initiales si null
  bib: number | null;
};

// api/src/punch/punch.types.ts
type PunchId = string & { readonly _brand: 'PunchId' };

type LoopPunch = {
  id: PunchId;
  editionSlug: EditionSlug;
  runnerSlug: RunnerSlug;
  loopIndex: number;           // 1-based
  finishedAt: Date;            // écrit par punch.service via new Date() côté app, pas DEFAULT now() côté Postgres
  correctedAt: Date | null;
  voidedAt: Date | null;
};

// api/src/ranking/ranking.types.ts
type RunnerStatus =
  | { kind: 'in-race'; lastLoop: number }
  | { kind: 'dnf'; outAtLoop: number; reason: 'late' | 'manual' };

type RankedRunner = {
  runner: Runner;
  rank: number | 'ex-aequo';
  status: RunnerStatus;
  lastLoopDurationMs: number | null;
};

// Fonctions pures (100 % coverage requis) — chacune dans son `.core.ts`
// Elles n'appellent JAMAIS `new Date()` directement : toute notion de "maintenant" est passée en argument,
// ce qui permet à `vi.setSystemTime()` de driver les tests sans abstraction intermédiaire.
parseGpx(file: ArrayBuffer): { distanceMeters; elevationGainMeters; trackJson; startLatLng };
computeSunriseSunset(latLng, date: Date): { sunriseAt: Date; sunsetAt: Date };
computeStandings(edition, runners, punches, now: Date): RankedRunner[];
nextHourlyTop(edition, now: Date): Date | null;       // null si après endsAt
isRaceEndReached(edition, now: Date): boolean;
projectDnfCandidates(edition, runners, punches, now: Date): Runner[];
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
apps/last-loop-lepin/                                              // NEW workspace
  package.json                                                     // NEW: pnpm workspace, scripts dev/build/test/test:core/deploy
  vitest.config.ts                                                 // NEW: deux projects ('core' + 'back-e2e')
  drizzle.config.ts                                                // NEW: pointe sur api/src/database/schema.ts
  biome.jsonc                                                      // NEW: extends root, "root": false
  tsconfig.json, tsconfig.cdk.json                                 // NEW
  cdk.json                                                         // NEW

  site/                                                            // frontend Vite + React
    src/main.tsx                                                   // NEW
    src/routes/SpectatorPage.tsx                                   // NEW
    src/routes/RunnerFichePage.tsx                                 // NEW (/r/<slug>)
    src/routes/AdminPage.tsx                                       // NEW (PIN-gated)
    src/components/Leaderboard.tsx                                 // NEW
    src/components/EliminatedWall.tsx                              // NEW
    src/components/Countdown.tsx                                   // NEW (useSyncExternalStore sur un tick 1 Hz de Date.now())
    src/components/CourseMap.tsx                                   // NEW
    src/components/LoopsTimeline.tsx                               // NEW (tops horaires + repères sunrise/sunset)
    src/components/CorrectionBanner.tsx                            // NEW
    src/domain/types.ts                                            // NEW (types DTO côté frontend, miroir typé des api types)
    src/domain/initials.utils.ts + .test.ts                        // NEW, 100% (avatar fallback, pure)
    src/api/client.ts                                              // NEW: fetch wrapper typé sur les controllers Hono

  api/                                                             // backend Hono on Lambda streaming
    src/app.ts + app.test.ts                                       // NEW: Hono factory, compose toutes les routes (monte __test/ conditionnellement)
    src/main.ts                                                    // NEW: handler Lambda via awslambda.streamify
    src/punch/                                                     // NEW feature
      punch.controller.ts + .test.ts                               // routes /api/admin/punches{,/(id)}
      punch.service.ts + .test.ts                                  // orchestration : valide, persiste, broadcast
      punch.repository.ts + .test.ts                               // accès Drizzle
      punch.core.ts + .test.ts                                     // pur — règles métier de pointage, 100 % gate
      punch.schema.ts                                              // Drizzle table + Zod validators
      punch.types.ts                                               // PunchId brandé, types domaine
    src/runner/                                                    // NEW feature (mêmes 6 fichiers)
    src/edition/                                                   // NEW feature (mêmes 6 fichiers)
    src/ranking/                                                   // NEW feature (sans repository propre)
      ranking.controller.ts + .test.ts                             // GET /api/standings/:editionId
      ranking.service.ts + .test.ts                                // lit punch.repository + runner.repository
      ranking.core.ts + .test.ts                                   // pur — calcul classement & départage, 100 % gate
      ranking.types.ts                                             // RankedRunner, Standings
    src/auth/                                                      // NEW
      auth.middleware.ts + .test.ts                                // PIN check + rate-limit (Hono middleware)
      auth.jwt.ts + .test.ts                                       // jose-based sign/verify
    src/media/                                                     // NEW
      media.controller.ts + .test.ts                               // POST /api/admin/presign
      media.service.ts + .test.ts
      media.s3.ts + .test.ts                                       // presigner AWS SDK v3
    src/helpers/                                                   // purs transverses, 100 % gate sur .core.ts
      geo/geo.core.ts + geo.test.ts                                // Haversine, lissage D+
      gpx/gpx.core.ts + gpx.test.ts                                // wrap @tmcw/togeojson + extraction distance/D+/startLatLng
      sun/sun.core.ts + sun.test.ts                                // sunrise/sunset depuis (lat, lng, dateIso)
    src/__test/                                                    // monté uniquement si LASTLOOP_ALLOW_TEST_SEED='1'
      test-seed.controller.ts + .test.ts                           // POST /api/__test/seed?fixture=<name>
    src/database/                                                  // infra Postgres
      client.ts + client.test.ts                                   // postgres-js + DsqlSigner + drizzle()
      schema.ts                                                    // barrel : re-export tous les <feature>.schema.ts
      migrations/                                                  // généré par drizzle-kit

  cdk/
    src/stack.ts                                                   // NEW: StaticSite + LambdaApi + DsqlCluster + DsqlSchema + bucket S3 photos
    src/stack.test.ts                                              // NEW: assertion CDK template (vérifie notamment que LASTLOOP_ALLOW_TEST_SEED n'est pas set en prod)

  test/                                                            // setup partagé des tests back
    setup-postgres.ts                                              // NEW: lance le testcontainer Postgres, applique le schéma Drizzle
    fixtures/                                                      // NEW: petites factories (makeEdition, makeRunner, makePunch)
    race-scenarios/                                                // NEW: suites vitest qui rejouent une course complète via vi.setSystemTime + app.request()

.github/path-filters.yml                                           // UPDATE: nouveau filter `last-loop-lepin`
.github/workflows/deploy.yml                                       // UPDATE: ajouter le job de déploiement
commitlint.config.js (root)                                        // UPDATE: ajouter scope `last-loop-lepin`
CLAUDE.md                                                          // UPDATE: layout mentionne le nouveau workspace + étend le gate pur à `**/*.core.ts`
```

### Test strategy

La couverture est asservie par **deux projets vitest** distincts dans `apps/last-loop-lepin/vitest.config.ts`. Aucune validation manuelle n'est admise comme gate.

**Gate A — `pnpm --filter @borso/last-loop-lepin run test:core`**

Périmètre : tous les fichiers `**/*.core.test.ts` (back) et `**/*.utils.test.ts` (front). Ne charge **pas** testcontainers, ne charge **pas** la stack AWS — tourne en process pur ; cible ~1 s sur la boucle de dev.

Seuil de couverture : **100 % statements / branches / functions / lines** sur `**/*.core.ts` et `**/*.utils.ts`. Échec dur si une ligne pure n'est pas couverte.

Suites attendues :

| Fichier sous test | Cas obligatoires |
| --- | --- |
| `helpers/geo/geo.core.ts` | Distance Haversine (cas standard, distance nulle, antipodes), lissage D+ (gain > seuil de bruit, gain < seuil ignoré, descente ignorée). |
| `helpers/gpx/gpx.core.ts` | GPX valide minimal, multiple tracks, GPX vide, GPX malformé (XML cassé), GPX sans `<ele>`, extraction `startLatLng`. |
| `helpers/sun/sun.core.ts` | Solstice été (jour long), solstice hiver (jour court), latitudes proches du cercle polaire, transition DST. |
| `punch/punch.core.ts` | Pointage valide → état mis à jour ; pointage hors-fenêtre (avant `startsAt`, après `endsAt`) refusé ; pointage sur une boucle non-attendue refusé ; tolérance ±0 s côté domaine. |
| `ranking/ranking.core.ts` | Classement coureurs en course → éliminés → ex-æquo ; départage par ordre d'arrivée sur la dernière boucle commune ; égalité parfaite → ex-æquo affiché ; classement final post-`endsAt` cohérent. |
| `edition/edition.core.ts` | `nextHourlyTop(now)` renvoie `null` après `endsAt`, gère DST Europe/Paris ; `isRaceEndReached(now)` ; `projectDnfCandidates(now)` au top horaire. |
| `site/src/domain/initials.utils.ts` | Couleur déterministe par hash du nom (collision testée), génération initiales (1 mot, 2 mots, accents, espaces multiples). |

**Gate B — `pnpm --filter @borso/last-loop-lepin run test`**

Périmètre : `**/*.test.ts` complet, y compris les tests intégration qui montent l'app Hono (`createApp({ db })`) et tapent ses endpoints via `app.request()`. Un container Postgres 16 est lancé une fois par run via testcontainers (`test/setup-postgres.ts`), le schéma Drizzle est appliqué par `drizzle-kit push`, chaque suite récupère son schéma Postgres dédié pour l'isolation. Le temps est mocké via `vi.useFakeTimers({ shouldAdvanceTime: false })` + `vi.setSystemTime(iso)` dans chaque suite qui touche au métier ; le `new Date()` appelé par les services est ainsi piloté sans abstraction supplémentaire. Cible ~30 s, joué pre-push (hook) et CI.

Seuil de couverture : **100 % statements / branches / functions / lines** sur `apps/last-loop-lepin/api/src/**` à l'exclusion de `**/*.test.ts`, `**/*.schema.ts` (déclaratif Drizzle), `main.ts` (bootstrap Lambda). La couverture s'accumule sur l'union des deux gates (gate A + gate B), ce qui veut dire qu'un fichier `.core.ts` couvert par ses tests unitaires *et* exercé par les tests d'endpoint reçoit la couverture des deux sources sans surcoût.

Suites attendues :

| Endpoint sous test | Cas obligatoires |
| --- | --- |
| `POST /api/admin/auth/login` | PIN correct → 200 + JWT ; PIN incorrect → 401 ; rate-limit déclenche 429 après 5 tentatives sur la même IP en 5 min. |
| `POST /api/admin/editions` | Crée une édition avec GPX valide, refuse un GPX malformé (400), refuse sans JWT (401), refuse un `startsAt > endsAt` (400). |
| `POST /api/admin/punches` | Pointe un coureur, persiste, refuse un double-pointage simultané (409). |
| `PUT /api/admin/punches/:id` | Correction d'un pointage → écrit `corrected_at`, n'affecte pas la position en classement si timestamp pas modifié. |
| `DELETE /api/admin/punches/:id` | Annulation → écrit `voided_at`, le punch ne compte plus dans le classement. |
| `POST /api/admin/runners` | CRUD inscrits, photo via `presign` puis upload S3 mocké. |
| `GET /api/standings/:editionId` | Renvoie le classement courant ordonné, gère ex-æquo, marque les DNF, fonctionne hors-fenêtre (renvoie le classement final figé). |
| `GET /api/editions/:slug/state` | État live pour la vue spectateur (countdown au prochain top, photos des éliminés). |
| `POST /api/admin/presign` | Renvoie une URL S3 presignée valide ≤ 5 min. |

**Suite "course complète" — `test/race-scenarios/race-day-2026.test.ts`** (la suite que motive le besoin de mock du temps)

Une suite vitest (gate B) qui *rejoue une édition de A à Z* via `vi.setSystemTime()` et `app.request()` :

1. `vi.setSystemTime('2026-09-19T05:30:00+02:00')` — la veille du départ, créer l'édition + 8 inscrits via `POST /api/admin/editions` puis `POST /api/admin/runners`.
2. `vi.setSystemTime('2026-09-19T06:00:00+02:00')` — démarrer la course, assert `GET /api/standings/:slug` montre les 8 en course.
3. Boucle `for hour in [06..21]` :
   - `vi.setSystemTime('2026-09-19T<hour>:50:00+02:00')` — `POST /api/admin/punches` pour chaque survivant (avec un drop-out programmé selon un scénario fixture).
   - `vi.setSystemTime('2026-09-19T<hour+1>:00:00+02:00')` — `GET /api/standings/:slug` → assert que les non-pointés sont passés en DNF.
4. `vi.setSystemTime('2026-09-19T22:00:00+02:00')` — assert `GET /api/standings/:slug` renvoie le classement final figé avec le vainqueur attendu et l'ordre de départage des derniers.
5. **Coverage attendue** : ce seul test fait passer une grosse partie du back en une exécution. Les `.core.test.ts` complètent les cas dégénérés que le scénario n'exerce pas (GPX malformé, antipodes Haversine, etc.).

**Visual validation (`/visual-validation` après implémentation).** Chaque ligne ci-dessous = une assertion dans le checklist du validator. Pour les écrans dépendants de l'état de course, le validator appelle d'abord `POST /api/__test/seed?fixture=<name>` (monté uniquement quand `LASTLOOP_ALLOW_TEST_SEED='1'`, donc uniquement sur preview) pour pré-cuire l'état attendu, puis screenshot :

- Page d'accueil hors-jour-J affiche date, lieu, GPX (ou « tracé à venir ») et bouton « Voir l'édition 2025 » si archives.
- Page d'accueil jour J en mode live (`fixture=race-mid-loop-3`) affiche les 4 zones (classement / mur / countdown / carte) et le countdown décrémente entre deux screenshots espacés de 2 s.
- Fiche coureur `/r/<slug>` (`fixture=race-mid-loop-3`) affiche le runner, ses temps, son statut.
- Vue `/admin` refuse un mauvais PIN avec rate-limit, accepte le bon PIN.
- Setup d'édition : upload GPX, distance/D+/sunrise/sunset affichés en lecture seule, heure de début et heure de fin saisies.
- Page des boucles affiche les tops horaires + repères visuels sunrise et sunset positionnés sur la timeline.
- Pointage : clic « X a fini » sur `/admin` → apparition du nouveau temps sur la vue spectateur ouverte en parallèle (input metric `loop_punched`).
- Top horaire (`fixture=top-with-dnf-candidates`) : système liste les non-pointés, orga confirme un DNF.
- Correction : édition d'un pointage → bannière apparaît sur vue spectateur pendant 60 s.
- Fin de course (`fixture=race-finished`) : écran « course terminée » + classement final, tout coureur dehors marqué DNF.

**Technical validation (`/technical-validation`).** Lint + knip + typecheck + build + gate A + gate B + revue Q.O.D. ligne par ligne. Le validator vérifie aussi (i) qu'aucun timestamp métier dans le schéma Drizzle n'utilise `.defaultNow()` (whitelist explicite pour les colonnes audit), (ii) que `stack.test.ts` assert l'absence de la variable `LASTLOOP_ALLOW_TEST_SEED` dans la stack prod, (iii) que le router d'app monte le module `__test/` seulement quand le flag est posé.

**Coverage gates infra.** Le stack CDK `apps/last-loop-lepin/cdk/` n'est **pas** soumis au gate 100 % de `infra/cdk/**` (il vit sous `apps/`, pas `infra/`) — l'assertion sur le stack prod ci-dessus est néanmoins requise par technical-validation.

**Pas de manual sweep dans les gates.** L'orga fera un dry-run J-7 (cf. *Production strategy → smoke post-deploy*), distinct du gate de spec.

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
