# Plan — Déléguer une feature au tech-lead-orchestrator

> Early quality check. Pair with [`../spec/spec.md`](../spec/spec.md). When a defect lands and a Dantotsu traces back here, the chain is visible: the plan either named the risk and we missed mitigating it, didn't name the risk at all (planning gap), or named it correctly and the defect comes from elsewhere.

## How each spec decision becomes code

| Spec ref | Decision | Where it lands | Self-check |
|---|---|---|---|
| Q.O.D. *positionnement* (a) | Tech lead remplace l'auto-chain | `.claude/skills/tech-lead-orchestrator/SKILL.md` (NEW) section "Operating mode" décrit l'ordre `spec → plan → ADRs → impl → val → ship`. `.claude/skills/specification/SKILL.md` + `.../technical-conception/SKILL.md` *Auto-chain* section : auto-chain devient conditionnel sur `docs/features/<app>/<slug>/runs/<run-id>/state.json#piloted_by_tech_lead`. | `grep -n "Auto-chain" .claude/skills/{specification,technical-conception}/SKILL.md` montre la condition. Scenario test stub `state.json` et vérifie qu'aucun auto-chain ne se déclenche. |
| Q.O.D. *contrat sous-agent* (a) | YAML front-matter `status / next / summary / artifacts` | `.claude/skills/tech-lead-orchestrator/sub-agent-contract.md` (NEW) décrit le schéma. Implementation : `verdict-parser.utils.ts` (NEW) lit le front-matter, retourne `SubAgentVerdict`. Tous les `.claude/skills/{implementation,technical-validation,visual-validation}/SKILL.md` (UPDATE) ajoutent une section "Verdict émis" qui instruit la production du fichier en fin de run. | `pnpm -F @borso/skill-tech-lead-orchestrator test verdict-parser.utils.test.ts` au vert. `grep -l 'Verdict émis' .claude/skills/*/SKILL.md` retourne 4 entrées (impl, tech-val, vis-val, tech-conception). |
| Q.O.D. *triggers ADR* (4 OR-rules) | Détection ADR | `.claude/skills/tech-lead-orchestrator/src/adr-trigger.utils.ts` (NEW) : prédicat pur `needsAdr(candidate: ArchChoice): boolean` sur `{ hasMultipleSeriousAlternatives, hasCrossCuttingImpact, divergesFromConvention, looksStandardOrExistsElsewhere }`. La détection *fuzzy* (lecture LLM du plan) reste dans SKILL.md ; l'utilité teste seulement la composition des 4 flags. | 100% coverage sur `adr-trigger.utils.test.ts` (16 cas pour 4 booléens). |
| Q.O.D. *détection "déjà existe"* (a) | Recherche `docs/` + code repo | SKILL.md du tech lead, section "ADR trigger 4" : invoque `Grep` sur `docs/knowledge/`, `docs/adr/`, et les apps avant de demander un ADR. Pas de web search. | Scenario test inject une feature qui matche `docs/knowledge/cloudfront-cname-uniqueness.md` ; le tech lead doit produire un ADR référençant ce fichier. |
| Q.O.D. *split travail* | Séquentiel par défaut | SKILL.md "Operating mode" → un seul `implementation` agent à la fois. `technical-validator` + `visual-validator` lancés via deux `Agent` calls dans le **même message** (cf. règle parallèle agents). | `grep -A 5 "Validators in parallel" SKILL.md` montre l'instruction. Scenario test asserte que ≤ 1 `implementation` agent a écrit à un instant donné dans `runs/<run-id>/agents/`. |
| Q.O.D. *arbitrage retry* | Fix → replan → escalate, toujours relire le plan | SKILL.md "Arbitration" section. Utilitaire `retry-budget.utils.ts` (NEW) : `nextAction(retries, verdictKind, planChecksum): "fix" \| "replan" \| "escalate"`. Pas d'écriture spec.md sans accord humain. | `retry-budget.utils.test.ts` 100% coverage. Scenario test couvre les 3 sorties. |
| Q.O.D. `MAX_RETRIES = 3` | Borne | `retry-budget.utils.ts` lit `process.env.TECH_LEAD_MAX_RETRIES ?? "3"`. | Test paramétré 1/2/3/4/5. |
| Q.O.D. *même PR* | `/adr-writer` ship avec le tech lead | `.claude/skills/adr-writer/{SKILL,standard,template}.md` + `src/{adr-number,adr-render}.utils.ts` (tous NEW) dans le même PR. | `git diff --name-only main` après impl montre les deux skills. |
| Q.O.D. `<app> = meta` | Nouveau slug docs | `docs/features/meta/` (NEW), `CLAUDE.md` (UPDATE *Layout* + *Conventions*) ajoute `meta` aux slugs valides pour `<app>` docs, `commitlint.config.js` (UPDATE) ajoute `meta` à `scope-enum`. **Pas** d'entrée dans `.github/path-filters.yml` (`meta` n'est pas un workspace deployable). | `git commit -m "docs(meta): ..."` passe le hook commit-msg. `node -e "import('./commitlint.config.js').then(m=>console.log(m.default.rules['scope-enum']))"` liste `meta`. |
| Q.O.D. *auto-chain conditionnel* | via `runs/<run-id>/state.json` | Spec liste `.claude/skills/<skill>/runs/...` ; **le plan corrige le chemin à `docs/features/<app>/<slug>/runs/<run-id>/`** (décision plan, cf. question 2 ci-dessous). `state.json` schéma : `{ pilotedByTechLead: boolean, runId, currentStage }`. `state.utils.ts` (NEW) charge / sauve / valide. | `state.utils.test.ts` 100% coverage. Scenario test : `pilotedByTechLead=true` désactive auto-chain de `/specification`. |
| Q.O.D. *format verdict YAML* | Fichier sur disque + front-matter | `docs/features/<app>/<slug>/runs/<run-id>/agents/<agent>-<step>.md`. Tous commités. | Scenario test : après run stub, les fichiers existent et `git status` montre untracked → seront commités par le tech lead lui-même. |
| Q.O.D. *limite contexte tech lead* | Lire front-matter + résumé ≤ 200 mots | SKILL.md "Context discipline" : `Read` partiel avec `limit:` pour ne récupérer que le front-matter et la section "Summary". Jamais le corps complet. | Scenario test : monitorer le nombre de lignes lues par run via instrumentation; ≤ N (à fixer). Open question Q-CONTEXT. |
| Spec *Changes / Types* | `SubAgentVerdict`, `OrchestratorState`, `AdrFile` | `.claude/skills/tech-lead-orchestrator/src/types.ts` (NEW). Re-export depuis `index.ts`. | `pnpm -F @borso/skill-tech-lead-orchestrator typecheck` clean. |
| Spec *Changes / Files* | Liste fichiers | Voir section 1 plus haut — chemins corrigés (`runs/` ↦ feature folder ; `src/` ↦ workspace skill). | `git diff --stat main` après impl correspond à la liste corrigée. |
| Spec *Test strategy* / scenario test | Fixture-driven E2E | `.claude/skills/tech-lead-orchestrator/tests/fixtures/feature-toy/` (NEW) + `tests/scenario.test.ts` (NEW). Stub des sous-agents via fichiers de verdict pré-écrits. | `pnpm -F @borso/skill-tech-lead-orchestrator test scenario.test.ts` 4 sous-tests verts (happy, question, replan, retry-exhausted). |
| Spec *Analytics / events* | `tech_lead_*` events | `.claude/skills/tech-lead-orchestrator/src/journal.utils.ts` (NEW) : `appendEvent(event)` écrit en JSONL dans `journal.md.jsonl`. Section markdown `journal.md` est régénérée comme rendu humain. `pnpm tech-lead:metrics` (NEW root script) agrège. | `journal.utils.test.ts` 100% coverage. `pnpm tech-lead:metrics` sur une fixture retourne les compteurs attendus. |
| Spec *Analytics / human_intervention_size* | `count(human_corrections_per_run)` | Instrumentation best-effort par l'orchestrateur : SKILL.md instruit "à chaque ré-engagement humain, appelle `journal.utils.ts appendEvent('human_message_received', { kind })`" avec `kind: 'guidance' \| 'correction' \| 'answer'`. La métrique d'intérêt = `count(correction)` (signal "j'ai dû corriger l'IA sur un truc qu'elle devrait savoir → Dantotsu candidate"). `guidance` et `answer` ne pèsent pas dans la métrique. | Scenario test injecte 3 prompts dont 1 `correction` ; le journal contient le bon compte. Pas de hook config — décision Q-HUMAN-MSG. |
| Spec *Analytics / time_to_first_escalation* | Mesure inter-événement | `journal.utils.ts` calcule au moment du `tech_lead_run_completed` à partir des timestamps `run_started` et premier `escalation`. | Test unitaire sur `journal.utils.ts`. |
| Spec *Zero-defect / OrchestratorContextOverflowError* | **Décision Q-CONTEXT : pas de seuil hard, instrumenter seulement.** `state.utils.ts` : compteur `bytesRead`, événement `tech_lead_context_growth` émis à chaque doublement (échelle log : 1 KiB, 2 KiB, 4 KiB, …). Pas d'erreur levée. La classe `OrchestratorContextOverflowError` du spec est donc absente de l'impl ; cf. section Decisions. | Unit test : compteur incrémente correctement ; événements émis aux bons paliers. |
| Spec *Zero-defect / OrchestratorSpecMutationAttemptedError* | Checksum spec.md | `state.utils.ts` : `recordSpecChecksum(specPath)` + `assertSpecUnchanged(specPath)`. Appelé entre chaque étape. | Unit test : muter le fichier entre 2 appels → throw. |
| Spec *Zero-defect / OrchestratorAdrConflictError* | Conflit ADR | `.claude/skills/adr-writer/src/adr-number.utils.ts` : `findConflictingAdrs(newDecision, existingAdrs)` retourne `Adr[]`. SKILL.md de l'adr-writer instruit l'escalation. | Unit test : 2 ADRs avec décisions opposées sur le même contexte → conflict détecté. |
| Spec *Zero-defect / OrchestratorHookFailure* | Pre-commit / pre-push fail | SKILL.md "On hook failure" : lire stderr → traiter comme verdict FAIL → boucle d'arbitrage normale. Jamais `--no-verify`. | Scenario test : injecter un hook qui fail → tech lead retry sans bypass. |
| Spec *Production / dogfooding* | Post-merge kaizen | Pas de gate dans cette PR. Suivi : entrée dans `docs/knowledge/tech-lead-orchestrator.md` (NEW) mentionne "dogfooding runs to come". | `grep -l "dogfooding" docs/knowledge/tech-lead-orchestrator.md` non vide. |
| Spec *Out of scope* | Hors PR | `--resume`, `/pattern-scout`, parallélisme implementer multi-worktrees, web search proactive : pas de fichier créé. | (out of scope) |

**Pattern Coherence pass (step 3.5).** Trois nouveaux patterns introduits, audit explicite :

1. **`.claude/skills/<skill>/` comme workspace pnpm** (nouveau). Audit : aucun autre skill n'a aujourd'hui de package.json — pas de pattern parallèle à unifier. La règle reste "un skill qui a du code testable devient un workspace". Cohérent avec `apps/*` + `infra/*`.
2. **Run state committé sous `docs/features/<app>/<slug>/runs/`** (nouveau). Audit : `docs/features/<app>/<slug>/{spec,plan,validation}/` est le pattern existant. `runs/` est une 4ᵉ sous-dossier, même logique : tout l'historique de la feature au même endroit. Pas de pattern parallèle (rien d'autre n'est sous `.tech-lead/`). Cohérent.
3. **YAML front-matter pour verdicts** (nouveau). Audit : aucun fichier `.md` du repo n'utilise actuellement de front-matter YAML. Justifié parce que les verdicts ont besoin d'un payload structuré (`status`, `next`, etc.). Alternative écartée : JSON séparé — moins lisible pour le humain qui scanne `runs/`.

## Risk register

| Risk | Severity | Mitigation in plan | Detection if it slips |
|---|---|---|---|
| Tech lead boucle indéfiniment (LLM hallucinate un autre retry à chaque fois) | **high** | `retry-budget.utils.ts` est l'unique source de vérité ; SKILL.md instruit "appeler `nextAction()` avant chaque retry, respecter la sortie". `MAX_RETRIES=3` hard cap. | Scenario test "retry-exhausted" vert ; en prod, événement `tech_lead_escalation` doit apparaître avant le 4ᵉ retry. Si journal montre 4+ `tech_lead_stage_changed=implement`, alerte (manuelle, lecture journal). |
| Sous-agent modifie `spec.md` en cachette | **high** | Checksum + assert avant/après chaque sous-agent (cf. `OrchestratorSpecMutationAttemptedError`). | Unit test du checksum. En prod, `errors.log` non vide → tech lead escalade visiblement. |
| Tech lead absorbe les corps complets des verdicts → context blow-up → mauvaises décisions silencieuses | **high** | `Read` avec `limit:` et `offset:` pour ne récupérer que front-matter + summary. Compteur `bytesRead` instrumenté ; **pas de seuil hard** (décision Q-CONTEXT). | Événements `tech_lead_context_growth` dans le journal montrent la trajectoire. Si un run pathologique apparaît, il est visible dans `pnpm tech-lead:metrics` et déclenche un Dantotsu post-merge. |
| ADR spam : 1 ADR par micro-choix, `docs/adr/` devient illisible | **medium** | `adr-trigger.utils.ts` exige *au moins 1 des 4 triggers vrai* (pas tous, mais au moins un avec sémantique stricte). SKILL.md instruit "préférer un ADR qui regroupe plusieurs choix d'un même chantier plutôt qu'un par choix". | Revue manuelle de `docs/adr/` après les 3 premiers runs. Si > 10 ADRs / feature → ajuster les triggers. |
| `meta` slug brise l'idée "un slug = un workspace deployable" | **low** | CLAUDE.md *Layout* clarifie : `<app>` de docs ≠ workspace pnpm. `path-filters.yml` non touché. | `git push` vers un PR `meta` ne déclenche aucun preview deploy — vérifié à la première PR `meta`. |
| `.claude/skills/*` workspace casse knip / biome / commitlint | **medium** | Ajout glob `.claude/skills/*` à `pnpm-workspace.yaml`. Vérifié : pnpm n'inclut que les folders avec `package.json`, donc skills purement markdown restent inertes. Biome root config "reach every workspace" → s'applique au nouveau workspace, OK. Knip : nouveau `knip.json` ou config dans `package.json` du workspace pour ignorer les fixtures de test. | `pnpm exec knip` clean (gate pre-push). `pnpm exec biome lint` clean (gate). |
| Hook `UserPromptSubmit` pour `human_intervention_size` mal scopé → s'exécute pour toutes les sessions, pas que celles du tech lead | **medium** | Le hook lit `state.json` du run actif (variable d'env `TECH_LEAD_RUN_ID` posée par le SKILL.md au démarrage). Si pas de var → no-op. | Scenario test sans `TECH_LEAD_RUN_ID` exporte → hook ne touche aucun fichier. |
| Verdict YAML mal formé par un sous-agent (LLM glisse un caractère) | **medium** | `verdict-parser.utils.ts` valide le schéma via Zod. Si parse échoue → traite comme `status: blocked` avec `reason: unparseable`. | Unit test sur 6 verdicts cassés. Scenario test : injecter un verdict cassé → tech lead escalade. |
| `pnpm tech-lead:metrics` non maintenu, métriques pourrissent | **low** | Test E2E sur fixture journal → assert le rendu. Commande listée dans `docs/knowledge/tech-lead-orchestrator.md`. | Test E2E rouge si format change. |
| `/visual-validation` retourne PASS_EXCEPT_UNVERIFIABLE "no UI" mais le standard de visual-validation ne supporte pas ce verdict pour les skills | **low** | Lire `.claude/skills/visual-validation/standard.md` lors de l'impl ; si le verdict n'est pas autorisé, ajouter un cas "no UI surface → skip" au lieu de PASS_EXCEPT_UNVERIFIABLE. | Lecture manuelle au moment de l'impl, ouvert comme Q-VIS-VAL. |
| Tech lead écrit dans `runs/` après le `git commit` final → fichiers untracked dans le PR | **low** | SKILL.md "Ship stage" : `git add docs/features/<app>/<slug>/runs/` **avant** le commit final. | `git status` clean après le push (vérifié par scenario test). |
| Pattern Coherence : `.claude/skills/` workspace ouvre la porte à 7 autres skills qui voudraient leurs utils ; sans frein, prolifération de package.json | **low** | Documenter dans CLAUDE.md *Layout* : "un skill devient workspace **seulement** s'il a du code testable nommé `*.utils.ts`". | Audit annuel (kaizen) : si `find .claude/skills -name package.json | wc -l > 5`, ré-évaluer. |

## Code-quality self-check

- [ ] `pnpm exec biome lint` clean (incl. type-assertion plugin: only `as const`, `as unknown`).
- [ ] `pnpm typecheck` clean (`tsc --noEmit` dans chaque workspace touché : `@borso/skill-tech-lead-orchestrator`, `@borso/skill-adr-writer`).
- [ ] No `any`.
- [ ] No abbreviations / one-letter locals outside trivial loop indices.
- [ ] Magic numbers (`MAX_RETRIES`, `CONTEXT_BUDGET_BYTES`, `SUMMARY_WORD_CAP`) extraits en constantes nommées au top du fichier où ils sont utilisés.
- [ ] Comments document the WHY only — pas de what-comments, pas de JSDoc sur internals.
- [ ] Function names describe the result, not the mechanism (`nextAction`, `assertSpecUnchanged`, `findConflictingAdrs`, `digestVerdict`).
- [ ] Conventional-commit scope = `meta` (à ajouter au `scope-enum`).
- [ ] `pnpm exec knip` clean — pas d'exports / fixtures inutilisés. Fixtures de test déclarées dans `knip.json` du workspace.
- [ ] Chaque pure helper introduit vit dans `<name>.utils.ts` avec sibling `<name>.utils.test.ts` couvert à 100 % (statements / branches / functions / lines). Concerne : `state`, `verdict-parser`, `adr-trigger`, `retry-budget`, `journal`, `adr-number`, `adr-render`.
- [ ] Pas de `useEffect` (feature non-React, sans objet).
- [ ] Sub-agent verdict JSON-schema'd via Zod, pas via `as Foo` (interdit par le plugin).

## Pre-flight gates

1. `pnpm install`.
2. `pnpm --filter @borso/skill-tech-lead-orchestrator typecheck && pnpm --filter @borso/skill-adr-writer typecheck`.
3. `pnpm exec biome lint`.
4. `pnpm --filter @borso/skill-tech-lead-orchestrator test:coverage && pnpm --filter @borso/skill-adr-writer test:coverage` — gate 100% sur chaque `*.utils.ts`.
5. `pnpm --filter @borso/skill-tech-lead-orchestrator test scenario.test.ts` — scenario E2E fixture-driven.
6. (skip silencieux) `/visual-validation` — pas de surface UI. SKILL.md du tech lead intègre la règle "si la feature n'a pas de surface visuelle, log `tech_lead_visual_validation_skipped` dans le journal et passe". Pas de fichier verdict, pas d'extension du standard de `/visual-validation`. Décision Q-VIS-VAL.
7. `pnpm exec knip`.
8. `/technical-validation docs/features/meta/tech-lead-orchestrator/spec/spec.md` — code review vs spec.
9. `human:` Hugo lit le diff de `CLAUDE.md` et `commitlint.config.js` (changements de convention repo) avant approbation finale du PR.

## Decisions (Q-* résolus avec Hugo)

| Question | Décision | Implication |
|---|---|---|
| **Q-HUMAN-MSG** | Instrumentation best-effort, classification par l'orchestrateur en `guidance / correction / answer`. La métrique cible est `count(correction)` — signal "j'ai dû corriger l'IA sur un truc qu'elle devrait savoir → Dantotsu candidate". Conversations productives (`guidance`, `answer`) ne pèsent pas. Pas de hook `UserPromptSubmit`. | `journal.utils.ts` accepte un payload `{ kind: 'guidance' \| 'correction' \| 'answer' }`. SKILL.md du tech lead instruit l'orchestrateur à classer chaque ré-engagement. `pnpm tech-lead:metrics` agrège par `kind`. |
| **Q-CONTEXT** | Pas de seuil hard, instrumenter seulement. | `OrchestratorContextOverflowError` retirée du `types.ts` et du SKILL.md. `state.utils.ts` émet `tech_lead_context_growth` aux paliers log (1/2/4/8/…  KiB). Risk register row "blow-up" garde le signal mais pas la garde-fou. |
| **Q-VIS-VAL** | Skip silencieux. | Pas d'extension du standard de `/visual-validation`. SKILL.md du tech lead : "si la feature n'a pas de surface visuelle, émets `tech_lead_visual_validation_skipped`, passe à `/technical-validation`". Gate 6 du pre-flight devient un no-op explicite. |
| **Q-RUN-COMMIT** | Garder tout. | SKILL.md "Ship stage" : `git add -A docs/features/<app>/<slug>/runs/` y compris les runs avortés. Pas de nettoyage. Documenter dans `docs/knowledge/tech-lead-orchestrator.md` que la diff PR contient l'historique complet. |

## Open questions / unknowns

(aucune au moment d'enchaîner `/implementation` — les 4 Q-* ci-dessus sont résolues)

## Missing technical skills

- **`/skill-author`** — un skill qui guide la création d'un nouveau skill (squelette SKILL.md + standard.md + template.md, glob d'invocation). Le présent travail aurait gagné à l'avoir. Seed prochain itération.
- **`/node-cli-tooling`** — un skill qui guide la création d'un workspace pnpm avec vitest + biome + tsconfig pour du code Node interne (vs library). Pertinent pour les workspaces sous `.claude/skills/*`. Seed prochain itération.
- **`/hook-author`** — un skill qui guide la création / config d'un hook Claude Code (`UserPromptSubmit`, `SessionStart`, etc.). Pertinent pour Q-HUMAN-MSG. Seed prochain itération.
