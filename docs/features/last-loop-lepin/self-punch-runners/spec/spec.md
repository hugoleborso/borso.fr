# Les coureurs pointent eux-mêmes leur fin de boucle

## Perspectives confronted

- [x] **Client / business** — confirmé dans le spec parent ([`race-screen-clarity-and-self-punch/spec/spec.md`](../../race-screen-clarity-and-self-punch/spec/spec.md)) : l'admin a tapé 6 pointages au top horaire sur l'édition test, intenable à 20-30 coureurs ; les coureurs ont demandé à pouvoir le faire eux-mêmes. Coexistence avec le pointage admin gardée comme filet de sécurité.
- [x] **Product** — confirmé : sélection libre du coureur (pas de token, pas de QR), géofence comme seule barrière, admin reste filet. Le compromis anti-triche est assumé : un coureur motivé à tricher reste capable de forger les coordonnées en devtools ; ce n'est pas le profil d'attaquant qu'on cherche à arrêter.
- [x] **Tech-lead** — confirmé : on réutilise `validatePunchTiming` (déjà pur en `*.core.ts`), on ajoute une route publique distincte de la route admin, on étend `loopPunchesTable` avec des colonnes nullable, on calcule la distance haversine en serveur ET en client (double check), formule dupliquée en deux `*.utils.ts` jumeaux à 100 % coverage chacun (la formule étant gelée mathématiquement, le risque de drift est faible et capturé par des vecteurs de test partagés). Aucune logique temporelle nouvelle. DSQL accepte `ALTER TABLE ADD COLUMN` (cf. [`docs/knowledge/dsql-postgres-compat-gaps.md`](../../../knowledge/dsql-postgres-compat-gaps.md) qui ne le liste pas) ; résidu à dry-run au plan : la combinaison `ADD COLUMN ... NOT NULL DEFAULT 'admin'` sur des rows existantes.
- [x] **Developer** — confirmé : `haversineDistanceMeters` dupliqué en deux fichiers `*.utils.ts` jumeaux (api + site), chacun à 100 % de coverage (décision révisée en plan-time, cf. Q.O.D.). Pas de `useGeolocation` au sens hook — juste une fonction async `requestPosition()` appelée dans le `onClick` du bouton « Je suis là » (conforme à CLAUDE.md « useEffect est un smell »). Deux modales (confirmation + résultat). Test stratégie : `/visual-validation` couvre les 4 chemins (succès, hors zone, déjà punché, permission refusée).
- [x] **Designer** — confirmé : chips de coureurs (`leaderboard-chip`) deviennent tapables ; affordance discrète (hover/active state, pas de bouton visible) ; modale dédiée plutôt que page séparée ; chip d'un coureur DNF tapée déclenche une modale d'erreur explicite plutôt qu'un rendu inerte.

## Why

L'admin actuelle est le goulot d'étranglement du top horaire : sur le test à 6 coureurs, le rythme est déjà tendu ; à 20-30 il devient intenable, surtout quand l'admin se déplace ou est occupé. Le self-punch permet au coureur de fermer sa boucle lui-même depuis son téléphone, en tapant sa chip dans le classement public, sous réserve d'être physiquement présent dans une géofence de 100 m autour du point de départ-arrivée GPX.

**Output metric** (lagging, hors CI) : ratio des pointages effectués en self-punch vs admin-punch sur la prochaine édition réelle, lu en base via la colonne `source`. Cible souhaitée : > 70 % des pointages en self-punch, sans contestation a posteriori d'un coureur sur sa propre validation. Mesuré hors-bande, manuellement, après l'édition.

**Input metrics** (driveables par `/visual-validation`) :
- Le tap sur une chip de coureur (`leaderboard-chip`) en course ouvre la modale de confirmation.
- Le tap sur la chip d'un coureur DNF ouvre la modale d'erreur « ce coureur est déjà éliminé », sans appeler l'API.
- Le bouton « Je suis là, valider la boucle N » de la modale déclenche `navigator.geolocation.getCurrentPosition`.
- Une position dans la géofence (`distance < 100 m`) écrit un punch en base avec `source='self'` et les coordonnées loggées.
- Une position hors géofence (`distance ≥ 100 m`) affiche la modale d'erreur « hors zone » sans écrire en base.
- Un refus de permission `navigator.geolocation` affiche la modale d'erreur avec le guide de réactivation par navigateur.

**Gemba** : édition test du 2026-05-14, 4 DNF dont 2 en B1 et 2 en B2 (screenshots dans le spec parent). L'admin a manqué un pointage parce qu'il était occupé à valider un DNF — c'est précisément le scénario que ce spec adresse.

## Result

L'écran public `/` reste celui que les spectateurs voient déjà. Le seul ajout visible côté lecture est l'affordance tactile sur les chips de coureurs. Quand un coureur tape sa chip :

1. **Modale de confirmation** — par-dessus le classement.
   - Texte : « Je suis **[displayName]**, valider la boucle **N** ? »
   - Avatar et numéro de dossard du coureur sélectionné.
   - Bouton primaire : « Je suis là ».
   - Bouton secondaire : « Annuler ».
2. **Modale de résultat** (remplace la précédente après le tap sur « Je suis là ») — quatre variantes :
   - **Succès** : « Boucle N validée — prochain top à HH:MM », bouton « Fermer ».
   - **Hors zone** : « Tu es à X m du point de départ-arrivée. Le pointage n'est possible qu'à moins de 100 m. » Bouton « Fermer ».
   - **Refus de permission** : « Active la localisation pour pointer. » Guide bref par navigateur (Safari iOS : Réglages › Safari › Localisation ; Chrome Android : icône cadenas › Autorisations › Localisation). Bouton « Réessayer ».
   - **Erreur métier** (`already-punched-this-loop`, `race-not-started`, `race-finished`, `runner-not-in-race`) : message court par cas. Bouton « Fermer ».
   - **Erreur réseau** : « Pas de connexion. Réessaie. » Bouton « Réessayer ».
3. **Cas chip DNF** : une chip dont `status.kind === 'dnf'` ouvre directement la modale d'erreur « Ce coureur est déjà éliminé — adresse-toi à l'organisation si tu veux être réintégré. » Pas d'appel API, pas de demande de géoloc.

Pas de redirection, pas de nouvelle page. Le coureur reste sur `/` et voit le repoll de standings après fermeture.

## Use cases / edge cases

### Happy path — un coureur valide sa boucle

1. Borso clôt sa boucle 3 en courant. Il arrive au point de départ-arrivée, sort son téléphone, ouvre `/borso.fr/last-loop-lepin/` (ou équivalent).
2. Il trouve sa chip dans le classement, la tape.
3. Modale : « Je suis Borso, valider la boucle 3 ? » — il tape « Je suis là ».
4. Le navigateur demande la permission géoloc ; il accepte.
5. Le client calcule `haversineDistance(currentPos, edition.gpx.startLatLng)` = 12 m. Le POST part vers `POST /api/self-punches` avec `{ editionSlug, runnerSlug, clientLat, clientLng, clientAccuracy }`.
6. Le serveur recalcule `distance` (12 m), passe `validatePunchTiming`, écrit le punch avec `source='self'`, retourne 201.
7. Modale de succès : « Boucle 3 validée — prochain top à 21:00 ».
8. Repoll de standings → la chip de Borso passe à `BOUCLE 3`.

### Edge cases

- **Coureur tape la chip d'un autre coureur en course** : la modale de confirmation lit le `displayName` de la chip tapée. Si Borso tape la chip de Pchol, la confirmation dit « Je suis Pchol, valider la boucle 3 ? ». Si Borso confirme et est effectivement dans la géofence, c'est un punch frauduleux pour Pchol. Mitigation : aucune au-delà du log (`source='self'`, `userAgent`, `ip`). Acceptée comme limite du modèle « sélection libre ».
- **Spectateur sur son téléphone perso tape une chip** : il n'est pas dans la géofence (spectateur à 200 m du point) → modale « hors zone ». Filtré.
- **Écran de retransmission** : non tactile, donc immune par construction.
- **Coureur tape sa chip avant le 1ᵉʳ top horaire** : `validatePunchTiming` retourne `targetLoop = 1`. Si on est encore avant `edition.startsAt`, rejet `race-not-started`. Modale d'erreur métier correspondante.
- **Coureur tape sa chip après `endsAt`** : rejet `race-finished`. Modale d'erreur métier.
- **Coureur tape sa chip alors qu'il a déjà punché la boucle courante** (admin a déjà pointé pour lui, ou self-punch précédent) : rejet `already-punched-this-loop`. Modale d'erreur métier.
- **Coureur en mode fallback cellulaire avec `accuracy = 500 m`** : la `distance` brute calculée est ce qu'elle est ; si la position rapportée le place à 50 m du point, on accepte (même si la « vraie » position pourrait être à 500 m). Décision assumée : on logge `accuracy` mais on ne l'utilise pas dans la règle. Le coureur frauduleux qui exploite ce trou doit déjà être physiquement proche d'un point pour qu'un fallback cellulaire ait des chances de placer son barycentre dedans.
- **Coureur autorise la géoloc, mais `getCurrentPosition` time out** (`PositionError.TIMEOUT`) : modale d'erreur « impossible d'obtenir ta position, réessaie », bouton « Réessayer ».
- **Coureur a déjà fait DNF mais tape quand même sa chip** : modale d'erreur « Tu es déjà éliminé », sans appel API.

### Error cases

- **POST 4xx / 5xx** : modale d'erreur avec le message serveur ou « Erreur serveur, réessaie » par défaut. Bouton « Réessayer » re-tente la séquence depuis la géoloc.
- **POST timeout / pas de réseau** : modale « Pas de connexion ». Bouton « Réessayer ». Pas de queue offline.
- **Serveur recalcule `distance > 100 m` alors que le client l'avait à `< 100 m`** : possible si le client a triché ou si les coordonnées ont été altérées en transit. Serveur rejette 400 avec `reason: 'out-of-zone'`. Modale d'erreur métier.

## Questions, Options and Decisions

| Question | Options | Décision (2026-05-15) |
| --- | --- | --- |
| **Authentification du coureur** | (a) Token unique par coureur pré-distribué. (b) Magic link SMS. (c) Sélection libre dans le classement. | **(c)** — la géofence est l'unique garde-fou ; l'identité reposait déjà sur la bonne foi sur l'édition test. Effort orga zéro le jour J. |
| **Affordance UI** | (a) Bouton « Je suis là » sur chaque chip. (b) Bouton flottant + feuille de sélection. (c) Chip elle-même tapable. | **(c)** — pas de bouton visible qui invite les spectateurs à taper ; l'affordance se révèle au hover/active. |
| **Modale vs page de résultat** | (a) Modale dédiée. (b) Page dédiée. (c) Bandeau inline. | **(a)** — le coureur reste dans le contexte du classement, fermeture ramène à la liste. |
| **Centre de la géofence** | (a) `edition.gpx.startLatLng`. (b) Nouvelle colonne `editions.punchLatLng`. (c) Calibrage one-shot le jour J. | **(a)** — déjà en base, zéro setup. Hypothèse implicite : sur un last-loop, le point de pointage est confondu avec le départ. |
| **Rayon de la géofence** | (a) 50 m. (b) 100 m. (c) Configurable par édition. (d) Pas de barrière, log seulement. | **(b)** — 100 m couvre les dégradations GPS (couvert forestier, multipath) sans laisser passer un fallback cellulaire à plusieurs centaines de mètres. Hardcodé pour limiter la surface d'erreur de configuration. |
| **Combinaison `distance` × `accuracy`** | (a) Strict : `distance + accuracy < 100 m`. (b) Composé : `distance < 100 m AND accuracy < 50 m`. (c) Simple : `distance < 100 m`, ignore `accuracy`. (d) Pas de barrière, log seulement. | **(c)** — la simplicité l'emporte. `accuracy` est loggée pour contestabilité a posteriori mais ne joue pas dans la décision. |
| **Où valide-t-on la géofence ?** | (a) Client uniquement. (b) Serveur uniquement. (c) Double check. | **(c)** — client filtre pour ne pas envoyer si trivialement hors zone (UX), serveur recalcule pour sécurité. |
| **Stockage du log** | (a) Aucun ajout. (b) Flag `source` seul. (c) `source` + `clientLatLng` + `accuracy` + `distance` + `ua` + `ip`. (d) Idem (c) sans l'IP. | **(d)** — sans le log, aucune contestabilité possible ; l'IP n'apporte pas de valeur de contestation au-delà du `userAgent` + coordonnées et son stockage attire inutilement la question privacy. Colonnes nullable, non remplies pour les admin-punchs. |
| **Partage de la formule haversine** | (a) Duplication front/back. (b) Sous-package `@last-loop-lepin/geolocation` partagé. (c) Pre-flight API check. | Décision initiale **(b)** ; révisée en plan-time vers **(a)** (2026-05-15) — le `pnpm-workspace.yaml` ne référence aujourd'hui que `apps/*` et `infra/*`, créer le premier sous-package shared pour partager 30 lignes de formule mathématiquement gelée n'est pas rentable. Drift surveillé par des vecteurs de test communs ; un drift fait casser le test back-e2e de bout en bout (cf. `plan.md` R-Drift-haversine). |
| **Offline** | (a) Pas de queue. (b) Queue avec `clientTimestamp`. (c) Queue avec `serverTimestamp`. | **(a)** — coût d'implémentation et de validation hors proportion avec la fréquence attendue d'une coupure. Admin reste filet. |
| **Coureurs DNF tapent leur chip** | (a) Chip non tapable. (b) Tapable, modale d'erreur explicite. | **(b)** — retour explicite vaut mieux qu'un tap inerte. |
| **Permission GPS refusée** | (a) Modale + guide réactivation par navigateur. (b) Message générique. (c) Bascule fallback admin. | **(a)** — courte friction d'éducation, suffisante. |
| **Coexistence avec l'admin** | (a) Remplace. (b) Coexiste, premier des deux gagne. | **(b)** — déjà acté dans le spec parent. `already-punched-this-loop` géré par `validatePunchTiming`. |

### Hors scope

- Géofence configurable par édition (rayon, centre) — si un cas réel l'exige, refactor ultérieur.
- Vérification de mouvement (coureur immobile depuis 1 h ⇒ douteux) — non discriminante à ce stade.
- Notification push aux spectateurs.
- Bascule fallback admin automatique en cas de refus permission.
- Migration des `loop_punches` existants pour les enrichir des nouveaux champs : passé reste tel quel.
- ADR techno géoloc : un seul candidat raisonnable (`navigator.geolocation` + haversine), pas de trade-off à acter.

## Changes

### Types / domain model

```ts
// api/src/punch/punch.types.ts (UPDATE)
type LoopPunch = {
  readonly id: string;
  readonly editionSlug: string;
  readonly runnerSlug: string;
  readonly loopIndex: number;
  readonly finishedAt: Date;
  readonly source: 'admin' | 'self';
  readonly clientLat: number | null;
  readonly clientLng: number | null;
  readonly clientAccuracyM: number | null;
  readonly distanceFromCenterM: number | null;
  readonly userAgent: string | null;
  // … existing fields (correctedAt, voidedAt, createdAt)
};

// api/src/punch/punch.schema.ts (UPDATE)
export const selfPunchInputSchema = z.object({
  editionSlug: editionSlugSchema,
  runnerSlug: runnerSlugSchema,
  clientLat: z.number().min(-90).max(90),
  clientLng: z.number().min(-180).max(180),
  clientAccuracyM: z.number().nonnegative().nullable(),
});

// api/src/helpers/geo/haversine.utils.ts (NEW)
// site/src/domain/haversine.utils.ts (NEW — copie jumelle)
type LatLng = { readonly lat: number; readonly lng: number };
export function haversineDistanceMeters(a: LatLng, b: LatLng): number;
```

### Database changes

```sql
-- DSQL accepte ADD COLUMN (cf. docs/knowledge/dsql-postgres-compat-gaps.md
-- qui liste 9 divergences sans ADD COLUMN). Résidu à dry-run au plan :
-- la combinaison `ADD COLUMN ... NOT NULL DEFAULT 'admin'` peut ne pas
-- matérialiser le default sur les rows existantes selon les variantes du
-- moteur. Fallback si nécessaire : ADD COLUMN nullable → UPDATE … SET
-- source='admin' → ALTER COLUMN SET NOT NULL, en trois statements
-- séparés (le migration runner split déjà sur statement-breakpoint).

ALTER TABLE loop_punches ADD COLUMN source                  TEXT    NOT NULL DEFAULT 'admin';
ALTER TABLE loop_punches ADD COLUMN client_lat              DOUBLE PRECISION;
ALTER TABLE loop_punches ADD COLUMN client_lng              DOUBLE PRECISION;
ALTER TABLE loop_punches ADD COLUMN client_accuracy_m       DOUBLE PRECISION;
ALTER TABLE loop_punches ADD COLUMN distance_from_center_m  DOUBLE PRECISION;
ALTER TABLE loop_punches ADD COLUMN user_agent              TEXT;
```

Le `source` default rend les rows existantes `'admin'`. Le `NOT NULL` sur `source` est la seule invariante portée en SQL ; le reste est nullable parce que la sémantique est « self-punch seulement ». L'IP n'est volontairement pas loggée (cf. *Questions, Options and Decisions*).

### Files to change

```
# Back
apps/last-loop-lepin/api/src/helpers/geo/haversine.utils.ts          // NEW: haversineDistanceMeters({lat,lng},{lat,lng}): number — 100% coverage (vitest.workspace.ts to be extended so api/src/**/*.utils.ts is gated)
apps/last-loop-lepin/api/src/helpers/geo/haversine.utils.test.ts     // NEW
apps/last-loop-lepin/api/src/punch/punch.schema.ts                   // UPDATE: loopPunchesTable adds 6 columns; new selfPunchInputSchema
apps/last-loop-lepin/api/src/punch/punch.types.ts                    // UPDATE: LoopPunch type adds the same 6 fields (no ip)
apps/last-loop-lepin/api/src/punch/punch.service.ts                  // UPDATE: registerSelfPunch(db, input, edition, userAgent, now) — reads edition.gpx.startLatLng, calls local haversineDistanceMeters, rejects out-of-zone, calls validatePunchTiming, writes with source='self'
apps/last-loop-lepin/api/src/punch/punch.service.test.ts             // UPDATE: cover happy path + out-of-zone reject + validatePunchTiming reject paths
apps/last-loop-lepin/api/src/punch/punch.repository.ts               // UPDATE: insert column list extended; existing admin path passes NULLs on the self-only columns
apps/last-loop-lepin/api/src/punch/self-punch.controller.ts          // NEW: public router (no requireAdminSession), POST /self-punches, reads User-Agent header, returns 201 / 400
apps/last-loop-lepin/api/src/punch/self-punch.controller.test.ts     // NEW
apps/last-loop-lepin/api/src/main.ts                                 // UPDATE: mount selfPunchRouter under public surface
apps/last-loop-lepin/vitest.workspace.ts                             // UPDATE: extend core project to gate api/src/**/*.utils.ts (today only *.core.ts is gated api-side)

# Front
apps/last-loop-lepin/site/src/domain/haversine.utils.ts              // NEW: copie jumelle de la version api, 100 % coverage (déjà gaté par le pattern site/src/**/*.utils.ts existant)
apps/last-loop-lepin/site/src/domain/haversine.utils.test.ts         // NEW
apps/last-loop-lepin/site/src/domain/requestPosition.utils.ts        // NEW: async fn wrapping navigator.geolocation.getCurrentPosition with timeout; returns { kind: 'denied' | 'timeout' | 'unavailable' | 'ok'; position?: { lat, lng, accuracy } }. Called inside the "Je suis là" click handler — no useEffect.
apps/last-loop-lepin/site/src/domain/requestPosition.utils.test.ts   // NEW (vi.mock on navigator.geolocation)
apps/last-loop-lepin/site/src/components/Leaderboard.tsx             // UPDATE: chip becomes a <button> with onClick handler; onClick(entry) opens SelfPunchModal
apps/last-loop-lepin/site/src/components/SelfPunchModal.utils.ts     // NEW: FSM pure — nextStep(current, event) returns next state ('initial' | 'awaiting-geo' | 'success' | 'out-of-zone' | 'dnf' | 'permission-denied' | 'timeout' | 'business-error' | 'network-error'). 100 % coverage.
apps/last-loop-lepin/site/src/components/SelfPunchModal.utils.test.ts // NEW
apps/last-loop-lepin/site/src/components/SelfPunchModal.tsx          // NEW: thin React shell — single useState<FSMState>, consumes the FSM utils, calls requestPosition in onClick, POSTs to /api/self-punches. Validated by /visual-validation (le repo n'a pas de testing-library, convention site = tests sur *.utils.ts seulement).
apps/last-loop-lepin/site/src/domain/types.ts                        // UPDATE: LoopPunchDto adds source + nullable geo fields; standings DTO already exposes edition.gpx.startLatLng (no change)
```

### Test strategy

- **Unit `*.utils.ts`** — les deux `haversine.utils.ts` (api + site) shippent à 100 % coverage chacun, sur **les mêmes vecteurs de test** (same-point 0 m, Paris ↔ Lyon ≈ 392 km à ±0.5 % de tolérance, antipodal ~20 003 km, intra-100m pour la frontière de la règle, signes lat/lng). Drift de la formule détecté par divergence entre les distances calculées (cf. `plan.md` R-Drift-haversine). `requestPosition.utils.ts` (site) ship à 100 % via `vi.mock('navigator.geolocation')`. `selfPunchModal.utils.ts` (site, FSM pure) ship à 100 % — 9 transitions énumérées.
- **Unit back-service** — `punch.service.test.ts` extends to `registerSelfPunch`: happy path writes `source='self'` + the 6 metadata fields ; out-of-zone rejects with `PunchRejectedError('out-of-zone')` ; `validatePunchTiming` reject paths still fire (race-not-started, race-finished, already-punched-this-loop, runner-not-in-race) and the controller maps them to 400/409.
- **Unit front modale** — la logique d'orchestration de la modale est portée par `SelfPunchModal.utils.ts` (FSM pure), testée à 100 % couverture. La React shell (`SelfPunchModal.tsx`) est validée par `/visual-validation` — le repo ne ship pas testing-library et la convention site est `*.utils.test.ts` uniquement (cf. `domain/initials.utils.ts`, `admin/setup-form.utils.ts`).
- **Visual validation** — driven by `/visual-validation`, asserts the 6 input metrics named in *Why*:
  1. Tap on a running chip opens the confirmation modale with the right name + loop number.
  2. Tap on a DNF chip opens the "déjà éliminé" modale, no network call observed.
  3. The "Je suis là" button triggers `navigator.geolocation.getCurrentPosition` (mocked in the test harness to return a fixed in-zone position).
  4. An in-zone position writes a punch with `source='self'` (assert via the standings repoll showing the new loop badge).
  5. An out-of-zone mocked position shows the out-of-zone modale and the standings DON'T update.
  6. A denied permission shows the reactivation guide with the per-browser hint.
- **Technical validation** — lint + knip + typecheck + build + coverage gates pass. Per-Q.O.D. correctness pass on the diff confirms (a) the public route has no admin middleware, (b) the server recomputes haversine and rejects independently of the client check, (c) the schema migration adds columns nullable except `source`.
- **Coverage gates** — les nouveaux `*.utils.ts` (api : `helpers/geo/haversine.utils.ts` ; site : `domain/haversine.utils.ts`, `domain/requestPosition.utils.ts`, `components/SelfPunchModal.utils.ts`) sont gatés à 100 %. Le pattern existant `site/src/**/*.utils.ts` gate déjà les utils site ; côté api, `vitest.workspace.ts` est étendu pour gater `api/src/**/*.utils.ts` (aujourd'hui seul `api/src/**/*.core.ts` l'est). Pas de `infra/cdk/**` ni `infra/shared/**` modifié.
- **Manual smoke after deploy** — post-deploy belt only: open `/` on a phone, tap own chip, validate one loop on the dev edition. Not a gate.

## Production strategy

### Analytics

**Input metrics** (Sentry breadcrumbs + structured logs) :
- `self_punch_attempt_started` — fires on tap of « Je suis là » in the confirmation modale. Tag `{ editionSlug, runnerSlug }`.
- `self_punch_geoloc_denied` — fires on `PositionError.PERMISSION_DENIED`. Same tag.
- `self_punch_geoloc_timeout` — fires on `PositionError.TIMEOUT`. Same tag.
- `self_punch_rejected_client_out_of_zone` — fires when the client refuses to POST. Tag includes the distance computed.
- `self_punch_rejected_server` — fires on 4xx from the server. Tag includes the reason (`out-of-zone`, `already-punched-this-loop`, `race-not-started`, `race-finished`, `runner-not-in-race`).
- `self_punch_accepted` — fires on 201. Tag includes the `loopIndex` returned.

No p50/p75 thresholds — the volume is too low (one edition has ~30 coureurs, ~20 boucles, ~600 events max). Dashboards review the distribution by reason after each edition.

**Output metric** (lagging, manual review) :
- Ratio `count(loop_punches WHERE source='self') / count(loop_punches)` on the most recent edition. Target: > 70 %. Reviewed once per edition.
- Self-report from the orga: "did the self-punch ease the top-hour rhythm?" Yes/No/Other.

### Zero-defect strategy

Named error classes :
- **`PunchRejectedError('out-of-zone')`** — server-side guard. Surfaces as 400. Alerting threshold: > 10 occurrences in 10 min on the same edition during a live race → likely a misconfigured `gpx.startLatLng` or a malicious actor; page Hugo.
- **`PunchRejectedError('already-punched-this-loop')`** — same class, different reason. Normal occurrence (race condition between admin and self-punch, or a coureur double-tapping). No alert.
- **`PunchTimingError(reason: 'race-not-started' | 'race-finished' | 'runner-not-in-race')`** — normal, no alert.
- **Front-side `GeolocationDeniedError`** — surfaced in modale + breadcrumb. No alert.
- **DSQL write failure on the wider INSERT** — Sentry tag `feature: self-punch`. Alert > 3 occurrences / 10 min in prod. Likely cause: a forgotten column, a non-applied migration.
