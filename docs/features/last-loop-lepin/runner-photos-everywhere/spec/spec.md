# Les photos coureurs s'affichent partout où il y a un avatar

> ⚠️ Missing client discussion
> ⚠️ Missing product discussion
> ⚠️ Missing tech-lead discussion
> ⚠️ Missing developer discussion
> ⚠️ Missing designer discussion
>
> **Spec stub.** Capturé pendant la session du 2026-05-15 qui specquait `elevation-profile-under-map`. Aucune perspective n'a encore été confrontée. À reprendre via `/specification` quand la file d'attente devant lui se vide.

## Why (esquisse)

`runner.photoKey` existe dans le DTO (`apps/last-loop-lepin/site/src/api/client.ts:44`) et l'admin a un formulaire d'upload (`RunnerAdminPanel.tsx:27,69`), mais la photo n'est *jamais affichée*. Aujourd'hui tous les avatars utilisent `initialsAvatar` (deux lettres, fond coloré). Faire usage de ces photos rendrait la retransmission plus humaine — on voit *qui* court, pas juste leurs initiales.

## Trois surfaces affectées

- `Leaderboard.tsx` — chip dans la grille `.leaderboard-chips`.
- `CourseMap.tsx` — avatar coureur Leaflet (`avatarHtml` construit le HTML en string).
- `ElevationProfile.tsx` (à venir) — pastilles SVG sur le profil de dénivelé.

## Pistes initiales (non-arbitrées)

- **Résolution `photoKey → URL`** : presigned S3 URL (via une nouvelle route `GET /api/runners/:slug/photo-url`), ou bucket public + URL déterministe (`https://photos.<env>.borso.fr/<photoKey>`), ou stockage côté DB en base64 (mauvaise idée, photos lourdes).
- **Fallback** : si `photoKey === null` ou si l'URL retourne 404, retomber sur `initialsAvatar` (déjà éprouvé). Toute la surface UI doit avoir le même fallback.
- **Format et taille** : photos uploadées sont de taille arbitraire (selfie au phone). Vaut mieux servir des miniatures redimensionnées (~64 px) pour éviter de saturer la bande passante en retransmission. Soit on calcule au upload time, soit à la volée via un Lambda CloudFront.
- **Caching** : `cache-control: public, max-age=86400` ou similaire. Une photo coureur change rarement après l'upload.
- **Compat retransmission** : l'écran de retransmission est tactile zéro et a une connexion variable. Préchargement au mount des photos in-race ? Ou paresseux par chip ?
- **CourseMap.tsx particulier** : aujourd'hui `avatarHtml` construit le HTML en string (composant Leaflet imperatif). Si on passe à des photos, soit on garde le HTML string (avec `<img src=...>` injecté), soit on bascule sur `<L.divIcon>` + React portal. Plus complexe.
- **`SelfPunchModal.tsx`** : aussi une surface où on pourrait afficher la photo du runner sélectionné. Cohérence transversale.

## Hors-scope probable

- Édition de la photo après upload (le formulaire admin gère déjà l'upload, suffisant pour v1).
- Filtres / cropping côté client.
- Multiples photos par coureur.

## Notes de la conversation source (2026-05-15)

Hugo : sur la pastille coureur du profil de dénivelé, demande « initiales ou photos si elles sont dispo ». Décision de session : photos hors-scope pour `elevation-profile-under-map`, stub spec parallèle pour traiter la feature transversale ensuite. Quand `runner-photos-everywhere` ship, les trois surfaces (Leaderboard, CourseMap, ElevationProfile) basculent en cohérence.
