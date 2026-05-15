# Une pastille violette signale le coureur du tour le plus rapide

## Perspectives confronted

- [x] **Client / business** — confirmé : feature de polish pour la retransmission. Crée un repère narratif (« qui est sur un rythme exceptionnel ? ») et une distinction symbolique légère (style « Fastest Lap » F1) sans bouleverser l'écran.
- [x] **Product** — confirmé : sémantique « record d'édition » assumée. Si Borso fait un 12:00 puis DNF, la pastille reste sur Borso jusqu'à ce qu'un autre coureur batte ce temps. Tie-break à la milliseconde : les deux coureurs sont décorés (cohérent avec l'ex-aequo `ranking.core.ts`).
- [x] **Tech-lead** — confirmé : nouvelle fonction pure dans un nouveau `fastest-lap.core.ts` (séparé de `punch.core.ts` qui ne porte que les règles de pointage, et de `ranking.core.ts` qui calcule le classement — le « meilleur tour » est un autre projection). Le `Standings` DTO gagne un champ `fastestLap: ReadonlyArray<{ runnerSlug, durationMs }>` (array pour gérer le tie-break naturellement, vide quand aucune boucle close). Aucune migration DB.
- [x] **Developer** — confirmé : tout est calcul pur sur les `LoopPunch[]` déjà chargés par `computeStandings`. Test 100 % coverage trivial. Côté front, `Leaderboard.tsx` ajoute un `.fastest-lap-badge` à la chip dont `runner.slug` est dans `fastestLap`. CSS-only, pas de JS.
- [x] **Designer** — confirmé : pastille violette ronde façon Fastest Lap F1, icône chronomètre, placée en haut-droite de la chip (zone aujourd'hui libre, voir `leaderboard-chip__head` qui contient rank + avatar + name à gauche). Couleur du fond cohérente avec la palette F1 (`#a020f0` ou variable CSS dédiée), icône SVG chrono blanc. Pas de surface UI sur la carte v1.

## Why

Sur une édition longue (3-6 heures), les écarts entre coureurs se forment lentement. Pour un spectateur qui prend la retransmission en cours de route, savoir « qui est le plus rapide *en pointe* » donne un fil narratif à suivre, distinct du classement (qui rang-ordonne par profondeur de boucle, pas par vitesse). C'est aussi une distinction symbolique légère pour les coureurs — analogue au « fastest lap » F1 (purple badge) ou au maillot à pois en cyclisme.

**Output metric** (lagging, hors CI) : self-report Hugo à la prochaine édition réelle, format binaire « la pastille apporte de la lisibilité / est invisible-ou-distrayante ». Pas de mesure quantitative — c'est un polish.

**Input metrics** (driveables par `/visual-validation`) :
- Le DTO standings inclut `fastestLap: ReadonlyArray<{ runnerSlug, durationMs }>`, calculé à partir des `LoopPunch[]` non-voidés.
- Quand au moins une boucle est close, `fastestLap` contient un (ou plusieurs en cas d'ex-aequo) records.
- La chip du runner dont `runner.slug` apparaît dans `fastestLap` porte une `.fastest-lap-badge` visible.
- Quand aucune boucle n'est close, `fastestLap` est `[]` et aucune chip n'est décorée.

**Gemba** : pas d'observation terrain — c'est une demande de polish issue de la session de spec du 2026-05-15. Le pain point qu'elle adresse est anticipé (« suivre une retransmission longue sans repère narratif autre que le classement est fade »), pas vécu.

## Result

Sur la chip du runner détenteur (ou les chips, en cas d'ex-aequo) :
- Pastille violette ronde, ~16px de diamètre, placée en haut-droite de la chip (recouvrement léger sur le bord, comme un sticker collé dessus).
- Icône chronomètre SVG en blanc à l'intérieur.
- Optionnel : une légère ombre portée pour le détacher de la chip (à arbitrer en implementation visuelle).

Avant : chip standard. Après : chip + pastille violette dans le coin. Tout autre élément de la chip (rang, avatar, nom, status, time) reste tel quel.

L'écran de retransmission affiche cette pastille ; l'écran tactile (admin) aussi, sans changement de comportement (la chip admin n'est pas tapable depuis cet écran — voir spec `self-punch-runners`).

## Use cases / edge cases

### Happy path

1. L'édition démarre à 14:00, interval 60 min.
2. À 15:00, Hugo, Borso, et Pchol pointent leur B1. Durations respectives : 42m, 47m, 51m.
3. `fastestLap` = `[{ runnerSlug: 'hugo', durationMs: 42×60_000 }]`. Chip de Hugo décorée.
4. À 16:00, Borso pointe son B2 en 40m (record battu). Hugo en 44m, Pchol en 52m.
5. `fastestLap` = `[{ runnerSlug: 'borso', durationMs: 40×60_000 }]`. Chip de Borso décorée, celle de Hugo nettoyée.
6. À 17:00, Borso DNF (n'a pas pointé). Hugo et Pchol pointent leur B3.
7. `fastestLap` reste `[{ runnerSlug: 'borso', durationMs: 40×60_000 }]` (les punchs de Borso pour B1 et B2 restent dans la base, non-voidés). Chip de Borso (DNF) reste décorée.

### Edge cases

- **Aucune boucle close** : `fastestLap = []`. Aucune chip décorée. Affichage propre par construction.
- **Un seul coureur a closé une boucle** : ce coureur porte la pastille (sémantique acceptable « il détient le record actuel, qu'il y en ait un ou trente »).
- **Ex-aequo à la milliseconde** : `fastestLap` contient les deux entrées. Les deux chips sont décorées. Aucun message « ex-aequo » texte — la double pastille suffit.
- **Le détenteur fait DNF** : son punch reste, son record reste, sa chip DNF garde la pastille. Le `Leaderboard.tsx` ne discrimine pas sur le statut DNF pour décorer.
- **Tous les punches sont voidés (admin a annulé une session test)** : `fastestLap = []`. Pas de pastille.
- **Pointage à la frontière du loop start (`elapsed = 0`)** : `lastLoopDurationMs` retourne `null` aujourd'hui pour ce cas. Le nouveau calcul utilise la même logique → durations `null` sont écartées, ce punch ne concourt pas pour le meilleur tour. Acceptable (c'est un edge case de clock skew test-only).

### Error cases

- **Aucun** — feature read-only sur des données déjà validées par `validatePunchTiming` à l'écriture. Pas de surface d'erreur dédiée.

## Questions, Options and Decisions

| Question | Options | Décision (2026-05-15) |
| --- | --- | --- |
| **Définition « meilleur tour »** | (a) Min `finishedAt[N] - finishedAt[N-1]` (wall-clock entre punchs). (b) Min `finishedAt[N] - (startsAt + (N-1) × interval)` (temps de course, écarte le repos au corral). | **(b)** — cohérent avec `lastLoopDurationMs` existant (`punch.core.ts:69`), c'est le temps physiquement couru. Le repos au corral fausserait la mesure. |
| **Tie-break à la ms** | (a) Les deux décorés. (b) Premier dans le temps. (c) Aucune pastille tant que doublon. | **(a)** — cohérent avec l'ex-aequo déjà géré par `tiesForRanking` dans `ranking.core.ts`. Affichage : deux pastilles, pas de message texte. |
| **DNF holder** | (a) Reste sur le DNF (record d'édition). (b) Migre vers in-race. (c) Deux pastilles distinctes. | **(a)** — sémantique « record d'édition », pas « qui est en forme maintenant ». Si la sémantique alternative devient utile, follow-up. |
| **Visuel** | (a) Pastille ronde + icône chrono. (b) Liseret autour de la chip. (c) Pastille pleine sans icône. | **(a)** — pastille violette F1-style, icône chronomètre, ~16px, haut-droite de la chip. |
| **Surface UI** | (a) Chip uniquement. (b) Chip + avatar carte. | **(a) v1** — la carte reste neutre, la chip porte la distinction. |
| **Forme du champ DTO** | (a) `fastestLap: { runnerSlug, durationMs } \| null`. (b) `fastestLap: ReadonlyArray<{ runnerSlug, durationMs }>`. | **(b)** — array gère le tie-break naturellement (length ≥ 2), pas de forme spéciale pour l'ex-aequo. Vide quand aucun loop close. |
| **Inclure `loopIndex` dans le DTO ?** | (a) Oui (`{ runnerSlug, loopIndex, durationMs }`). (b) Non (`{ runnerSlug, durationMs }`). | **(b) v1** — le rendu n'a besoin que du `runnerSlug` pour décorer. Le `loopIndex` est calculable post-hoc côté admin si on veut creuser. À ajouter dans un follow-up si un tooltip « Meilleur tour : B3 en 38:42 » est demandé. |

### Hors scope

- Surface UI sur la carte (avatar décoré).
- Tooltip / drill-down sur la pastille (« Meilleur tour : B3 en 38:42 »).
- Animation d'apparition / célébration quand le record est battu.
- Historique des records (les anciens records ne sont pas conservés).
- « Meilleur tour parmi les in-race » comme deuxième pastille.
- `loopIndex` dans le DTO.

## Changes

### Types / domain model

```ts
// api/src/ranking/ranking.types.ts (UPDATE)
export interface Standings {
  readonly editionSlug: string;
  readonly computedAt: Date;
  readonly raceEnded: boolean;
  readonly ranked: readonly RankedRunner[];
  readonly fastestLap: ReadonlyArray<{ readonly runnerSlug: string; readonly durationMs: number }>; // NEW — empty when no loop closed; length ≥ 2 means tie at the ms.
}

// api/src/ranking/fastest-lap.core.ts (NEW, pure)
/**
 * Find the runner(s) with the minimal loop duration across all valid
 * punches. Duration uses the same formula as lastLoopDurationMs:
 * finishedAt − (startsAt + (loopIndex − 1) × intervalMs).
 *
 * Returns an empty array when no punch yet, or when every duration is
 * null (clock-skew edge). Length ≥ 2 indicates a tie at the millisecond.
 */
export function fastestLap(
  edition: RaceEdition,
  punches: readonly LoopPunch[],
): ReadonlyArray<{ runnerSlug: string; durationMs: number }>;
```

### Database changes

Aucune. Le calcul lit `loop_punches` déjà persisté.

### Files to change

```
# Back
apps/last-loop-lepin/api/src/ranking/fastest-lap.core.ts             // NEW: pure, 100% coverage. Reuses the duration formula from punch.core.ts (factored into a helper exported from punch.core.ts).
apps/last-loop-lepin/api/src/ranking/fastest-lap.core.test.ts        // NEW: 6 vectors — empty punches, one runner one loop, multiple runners multiple loops, tie at ms, all-voided, DNF holder retained.
apps/last-loop-lepin/api/src/punch/punch.core.ts                     // UPDATE: extract `loopDurationMs(edition, punch): number | null` (used by lastLoopDurationMs and by fastest-lap.core.ts). The existing `lastLoopDurationMs` is rewritten on top.
apps/last-loop-lepin/api/src/punch/punch.core.test.ts                // UPDATE: cover the new extracted helper directly.
apps/last-loop-lepin/api/src/ranking/ranking.types.ts                // UPDATE: Standings gains the fastestLap field.
apps/last-loop-lepin/api/src/ranking/ranking.core.ts                 // UPDATE: computeStandings calls fastestLap() and forwards.
apps/last-loop-lepin/api/src/ranking/ranking.core.test.ts            // UPDATE: 2 vectors — fastestLap empty before any punch, fastestLap populated after.

# Front
apps/last-loop-lepin/site/src/domain/types.ts                        // UPDATE: site-side StandingsDto gains fastestLap.
apps/last-loop-lepin/site/src/api/client.ts                          // UPDATE: Zod schema for standings matches the new shape.
apps/last-loop-lepin/site/src/components/Leaderboard.tsx             // UPDATE: read standings.fastestLap; build a Set<string> of decorated slugs; the chip renders <span className="leaderboard-chip__fastest-lap-badge" /> when entry.runner.slug is in the set.
apps/last-loop-lepin/site/src/styles/leaderboard.css (or similar)    // UPDATE: new .leaderboard-chip__fastest-lap-badge rule — round, ~16px, violet bg (--accent-fastest-lap, default #a020f0), absolute top-right of the chip, contains an inline-SVG chrono icon.
```

### Test strategy

- **Unit `*.core.ts`** — `fastest-lap.core.ts` (NEW) à 100 % coverage avec 6 vecteurs. `punch.core.ts` reste à 100 % après extraction de `loopDurationMs` (un test direct couvre le nouveau helper). `ranking.core.ts` reste à 100 % avec 2 vecteurs additionnels.
- **Visual validation** — `/visual-validation` ouvre `/` avec un dataset connu : 3 coureurs avec 2 boucles chacun, durées asymétriques. Asserte (a) la pastille est sur la chip du record holder, (b) deux pastilles en cas d'ex-aequo, (c) zéro pastille avant le premier loop close, (d) pastille reste sur le DNF après que le coureur fait DNF.
- **Technical validation** — lint + knip + typecheck + build + coverage gates. Diff revue confirme : (a) la formule `loopDurationMs` est bien extraite et réutilisée (pas dupliquée), (b) le DTO Zod parsing tolère un `fastestLap: []` sans crash sur les éditions sans punch, (c) le rendu Leaderboard n'utilise pas `useEffect` pour cette feature (CSS + Set inline).
- **Coverage gates** — `fastest-lap.core.ts` est gaté par `api/src/**/*.core.ts` existant à 100 %. Pas d'extension de `vitest.workspace.ts` nécessaire.
- **Manual smoke après deploy** — *belt only* : ouvrir `/` sur l'édition test 2026-05-14 en read-only, observer que la pastille est sur le runner avec le meilleur tour vérifiable manuellement.

## Production strategy

### Analytics

**Input metrics** :
- Aucun nouvel event. La feature est pure-projection sur des données existantes ; aucun comportement utilisateur nouveau à instrumenter.

**Output metric** (lagging, manual review) :
- Self-report Hugo à la prochaine édition : « la pastille apporte de la lisibilité ? oui/non/autre ». Binaire qualitatif.

### Zero-defect strategy

Named error classes :
- **Aucune** — feature read-only, sans surface d'écriture, sans donnée utilisateur. Le seul risque est un bug de calcul (`fastestLap` faux) attrapé par les tests unitaires.
- **`ZodError` au mount de la page** si le serveur renvoie un DTO mal formé (`fastestLap` non-tableau, mauvais shape) — déjà géré par le parsing Zod existant côté front. Pas d'alerte spécifique : si ça fire, c'est qu'on a bugé le serveur.
