# Lisibilité de l'écran de course + étude du pointage par les coureurs

## Perspectives confronted

- [x] **Client / business** — confirmé : on veut honorer la différence entre "sorti par le chrono" et "a abandonné", + donner aux spectateurs un sens du temps restant. Self-punching motivé par charge admin + indisponibilité admin + demande coureurs.
- [x] **Product** — confirmé : 3 ajustements buildables + 1 étude de faisabilité dans le même spec (choix utilisateur, malgré la recommandation de splitter). L'étude self-punching produit une décision (build / pas build / build avec mécanisme géoloc) à reporter en ADR.
- [x] **Tech-lead** — confirmé : tout est dérivable des champs existants (`startsAt`, `endsAt`, `intervalMinutes` ; helpers `loopIndexAt`, `totalHourlyTops` déjà purs en `*.core.ts`). L'enum `reason` passe à 3 valeurs ; le statut DTO public est étendu. Self-punching = nouvelle route publique + un middleware d'auth coureur géoloc-based ; risque anti-triche reconnu (géoloc navigateur trivialement falsifiable en dev tools).
- [x] **Developer** — confirmé : les changements 1/2/3 sont des modifs ciblées sur des fichiers identifiés ligne par ligne ; le 4 produit du code de POC ou rien selon la décision. Le test gate `*.utils.ts` 100 % couvre la dérivation "boucle courante / restantes" ; `*.core.ts` 100 % couvre l'extension de `reason`.
- [x] **Designer** — confirmé : le compteur de boucles remplace le label `MM:SS` sous le flip ; le badge classement gagne une variante visuelle pour `late-validated` ; la card "Mur des éliminés" est retirée sans remplacement.

## Why

Trois ajustements de lisibilité + une étude de faisabilité produit, regroupés parce qu'ils touchent tous le même écran spectateur et la même surface admin et seront livrés (ou pas, pour la 4) dans la même session.

- **Mur des éliminés redondant.** L'info "Untel sorti boucle N" est déjà visible dans le pavé "Classement" avec le badge `DNF · B2`. La card "Mur des éliminés" duplique l'information, allonge le scroll, et fait croire au spectateur qu'il y a deux listes différentes à lire. Honnêteté de l'info > complétude visuelle.
- **"Valider DNF" sémantiquement faux.** Aujourd'hui, valider un auto-DNF système (coureur rattrapé par le top horaire) écrit `reason: 'manual'` en base, comme si le coureur avait abandonné. Conséquence : les archives mélangent "rattrapé par le chrono" et "a jeté l'éponge", alors que la majorité des éliminations sont du premier type — c'est l'essence d'un last-man-standing. Le badge public et la trace admin doivent porter cette différence.
- **Boucle courante non visible.** Le spectateur voit un compte-à-rebours `MM:SS` jusqu'au prochain top, mais pas "on en est où dans la course". Quand le badge classement affiche "Boucle 3" pour un coureur, on n'a pas la dénomination — 3 sur 12 ? sur 30 ? Donner le total et le restant referme cette boucle de lecture.
- **Self-punching à étudier.** Pendant le test de la veille, l'admin a tapé 6 pointages au top horaire ; sur une vraie édition à 20-30 coureurs c'est intenable, surtout quand l'admin se déplace sur le parcours. La question n'est pas "comment l'implémenter" mais "est-ce que ça vaut le coup", avec un mécanisme candidat (géoloc + fiche coureur) à challenger sur l'anti-triche et la simplicité.

**Output metric.** L'écran de course raconte une histoire juste de la course en cours, sans intervention humaine — un spectateur qui ouvre la page comprend en 5 secondes (a) combien il reste de boucles, (b) qui a été sorti par le chrono vs qui a abandonné, (c) qui est encore en course. Mesure : self-report auprès de 3 spectateurs après la prochaine édition réelle.

**Input metrics.**
- Le pavé "Classement" affiche un badge distinct pour `late-validated` vs `manual` (assertable en `/visual-validation`).
- Le card "Prochain top horaire" affiche `Boucle N / Total · X restantes` à la place de `MM:SS`.
- Aucune card "Mur des éliminés" présente dans le DOM de `/`.
- Décision sur self-punching capturée en ADR sous `docs/adr/NNNN-self-punching-last-loop-lepin.md` avec criteria/options/consequences (la décision elle-même peut être "ne pas build"), branchant — si "build" — un spec follow-up.

**Gemba.** Captures d'écran de l'app live (Edition test la veille, 4 DNF dont 2 en B1 et 2 en B2) montrent la duplication mur/classement et l'absence de compteur de boucles. Vu dans le screenshot joint à la conversation.

## Result

### Avant / après — Écran spectateur

**Avant** (état actuel, screenshot dans la conversation) :
- Card "Prochain top horaire" : flip `01:02` MM:SS, sous-label `MM:SS`, ligne `2 EN COURSE` `4 DNF`.
- Card "Classement" : badges `BOUCLE 3` (vert) pour en-course, `DNF · B2` (rouge) pour DNF — sans distinction late vs manual.
- Card "Mur des éliminés" : 4 vignettes "Sorti boucle 1/2".

**Après** :
- Card "Prochain top horaire" : flip `01:02` MM:SS, sous-label `BOUCLE 3 / 12 · 9 restantes` (mono, même style que `MM:SS` actuel), ligne `2 EN COURSE` `4 DNF` (inchangée).
- Card "Classement" : badges inchangés pour en-course, badges `DNF · B2` portant une variante visuelle pour `late-validated` (à distinguer de `manual`). Proposition designer : `late-validated` reste rouge (statut final identique) mais le texte devient `Hors délai · B2` au lieu de `DNF · B2`. À confronter visuellement.
- Pas de card "Mur des éliminés".

### Avant / après — Admin (`/admin`)

- Card "DNF à valider" : bouton "Valider DNF" envoie désormais `reason: 'late-validated'` au lieu de `'manual'`.
- Card "Réintégrer un DNF" : ligne `loop-info` distingue 3 cas — `auto-DNF système` (reason=late, pas encore validé), `auto-DNF validé` (reason=late-validated), `abandon manuel` (reason=manual). Le bouton "Faire passer (1 h)" est inchangé.
- Card "Abandon volontaire" : le bouton "Marquer abandon" continue d'envoyer `reason: 'manual'`. Inchangée.

### Self-punching (étude)

Pas de mockup — l'étude livre une décision en ADR. Si décision = build, un spec d'implémentation suit.

## Use cases / edge cases

### Happy path — écran spectateur après les 3 ajustements

1. Spectateur ouvre `/` pendant la course. Edition `status='live'`.
2. Card "Prochain top horaire" : flip MM:SS jusqu'au prochain top + sous-label `Boucle 3 / 12 · 9 restantes` (où 3 = dernière boucle fermée).
3. Card "Classement" : 6 lignes, dont 2 en-course (`BOUCLE 3` vert), 2 `Hors délai · B2` (orange/rouge clair), 2 `DNF · B1` (rouge plein).
4. Pas de card "Mur des éliminés" en bas.

### Happy path — admin valide un auto-DNF

1. Admin connecté ouvre `/admin`. Top horaire de la boucle 3 vient de passer ; Borso et Pchol ont pointé, Cosyn et Tinou non.
2. Section "DNF à valider" liste Cosyn, Tinou comme `reason='late'`. Click "Valider DNF" sur Cosyn.
3. POST `/api/admin/dnfs` avec `reason: 'late-validated'` (au lieu de `'manual'` actuel).
4. Standings repoll → Cosyn passe en `status.kind='dnf', reason='late-validated'`.
5. Côté spectateur : badge devient `Hors délai · B2`.
6. Côté admin : Cosyn passe dans "Réintégrer un DNF" avec label `auto-DNF validé · B2`.

### Happy path — admin marque un abandon volontaire

1. Admin clique "Marquer abandon" sur Arn (en course, B3).
2. POST `/api/admin/dnfs` avec `reason: 'manual'`. Inchangé.
3. Badge spectateur : `DNF · B3` (rouge plein, identique à aujourd'hui).
4. Admin reinstate label : `abandon manuel · B3`.

### Edge cases

- **Edition `status='setup'`** (hors jour J) : page d'accueil affiche `HorsJourJ`, le card "Prochain top horaire" n'est pas rendu. Le compteur de boucles n'apparaît pas. Inchangé par rapport à aujourd'hui.
- **Edition `status='finished'`** : `loopIndexAt(now) >= totalHourlyTops(edition)`. Affichage `Boucle 12 / 12 · 0 restante`. Le flip MM:SS est déjà à `00:00`.
- **`intervalMinutes` non-rond ou `endsAt - startsAt` non-multiple** : `totalHourlyTops` floor-arrondit déjà. Si `totalHourlyTops = 0` (edition mal configurée), afficher `Boucle — / —` au lieu de crasher.
- **Avant le 1ᵉʳ top horaire** (rien n'est encore fermé) : afficher `Boucle — / 12`. Sémantique : on compte les **boucles fermées**, pas la boucle en cours. Aligne avec le badge classement (`lastLoop=0` avant le premier passage). La valeur affichée est `lastClosedLoop = max(0, loopIndexAt(now) - 1)` ; on rend `—` quand `lastClosedLoop === 0`.
- **Un coureur déjà DNF `manual` est validé à nouveau** : ne devrait pas être possible côté UI (il n'apparaît plus dans la liste "DNF à valider"). Côté API : si reçu, écraser la `reason` n'a aucun sens — rejet 409 ou idempotence sur le tuple `(runnerSlug, editionSlug, outAtLoop, reason)`. À trancher dans le plan.
- **Réintégration via "Faire passer (1 h)"** : remet en course quelle que soit l'ancienne `reason`. Inchangé.

### Error cases

- API renvoie 4xx sur "Valider DNF" : `error` state du panel affiche le message — code path déjà en place (`DnfCandidatesPanel.tsx:62`).
- `useStandings` en erreur réseau : la card "Prochain top horaire" affiche le flip + `Boucle — / —` plutôt que de crasher.

## Questions, Options and Decisions

| Question | Options | Décision (2026-05-15) |
| --- | --- | --- |
| **Granularité du statut DNF** | (a) Garder `late \| manual`. (b) Étendre à `late \| manual \| late-validated`. (c) Champ `validatedAt` à part. | **(b)** — extension d'enum cohérente avec le modèle existant, pas de nouveau champ, tests `*.core.ts` minimes. |
| **Découpage du spec** | (a) Un seul spec. (b) Deux specs (polish vs étude). (c) Polish maintenant, étude plus tard. | **(a)** — choix utilisateur explicite, malgré la recommandation de splitter. Trace conservée ici en cas de regret. |
| **Source des totaux de boucles** | (a) Dérivé (`endsAt − startsAt`) / `intervalMinutes`. (b) Nouveau champ `totalLoops` en base. | **(a)** — `totalHourlyTops()` existe déjà comme helper pur ; pas de migration. |
| **Format compteur de boucles** | (a) Pill discrète sous le flip. (b) Nouvelle card à côté. (c) Remplace `MM:SS` du sous-label. | **(c)** — choix utilisateur. Le label `MM:SS` est redondant avec le flip lui-même. |
| **Visibilité de `late-validated`** | (a) Backend seulement. (b) Backend + classement public. (c) Backend + classement + admin. | **(c)** — choix utilisateur. Distinction visible partout pour cohérence narrative. |
| **Texte du badge classement** | (a) Garder `DNF · B2` pour les deux. (b) `Hors délai · B2` vs `DNF · B2`. (c) Couleur différente, texte identique. | **(b)** — choix utilisateur. Même couleur rouge ou variante à trancher au plan. |
| **Sémantique du compteur de boucles** | (a) Boucle en cours (loopIndexAt). (b) Dernière boucle fermée (loopIndexAt − 1), `—` avant le 1ᵉʳ top. | **(b)** — choix utilisateur. Aligne avec le badge classement qui montre déjà la dernière boucle fermée. |
| **Refactor confirmDnf** | (a) Param `reason: 'manual' \| 'late-validated'`. (b) Splitter en deux fonctions distinctes. | **(a)** — choix utilisateur. Refactor minimal, 1 ligne. |
| **Self-punching — vaut le coup ?** | Critères : anti-triche + simplicité. Options ci-dessous. | **À trancher en ADR** `docs/adr/NNNN-self-punching-last-loop-lepin.md`. Mécanisme candidat : géoloc + bouton sur fiche coureur, coexistant avec le pointage admin. Voir tableau d'évaluation ci-dessous. |
| **Self-punching — coexistence** | (a) Remplace admin. (b) Coexiste, premier des deux gagne. (c) À trancher en ADR. | **(b)** — choix utilisateur. L'admin reste le filet de sécurité ; le coureur est un raccourci. |
| **Self-punching — auth coureur** | (a) Slug seul (URL fiche publique). (b) Token unique par coureur (généré au pré-enregistrement). (c) Magic link SMS au départ. | **À trancher en ADR.** Slug seul = trivialement spoofable ; token = effort logistique modéré ; SMS = dépendance externe + coût. |

### Évaluation du mécanisme géoloc (entrée pour l'ADR)

Critères pondérés par l'utilisateur : **anti-triche** + **simplicité**.

| Critère | Géoloc + slug (URL publique) | Géoloc + token coureur unique |
| --- | --- | --- |
| Anti-triche réseau | Faible (browser geoloc spoofable en 3 clics dev tools) | Idem (la géoloc reste le maillon faible) |
| Anti-triche identité | Aucun (n'importe qui peut pointer pour un slug visible) | Modéré (token nécessaire) |
| Simplicité coureur | Très forte (lien dans la fiche, 1 clic) | Modérée (recevoir le token avant la course) |
| Effort de dev | 1-2 j (route publique + check geoloc + UI bouton) | 3-5 j (gen tokens + distribution + UI) |
| Effort orga (jour J) | Aucun | Modéré (vérifier que chaque coureur a son token) |

**Conclusion provisoire pour l'ADR** : la géoloc seule n'est pas un mécanisme anti-triche cryptographique. Elle filtre les pointages flemmards à distance, mais ne tient pas contre un coureur motivé à tricher. Pour un last-man-standing entre amis, c'est probablement suffisant ; pour une édition compétitive, non. Décision à prendre après confrontation à un cas réel (test la veille, prochaine édition). **Statut : étude reportée à un /adr dédié**, ce spec n'écrit que la partie 1-2-3.

### Hors scope

- Notification push aux coureurs / spectateurs.
- Export CSV mis à jour avec la nouvelle `reason` (suit naturellement, à vérifier au moment du build).
- Refonte visuelle des badges classement au-delà de l'ajout d'une variante `late-validated`.
- Implémentation effective du self-punching — uniquement l'étude / ADR.
- Migration des `manual` DNF existants vers `late-validated` rétro : on garde le passé tel quel.

## Changes

### Types / domain model

```ts
// api/src/ranking/ranking.types.ts (UPDATE) + site/src/domain/types.ts (UPDATE)
type RunnerStatus =
  | { readonly kind: 'in-race'; readonly lastLoop: number }
  | {
      readonly kind: 'dnf';
      readonly outAtLoop: number;
      readonly reason: 'late' | 'manual' | 'late-validated';
    };

// api/src/punch/punch.schema.ts (UPDATE)
export const createDnfInputSchema = z.object({
  editionSlug: editionSlugSchema,
  runnerSlug: runnerSlugSchema,
  outAtLoop: z.number().int().nonnegative(),
  reason: z.enum(['late', 'manual', 'late-validated']),
});

// api/src/punch/punch.types.ts (UPDATE)
type ManualDnf = {
  readonly runnerSlug: string;
  readonly outAtLoop: number;
  readonly reason: 'manual' | 'late-validated';
  // 'late' n'est jamais persisté — c'est l'état projeté avant validation.
};
```

### Database changes

```sql
-- Aucune migration. `manual_dnfs.reason` est `text('reason').notNull()`
-- (drizzle, punch.schema.ts:35) — pas d'enum PostgreSQL à étendre. La
-- contrainte des 3 valeurs est portée par le zod schema côté API. Lignes
-- existantes restent en 'manual' — pas de backfill.
```

### Files to change

```
# 1. Mur des éliminés
apps/last-loop-lepin/site/src/routes/SpectatorPage.tsx               // UPDATE: retirer lignes 182–187
apps/last-loop-lepin/site/src/components/EliminatedWall.tsx          // DELETE

# 2. Statut late-validated
apps/last-loop-lepin/api/src/ranking/ranking.types.ts                // UPDATE: enum reason → 3 valeurs
apps/last-loop-lepin/api/src/ranking/ranking.core.ts                 // UPDATE: tests pour la nouvelle valeur (passe par manualDnf.reason)
apps/last-loop-lepin/api/src/punch/punch.schema.ts                   // UPDATE: zod enum → 3 valeurs
apps/last-loop-lepin/api/src/punch/punch.types.ts                    // UPDATE: ManualDnf.reason
apps/last-loop-lepin/api/src/punch/punch.service.ts                  // UPDATE: si validation runtime, ajouter le nouveau cas
apps/last-loop-lepin/site/src/domain/types.ts                        // UPDATE: DTO miroir
apps/last-loop-lepin/site/src/components/admin/DnfCandidatesPanel.tsx// UPDATE:
                                                                     //   - ligne 55: reason: 'late-validated' pour Valider DNF
                                                                     //   - ligne 79 (abandonVoluntarily → confirmDnf): paramétrer la reason
                                                                     //   - ligne 191: switch sur 3 reasons pour le label
apps/last-loop-lepin/site/src/components/Leaderboard.tsx             // UPDATE: badge texte/variante pour late-validated
apps/last-loop-lepin/site/src/components/Leaderboard.test.ts(.tsx)   // UPDATE/NEW si pas couvert

# 3. Compteur de boucles
apps/last-loop-lepin/site/src/domain/loop-progress.utils.ts          // NEW: { currentLoop, totalLoops, remainingLoops } à partir de l'edition + now. 100% coverage.
apps/last-loop-lepin/site/src/domain/loop-progress.utils.test.ts     // NEW
apps/last-loop-lepin/site/src/routes/SpectatorPage.tsx               // UPDATE: card-body du countdown-card → afficher progress au lieu du label "MM:SS"
apps/last-loop-lepin/site/src/components/Countdown.tsx               // UPDATE possible: si le composant rend "MM:SS" en dur sous le flip, l'extraire en prop label / sous-label

# 4. Étude self-punching
docs/adr/NNNN-self-punching-last-loop-lepin.md                       // NEW via /adr — produit hors du build, livrable de cette spec
```

### Test strategy

- **Unit `*.utils.ts`** — `loop-progress.utils.ts` ship à 100 % coverage (statement / branch / function / line). Cas couverts : avant départ, en course, après fin, edition mal configurée (`totalHourlyTops = 0`), `intervalMinutes` non-rond.
- **Unit `*.core.ts`** — `ranking.core.test.ts` étendu pour prouver que `manualDnf.reason === 'late-validated'` projette bien un `status.kind === 'dnf'` avec la bonne reason transitivement. 100 % conservé.
- **Visual validation** (drive par `agent-browser`, assertions input metrics) :
  1. `/` en `status='live'` avec ≥1 coureur en `reason='late-validated'` (seed via API admin dans le before-hook) : badge contient "Hors délai" et pas "DNF" pour ce coureur ; badge contient "DNF" pour un coureur en `reason='manual'`.
  2. `/` en `status='live'` : card "Prochain top horaire" affiche une chaîne matchant `/Boucle \d+ \/ \d+ · \d+ restantes?/` ; aucune occurrence du texte "MM:SS" sous le flip.
  3. `/` en `status='live'` : aucun élément contenant le texte "Mur des éliminés".
  4. `/admin` connecté : cliquer "Valider DNF" sur un candidat `late` → après repoll, le coureur disparaît de "DNF à valider", apparaît dans "Réintégrer un DNF" avec le label exact `auto-DNF validé · B<n>`.
- **Technical validation** — lint + knip + typecheck + build + tous les unit tests passent ; revue de diff confirme que `reason: 'manual'` n'est plus envoyé par "Valider DNF" et toujours envoyé par "Marquer abandon".
- **Pas de manual sweep** — la passe humaine (préfèrer une vraie édition test) est explicitement notée comme belt sur les bretelles, sous *Production strategy → Manual smoke after deploy* ci-dessous, pas comme gate.

L'étude self-punching n'a pas de gate de test : son livrable est l'ADR. Si l'ADR conclut "build", un spec follow-up portera ses propres gates.

## Production strategy

### Analytics

**Input metrics** (events nommés, instrumentés via `recordAnalyticsEvent`) :
- `dnf_validated` existe déjà (`DnfCandidatesPanel.tsx:57`) — ajouter le champ `reason: 'late-validated'` pour les distinguer des `manual` dans Sentry breadcrumbs.
- Nouvel event `loop_progress_viewed` ? **Non** — la card est rendue sur 100 % des visites `/`, pas besoin d'event dédié, le pageview suffit.
- Pas d'event nouveau pour la suppression du mur (negation ne se mesure pas en event).

Seuils :
- Aucun seuil dur. La métrique est lagging : "le spectateur comprend en 5 s", mesurée par self-report.

**Output metric** (lagging, hors CI) :
- Self-report après la prochaine édition réelle (3 spectateurs interrogés, "qu'est-ce qui manque / trop ?"). Aussi : vérifier que le ratio `late-validated / total DNF` dans les archives correspond au sentiment subjectif.

### Zero-defect strategy

- **`DnfValidationFailedError`** (existante) : déjà capté côté UI par `setError` ; surveiller un pic d'occurrences après le déploiement (Sentry tag `feature: dnf-validation`, alerte > 3 occurrences / 10 min en prod).
- **`LoopProgressMisconfiguredError`** : si `loop-progress.utils.ts` détecte `totalHourlyTops = 0` ou des bornes invalides, log warning + retourner `{ currentLoop: 1, totalLoops: 0, remaining: 0 }` (l'UI affiche `Boucle — / —`). Pas d'alerte (config edition côté admin, pas runtime).
- **Manual smoke after deploy** : ouvrir `/` une fois et `/admin` une fois, vérifier visuellement les badges et le compteur de boucles. Pas un gate, juste un belt humain post-merge.
