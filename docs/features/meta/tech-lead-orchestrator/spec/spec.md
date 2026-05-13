# Déléguer une feature au tech-lead-orchestrator et la retrouver en PR prêt à déployer

## Perspectives confronted

- [x] **Client / business** — confirmé en conversation : le "client" est Hugo (solo dev), valeur = temps humain par feature ↓ via confiance ↑.
- [x] **Product** — invocation, output metric, positionnement vs auto-chain existant et UX humain validés via `AskUserQuestion`.
- [x] **Tech-lead** — confronté dans Q.O.D. ci-dessous : risques de context blow-up, loop runaway, ADR-spam, spec drift.
- [x] **Developer** — fichiers, contrats sous-agents, hooks de retry énumérés dans *Changes* ; test strategy nommée explicitement vu la nature meta du livrable.
- [x] **Designer** — pas d'UI ; l'UX = ce qui s'affiche dans le terminal + ce qui persiste sur disque ; confirmé : status concis + tout en fichiers.

## Why

Aujourd'hui le pipeline du repo est un auto-chain linéaire `/specification → /technical-conception → /implementation → /technical-validation → /visual-validation`. Quand une feature passe ce pipeline, **Hugo doit garder un œil sur chaque étape** : relancer manuellement quand une validation échoue, arbitrer "fix vs replan vs rewrite-spec", écrire les ADRs à la main (ou pire, les oublier), trier les questions que l'implementer remonte en cours de route. Le pipeline existe ; le rôle de chef d'orchestre n'existe pas.

- **Output metric (lagging, mesuré hors-CI)** : temps humain médian par feature shippée ↓. Mesuré en faisant la somme `commits.diff(authored_at, push_at) – temps_d'attente_CI` sur les PRs labellisées `via-tech-lead` vs celles qui n'y passent pas. Revue mensuelle, jamais asserté par `/visual-validation`.
- **Input metrics (leading, machine-observables)** :
  1. **Rework rate** : nombre de Dantotsus ouverts par PR labellisée `via-tech-lead` (cible : 0).
  2. **Traceability rate** : 100 % des choix d'architecture identifiés par le tech lead ont un ADR sous `docs/adr/` lié depuis `spec.md` ou `plan.md`.
  3. **Convergence rate** : % de runs `/tech-lead-orchestrator` qui produisent un PR sans escalation humaine en cours de route (cible initiale ≥ 50 %, à raffiner).
  4. **Human-intervention size** : `count(messages_humain_dans_session)` par run (proxy quantifiable du "temps humain self-reporté"). Cible : décroissante sur les 5 premiers runs successifs.
  5. **Time-to-first-escalation** : durée entre `run_started` et la première `escalation` (s'il y en a une). Si très court systématiquement, la confiance n'est pas au rendez-vous → revue de la décision (a).
- **Gemba** : la dernière feature non-triviale (cf. `docs/features/borsouvertures/*`) a vu Hugo intervenir manuellement à chaque transition de skill, l'implementer remontait des questions à l'humain alors qu'elles relevaient d'archi pas de produit, et deux choix d'archi non-triviaux n'ont jamais eu d'ADR.

## Result

Une commande terminal :

```
/tech-lead-orchestrator "I want to add <feature description>"
```

déclenche, sans surveillance continue :

1. Une session de specification (le human reste impliqué, c'est le point où il *donne la direction*).
2. La rédaction d'un `plan.md` complet.
3. La rédaction d'un ou plusieurs ADRs sous `docs/adr/NNNN-<slug>.md` à chaque choix d'archi qualifiant (cf. seuil ADR plus bas).
4. Une boucle implementation → validations (technical + visual en parallèle) → arbitrage → retry, bornée.
5. Un commit + push sur la branche, et un rappel à Hugo d'approuver le déploiement prod (cf. CLAUDE.md *Deployments*).

Artefacts visibles, *tous persistés sur disque* :

```
docs/features/<app>/<slug>/
  spec/spec.md
  plan/plan.md
  validation/technical-validation-<ts>.md
  validation/visual-validation-<ts>.md
  validation/visual-validation-<ts>/  # screenshots
docs/adr/NNNN-<slug>.md  # un ou plusieurs, référencés depuis spec.md / plan.md
.claude/skills/tech-lead-orchestrator/runs/<run-id>/journal.md  # status updates persistés
```

Dans le terminal : status concis ("→ /specification lancé", "← ADR-007 écrit sur cache invalidation", "→ implementer, run 1/3", "← validation FAIL, j'analyse le plan", "↑ escalation : conflit spec/plan sur use case #3"). Pas de gros chat.

## Use cases / edge cases

```mermaid
flowchart TD
  H[Human: /tech-lead-orchestrator "..."] --> S{Spec already exists?}
  S -- no --> Spec[/specification skill<br/>interactive with human/]
  S -- yes --> Plan
  Spec --> Plan[/technical-conception skill/]
  Plan --> ADRgate{Architectural<br/>decisions found?}
  ADRgate -- yes --> ADR[/adr-writer skill<br/>writes docs/adr/NNNN-*.md/]
  ADR --> Plan
  ADRgate -- no --> Impl[Agent: implementation]
  Impl --> QFromAgent{Sub-agent returned<br/>a question?}
  QFromAgent -- yes --> TLDecide[Tech lead decides:<br/>answer / ADR / re-spec request to human]
  TLDecide --> Impl
  QFromAgent -- no --> Val[Parallel: technical-validator + visual-validator]
  Val --> Verdict{Both PASS?}
  Verdict -- yes --> PR[Commit + push + remind deploy]
  Verdict -- no --> Arb{Plan re-check.<br/>Defect type?}
  Arb -- local fix --> Impl2[Implementer + verdict context]
  Impl2 --> Val
  Arb -- plan flaw --> Replan[/technical-conception on sub-section/]
  Replan --> Impl
  Arb -- spec flaw --> Escalate[Stop. Summarize.<br/>Propose spec change.<br/>Hand back to human]
  RetryCap{N retries<br/>exhausted?} -- yes --> Escalate
  Impl2 --> RetryCap
```

**Happy path numéroté :**
1. Human invoque le skill avec une description.
2. Tech lead détecte qu'il n'y a pas de `spec.md` → délègue à `/specification`.
3. `/specification` interroge le human, produit `spec.md`, toutes perspectives cochées.
4. Tech lead délègue à `/technical-conception`, produit `plan.md`.
5. Tech lead grep le plan pour les marqueurs de décision archi (cf. seuils ADR) ; pour chaque marqueur, délègue à `/adr-writer`.
6. Tech lead spawn un sous-agent `implementation` (séquentiel, un seul à la fois).
7. Sous-agent termine sa run sans question.
8. Tech lead spawn `technical-validator` + `visual-validator` en parallèle.
9. Les deux PASS.
10. Tech lead commit, push, rappelle à Hugo d'approuver le deploy prod.

**Edge cases :**
- Spec déjà existante (re-run sur la même feature) : tech lead reprend au step 4.
- Sous-agent renvoie une question structurée au lieu de "done" : tech lead lit, décide, écrit potentiellement un ADR, relance.
- Plusieurs ADRs nécessaires : générés séquentiellement, numérotés `NNNN`, liés depuis le plan.
- Tech lead détecte un pattern qui existe déjà (recherche `docs/knowledge`, `docs/adr`, code) : ADR systématique pour tracer "réutilise X" ou "réinvente parce que Y".

**Error cases :**
- Validation FAIL avec verdict ambigu (ni clairement local, ni clairement plan) → tech lead consulte `plan.md`, choisit l'option la moins coûteuse en premier (fix local), incrémente le compteur.
- Compteur retry > `MAX_RETRIES` (cf. Q.O.D.) → escalation forcée.
- Verdict de validation suggère un trou dans `spec.md` → tech lead **n'écrit pas** dans `spec.md`. Il escalade avec une proposition de modification que le human accepte ou refuse.
- ADR-writer signale un conflit avec un ADR existant → escalation immédiate (les conflits archi sont des décisions humaines).
- Sub-agent timeout / crash → 1 retry automatique, sinon escalation.
- Hooks pre-commit ou pre-push échouent → tech lead lit la sortie, traite comme un verdict de validation FAIL (jamais `--no-verify`).

## Questions, Options and Decisions

| Question | Options | Decision (2026-05-12) |
| --- | --- | --- |
| Où vit le tech lead dans le pipeline ? | (a) Remplace l'auto-chain (b) S'insère entre conception et implem (c) Agent résident en parallèle | **(a) Remplace l'auto-chain.** `/specification` ne chaîne plus à `/technical-conception` automatiquement ; c'est le tech lead qui décide. Mise à jour requise dans `.claude/skills/specification/SKILL.md` *Auto-chain* section. |
| Comment le sous-agent interroge le tech lead ? | (a) Sous-agent termine sa run avec une question structurée (b) Outil `ask-tech-lead` interne (c) Sous-agent escalade direct au human | **(a)** Le sous-agent termine sa run. Contrat : sortie JSON dans son rapport final (`status: "done" | "question" | "blocked"` + payload). Plus simple à tracer, pas de session imbriquée. |
| Quand écrire un ADR ? | Triggers ADR | **4 triggers, OR** : (1) choix entre ≥ 2 alternatives sérieuses ; (2) impact cross-cutting (≥ 2 apps ou modules) ; (3) divergence avec une convention (CLAUDE.md, ADR existant, docs/knowledge) ; (4) feature qui semble standard / déjà exister ailleurs (ADR justifie "réutilise" ou "réinvente parce que"). |
| Comment détecter (4) "déjà existe" ? | (a) Recherche `docs/` + code repo (b) + web search (c) Skill `/pattern-scout` dédié | **(a)** Recherche locale d'abord. Web search seulement si la décision touche un standard industrie clair (ex. cache invalidation, tenant isolation). `/pattern-scout` hors-scope. |
| Split du travail en parallèle ? | (a) Toujours séquentiel (b) Parallèle quand plan le permet (c) Cas-par-cas | **Séquentiel par défaut, parallèle uniquement si chantiers vraiment indépendants** (ex. doc + code de support). Le faux exemple "back + front" est rejeté : front a besoin des types du back. Les validations technical + visual restent en parallèle (post-implem, lectures seules). |
| Arbitrage retry ? | Options de fix | **3 options ouvertes au tech lead, dans cet ordre de coût croissant** : (a) fix local par l'implementer ; (b) replan partiel via `/technical-conception` sur la sous-section ; (c) escalation au human avec proposition de modification spec — jamais d'écriture dans `spec.md` sans accord humain. **Toujours re-lire le plan avant d'arbitrer.** |
| `MAX_RETRIES` ? | 2 / 3 / 5 | **3** retries sur le couple implem+validation. Configurable via variable d'env `TECH_LEAD_MAX_RETRIES` (override pour scénarios de test). |
| ADR-writer dans le même PR ? | Spec séparée vs même PR | **Même PR, même spec** (cette spec couvre `/tech-lead-orchestrator` *et* `/adr-writer`). Section *Changes* liste les deux. |
| `<app>` slug pour ce méta-livrable ? | `infra` / nouveau `meta` / `tooling` | **`meta`.** Nouveau slug, déclenche une mise à jour dans CLAUDE.md (*Conventions / Layout*), `commitlint.config.js` (`scope-enum`), et **pas** dans `.github/path-filters.yml` (pas un workspace deployable — ce n'est qu'un slug docs). |
| `/specification` doit-il continuer son auto-chain ? | Oui / Non / Conditionnel | **Conditionnel** : si invoqué dans une session pilotée par `/tech-lead-orchestrator` (détectable via une variable de contexte ou un fichier `runs/<run-id>/state.json`), le auto-chain est désactivé. Sinon, comportement actuel préservé pour qu'on puisse encore lancer `/specification` seul. |
| Sortie du sous-agent : format ? | Markdown libre / JSON / fichier de verdict | **Fichier de verdict typé sur disque** sous `runs/<run-id>/agents/<agent-name>-<step>.md` avec un front-matter YAML (`status:`, `next:`, `payload:`). Le tech lead parse le front-matter, ignore le corps sauf si statut `question` / `blocked`. |
| Comment le tech lead borne son propre contexte ? | Re-charger en boucle / Garder tout / Résumer | **Le tech lead n'absorbe jamais les corps de verdicts entiers** : il lit le front-matter et un résumé ≤ 200 mots produit par le sous-agent. Les corps restent sur disque et sont relus à la demande. Évite le context blow-up nommé en *risque tech-lead*. |

**Out of scope :**
- Sessions multi-utilisateurs / handoff entre humans (solo dev).
- Reprise par `/tech-lead-orchestrator --resume` après crash de session — *option intéressante*, gardée pour un second tour (l'état disque le permet déjà ; ce qui manque c'est le code de reprise).
- Web search proactive pour benchmark de patterns externes (couvert seulement par le trigger ADR (4) ciblé).
- `/pattern-scout`, un skill dédié à la détection "ça existe déjà ailleurs".
- Parallélisme implementer multi-worktrees.

## Changes

### Types / domain model

```ts
// Contrat retourné par un sous-agent (implementer / validator / adr-writer).
// Persisté en YAML front-matter dans runs/<run-id>/agents/<agent>-<step>.md.
type SubAgentVerdict = {
  status: "done" | "question" | "blocked" | "failed";
  summary: string;             // <= 200 words, lu par le tech lead
  next?:                       // hint pour le tech lead
    | { kind: "validate" }
    | { kind: "answer-needed"; question: string; options?: string[] }
    | { kind: "replan"; scope: string }
    | { kind: "escalate"; reason: string };
  artifacts: string[];         // chemins relatifs des fichiers produits
};

// État persisté par le tech lead.
type OrchestratorState = {
  runId: string;
  feature: { app: string; slug: string };
  stage: "spec" | "plan" | "adrs" | "implement" | "validate" | "arbitrate" | "ship" | "escalated";
  retries: { implement: number; validate: number };
  adrIndex: number[];          // numéros d'ADRs créés pour ce run
  startedAt: string; updatedAt: string;
};

// ADR — format minimal, aligné sur les standards (Context / Decision / Consequences).
type AdrFile = {
  number: number; slug: string; status: "proposed" | "accepted" | "superseded";
  context: string; decision: string; consequences: string;
  supersedes?: number[]; supersededBy?: number;
};
```

### Database changes

Aucune. Skill local, état sur disque uniquement.

### Files to change

```
.claude/skills/tech-lead-orchestrator/SKILL.md                            # NEW
.claude/skills/tech-lead-orchestrator/standard.md                         # NEW
.claude/skills/tech-lead-orchestrator/sub-agent-contract.md               # NEW — contrat YAML pour sous-agents
.claude/skills/tech-lead-orchestrator/src/state.utils.ts                  # NEW — load/save OrchestratorState
.claude/skills/tech-lead-orchestrator/src/state.utils.test.ts             # NEW — 100% coverage
.claude/skills/tech-lead-orchestrator/src/verdict-parser.utils.ts         # NEW — parse YAML front-matter
.claude/skills/tech-lead-orchestrator/src/verdict-parser.utils.test.ts    # NEW
.claude/skills/tech-lead-orchestrator/src/adr-trigger.utils.ts            # NEW — détecte si un choix mérite un ADR (4 triggers)
.claude/skills/tech-lead-orchestrator/src/adr-trigger.utils.test.ts       # NEW
.claude/skills/tech-lead-orchestrator/src/retry-budget.utils.ts           # NEW — borne MAX_RETRIES
.claude/skills/tech-lead-orchestrator/src/retry-budget.utils.test.ts      # NEW

.claude/skills/adr-writer/SKILL.md                                        # NEW
.claude/skills/adr-writer/standard.md                                     # NEW — format ADR (Context/Decision/Consequences)
.claude/skills/adr-writer/template.md                                     # NEW — squelette ADR
.claude/skills/adr-writer/src/adr-number.utils.ts                         # NEW — pick next NNNN
.claude/skills/adr-writer/src/adr-number.utils.test.ts                    # NEW
.claude/skills/adr-writer/src/adr-render.utils.ts                         # NEW — render template -> markdown
.claude/skills/adr-writer/src/adr-render.utils.test.ts                    # NEW

docs/adr/README.md                                                        # NEW — index des ADRs
docs/adr/0001-tech-lead-orchestrator-replaces-auto-chain.md               # NEW — premier ADR meta, dogfooding

.claude/skills/specification/SKILL.md                                     # UPDATE — auto-chain conditionnel (lit runs/<run-id>/state.json)
.claude/skills/technical-conception/SKILL.md                              # UPDATE — idem + émet verdict YAML en fin de run
.claude/skills/implementation/SKILL.md                                    # UPDATE — émet verdict YAML en fin de run (status/next/summary/artifacts)
.claude/skills/technical-validation/SKILL.md                              # UPDATE — verdict YAML, mappe PASS/FAIL/PASS_EXCEPT_UNVERIFIABLE → status
.claude/skills/visual-validation/SKILL.md                                 # UPDATE — verdict YAML idem

CLAUDE.md                                                                 # UPDATE — `meta` workspace slug autorisé pour docs/features
commitlint.config.js                                                      # UPDATE — ajouter `meta` au scope-enum

docs/knowledge/tech-lead-orchestrator.md                                  # NEW — debugging recipe + journal interne
```

Pas de changement `.github/path-filters.yml` : `meta` n'est pas un workspace deployable.

### Test strategy

> Méta-feature : le livrable est principalement des skills markdown + utilitaires TS. La validation s'appuie donc sur :

- **Unit tests sur les `*.utils.ts`** (cf. CLAUDE.md "Clean code") — 100% coverage gated par le test runner. Cible : `state.utils`, `verdict-parser.utils`, `adr-trigger.utils`, `retry-budget.utils`, `adr-number.utils`, `adr-render.utils`. Tout ce qui est pur et déterministe sort dans `*.utils.ts`.
- **Scenario test end-to-end (fixture-driven)** — un test runner spawn le skill `/tech-lead-orchestrator` sur une feature fixture pré-construite (`tests/fixtures/feature-toy/`) avec une spec minimale, une plan attendue, et assert : (a) `spec.md` / `plan.md` / au moins 1 ADR créés ; (b) sous-agents stubbed retournent `status: done` → tech lead atteint stage `ship` ; (c) sous-agent stubbed retourne `status: question` → tech lead arbitrer et relance ; (d) `MAX_RETRIES` dépassé → stage `escalated`. Ce test couvre la boucle, pas le LLM lui-même.
- **`/technical-validation`** — lit cette spec + plan.md + diff, vérifie correctness-vs-spec, 100% coverage sur les utils, et que les fichiers de SKILL.md respectent le standard (présence des sections obligatoires, liens vers skills composés).
- **`/visual-validation`** — **non applicable** pour un skill sans UI. Call out explicite : le verdict `visual-validation` produit un PASS_EXCEPT_UNVERIFIABLE motivé "no UI surface".
- **Dogfooding loop (post-merge, pas un gate de merge)** — la PR de ce skill merge dès que scenario tests + 100% utils + `/technical-validation` passent. Le *vrai* test produit se fait **sur la PR suivante** : Hugo lance `/tech-lead-orchestrator` sur une vraie petite feature, et `/after-task-dantotsus` capture systématiquement tout écart entre artefact produit et artefact attendu sous forme de Dantotsu, qui revient en PR `kaizen` patcher le skill. C'est la Self-improvement loop CLAUDE.md appliquée au skill lui-même, **pas un manual sweep dans le test strategy de *cette* PR**.
- **Coverage gate `infra/cdk/**`** : intacte, ce PR n'y touche pas.

## Production strategy

### Analytics

**Input metrics (instrumentés dans `journal.md` de chaque run) :**
- Événement `tech_lead_run_started` (feature slug, app, spec déjà présente ou non).
- Événement `tech_lead_stage_changed` (stage avant/après, retries courants).
- Événement `tech_lead_adr_written` (numéro ADR, trigger qui l'a déclenché parmi les 4).
- Événement `tech_lead_escalation` (raison, stage, retries consommés).
- Événement `tech_lead_human_message_received` (timestamp, stage actuel) — alimente `human_intervention_size`.
- Événement `tech_lead_run_completed` (stage final, durée totale, nombre d'ADRs, nombre de retries cumulés, `human_intervention_size`, `time_to_first_escalation`).
- Seuils :
  - **Convergence rate** = `count(stage_final=ship) / count(run_started)` sur fenêtre 30j ≥ 50 % au lancement, cible 80 % sous 90j.
  - **Traceability rate** = `count(architectural_choice_with_adr) / count(architectural_choice_total)` = 100 % (zéro tolérance, sinon trigger ADR (3) "divergence convention" est cassé).
  - **Rework rate** = `count(dantotsus_filed_on_via_tech_lead_PR) / count(via_tech_lead_PR)` sur 30j, cible 0.
  - **Human-intervention size** : tendance décroissante sur les 5 premiers runs (mesure de l'apprentissage du tech lead, pas un seuil absolu).
  - **Time-to-first-escalation** : si médiane < 10 % de la durée totale d'un run sur fenêtre 30j → revue de (a).

Pas d'événement remoté vers un SaaS — `journal.md` reste sur disque ; un script `pnpm tech-lead:metrics` calcule les agrégats à la demande.

**Output metric (lagging, out-of-band) :**
- **Temps humain par feature.** Revue mensuelle par Hugo : pour chaque PR fermée le mois écoulé, estimer le temps actif passé en supervision (relectures, arbitrages manuels, replans). Pas d'instrumentation automatique — la métrique est self-reportée, comparée entre cohortes "via tech-lead" vs "manuel". Si la cohorte tech-lead ne dépasse pas la cohorte manuelle après 3 itérations, la décision (a) (Remplace l'auto-chain) est remise en cause.

### Zero-defect strategy

- **`OrchestratorContextOverflowError`** — déclenchée si la session du tech lead lit > X tokens cumulés depuis le démarrage (proxy : nombre de fichiers de verdict lus en intégral, doit rester ≤ 0 ; seul le front-matter doit être lu). Surface : sortie stderr + escalation immédiate.
- **`OrchestratorRetryExhaustedError`** — atteinte du `MAX_RETRIES`. Surface : message d'escalation au human avec proposition de modification spec (jamais d'écriture spec.md sans accord).
- **`OrchestratorSpecMutationAttemptedError`** — un sous-agent (typiquement implementer) a écrit dans `spec.md`. Détection : checksum de `spec.md` au début / à chaque retour de sous-agent. Surface : escalation immédiate, revert du fichier, mention dans le journal.
- **`OrchestratorAdrConflictError`** — `/adr-writer` détecte qu'un ADR existant entre en conflit. Surface : escalation au human.
- **`OrchestratorHookFailure`** — pre-commit ou pre-push échoue. Surface : traité comme un verdict de validation FAIL, jamais `--no-verify` (rappel CLAUDE.md *Hooks*).
- Alerting : pas de Sentry pour un skill local. Les erreurs ci-dessus écrivent dans `runs/<run-id>/errors.log` et sortent en stderr. Le human est notifié *par l'arrêt visible du tech lead dans le terminal* — c'est l'alerte.
