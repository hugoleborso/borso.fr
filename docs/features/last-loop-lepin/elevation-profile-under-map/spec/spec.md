# Le profil de dénivelé porte les avatars qui se déplacent comme sur la carte

## Perspectives confronted

- [x] **Client / business** — confirmé : sur une boucle vallonnée, la position du coureur sur la carte ne dit pas s'il monte ou descend en ce moment. Le profil corrélé répond à cette question d'un coup d'œil. Pour la retransmission spectateur c'est un nouveau repère narratif sans nouvelle interaction.
- [x] **Product** — confirmé : suivi des coureurs *dans le profil* (pas juste topologie statique). Tous les coureurs in-race ont leur curseur sur le profil ; même cadence de mise à jour que les avatars de la carte (poll standings toutes les 2 s).
- [x] **Tech-lead** — confirmé : on étend `GpxMetadata.trackJson` avec `pointElevations: ReadonlyArray<number>` (même pattern que `pointTimeFractions` ajouté par la feature `gpx-speed-aware-projection`). Le parser GPX (`gpx.core.ts`) lit déjà `<ele>` mais le tableau est dropped après le calcul du D+ — il suffit de le préserver. Aucune migration DB (`editions.gpx` est text-JSON, backward-compatible). Le profil est rendu via SVG hand-rolled — pas de chart lib, pas de nouvelle dep.
- [x] **Developer** — confirmé : un nouveau `*.utils.ts` pur `elevation-profile.utils.ts` côté site, 100 % coverage. Inputs : `(elevations, distances, width, height) → { areaPolygonPoints, linePolylinePoints, yAt(distanceFraction) }`. Le composant React `ElevationProfile.tsx` rend le SVG + map les pastilles coureurs via le même `distanceFraction` que celui calculé par `course-map.utils.ts` (réutilisation directe). Pas de `useEffect`.
- [x] **Designer** — confirmé : aire remplie style Strava, gradient vertical de l'accent vers transparent. Curseurs des coureurs = mêmes `initialsAvatar` que sur la carte (`circle` + texte SVG), 14 px de diamètre, posés sur la courbe à la position `(distanceFraction × width, yAt(distanceFraction))`. Quand plusieurs coureurs sont groupés, les pastilles se superposent — pas de dispersion, on accepte l'overlap (sémantique « ils sont ensemble »). Photos coureurs hors-scope (cf. stub spec `runner-photos-everywhere`).

## Why

Sur une boucle vallonnée (la prochaine édition prévue à Lépin a un D+ significatif), la position lat/lng d'un avatar sur la carte ne dit pas s'il est *en train de monter ou de descendre*. Le profil corrélé répond à cette question — le spectateur voit instantanément qu'un coureur est sur la portion ascendante (donc ralenti) ou descendante (donc rapide), sans avoir à reconnaître mentalement la topologie sur la carte 2D.

**Output metric** (lagging, hors CI) : self-report en retransmission « est-ce que le profil m'aide à comprendre ce qui se passe ? oui / non / autre ». Binaire qualitatif, mesuré par Hugo après la prochaine édition réelle. La feature jumelle `gpx-speed-aware-projection` adresse le « comment ça bouge » ; cette feature-ci adresse le « où ça bouge dans la topographie ».

**Input metrics** (driveables par `/visual-validation`) :
- Le DTO `edition.gpx.trackJson` inclut `pointElevations: ReadonlyArray<number>` (longueur === `points.length`) si le GPX uploadé avait des `<ele>` sur tous les `<trkpt>`.
- Le profil SVG est rendu dans la zone bas-droite de la grille `.spectator-hero` quand l'édition est `live`.
- Pour chaque coureur `in-race`, une pastille avec ses initiales est rendue sur la courbe, à la même fraction de distance que son avatar sur la carte.
- Quand un coureur fait DNF (ou est au corral après avoir clos la boucle courante), sa pastille disparaît du profil. Les coureurs au corral sont déjà cachés de la carte par la condition `restingAtCorral` ; on applique la même logique.
- Le « Mur des éliminés » disparaît de la page (redondant avec les chips DNF dans le classement).

**Gemba** : pas d'observation terrain spécifique sur cette feature — c'est issue de la session spec du 2026-05-15. Anticipée pour la prochaine édition vallonnée.

## Result

Nouveau layout en grille pour `.spectator-hero` :

```
+---------------------+------------------+
|                     |     CARTE        |
|       HORLOGE       |   (CourseMap)    |
|     (Countdown +    +------------------+
|    InRaceCounter)   |     PROFIL       |
|                     |  (NEW component) |
+---------------------+------------------+
|                                        |
|              CLASSEMENT                |
|             (Leaderboard)              |
|                                        |
+----------------------------------------+
```

Horloge en colonne gauche, span 2 rangées. Carte top-right, profil bottom-right. Classement en pleine largeur en dessous. Le « Mur des éliminés » est supprimé (déjà ré-implémenté en tant que chip-DNF dans `Leaderboard`).

Le profil lui-même :
- Aire remplie style Strava, gradient vertical (accent → transparent).
- Courbe surlignée (stroke de l'accent).
- Axe X = distance cumulative de la boucle (0 → totalMeters). Pas de labels.
- Axe Y = altitude (minElevation → maxElevation, marge 5 % en haut). Pas de labels.
- Pastilles coureurs : cercles SVG 14 px avec initiales centrées, position `(distanceFraction × width, yAt(distanceFraction))` calculée à chaque poll standings.

Mockup mental : analogue à la mini-élévation Strava sous le segment, augmenté des pastilles à la place d'un curseur unique.

## Use cases / edge cases

### Happy path

1. L'orga upload un GPX recorded (Strava) avec `<ele>` sur chaque `<trkpt>` (cas par défaut).
2. Le parser conserve `pointElevations`. Le DTO l'expose dans `trackJson`.
3. L'édition démarre. L'écran `/` rend la grille : horloge gauche, carte top-right, profil bottom-right, classement plein-largeur.
4. À chaque poll standings (toutes les 2 s), `CourseMap` calcule `distanceFraction` par coureur in-race ; `ElevationProfile` consomme la même `distanceFraction` pour placer les pastilles sur la courbe.
5. Un coureur s'élance sur la portion ascendante → sa pastille monte le long de la courbe.
6. Le coureur arrive au sommet → la pastille passe à descendre.

### Edge cases

- **GPX sans `<ele>`** (théorique, le format GPX expose toujours `<ele>` quand recorded ; les uploads plottés peuvent l'omettre) : `pointElevations` est `undefined` dans le DTO. Le composant `ElevationProfile` rend un placeholder « Profil indisponible » (muted, même hauteur que le SVG normal pour ne pas casser la grille). Pas de dégradation des autres composants.
- **GPX avec `<ele>` partiel** (un seul trkpt sur N sans `<ele>`) : traité comme « pas d'élévations du tout » (same logique que la feature `gpx-speed-aware-projection` pour `<time>` partiel). Tous-ou-rien.
- **Profil avec dénivelé nul** (boucle plate) : minElevation === maxElevation. Le SVG rend une ligne horizontale (cas géré par clamp dans le calcul Y). Aucune erreur.
- **Coureurs au corral** : leur pastille n'est PAS rendue (même règle `restingAtCorral` que la carte).
- **Coureurs DNF** : leur pastille n'est PAS rendue. Cohérent avec la carte.
- **Plusieurs coureurs à la même fraction** : les pastilles se superposent. Pas de dispersion v1 ; le spectateur voit « ils sont ensemble », sémantique acceptable.
- **Très grand nombre de points** (cas test : 2644 trkpts sur le GPX Strava du 2026-05-14) : le polygon SVG a 2644 sommets. Performance OK sur desktop ; sub-sampling éventuellement à considérer dans un follow-up si la carte rame sur mobile (out of scope v1, même décision que `gpx-speed-aware-projection`).

### Error cases

- **`pointElevations.length !== points.length`** : invariant validé au parsing GPX. Zod refine côté lecture (`edition.repository.ts → rowToEdition`) pour défense en profondeur. ZodError au mount = donnée corrompue, alerte > 1 occurrence en prod.
- **Tous les `pointElevations` sont identiques** (corruption du parse) : géré par le clamp minElevation/maxElevation. Profil rendu plat. Pas d'erreur.

## Questions, Options and Decisions

| Question | Options | Décision (2026-05-15) |
| --- | --- | --- |
| **Bénéfice principal** | (a) Compréhension topologique statique. (b) Suivi des coureurs *dans* le profil. (c) Polish visuel. | **(b)** — la corrélation carte↔profil est la vraie valeur. Profil statique aurait été un nice-to-know de plus, mais le suivi en temps réel est ce qui justifie l'effort. |
| **Style de rendu** | (a) Aire remplie type Strava. (b) Sparkline ligne fine. (c) Avec axes + grille. | **(a)** — gradient vertical, courbe surlignée, pas de labels. Lisibilité immédiate, surface graphique propre. |
| **Curseurs coureurs** | (a) Profil statique. (b) Curseur du leader uniquement. (c) Curseurs de tous les coureurs in-race. | **(c)** — densité visuelle élevée à 20-30 coureurs assumée. La sémantique « ils sont groupés » est portée par les superpositions. |
| **Style des pastilles** | (a) Pastilles rondes avec initiales (`initialsAvatar`). (b) Traits verticaux colorés. (c) Points anonymes uniformes. | **(a)** — cohérence visuelle avec la carte. Photos coureurs reportées (hors-scope, cf. `runner-photos-everywhere`). |
| **Mur des éliminés** | (a) Reste hors grille en bas. (b) Supprimé. (c) Intégré dans la grille. | **(b)** — redondant avec les chips DNF dans le classement. Simplification de la page. |
| **Données d'élévation** | (a) Tableau brut `pointElevations` dans `trackJson`. (b) Profil pré-échantillonné serveur. (c) Re-parse client. | **(a)** — même pattern que `pointTimeFractions`. Client a la donnée brute, peut faire évoluer le rendu sans toucher au serveur. |
| **Lib chart** | (a) SVG hand-rolled. (b) Recharts. (c) ECharts / uPlot / Chart.js. | **(a)** — gradient, polygon, pastilles : tout en JSX standard, pas d'instance impérative à gérer, pas de dépendance ajoutée. ~80 lignes JS + 30 lignes CSS au total. |
| **Photos coureurs sur les pastilles** | (a) Dans le scope, fallback initiales. (b) Initiales uniquement, photos hors-scope. (c) Stub spec parallèle « photos partout ». | **(c)** — feature séparée capturée à [`runner-photos-everywhere/spec/spec.md`](../runner-photos-everywhere/spec/spec.md) (stub). Cette feature utilise uniquement `initialsAvatar` ; quand `runner-photos-everywhere` ship, les trois surfaces (Leaderboard, CourseMap, ElevationProfile) basculent ensemble. |
| **Projection X des pastilles** | (a) Même `distanceFraction` que la carte. (b) Projection linéaire indépendante. | **(a)** — cohérence carte↔profil garantie. Réutilise `projectFractionTimeAware` quand `pointTimeFractions` est dispo, sinon fallback linéaire (mêmes branches que la carte). |

### Hors scope

- Photos sur les pastilles (cf. stub `runner-photos-everywhere`).
- Coloration de la courbe par pente (rouge montée / bleu descente).
- Sub-sampling du profil pour mobile.
- Axes numériques (distance, altitude).
- Tooltip au survol — la page n'est pas interactive (retransmission).
- Dispersion des pastilles groupées (anti-overlap).

## Changes

### Types / domain model

```ts
// api/src/edition/edition.types.ts (UPDATE)
export interface GpxMetadata {
  readonly distanceMeters: number;
  readonly elevationGainMeters: number;
  readonly trackJson: {
    readonly points: ReadonlyArray<{ readonly lat: number; readonly lng: number }>;
    readonly pointTimeFractions?: ReadonlyArray<number>; // existing (gpx-speed feature)
    readonly pointElevations?: ReadonlyArray<number>;   // NEW — meters, length === points.length when present
  };
  readonly startLatLng: { readonly lat: number; readonly lng: number };
}

// api/src/helpers/gpx/gpx.core.ts (UPDATE)
export interface GpxTrack {
  readonly distanceMeters: number;
  readonly elevationGainMeters: number;
  readonly startLatLng: LatLng;
  readonly points: readonly LatLng[];
  readonly pointTimeFractions: readonly number[] | null; // existing
  readonly pointElevations: readonly number[] | null;   // NEW — null when any <trkpt> lacked <ele>
}

// site/src/components/elevation-profile.utils.ts (NEW, pure)
type ProfileGeometry = {
  readonly areaPolygonPoints: string;       // SVG polygon points attribute
  readonly linePolylinePoints: string;       // SVG polyline points attribute
  readonly yAt: (distanceFraction: number) => number; // for runner-avatar Y coord
  readonly width: number;
  readonly height: number;
};

export function buildProfileGeometry(
  pointElevations: ReadonlyArray<number>,
  cumulativeDistances: ReadonlyArray<number>,
  width: number,
  height: number,
): ProfileGeometry;
```

### Database changes

Aucune. Même argument que `gpx-speed-aware-projection` : `editions.gpx` est text-JSON, l'ajout d'une clé optionnelle est backward-compatible. Les éditions déjà uploadées sans `pointElevations` rendront le profil placeholder « indisponible ».

### Files to change

```
# Back
apps/last-loop-lepin/api/src/helpers/gpx/gpx.core.ts                  // UPDATE: preserve elevations from RawPoint → GpxTrack.pointElevations (null when partial)
apps/last-loop-lepin/api/src/helpers/gpx/gpx.core.test.ts             // UPDATE: 3 new vectors — all-elevated, one-missing, none
apps/last-loop-lepin/api/src/edition/edition.types.ts                 // UPDATE: GpxMetadata.trackJson.pointElevations optional
apps/last-loop-lepin/api/src/edition/edition.schema.ts                // UPDATE: Zod refine on pointElevations (length-parity with points, all finite numbers)
apps/last-loop-lepin/api/src/edition/edition.service.ts               // UPDATE: trackJsonOf helper extended (same null→omit pattern as pointTimeFractions)
apps/last-loop-lepin/api/src/edition/edition.repository.test.ts       // UPDATE: 2 round-trip tests (present persists; absent stays undefined)

# Front
apps/last-loop-lepin/site/src/domain/types.ts                         // UPDATE: site-side DTO mirror
apps/last-loop-lepin/site/src/api/client.ts                           // UPDATE: Zod schema matches
apps/last-loop-lepin/site/src/components/elevation-profile.utils.ts   // NEW: pure SVG-geometry builder, 100% coverage
apps/last-loop-lepin/site/src/components/elevation-profile.utils.test.ts // NEW: 8 vectors — flat profile, monotonic climb, V-shape, large N (~2644 points), yAt boundary fractions (0, 0.5, 1), elevation==minElevation==maxElevation (clamp)
apps/last-loop-lepin/site/src/components/ElevationProfile.tsx         // NEW: React shell — reads edition.gpx.trackJson, computes `distanceFraction` per runner via the same projector as CourseMap (extracted as a shared helper, see below), renders SVG with <defs><linearGradient/>, <polygon>, <polyline>, and one <g> per runner avatar
apps/last-loop-lepin/site/src/components/course-map.utils.ts          // UPDATE: extract `runnerDistanceFraction(edition, entry, now): number | null` so both CourseMap.tsx and ElevationProfile.tsx call the same projection. Existing projectFraction / projectFractionTimeAware stay.
apps/last-loop-lepin/site/src/components/CourseMap.tsx                // UPDATE: replace inline fraction calc with the new shared helper (no behavioural change, refactor only)
apps/last-loop-lepin/site/src/routes/SpectatorPage.tsx                // UPDATE: .spectator-hero becomes 2×2 grid; <ElevationProfile /> added under <CourseMap />; <EliminatedWall /> removed from the JSX tree
apps/last-loop-lepin/site/src/components/EliminatedWall.tsx           // DELETE
apps/last-loop-lepin/site/src/styles/spectator.css (or equivalent)    // UPDATE: .spectator-hero { display: grid; grid-template-columns: 1fr 1fr; grid-template-rows: 1fr 1fr; } with horloge spanning rows
apps/last-loop-lepin/site/src/styles/tokens.css                       // UPDATE: optional new token --accent-profile-gradient (or reuse existing --accent)
```

### Test strategy

- **Unit `*.utils.ts`** — `elevation-profile.utils.ts` à 100 % coverage avec 8 vecteurs (cf. plus haut). Le helper `runnerDistanceFraction` extrait de `course-map.utils.ts` reste à 100 % (test directs + tests existants via `projectFraction*`).
- **Unit `*.core.ts`** — `gpx.core.ts` reste à 100 % après l'ajout du preservation `pointElevations` (3 vecteurs nouveaux).
- **Unit Zod refine** — `edition.schema.ts` refine (length-parity, finite numbers) testé directement.
- **Visual validation** — `/visual-validation` ouvre `/` avec un GPX test connu (le même `STRAVA_RECORDED_SAMPLE` utilisé par les features `gpx-speed-aware-projection` et `gpx.core.ts` tests, déjà sub-samplé à ~50 trkpts). Asserte : (a) le SVG du profil existe sous la carte, (b) un `<polygon>` est rendu avec un `points=` non-vide, (c) un gradient `<linearGradient>` est défini, (d) au moins une `<circle>` (avatar coureur) est rendue sur la courbe, (e) la `<circle>` est positionnée à la même `cx` qu'attendu d'après le seed (`distanceFraction × width`), (f) un GPX sans `<ele>` (vecteur de test alternatif) rend le placeholder « Profil indisponible » et pas de `<polygon>`, (g) `<EliminatedWall>` n'est plus présent dans le DOM.
- **Technical validation** — lint + knip + typecheck + build + coverage gates. Diff revue confirme : (a) refactor `runnerDistanceFraction` ne change pas la projection sur la carte (test snapshot ou comparaison directe), (b) la grille CSS bascule sans casser le rendu sur la page setup / archives, (c) `EliminatedWall.tsx` est bien supprimé (pas juste retiré du JSX), (d) knip ne flagge pas d'export orphelin restant.
- **Coverage gates** — `elevation-profile.utils.ts` gaté par `site/src/**/*.utils.ts` à 100 %. `course-map.utils.ts` reste à 100 % après le refactor. `gpx.core.ts` reste à 100 %.
- **Manual smoke après deploy** — *belt only* : ouvrir `/` en retransmission avec le GPX du test 2026-05-14 et observer les pastilles bouger sur le profil.

## Production strategy

### Analytics

**Input metrics** :
- Aucun event utilisateur nouveau (la page n'est pas interactive). Un breadcrumb `course_map_elevation_profile_mode: 'rendered' | 'placeholder'` au mount permet de constater post-prod combien d'éditions tournent avec ou sans `pointElevations`.

**Output metric** (lagging, manual review) :
- Self-report Hugo à la prochaine édition réelle : « le profil aide à comprendre ce qui se passe ? oui/non/autre ». Binaire qualitatif.

### Zero-defect strategy

Named error classes :
- **`ZodError` au mount** si la donnée en base est corrompue (`pointElevations.length !== points.length`, contient des non-numbers). Déjà couvert par le pattern Zod existant côté `edition.repository.ts`. Alerte > 1 occurrence en prod.
- **Aucune nouvelle classe d'erreur** côté front — le placeholder « Profil indisponible » est une voie de rendu normale, pas une erreur.
