# L'avatar du coureur avance sur la carte au rythme du tracé

## Perspectives confronted

- [x] **Client / business** — confirmé : usage en retransmission spectateur de l'écran `/`, où la carte est le point focal. Aujourd'hui le mouvement de l'avatar est visuellement incohérent avec la position réelle observée pendant le test du 2026-05-14 (cf. *Why → Gemba*).
- [x] **Product** — confirmé : pas de nouvelle surface UI, on raffine un mouvement existant. Le gain est *implicite* — le spectateur n'a pas à savoir qu'on est passé d'un modèle linéaire à un modèle basé sur la trace enregistrée ; il doit juste trouver que « la carte colle ».
- [x] **Tech-lead** — confirmé : on étend `GpxMetadata.trackJson` d'un tableau parallèle `pointTimeFractions: ReadonlyArray<number>` (cumulatif normalisé 0..1), produit au parsing GPX si tous les `<trkpt>` ont un `<time>`. La projection passe d'un mapping linéaire `time-fraction → distance-fraction` à `time-fraction → distance-fraction via le profil enregistré`. Aucune migration de schéma DB (la colonne `editions.gpx` est déjà `text`-JSON, `rowToEdition` parse côté repo). Fallback silencieux si pas de timings → comportement actuel préservé pour les éditions déjà uploadées.
- [x] **Developer** — confirmé : un nouveau `*.utils.ts` pur côté site qui prend `(timeFraction, pointTimeFractions, cumulativeDistances) → distanceFraction`, 100 % coverage. Côté api, le parser GPX est étendu pour produire les fractions normalisées ; la mutation est circonscrite à `gpx.core.ts` et son test (déjà à 100 %). Pas de hook React, pas de useEffect, juste une fonction pure substituée dans le `useEffect` Leaflet existant de `CourseMap.tsx`.
- [x] **Designer** — confirmé : aucune affordance nouvelle, aucun composant nouveau. Le seul changement visible est *physique* (le marqueur se déplace différemment dans le temps). Pas de mockup ; le « avant / après » se valide en faisant tourner l'app avec la même `now` et le même GPX, en visualisant le delta de position sur deux fractions données.

## Why

Pendant l'édition test du 2026-05-14, Hugo a constaté en retransmission que l'avatar des coureurs avançait visiblement *trop vite* sur les portions de montée du tracé (l'avatar s'affichait déjà en haut alors que les coureurs étaient encore à mi-pente) et *trop lentement* en descente (l'avatar restait en haut alors que les coureurs étaient déjà rentrés). Le mouvement de l'avatar étant le repère visuel principal pour le spectateur entre deux tops horaires, cette incohérence dégrade la perception de « ce qui se passe ». Avec une boucle plus vallonnée sur la prochaine édition, l'écart deviendra criant.

**Output metric** (lagging, hors CI) : self-report du spectateur en retransmission à la prochaine édition réelle, format binaire « la carte colle / ne colle pas ». Pas de mesure quantitative — le décalage actuel est qualitatif et la cible est qualitative.

**Input metrics** (driveables par `/visual-validation`) :
- Le DTO `edition.gpx.trackJson` inclut `pointTimeFractions` (array croissant strict, démarrant à 0, terminant à 1) si le GPX uploadé avait des `<time>` sur tous les `<trkpt>`.
- Quand `pointTimeFractions` est présent, la position de l'avatar à `timeFraction = 0.5` correspond au point GPX dont la fraction cumulative dépasse 0.5 (et **pas** au point à mi-distance linéaire).
- Quand `pointTimeFractions` est absent, l'avatar suit l'algorithme actuel (mi-temps = mi-distance).

**Gemba** : test edition du 2026-05-14, observation de l'écran retransmission ; GPX de cette édition partagé en pièce jointe (`/root/.claude/uploads/.../1dfdb349-Course_a__pied_le_midi.gpx`, Strava export, 2644 trkpts à 1 pt/s, `<time>` présent partout, 44 min 22 s).

## Result

Aucun nouvel élément visible. Le seul résultat est *comportemental* : sur la même édition, à la même seconde, l'avatar d'un coureur n'est pas à la même position lat/lng qu'avant — il est sur le point qui correspond au moment où le runner enregistré (Hugo) était lui-même à `timeFraction × loopMs` dans son enregistrement.

Pour valider : `/visual-validation` ouvre `/`, attend que la carte rende, capture la position des avatars à `now = startsAt + 0.25 × loopMs`, puis à `now = startsAt + 0.5 × loopMs`, puis à `now = startsAt + 0.75 × loopMs`. Trois screenshots. Pour chacun, l'agent compare la position lat/lng des avatars à des valeurs attendues (calculées au préalable depuis le GPX test). Pas de « ça a l'air bien » — assertions numériques.

## Use cases / edge cases

### Happy path — un GPX enregistré avec timings

1. L'orga upload un GPX Strava-recorded contenant `<time>` sur chaque `<trkpt>`.
2. Le parseur `gpx.core.ts` extrait `pointTimes: ReadonlyArray<Date | null>` pour chaque point.
3. Si **tous** les points ont un timestamp, le parseur calcule `pointTimeFractions: ReadonlyArray<number>` — fraction cumulative normalisée entre 0 et 1 (le premier point a fraction 0, le dernier a fraction 1).
4. Le DTO publié contient `trackJson.pointTimeFractions`.
5. Côté `CourseMap.tsx`, la fonction `projectFraction(track, fraction)` est remplacée par `projectFractionTimeAware(track, fraction, pointTimeFractions)` qui :
   1. Trouve `i` tel que `pointTimeFractions[i] <= fraction < pointTimeFractions[i+1]`.
   2. Interpole linéairement la position lat/lng entre `points[i]` et `points[i+1]` selon la position de `fraction` dans `[pointTimeFractions[i], pointTimeFractions[i+1]]`.
6. L'avatar suit le rythme du tracé enregistré.

### Edge cases

- **GPX sans `<time>` (plotted, ou recorded puis stripé)** : `pointTimeFractions` est `undefined` dans le DTO. `CourseMap.tsx` détecte l'absence et bascule sur `projectFraction(track, fraction)` (algorithme actuel). Sentry breadcrumb `projection_mode: 'linear-fallback'` au mount du composant pour traçabilité, pas d'alerte (cf. Q3 Q.O.D.).
- **GPX avec `<time>` partiel** (un seul `<trkpt>` sans timestamp sur 2644) : traité comme « pas de timings du tout » — la moindre absence invalide la série, on tombe au fallback. Plus simple à raisonner qu'un mode partiel.
- **Coureur 2× plus lent que l'enregistrement** : la fraction temporelle reste 0..1 sur la durée *de la boucle du coureur*. Si Hugo a couru en 44 min mais Borso met 88 min, à `timeFraction = 0.5` Borso est sur le point que Hugo a atteint en 22 min de son propre run — pas en 44 min. La *forme* du profil est conservée, seul le scale temporel total est différent.
- **Pause GPX dans l'enregistrement** (lacets, photo) : la pause se retrouve dans `pointTimeFractions` comme un grand saut de fraction sur une courte distance. L'avatar s'arrêtera 30 s à cet endroit lors de la projection. Pas de smoothing v1, ré-évaluable post-test (cf. Q5 Q.O.D.).
- **Premier point et dernier point au même lieu** (boucle fermée) : déjà géré par `projectFraction` actuel ; aucune logique nouvelle nécessaire.
- **Boucle GPX trop dense (2644 trkpts ≈ 1 pt/s sur 44 min)** : le DTO grossit de ~21 KB de doubles JSON pour `pointTimeFractions` (2644 × ~8 caractères). Acceptable mais à monitorer ; un sous-échantillonnage à ~200 points pourrait être justifié dans un follow-up si la taille du DTO devient un problème (cf. Q6 Q.O.D., out of scope v1).

### Error cases

- **`pointTimeFractions` mal formé en base** (non monotone, ne démarre pas à 0, ne finit pas à 1) : Zod schema côté `edition.repository.ts → rowToEdition` rejette la lecture, l'app crash au démarrage de la page. Mitigation : Zod refine `.refine(arr => arr[0] === 0 && arr[arr.length-1] === 1 && isMonotonic(arr))` sur le tableau. Erreur Sentry au mount avec contexte (= « le serveur a écrit une donnée corrompue »).
- **`pointTimeFractions.length !== points.length`** : invariant validé au parsing GPX (les deux tableaux sont produits ensemble). Zod refine côté lecture pour défense en profondeur.

## Questions, Options and Decisions

| Question | Options | Décision (2026-05-15) |
| --- | --- | --- |
| **Locus de la projection** | (a) Avatar sur la carte (`CourseMap.tsx`). (b) Nouveau % sur les chips du classement. (c) Les deux. | **(a)** — seule surface où une projection existe aujourd'hui. Les chips n'affichent que la dernière boucle validée + heure du top, pas de projection. |
| **Modèle slope → vitesse** | (a) Linéaire par morceaux sur la pente. (b) Naismith / Tobler. (c) Polynôme empirique (Strava GAP). (d) Calibrage online. (e) **Utiliser le temps point-à-point du GPX enregistré** — pas un modèle, des mesures réelles. | **(e)** — exploite la donnée déjà présente dans le GPX Strava-exported, capture *tous* les effets (pente, surface, virages, fatigue), pas de constante magique à défendre. |
| **Source de la donnée de pente / vitesse** | (a) Élévation brute dans le DTO (modèle slope client-side). (b) Facteurs pré-calculés serveur. (c) Re-parse GPX client-side. (d) **Fractions de temps normalisées dans le DTO** (avec décision e ci-dessus, on stocke ce qui est utile). | **(d)** — un tableau `pointTimeFractions: ReadonlyArray<number>` cumulatif 0..1 dans `trackJson`. Lecture O(log n) côté client via binary search. |
| **GPX sans balises `<time>`** | (a) Rejet au upload. (b) **Fallback silencieux** vers l'algo actuel. (c) Flag explicite dans le DTO. | **(b)** — préserve les éditions déjà uploadées, breadcrumb Sentry pour traçabilité, pas d'alerte. |
| **Smoothing des durées de segment** | (a) **Pas de smoothing v1**. (b) Clamp à 3× la médiane. (c) Moyenne mobile. | **(a)** — on commence simple, on observe en prod, on smooth seulement si une pause de l'enregistrement crée un défaut visuel notable. |
| **Sous-échantillonnage du GPX** | (a) Garder tous les points (2644 pour le test). (b) Sous-échantillonner à ~200 points au parsing. | **(a) v1** — taille du DTO acceptable (~21 KB additionnels). À revoir si DTO total dépasse 100 KB ou si la carte rame sur mobile. *Out of scope v1.* |

### Hors scope

- Sous-échantillonnage du GPX.
- Smoothing des durées (clamp, moyenne mobile).
- Profil de vitesse *par coureur* (chaque coureur a son propre rythme observé). v1 utilise un profil unique = celui du GPX uploadé.
- Recalibrage du profil depuis les pointages observés de l'édition courante (Bayesian update).
- Rejet au upload des GPX sans `<time>` (préservation du backward-compatibility).
- Affichage d'un graphe profil élévation / vitesse quelque part dans l'UI.

## Changes

### Types / domain model

```ts
// api/src/edition/edition.types.ts (UPDATE)
export interface GpxMetadata {
  readonly distanceMeters: number;
  readonly elevationGainMeters: number;
  readonly trackJson: {
    readonly points: ReadonlyArray<{ readonly lat: number; readonly lng: number }>;
    readonly pointTimeFractions?: ReadonlyArray<number>; // NEW — cumulative 0..1, length === points.length, monotonic, [0]=0, [n-1]=1
  };
  readonly startLatLng: { readonly lat: number; readonly lng: number };
}

// api/src/helpers/gpx/gpx.core.ts (UPDATE)
export interface GpxTrack {
  readonly distanceMeters: number;
  readonly elevationGainMeters: number;
  readonly startLatLng: LatLng;
  readonly points: readonly LatLng[];
  readonly pointTimeFractions: readonly number[] | null; // NEW — null when any <trkpt> lacked <time>
}

// site/src/components/course-map.utils.ts (NEW, pure)
export function projectFractionTimeAware(
  track: Indexed,
  fraction: number,
  pointTimeFractions: ReadonlyArray<number>,
): LatLngDto;
```

### Database changes

Aucune migration. La colonne `editions.gpx` est déjà stockée en `text`-JSON (cf. [`dsql-postgres-compat-gaps.md §1`](../../../knowledge/dsql-postgres-compat-gaps.md) — DSQL ne supporte pas `jsonb`). Le nouveau champ `pointTimeFractions` est juste une clé optionnelle de plus dans l'objet sérialisé. Les éditions existantes lues sans cette clé ⇒ `pointTimeFractions` reste `undefined` côté code ⇒ fallback déclenché. Backward-compatible par construction.

### Files to change

```
# Back
apps/last-loop-lepin/api/src/helpers/gpx/gpx.core.ts                 // UPDATE: regex extraction adds <time>, parsing builds cumulative pointTimeFractions when all points have a timestamp; returns null otherwise
apps/last-loop-lepin/api/src/helpers/gpx/gpx.core.test.ts            // UPDATE: 4 new test vectors — all-timed, one-missing, none-timed, single-point edge
apps/last-loop-lepin/api/src/edition/edition.types.ts                // UPDATE: GpxMetadata.trackJson.pointTimeFractions optional
apps/last-loop-lepin/api/src/edition/edition.schema.ts               // UPDATE: Zod schema for editions row gains the optional pointTimeFractions with refine(monotonic + bounds)
apps/last-loop-lepin/api/src/edition/edition.repository.ts           // UPDATE: rowToEdition forwards the new field; writeEdition serialises it
apps/last-loop-lepin/api/src/edition/edition.service.ts              // UPDATE: createEdition / updateEdition pass the parser output through to the row

# Front
apps/last-loop-lepin/site/src/domain/types.ts                        // UPDATE: site-side RaceEditionDto.gpx.trackJson.pointTimeFractions optional
apps/last-loop-lepin/site/src/api/client.ts                          // UPDATE: Zod schema for the public edition DTO matches
apps/last-loop-lepin/site/src/components/course-map.utils.ts         // NEW: projectFractionTimeAware(track, fraction, pointTimeFractions) — pure, 100% coverage. Binary search on pointTimeFractions, linear interpolation on the matched segment.
apps/last-loop-lepin/site/src/components/course-map.utils.test.ts    // NEW: 6 test vectors — monotonic time fractions equal to distance fractions (degenerate, output == projectFraction), pure-uphill profile (slow first half), pure-downhill profile (fast first half), single-segment, exact boundary fractions, fraction clamp [0,1].
apps/last-loop-lepin/site/src/components/CourseMap.tsx               // UPDATE: the runner-positioning useEffect (line ~155) chooses projectFractionTimeAware if pointTimeFractions is defined, otherwise falls back to existing projectFraction. Sentry breadcrumb on which branch fires.
```

### Test strategy

- **Unit `*.utils.ts`** — `course-map.utils.ts` ships à 100 % coverage avec 6 vecteurs (cf. plus haut). Le degenerate case (`pointTimeFractions === distanceFractions`) doit retourner la même position que `projectFraction`, ce qui ancre le test contre le code existant.
- **Unit `*.core.ts`** — `gpx.core.ts` (déjà à 100 %) reste à 100 % avec 4 vecteurs additionnels : all-timed (Strava-style), one-missing (fallback), none-timed (fallback), single-point edge.
- **Unit Zod refine** — `edition.repository.ts` valide qu'une corruption en base (`pointTimeFractions` non monotone, ne démarre pas à 0, ne finit pas à 1, longueur ≠ `points.length`) est rejetée à la lecture. Tests dédiés dans `edition.repository.test.ts`.
- **Visual validation** — `/visual-validation` ouvre `/` avec un GPX test connu (le fixture qu'on commit dans `apps/last-loop-lepin/api/src/helpers/gpx/__fixtures__/strava-recorded.gpx` — extrait du GPX réel uploadé en session, sous-échantillonné à 50 points pour rester en repo), une `now` mockée, et capture la position lat/lng des avatars à `timeFraction = 0.25 / 0.5 / 0.75`. Pour chaque, l'agent compare aux positions attendues (pré-calculées au parsing, dump dans un fichier `.expected.json` à côté du fixture).
- **Technical validation** — lint + knip + typecheck + build + coverage gates passent. Per-Q.O.D. correctness pass sur le diff confirme : (a) fallback bien câblé quand `pointTimeFractions` est `undefined`, (b) Zod refine bien en place, (c) le parser GPX retourne `null` plutôt qu'un tableau invalide en cas de timing partiel.
- **Coverage gates** — `course-map.utils.ts` (NEW, site) gaté par le pattern existant `site/src/**/*.utils.ts` à 100 %. `gpx.core.ts` reste à 100 %. Pas de `infra/cdk/**` ni `infra/shared/**` modifié.
- **Manual smoke après deploy** — *belt only* : ouvrir `/` en retransmission avec le GPX du test 2026-05-14 et observer pendant 5 minutes si le mouvement de l'avatar est cohérent avec une boucle complète. Pas un gate.

## Production strategy

### Analytics

**Input metrics** (Sentry breadcrumbs + structured logs, basse cardinalité) :
- `course_map_projection_mode` — breadcrumb au mount de `CourseMap`, valeur `'recorded-pace'` ou `'linear-fallback'`. Permet de répondre à la question post-prod « est-ce que toutes nos éditions tournent en mode recorded-pace, ou y a-t-il des éditions qui silentement retombent sur le linéaire ? ».
- `gpx_parse_partial_timings` — breadcrumb au parsing serveur si certains `<trkpt>` ont un `<time>` et d'autres non. Permet de détecter un GPX dégénéré sans bloquer l'upload.

Pas de p50/p75 thresholds — la volumétrie est anecdotique (un upload GPX par édition, deux ou trois éditions au mieux par an).

**Output metric** (lagging, manual review) :
- Self-report Hugo en retransmission de la prochaine édition réelle : « la carte colle / ne colle pas ». Binaire, qualitatif. Si « ne colle pas », ouverture d'un follow-up spec pour smoothing ou modèle alternatif.

### Zero-defect strategy

Named error classes :
- **Aucune nouvelle classe d'erreur** — le fallback silencieux est intentionnel et le Zod refine au repo-read catch les corruptions en base.
- **`ZodError` au mount de `editionFromRowSchema.parse`** — déjà géré, surface en Sentry. Si elle fire avec un message mentionnant `pointTimeFractions`, c'est qu'on a écrit une donnée corrompue : alerte > 1 occurrence en prod, parce que c'est forcément un bug, pas un input utilisateur.
- **`GpxParseError` au upload** — déjà géré, surface en 4xx sur la route admin. Pas d'alerte (input utilisateur).
