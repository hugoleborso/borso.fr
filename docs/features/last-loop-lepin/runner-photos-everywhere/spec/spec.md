# Les photos coureurs s'affichent partout où il y a un avatar

## Perspectives confronted

- [x] **Client / business** — confirmé : `runner.photoKey` est uploadé via le formulaire admin (`RunnerAdminPanel.tsx`) mais n'a jamais été affiché. Faire usage de ces photos rend la retransmission plus humaine — on voit *qui* court, pas juste leurs initiales. Pas de modification du flow d'upload — c'est purement un branchement de l'asset déjà collecté.
- [x] **Product** — confirmé : 4 surfaces basculent ensemble : `Leaderboard.tsx` (chips standings), `CourseMap.tsx` (markers Leaflet), `ElevationProfile.tsx` (pastilles SVG sous le profil — feature voisine en cours de plan en parallèle), `SelfPunchModal.tsx` (modale de confirmation). Si la photo est absente OU si le `<img>` échoue à charger, fallback silencieux vers `initialsAvatar` (composant existant) — pas d'état loading visible.
- [x] **Tech-lead** — confirmé : photo bucket S3 devient *partiellement* publique via une nouvelle distribution CloudFront (`photos-cdn.borso.fr` ou équivalent), URL déterministe `https://photos-cdn.borso.fr/<photoKey>`. Le DTO expose `photoUrl: string | null` calculé serveur-side (config `PHOTOS_CDN_HOST` env var), client ne sait rien de l'infra. Redimensionnement square 128×128 au moment de l'upload (Lambda S3 trigger ou inline dans le upload handler), bucket stocke `<photoKey>` (original) + `<photoKey>.thumb.jpg` (thumbnail). DTO sert l'URL du thumbnail.
- [x] **Developer** — confirmé : un nouveau `*.utils.ts` pur `runner-avatar.utils.ts` côté site retourne soit `{ kind: 'photo'; url }` soit `{ kind: 'initials'; initials; backgroundColor }` selon `photoUrl`. Le composant `<RunnerAvatar>` (NEW) consomme ce contrat, gère le `<img onError>` qui swap vers les initiales. Réutilisé par les 4 surfaces. Tests unitaires sur la fonction pure, 100 % coverage. Le composant React lui-même est validé par `/visual-validation`.
- [x] **Designer** — confirmé : photos circulaires (`border-radius: 50%`, `object-fit: cover`), tailles selon contexte : 32 px sur les chips Leaderboard, 28 px sur les markers CourseMap, 14 px sur les pastilles ElevationProfile, 64 px dans la modale SelfPunch. Toutes les photos sont la même image (thumbnail 128×128 servi par le CDN, redimensionné par CSS). Pas d'animation de transition (sticker on / off). Le fallback initiales doit avoir EXACTEMENT la même taille/forme pour ne pas créer de saut visuel.

## Why

`runner.photoKey` existe dans le schéma DB depuis le début (`apps/last-loop-lepin/api/src/runner/runner.schema.ts:16`) ; le formulaire admin upload des photos depuis le début (`RunnerAdminPanel.tsx:69`) ; ces photos sont jamais affichées. Les avatars actuels sur les 4 surfaces utilisent tous `initialsAvatar` (deux lettres, fond coloré). Conséquence : pendant les éditions, le spectateur ne reconnaît pas instantanément *qui* est qui sur la carte — juste deux lettres et une couleur arbitraire. Mettre les photos en place rend la retransmission plus humaine, donne aux coureurs leur visage sur l'écran.

**Output metric** (lagging, hors CI) : self-report Hugo à la prochaine édition réelle, format binaire « les photos rendent la page plus parlante / non / autre ». Pas de mesure quantitative.

**Input metrics** (driveables par `/visual-validation`) :
- Le DTO `RunnerDto` inclut `photoUrl: string | null` (calculé serveur-side depuis `photoKey` + `PHOTOS_CDN_HOST` ; `null` quand `photoKey === null`).
- Pour un coureur avec photo, les 4 surfaces affichent un `<img src=photoUrl>` (selector `[data-runner-slug] img`) circulaire.
- Pour un coureur sans photo OU dont la photo échoue à charger, les 4 surfaces affichent l'avatar initiales (sélecteur `[data-runner-slug] .runner-avatar--initials`).
- Le redimensionnement square 128×128 happens au moment de l'upload — un GET sur la photo URL retourne une image 128×128 max.
- Aucun saut visuel lors d'une transition photo → fallback (la zone de rendu garde la même taille).

**Gemba** : pas d'observation terrain spécifique. Le test du 2026-05-14 a tourné sans photos (cf. screenshots de validation PR #23 : `initialsAvatar` partout). Anticipé pour la prochaine édition réelle.

## Result

Sur les 4 surfaces existantes :
- **Leaderboard chip** : l'élément `.avatar` (32 × 32, déjà rendu en circle via CSS) bascule de `initialsAvatar` à `<img src={photoUrl} onError={swap}>`.
- **CourseMap marker** : `avatarHtml(entry)` (construit aujourd'hui un HTML string contenant le `<span class="map-avatar">` avec initiales) bascule à un `<img class="map-avatar-photo">` quand `photoUrl !== null`, et le `onError` côté Leaflet est géré via une délégation manuelle (Leaflet rend du HTML brut, donc on attache l'event listener dans un effect side-step). À cadrer au plan : impact sur le `useEffect` Leaflet bridge.
- **ElevationProfile pastille** (14 × 14, SVG `<foreignObject>` contient le `<RunnerAvatar>` React) : même composant React, plus petite taille.
- **SelfPunchModal** : la modale de confirmation `« Je suis [nom], valider la boucle N ? »` se voit ajouter la photo en 64 × 64 à côté du nom. Pour un coureur sans photo, fallback initiales 64 × 64 (juste plus grand).

Aucun changement de layout sur les 4 surfaces — c'est un drop-in remplacement du `initialsAvatar` actuel par un composant `<RunnerAvatar>` plus capable.

## Use cases / edge cases

### Happy path

1. L'admin uploade une photo via `RunnerAdminPanel.tsx` pour Borso. Le upload handler côté API (a) écrit l'original sous `<editionSlug>/<runnerSlug>/<uuid>.jpg` dans le bucket, (b) déclenche une Lambda S3 trigger qui resize le fichier à 128×128 square et écrit `<editionSlug>/<runnerSlug>/<uuid>.thumb.jpg` à côté, (c) écrit `<editionSlug>/<runnerSlug>/<uuid>.thumb.jpg` dans `runner.photoKey`.
2. L'édition démarre. La page `/` charge. Le DTO standings inclut Borso avec `photoUrl = "https://photos-cdn.borso.fr/lepin-2026/borso/abcd.thumb.jpg"`.
3. Sur la chip de Borso : `<img src={photoUrl} class="avatar">` charge depuis le CDN (cache-control HTTP `public, max-age=86400`), affiche la photo en cercle 32 px.
4. Sur la carte : le marker Leaflet de Borso affiche la même image en cercle 28 px.
5. Sur le profil de dénivelé : la pastille de Borso affiche la même image en cercle 14 px.
6. Borso tape sa propre chip → la modale `SelfPunchModal` affiche la photo en cercle 64 px en haut, à côté du nom.

### Edge cases

- **Photo absente** (`photoKey === null`, ex. un coureur ajouté sans photo) : `photoUrl = null` côté DTO. Le composant `<RunnerAvatar>` rend `initialsAvatar` directement, pas de `<img>`. Aucune requête réseau.
- **Photo dont l'URL retourne 404** (clé en base mais fichier supprimé du bucket par accident) : `<img onError>` swap silencieusement vers `initialsAvatar`. Breadcrumb Sentry `runner_photo_load_failed` au mount du composant (basse cardinalité).
- **Photo en cours de chargement** : aucun état loading visible. Tant que `<img>` n'a pas chargé, le navigateur réserve l'espace via les dimensions CSS — pas de reflow. Pour un cold start de la page, ~100ms de zone vide max (acceptable, mieux qu'un shimmer brutal).
- **Photo originale 4K très lourde** : non, c'est le thumbnail 128×128 qui est servi. Bandwidth contained par construction.
- **Plusieurs coureurs sans photo dans la même chip-grille** : chacun montre ses initiales. Aucune cascade différente.
- **Coureur avec photo dont la photo échoue à charger sur la carte UNIQUEMENT** (et passe sur la chip) : ne devrait pas arriver — même URL, même cache. Mais si ça arrive : le swap est par-composant, pas par-coureur. La chip reste avec photo, la carte avec initiales. Sémantique acceptable (chaque surface fait son propre rendering).
- **Coureur sans bucket / bucket inaccessible** (`PHOTOS_CDN_HOST` env var absente côté API) : le DTO calcule `photoUrl = null` pour tous les coureurs. Cascade → initiales partout. Pas de crash, juste pas de photos.

### Error cases

- **Aucune nouvelle classe d'erreur métier** — le swap silencieux gère le 404. Sentry breadcrumb seulement.
- **CDN distribution down** (incident AWS) : tous les `<img>` échouent simultanément → tous swap vers initiales. Comportement acceptable, retransmission continue. Pas d'alerte spécifique.

## Questions, Options and Decisions

| Question | Options | Décision (2026-05-15) |
| --- | --- | --- |
| **Résolution `photoKey → URL`** | (a) Bucket public via CloudFront + URL déterministe. (b) Presigned URL API-générée. (c) Endpoint API streamer. | **(a)** — cache HTTP utile, pas de presigned regeneration par request, simple. |
| **Optimisation taille** | (a) Pas de thumbnail v1 (servir l'original). (b) Resize à l'upload. (c) On-the-fly via CloudFront/Lambda@Edge. | **(b)** — Lambda S3 trigger à l'upload, square 128×128. Stockage doublé (original + thumb) — coût négligeable pour ~30 photos par édition. |
| **Surfaces v1** | Multi-select : Leaderboard / CourseMap / ElevationProfile / SelfPunchModal / Admin panel. | **Les 4 premières.** L'admin panel (`RunnerAdminPanel.tsx`) montre déjà la photo en cours d'upload via `URL.createObjectURL(file)` — pas besoin de la re-servir depuis le CDN. |
| **Fallback si photo absente / échec chargement** | (a) Cascade silencieuse vers initiales. (b) État loading visible. (c) Photo obligatoire. | **(a)** — `<img onError>` swap. Aucun saut visuel grâce à des dimensions CSS fixes et `initialsAvatar` à la même taille. |
| **Forme du DTO** | (a) `photoUrl: string \| null`. (b) `photoKey: string \| null`, client compose l'URL. | **(a)** — server-side computation. Si on change l'infra (CDN host, bucket scheme), seul le server change. |
| **Photo originale uploadée** | (a) Stockée. (b) Supprimée après génération du thumbnail. | **(a)** — original conservé pour usage futur (zoom modal, export, etc.). Coût stockage négligeable. |
| **Caching CDN** | (a) `public, max-age=86400` (24h). (b) `public, max-age=2592000` (30j) avec invalidation manuelle sur changement de photo. (c) Pas de cache (no-store). | **(a)** — 24h est un compromis : une photo changée pendant une édition propage dans la journée. Pas d'invalidation manuelle à gérer. |

### Hors scope

- Édition de la photo après upload (le formulaire admin permet déjà de re-uploader, ce qui crée une nouvelle `photoKey` — implicit replacement).
- Filtres / cropping côté client (les photos sont uploadées telles quelles, cropées square au resize côté Lambda).
- Multiples photos par coureur (galerie, photo de course vs photo de profil).
- Photos animées (GIF, vidéo) — JPG / PNG / WEBP seulement, validé au upload.
- Photo zoom au clic dans le retransmission (interactivité refusée par scope retransmission).
- Photo upload par le coureur lui-même via un flow self-service (admin seulement v1).

## Changes

### Types / domain model

```ts
// api/src/runner/runner.types.ts (UPDATE)
export interface Runner {
  readonly editionSlug: string;
  readonly slug: string;
  readonly displayName: string;
  readonly photoKey: string | null;       // existing — S3 key of the original
  readonly bib: number | null;
}

export interface RunnerDto extends Omit<Runner, 'photoKey'> {
  readonly photoKey: string | null;       // existing — exposed for admin / debug
  readonly photoUrl: string | null;       // NEW — fully-qualified URL of the thumbnail, or null when no photo
}

// site/src/domain/runner-avatar.utils.ts (NEW, pure)
type RunnerAvatarKind =
  | { readonly kind: 'photo'; readonly url: string; readonly fallback: RunnerAvatarInitials }
  | { readonly kind: 'initials'; readonly initials: RunnerAvatarInitials };

type RunnerAvatarInitials = { readonly initials: string; readonly backgroundColor: string };

export function buildRunnerAvatar(runner: { displayName: string; photoUrl: string | null }): RunnerAvatarKind;
```

### Database changes

Aucune migration. La colonne `photo_key` existe déjà (`runners.photo_key TEXT`). La colonne stocke maintenant la clé S3 *du thumbnail* (pas l'original) — change de sémantique gentle ; les éditions existantes (qui ont uploadé des photos mais ne les affichaient pas) verront leurs photoKey pointer vers le original au lieu du thumbnail, ce qui sera servi à pleine taille → pas idéal mais pas cassant. Follow-up migration possible : rerun le resize sur les `photoKey` existantes, mais hors-scope v1.

### Infrastructure changes

C'est la partie la plus lourde de cette feature. À cadrer au plan :

- **Nouveau distribution CloudFront** devant `photosBucket` (`apps/last-loop-lepin/cdk/lib/stack.ts:41`). Possiblement réutilise le pattern `StaticSite` existant dans `@borso/infra`, ou un nouveau construct `PhotosCdn` qui :
  - Boot un OAC (Origin Access Control) sur `photosBucket`.
  - Boot une distribution CloudFront pointant sur ce bucket, avec cache policy `CachingOptimized` + cache-control 24h.
  - DNS via `Route53` ou similaire pour `photos-cdn.<env>.borso.fr`. Cert ACM dans us-east-1 (CloudFront contrainte).
- **Lambda S3 trigger** sur `photosBucket` qui resize les `.jpg/.png/.webp` à 128×128 square. Code Node 22 utilisant `sharp` ou `@aws-sdk/client-s3` + une lib resize légère.
- **Env var** `PHOTOS_CDN_HOST` injectée dans la Lambda API (lecture seule — le builder du DTO en a besoin pour composer `photoUrl`).
- `apps/last-loop-lepin/cdk/test/stack.test.ts` (100 % coverage gated) à étendre pour assertions sur les nouvelles ressources.

### Files to change

```
# Back — API
apps/last-loop-lepin/api/src/runner/runner.service.ts                 // UPDATE: helper `runnerToDto(runner): RunnerDto` calcule photoUrl à partir de photoKey + PHOTOS_CDN_HOST env
apps/last-loop-lepin/api/src/runner/runner.controller.ts              // UPDATE: utilise le DTO via runnerToDto (toutes les routes admin)
apps/last-loop-lepin/api/src/runner/runner.controller.test.ts         // UPDATE: assert photoUrl in/out of response based on photoKey
apps/last-loop-lepin/api/src/standings/standings.service.ts (or similar) // UPDATE: les runners projetés dans Standings.ranked exposent photoUrl
apps/last-loop-lepin/api/src/media/media.s3.ts                        // UPDATE: post-upload hook qui marque la `photoKey` comme pointant vers le thumbnail (sera mis à jour quand la Lambda trigger aura fini)

# Back — Lambda S3 trigger (NEW)
apps/last-loop-lepin/api/src/media/resize-photo.handler.ts            // NEW: Lambda triggered by S3 ObjectCreated event ; télécharge l'original, resize 128×128 square via sharp, écrit `<key>.thumb.jpg` à côté
apps/last-loop-lepin/api/src/media/resize-photo.handler.test.ts       // NEW (back-e2e — moins de coverage exigée que `*.core.ts`)

# Infra — CDK
apps/last-loop-lepin/cdk/lib/stack.ts                                 // UPDATE: instancie le nouveau construct PhotosCdn, route PHOTOS_CDN_HOST vers la Lambda API
infra/cdk/src/PhotosCdn.ts                                            // NEW: construct CloudFront + OAC + bucket policy. Ship at 100 % coverage (infra/cdk gate).
infra/cdk/test/PhotosCdn.test.ts                                      // NEW
apps/last-loop-lepin/cdk/test/stack.test.ts                           // UPDATE: assert PhotosCdn présent en preview et prod, PHOTOS_CDN_HOST env var posée sur la Lambda

# Site — components
apps/last-loop-lepin/site/src/domain/runner-avatar.utils.ts           // NEW: pure builder, 100 % coverage
apps/last-loop-lepin/site/src/domain/runner-avatar.utils.test.ts      // NEW: 6 vectors — photo present, photo null, both fallback paths
apps/last-loop-lepin/site/src/components/RunnerAvatar.tsx             // NEW: composant React, <img onError>=swap. Size en prop (px). data-runner-slug attribute pour les sélecteurs visual-validation.
apps/last-loop-lepin/site/src/components/Leaderboard.tsx              // UPDATE: remplace <span class="avatar">{initials}</span> par <RunnerAvatar size={32} runner={…} />
apps/last-loop-lepin/site/src/components/CourseMap.tsx                // UPDATE: avatarHtml(entry) bascule sur `<img src={photoUrl}>` quand photoUrl !== null. Délégation onError via Leaflet event API (à valider au plan).
apps/last-loop-lepin/site/src/components/ElevationProfile.tsx (NEW from sister feature) // UPDATE: pastilles utilisent <RunnerAvatar size={14}>. **Bloque cette feature ?** À arbitrer : on attend que ElevationProfile soit shipped pour brancher dessus, ou on l'ajoute spéculativement.
apps/last-loop-lepin/site/src/components/SelfPunchModal.tsx           // UPDATE: ajout <RunnerAvatar size={64}> dans la modale de confirmation
apps/last-loop-lepin/site/src/domain/initials.utils.ts                // (no change — buildRunnerAvatar la consomme pour la branche initials)
apps/last-loop-lepin/site/src/domain/types.ts                         // UPDATE: site-side RunnerDto.photoUrl?: string | null
apps/last-loop-lepin/site/src/api/client.ts                           // UPDATE: Zod schema reflects photoUrl
apps/last-loop-lepin/site/src/styles/runner-avatar.css                // NEW (or inline in components.css): .runner-avatar (round, object-fit cover), .runner-avatar--initials, sizes via custom property --avatar-size
```

### Test strategy

- **Unit `*.utils.ts`** — `runner-avatar.utils.ts` à 100 % coverage : photo present → kind=photo, photo null → kind=initials. La fonction est trivialement testable (pas de side effect).
- **Unit Zod** — `client.ts` accepte `photoUrl?: string | null`, parse OK avec ou sans.
- **Unit S3 resize handler** — `resize-photo.handler.test.ts` : input un buffer JPEG arbitraire, assert que le output est 128×128 et JPEG valide. Lib resize testée en isolation.
- **Back-e2e** — `runner.controller.test.ts` étendu : upload une photo (mock S3), assert que la response inclut `photoUrl` valide. Roundtrip via standings.
- **Visual validation** — `/visual-validation` ouvre `/` avec un seed qui a 2 coureurs photo + 2 coureurs sans. Asserte sur les 4 surfaces : (a) `<img>` rendu pour les 2 avec photo, (b) `.runner-avatar--initials` rendu pour les 2 sans. Force un 404 sur une URL via mocking et vérifie le swap.
- **Technical validation** — lint + knip + typecheck + build + coverage gates. Diff revue confirme : (a) infra coverage 100 % (`infra/cdk/**`), (b) aucune nouvelle dep côté front (utilise `<img>` standard), (c) `<img onError>` est attaché correctement (pas perdu sur re-render via key prop).
- **Coverage gates** — `runner-avatar.utils.ts` gaté par `site/src/**/*.utils.ts`. `PhotosCdn.ts` gaté par `infra/cdk/**` à 100 % lines. Pas d'extension de `vitest.workspace.ts` nécessaire.
- **Manual smoke après deploy** — *belt only* : ouvrir l'admin, uploader une photo pour un coureur du test, ouvrir `/`, vérifier que la photo apparaît sur les 4 surfaces. Confirmer que le swap → initials fonctionne en supprimant manuellement le fichier dans S3.

## Production strategy

### Analytics

**Input metrics** (Sentry breadcrumbs) :
- `runner_photo_load_failed` — fire dans `<img onError>` du composant `<RunnerAvatar>`. Tag `{ runnerSlug, surface: 'leaderboard' | 'map' | 'profile' | 'modal' }`. Permet de constater si un coureur précis a un problème (URL cassée).
- `runner_photo_dto_null_count` — au mount de la page spectator, compter les runners avec `photoUrl === null` parmi `in-race`. Log si > 50 %, signal de friction admin upload.

Pas de p50/p75 — la volumétrie est basse (~30 chips par édition).

**Output metric** (lagging, manual review) :
- Self-report Hugo : « les photos rendent la page plus parlante ? oui/non/autre ».
- Côté usage : ratio `runners avec photoKey / total runners` par édition. Cible : > 80 % (admin a uploadé pour la plupart).

### Zero-defect strategy

Named error classes :
- **Aucune nouvelle classe d'erreur métier** — `<img onError>` est la voie de rendu normale pour le fallback.
- **`MediaConfigError('PHOTOS_BUCKET not set')`** — déjà géré dans `media.s3.ts`. Étendre avec `PHOTOS_CDN_HOST not set` si le DTO est demandé sans cette config. Throw au boot, surface en Sentry, alerte > 0 occurrence (= déploiement misconfiguré).
- **Lambda S3 resize timeout** — la Lambda fail, l'original reste, le thumbnail n'est jamais créé. `runner.photoKey` continue de pointer vers l'original (qui est plus gros mais valide). Acceptable v1 — Sentry log `photo_resize_lambda_failure` pour follow-up éventuel.
