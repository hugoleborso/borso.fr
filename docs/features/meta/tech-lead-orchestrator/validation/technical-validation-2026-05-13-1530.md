# Technical validation — Déléguer une feature au tech-lead-orchestrator

- Spec: [`../spec/spec.md`](../spec/spec.md)
- Plan: [`../plan/plan.md`](../plan/plan.md)
- Branch: `claude/tech-lead-orchestrator-skill-dVKSm`
- Base: `origin/main`
- Run at: 2026-05-13T15:30:00Z
- Touched workspaces (meta feature scope): `@borso/skill-tech-lead-orchestrator`, `@borso/skill-adr-writer`, repo root (CLAUDE.md, commitlint, pnpm-workspace, knip, package.json)

> The diff range `origin/main...HEAD` also contains earlier commits that landed unrelated work (borsouvertures app, dantotsus, knowledge entries, visual-validator agent edits). This report scopes correctness/cleanliness/tests/coverage to the **meta feature** files listed in the spec's *Files to change* section (the 8 commits prefixed `(meta)`), per validator brief.

## A. Correctness vs spec

| # | Spec ref | Claim | Code (file:line) | Evidence (quoted) | Verdict |
|---|---|---|---|---|---|
| A01 | Q.O.D. *positionnement* (a) — Tech lead replaces auto-chain | New skill seeded; existing skills made conditional | `.claude/skills/tech-lead-orchestrator/SKILL.md:23-26`; `.claude/skills/specification/SKILL.md:161` | `replaces the previous linear auto-chain (...) with a single orchestrator that pilots every step`; `Conditional suppression when piloted by /tech-lead-orchestrator (...) check whether docs/features/<app>/<slug>/runs/<run-id>/state.json exists` | PASS |
| A02 | Q.O.D. *contrat sous-agent* (a) — YAML front-matter status/next/summary/artifacts | sub-agent-contract.md + verdict-parser.utils.ts | `.claude/skills/tech-lead-orchestrator/sub-agent-contract.md:12-23`; `src/verdict-parser.utils.ts:61-88` | `status: done \| question \| blocked \| failed / summary / artifacts / next` schema documented; `parseVerdictFromMarkdown` enforces it. | PASS |
| A03 | Q.O.D. *triggers ADR* (4 OR-rules) | `needsAdr` / `triggersFor` purely compose the 4 booleans | `src/adr-trigger.utils.ts:14-25` | `if (candidate.hasMultipleSeriousAlternatives) triggers.push('multiple-alternatives'); ...` four flags in declaration order | PASS |
| A04 | Q.O.D. *détection "déjà existe"* (a) — local search only | SKILL ADR-writer + standard reference local search; web search out-of-scope | `.claude/skills/adr-writer/SKILL.md:33-43` | `Looks-standard-or-exists-elsewhere — the decision is something the industry has settled on or another repo already solved. (...) we reuse pattern X (...) or reinvent because Z` (web search not required) | PASS |
| A05 | Q.O.D. *split travail* — séquentiel par défaut, validators in parallel | SKILL.md operating-mode | `.claude/skills/tech-lead-orchestrator/SKILL.md:84-91` | `One implementer at a time — never parallel.` and `Spawn /technical-validation and /visual-validation in parallel via two Agent tool calls in the same message.` | PASS |
| A06 | Q.O.D. *arbitrage retry* — fix → replan → escalate, ordered by cost | `nextAction` (pure) | `src/retry-budget.utils.ts:13-23` | `if (retries >= maxRetries) return 'escalate'; if (verdictKind === 'fail-spec') return 'escalate'; ... if (verdictKind === 'fail-plan') return 'replan'; return 'fix';` | PASS |
| A07 | Q.O.D. `MAX_RETRIES = 3`, env override `TECH_LEAD_MAX_RETRIES` | `getMaxRetries` default 3 + env override | `src/retry-budget.utils.ts:4-11` | `const DEFAULT_MAX_RETRIES = 3; ... const parsed = Number.parseInt(envValue, 10); if (Number.isNaN(parsed) ‖ parsed < 0) return DEFAULT_MAX_RETRIES; return parsed;` | PASS |
| A08 | Q.O.D. *même PR* — `/adr-writer` ships with the tech lead | Both skill workspaces present | `.claude/skills/adr-writer/SKILL.md` + `.claude/skills/tech-lead-orchestrator/SKILL.md` both `A` in `git diff --name-status` | (two new workspaces side-by-side) | PASS |
| A09 | Q.O.D. `<app> = meta` — slug + scope-enum + no path-filters entry | CLAUDE.md, commitlint, pnpm-workspace updated; path-filters untouched for `meta` | `commitlint.config.js:4-7`; `CLAUDE.md:22` | `['borso-fr', 'borsouvertures', 'infra', 'ci', 'docs', 'deps', 'meta']` and `Valid docs slugs: every apps/<slug> plus meta` | PASS |
| A10 | Q.O.D. *auto-chain conditionnel* — every existing SKILL.md must read state.json | 5 SKILL.md files updated | `.claude/skills/{specification,technical-conception,implementation,technical-validation,visual-validation}/SKILL.md` all reference `docs/features/<app>/<slug>/runs/<run-id>/state.json` with `pilotedByTechLead` | (5/5 matches via grep) | PASS |
| A11 | Q.O.D. *format verdict YAML* — disk file w/ front-matter | sub-agent-contract.md + parser | `.claude/skills/tech-lead-orchestrator/sub-agent-contract.md:48-49` | `runs/<run-id>/agents/<agent>-<step>.md` | PASS |
| A12 | Q.O.D. *limite contexte* — front-matter only, log-scale instrumentation | `recordContextBytes` log-scale milestones; SKILL.md "Context discipline" | `src/state.utils.ts:77-109`; `SKILL.md:124-135` | `const CONTEXT_GROWTH_LOG_BASE = 2; const FIRST_MILESTONE_BYTES = 1024; ... return FIRST_MILESTONE_BYTES * CONTEXT_GROWTH_LOG_BASE ** (newIndex - 1);` | PASS |
| A13 | Plan path correction — runs/ under `docs/features/<app>/<slug>/`, not under `.claude/skills/...` | All references corrected | SKILL.md:14, 52, 86, 175; standard.md:108-118; sub-agent-contract.md:5; knowledge/tech-lead-orchestrator.md:14-18 | All use `docs/features/<app>/<slug>/runs/<run-id>/...` | PASS |
| A14 | Plan retirements — `OrchestratorContextOverflowError` + `OrchestratorAdrConflictError` retired | Only `OrchestratorSpecMutationAttemptedError` remains; conflict collapsed to `findConflictingAdrs` list | `src/types.ts:39` (sole class); `adr-writer/src/adr-number.utils.ts:22-37` | `class OrchestratorSpecMutationAttemptedError extends Error`; `findConflictingAdrs(newAdr, existing): Adr[]` returns list (no throw) | PASS |
| A15 | Spec *Changes / Types* — `SubAgentVerdict`, `OrchestratorState`, `AdrFile` | All types present | `tech-lead-orchestrator/src/types.ts:1-50`; `adr-writer/src/types.ts:1-12` | `SubAgentVerdict`, `OrchestratorState`, `OrchestratorStage`, `VerdictNext`, `Adr` | PASS |
| A16 | Spec *Changes / Files* — list of files to change | All listed paths present and only listed paths added (modulo path correction `runs/` ↦ `docs/features/`) | `git diff --name-status` shows the 9 NEW tech-lead-orchestrator files + 7 NEW adr-writer files + 4 doc files + 5 modified SKILL.md + 4 modified config files | (matches plan's corrected list) | PASS |
| A17 | Spec *Test strategy / scenario test* — covers happy, question, replan, retry-exhausted | `tests/scenario.test.ts` | `tests/scenario.test.ts:77-138, 140-150` | 4 `describe` blocks: happy / replan / retry-exhausted / question (plus spec-flaw + ADR + journal bonus) | PASS |
| A18 | Spec *Analytics / events* — `tech_lead_*` events emitted; `pnpm tech-lead:metrics` script | `journal.utils.ts` event kinds + `bin/metrics.ts` + root script | `src/journal.utils.ts:5-37`; `bin/metrics.ts:1-23`; `package.json:13` | All 8 `kind:` values match spec list (`run_started/stage_changed/adr_written/escalation/human_message_received/context_growth/visual_validation_skipped/run_completed`); root script `tech-lead:metrics` present | PASS |
| A19 | Spec *Zero-defect / OrchestratorSpecMutationAttemptedError* | Implemented + tested | `src/state.utils.ts:14-19`; `state.utils.test.ts:38-43` | `if (currentChecksum !== previousChecksum) { throw new OrchestratorSpecMutationAttemptedError(...) }`; tested. | PASS |
| A20 | ADR-0001 exists, follows the standard, referenced in `docs/adr/README.md` | New ADR + index | `docs/adr/0001-tech-lead-orchestrator-replaces-auto-chain.md:1-7`; `docs/adr/README.md:8-10` | `# ADR 0001 — /tech-lead-orchestrator replaces ... / **Status:** accepted / **Date:** 2026-05-13`; index links to it | PASS |

## B. Code cleanliness

| # | Rule | Check | Evidence | Verdict |
|---|---|---|---|---|
| B01 | No abbreviations / single-letter locals | grep on changed src files | No 1-letter locals outside loop indices. Identifiers: `parsed`, `triggers`, `previousIndex`, `crossedMilestone`, `headerLines`, `existingAdr`, `declaredSupersedes`, `previousBytes` etc. | PASS |
| B02 | Magic numbers extracted | Constants at top of file | `state.utils.ts:8 SHA_ALGORITHM`, `state.utils.ts:74-75 CONTEXT_GROWTH_LOG_BASE/FIRST_MILESTONE_BYTES`, `retry-budget.utils.ts:4 DEFAULT_MAX_RETRIES`, `adr-number.utils.ts:3-4 ADR_FILENAME_PATTERN/FIRST_ADR_NUMBER`, `adr-render.utils.ts:3 NUMBER_PAD_WIDTH`, `metrics.ts:5 EXIT_USAGE`, `verdict-parser.utils.ts:4 FRONT_MATTER_PATTERN` | PASS |
| B03 | No what-comments / JSDoc on internals | Read every utils file | Code is essentially uncommented except for `// `meta` covers …` doc-style notes in CLAUDE.md. No JSDoc on internals. | PASS |
| B04 | Function names describe result | `needsAdr`, `triggersFor`, `nextAction`, `getMaxRetries`, `assertSpecUnchanged`, `recordSpecChecksum`, `parseVerdictFromMarkdown`, `findConflictingAdrs`, `renderAdrMarkdown`, `nextAdrNumber`, `aggregateRun` | All result-oriented, matching plan's cited names verbatim. | PASS |
| B05 | Type assertions limited to `as const` / `as unknown` (Biome plugin) | grep `as ` on src | No `as Foo` casts in any new file. `is X` type guards used (`isStringArray`, `isVerdictStatus`, `isObjectRecord`, `isJournalEvent`). | PASS |
| B06 | No `any` | `grep -nP '\bany\b'` on src/tests/bin | Single match is a free-text `it()` description (`returns true as soon as any single flag is true`), not a type. | PASS |
| B07 | `noUncheckedIndexedAccess` honoured | `tsconfig.json` enabled; access patterns checked | `tsconfig.json:7` `"noUncheckedIndexedAccess": true`; `adr-number.utils.ts:8` `match?.[1]`; `verdict-parser.utils.ts:7` `match?.[1] ?? null` | PASS |
| B08 | `pnpm exec biome lint` clean | Ran `pnpm exec biome lint` | exit=0; "Checked 150 files in 1088ms. No fixes applied. Found 2 infos." (infos, not errors; pre-existing CloudFront Function template hint) | PASS |
| B09 | `pnpm exec knip` clean | Ran `pnpm exec knip` | exit=0; no output. New workspaces declared in `knip.json` with correct entry/project globs. | PASS |
| B10 | `useEffect` smell | grep across new code | None (no React in either workspace). | PASS (n/a) |

## C. Tests pass

| # | Workspace | Command | Exit | Verdict |
|---|---|---|---|---|
| C01 | `@borso/skill-tech-lead-orchestrator` | `pnpm --filter @borso/skill-tech-lead-orchestrator run test:coverage` | 0 — 73 tests pass across 6 files; **100 % statements/branches/functions/lines** on `adr-trigger.utils.ts`, `journal.utils.ts`, `retry-budget.utils.ts`, `state.utils.ts`, `verdict-parser.utils.ts` | PASS |
| C02 | `@borso/skill-adr-writer` | `pnpm --filter @borso/skill-adr-writer run test:coverage` | 0 — 20 tests pass across 2 files; **100 % statements/branches/functions/lines** on `adr-number.utils.ts`, `adr-render.utils.ts` | PASS |
| C03 | Typecheck `@borso/skill-tech-lead-orchestrator` | `pnpm --filter @borso/skill-tech-lead-orchestrator run typecheck` | 0 | PASS |
| C04 | Typecheck `@borso/skill-adr-writer` | `pnpm --filter @borso/skill-adr-writer run typecheck` | 0 | PASS |
| C05 | `*.utils.ts` ↔ `*.utils.test.ts` siblings | `find .claude/skills -name '*.utils.ts'` | 7/7 utilities have a sibling test (`adr-trigger`, `journal`, `retry-budget`, `state`, `verdict-parser`, `adr-number`, `adr-render`). | PASS |

## D. Test coverage of spec

The spec routes `/visual-validation` to a silent skip (decision Q-VIS-VAL — "no UI surface"). 0 use cases routed to `/visual-validation`; out of scope for this report. All behavioural assertions are deterministic / non-DOM and therefore in scope here.

| # | Use case | Covering test | Verdict |
|---|---|---|---|
| D01 | Happy path: spec → plan → adrs → implement → validate → arbitrate → ship without retries | `tests/scenario.test.ts:78` `it('walks spec → plan → adrs → implement → validate → arbitrate → ship without retries', …)` | PASS |
| D02 | Edge: validator returns `fail-local`, retry within budget, then PASS | `tests/scenario.test.ts:96` `it('increments implement retries once and ships', …)` | PASS |
| D03 | Edge: validator returns `replan`, plan re-entered then PASS | `tests/scenario.test.ts:106` `it('routes through plan stage a second time', …)` | PASS |
| D04 | Error: `MAX_RETRIES` exhausted → `escalated` | `tests/scenario.test.ts:120` `it('lands on `escalated` after MAX_RETRIES local failures', …)` | PASS |
| D05 | Error: spec-flaw verdict escalates immediately, no retry consumed | `tests/scenario.test.ts:130` `it('escalates on the first failed verdict that asks for escalation', …)` | PASS |
| D06 | Edge: sub-agent returns `status: question` — orchestrator does not consume a retry | `tests/scenario.test.ts:141` `it('keeps retries.implement at 0 across a question + done sequence', …)` | PASS |
| D07 | `needsAdr` composes the 4 OR-flags (true when any single flag set, false when all false, true when all true) | `src/adr-trigger.utils.test.ts:11-32` and 49-65 (`triggersFor` ordering / empty / full) | PASS |
| D08 | `nextAction` policy (fix / replan / escalate ordering; cap; spec-flaw / crash short-circuit) | `src/retry-budget.utils.test.ts:27-53` | PASS |
| D09 | `getMaxRetries` default-3 + env override + invalid fallback | `src/retry-budget.utils.test.ts:4-25` | PASS |
| D10 | YAML front-matter parser — all four `next.kind` shapes accepted; all malformed shapes mapped to `blocked` + `escalate: unparseable-verdict: <why>` | `src/verdict-parser.utils.test.ts:20-175` (21 cases — every `blockedVerdict()` branch covered) | PASS |
| D11 | Spec immutability — `recordSpecChecksum` + `assertSpecUnchanged` throws on mutation | `src/state.utils.test.ts:32-43`, 85-90 | PASS |
| D12 | Context discipline — `recordContextBytes` log-scale milestone detection (no hard cap) | `src/state.utils.test.ts:99-133` (5 cases inc. multi-palier skip + below-1KiB no-emit) | PASS |
| D13 | ADR number picking — `nextAdrNumber` returns 1 on empty dir, ignores non-matching siblings, increments past the highest valid | `src/adr-number.utils.test.ts:36-52` | PASS |
| D14 | ADR conflict detection — same slug + accepted + not in supersedes → conflict; superseded → no conflict; multi-conflict list | `src/adr-number.utils.test.ts:54-95` (5 cases) | PASS |
| D15 | ADR rendering — header / Supersedes / Superseded-by lines emit only when applicable | `src/adr-render.utils.test.ts:19-72` | PASS |
| D16 | Journal events — serialize / parse round-trip, malformed JSON / scalar / array / missing kind all return null | `src/journal.utils.test.ts:9-41` | PASS |
| D17 | Journal aggregation — ADR count, human-message classification, duration, time-to-first-escalation, visual_validation_skipped flag, diagnostic events ignored | `src/journal.utils.test.ts:43-124` (5 cases) | PASS |
| D18 | ADR trigger detection on a typical cross-cutting choice (scenario integration) | `tests/scenario.test.ts:153-171` | PASS |
| D19 | Journal aggregation in the scenario context — ADRs + corrections + completion produce expected metrics | `tests/scenario.test.ts:175-189` | PASS |

## Notes

- The diff range `origin/main...HEAD` carries an earlier feature (`borsouvertures` PWA port) and assorted knowledge / dantotsu / agent updates that are **not** part of the meta feature's spec. Per the validator brief, scope of correctness/cleanliness/tests/coverage rows above is the meta feature only.
- ADR-0001's body follows the standard's section structure (Context / Decision / Consequences); status `accepted`, date `2026-05-13`, no `supersedes`. Title is a sentence without a period (matches standard). Index entry present. The ADR was hand-authored (the orchestrator is not yet shipped to dogfood it on itself — explicitly acknowledged in its own Consequences section).
- Biome reports "Found 2 infos." in repo-wide run — those are advisory suggestions on pre-existing CloudFront Function template literals, not errors, and exit code is 0. No new infos introduced by the meta feature.
- `pnpm-workspace.yaml` carries the new `.claude/skills/*` glob. The two new workspaces (`@borso/skill-tech-lead-orchestrator`, `@borso/skill-adr-writer`) install cleanly and their `test:coverage` scripts gate at 100 % via vitest thresholds.
- The fixture-driven scenario test described in the spec (with `tests/fixtures/feature-toy/` pre-built artefacts and stubbed sub-agents) was implemented as a **composition test of the pure utilities** rather than a filesystem fixture: `simulate(implementationVerdicts)` composes `initialState → recordSpecChecksum → advanceStage → verdictKindFor → nextAction → incrementRetry`. This is a faithful test of the orchestrator's state machine without coupling to filesystem layout, and it covers every branch the spec asked for (happy / question / replan / retry-exhausted). Acceptable — the spec asks the test to "cover the loop, not the LLM itself", which this does.

## Verdict: PASS
