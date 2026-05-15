# Projection du classement fidèle au profil de vitesse du GPX

> ⚠️ Missing client discussion
> ⚠️ Missing product discussion
> ⚠️ Missing tech-lead discussion
> ⚠️ Missing developer discussion
> ⚠️ Missing designer discussion
>
> **Spec stub.** Capturé pendant la session du 2026-05-15 qui specquait `self-punch-runners`. Aucune perspective n'a encore été confrontée. À reprendre via `/specification` quand le self-punch est shippé.

## Why

Aujourd'hui, la projection de la position d'un coureur entre deux pointages utilise (vraisemblablement) une vitesse moyenne uniforme sur la boucle. Sur un tracé avec dénivelé, cette hypothèse est faussée : un coureur ralentit fortement en montée et accélère en descente. Conséquence : pour un spectateur qui suit le classement entre deux tops horaires, la position projetée d'un coureur peut être très loin de sa position réelle — surtout dans la première moitié du chrono après un top, où le coureur attaque la montée et où le classement projeté le « voit » avancer à plat.

L'objectif : que la projection inter-pointage soit fidèle au profil de dénivelé du GPX, pour que le classement intermédiaire affiché entre deux tops horaires reflète mieux la réalité.

## Pistes initiales (non-arbitrées)

- **Source du profil** : `apps/last-loop-lepin/api/src/helpers/gpx/gpx.core.ts` parse déjà le GPX. À enrichir d'une lecture d'élévation point-par-point ? Le format GPX expose `<ele>` standard.
- **Modèle de vitesse** : courbe vitesse(pente) à apprendre depuis les pointages observés, ou modèle physique simple (Naismith, Tobler), ou hybride.
- **Granularité** : on travaille au niveau du segment GPX (point-à-point), ou on découpe la boucle en N tranches d'élévation ?
- **Où ça vit** : `ranking.core.ts` projette la position courante d'un coureur ; c'est là que la nouvelle fonction de projection doit se brancher. La projection actuelle est probablement linéaire `progress = (now - lastPunch) / expectedLoopDuration` — à confirmer en relisant `ranking.core.ts`.

## Questions, Options and Decisions

> *Section vide — à remplir lors de la session `/specification`.*

## Hors-scope (probable)

- Personnalisation par coureur (chaque coureur a son propre profil vitesse) — sans doute trop ambitieux pour v1.
- Recalibrage en temps réel basé sur les pointages déjà vus de cette édition — à arbitrer.

## Notes de la conversation source (2026-05-15)

Hugo : « Je voudrais aussi qu'on ajuste les estimation de progressions des coureurs par le profil de vitesse qu'on retrouve dans le GPX, pour que les montées soient + lentes et les descentes plus rapides, que ce soit fidèle. »

Décision de session : capturer comme stub spec, traiter séquentiellement après `self-punch-runners`.
