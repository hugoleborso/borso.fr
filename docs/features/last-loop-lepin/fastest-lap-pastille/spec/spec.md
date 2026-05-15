# Une pastille violette signale le coureur du tour le plus rapide

> ⚠️ Missing client discussion
> ⚠️ Missing product discussion
> ⚠️ Missing tech-lead discussion
> ⚠️ Missing developer discussion
> ⚠️ Missing designer discussion
>
> **Spec stub.** Capturé pendant la session du 2026-05-15 qui specquait `gpx-speed-aware-projection`. Aucune perspective n'a encore été confrontée. À reprendre via `/specification` quand la file d'attente devant lui se vide.

## Why (esquisse)

Ajouter une distinction visuelle au coureur qui détient le tour le plus rapide de l'édition. Friendly competition / récompense légère / repère narratif pour le spectateur (« qui est sur un rythme exceptionnel ? »).

## Pistes initiales (non-arbitrées)

- **Définition « tour le plus rapide »** : tour = boucle entre deux pointages consécutifs. Plus rapide = `min(finishedAt[N] - finishedAt[N-1])` parmi tous les pointages validés (non `voidedAt`). Le calcul existe déjà partiellement : `lastLoopDurationMs` est exposé sur `RankedRunner` (cf. `ranking.core.ts:141`).
- **Où ça vit dans le code** : `ranking.core.ts` ou un nouveau `*.core.ts` dédié — fonction pure qui prend tous les punchs et retourne `{ runnerSlug, loopIndex, durationMs } | null`. Le `Standings` DTO gagne un champ `fastestLap: { runnerSlug, durationMs } | null`. Côté front, `Leaderboard.tsx` rend la pastille violette sur la chip du runner concerné.
- **Tie-break** : deux coureurs ex-aequo au millisecond près. Décider : (a) les deux sont décorés ; (b) le premier dans le temps gagne ; (c) on n'affiche pas de pastille tant qu'il y a doublon.
- **Edge case zéro boucle close** : avant le premier top horaire, pas de tour mesuré. Pas de pastille.
- **Edge case un seul coureur a clos une boucle** : la pastille décore ce coureur ; sémantique acceptable (« meilleur tour à ce moment T » avec un seul échantillon).
- **Pastille DNF** : si le détenteur du meilleur tour fait DNF après, la pastille reste-t-elle sur lui ou passe-t-elle au meilleur tour parmi les coureurs *encore in-race* ? Question produit ouverte.
- **Look** : pastille violette à confirmer (couleur retenue ? plat / contour / dégradé ? avec label « ⚡ MT » pour Meilleur Tour ? juste un fond ?).
- **Surface UI** : chip dans `Leaderboard.tsx` exclusivement, ou aussi avatar sur `CourseMap.tsx` ? Probable v1 = chip seulement.

## Notes de la conversation source (2026-05-15)

Hugo : « Aussi autre spec : ajouter une pastille violette au coureur ayant le tour le plus rapide de l'edition »

Décision de session : capturer comme stub spec, traiter après `self-punch-runners` et `gpx-speed-aware-projection`.
