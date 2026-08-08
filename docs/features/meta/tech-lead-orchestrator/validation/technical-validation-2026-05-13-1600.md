# Technical validation — Tech-lead-orchestrator skill (post-correction re-run)

- Spec: [`../spec/spec.md`](../spec/spec.md)
- Plan: [`../plan/plan.md`](../plan/plan.md)
- Branch: `claude/tech-lead-orchestrator-skill-dVKSm`
- Base: `origin/main`
- Run at: 2026-05-13T16:00:00Z
- Touched workspaces (relevant to this feature): none — skills are markdown-only by design after the mid-flight correction.

> This run re-validates the feature **after the mid-flight architectural correction** recorded in the addendum at the top of both spec.md and plan.md. The corrected design is: skills are markdown-only — no `package.json`, no `*.utils.ts`, no test runner under `.claude/skills/`. The four validation categories therefore collapse to: A. Correctness vs (corrected) spec, B. Markdown coherence + no dangling TS refs. Categories C (Tests pass) and D (Coverage of spec) are **N/A** for this feature — there is no code to test; the design is "no code". This is the correct verdict semantics, not a waiver.

## A. Correctness vs spec (corrected design)

| # | Spec ref | Claim | Code (file:line) | Evidence (quoted) | Verdict |
|---|---|---|---|---|---|
| A01 | Addendum spec.md | Skills are markdown-only — no TS scaffolding under `.claude/skills/` | `find .claude/skills` | No `package.json`, no `*.utils.ts`, no `*.test.ts`, no `vitest.config.ts`, no `tsconfig.json`, no `biome.jsonc`, no `bin/`, no `tests/`, no `src/` directories under `.claude/skills/`. Only `.md` files (and `dantotsu/scripts/list.sh` pre-existing). | PASS |
| A02 | Addendum plan.md ("retrait de `.claude/skills/*` du `pnpm-workspace.yaml`") | Workspace globs do not include `.claude/skills/*` | `pnpm-workspace.yaml:1-3` | `packages:\n  - apps/*\n  - infra/*` (no `.claude/skills/*`) | PASS |
| A03 | Addendum plan.md ("mentions de `pnpm tech-lead:metrics`") | Root `package.json` has no `tech-lead:metrics` script | `package.json` grep | grep `tech-lead` returns 0 matches. | PASS |
| A04 | Addendum plan.md (knip.json) | `knip.json` carries no skill workspace entry | `knip.json` grep | grep `tech-lead` returns 0 matches. | PASS |
| A05 | Addendum plan.md ("mise à jour de la *Layout* dans CLAUDE.md") | CLAUDE.md *Layout* says skills are markdown-only | `CLAUDE.md:22` | `` `.claude/skills/<slug>/` — skills. **Markdown-only.** A skill is a set of instructions an LLM follows: `SKILL.md`, `standard.md`, `template.md`, `worked-example.md` as needed. **No `package.json`, no test runner, no TS utilities.** [...] Skills are not pnpm workspaces. `` | PASS |
| A06 | Addendum spec.md ("primitives décrites en TypeScript [...] conservées comme prose descriptive") | `adr-writer` describes procedure entirely in prose — no `*.utils.ts`, `nextAdrNumber()`, `findConflictingAdrs()`, `renderAdrMarkdown()` | grep on `.claude/skills/adr-writer/{SKILL,standard,template}.md` | 0 matches for `.utils.ts`, `nextAdrNumber`, `findConflictingAdrs`, `renderAdrMarkdown`. | PASS |
| A07 | Addendum spec.md (same as A06, applied to orchestrator) | `tech-lead-orchestrator` SKILL.md + standard.md + sub-agent-contract.md describe primitives in prose only | grep | 0 matches for `verdict-parser.utils.ts`, `journal.utils.ts`, `state.utils.ts`, `adr-trigger.utils.ts`, `retry-budget.utils.ts`, `nextAction(`, `appendEvent(`. The two `.utils.ts` hits in `sub-agent-contract.md:84,87` are *example artifacts* a sub-agent might list (`palettes.utils.ts` in a borso-fr feature), not orchestrator-internal modules — PASS in context. | PASS |
| A08 | Q.O.D. *format verdict YAML* / spec | `state.json` schema spelled out in markdown | `tech-lead-orchestrator/standard.md:24-41` | Section `## state.json schema` with fields, types, and an overwrite/commit policy. | PASS |
| A09 | Spec *Analytics / events* | Journal event schema spelled out in markdown | `tech-lead-orchestrator/standard.md:152` | `` `runs/<run-id>/journal.md.jsonl` contains one JSON object per line. `` followed by event-shape description. | PASS |
| A10 | Q.O.D. *contrat sous-agent* | verdictKind derivation spelled out as a markdown table | `tech-lead-orchestrator/standard.md:58-69` | `### Deriving verdictKind` table mapping `status × next.kind` → `verdictKind`. | PASS |
| A11 | Q.O.D. *arbitrage retry* | Retry-action lookup spelled out as a markdown table | `tech-lead-orchestrator/standard.md:93` | `` `retries.implement` ≥ `MAX_RETRIES` `` row in retry-action table mapping `(retries, verdictKind)` → action. | PASS |
| A12 | Spec *Result* / Addendum | `docs/knowledge/tech-lead-orchestrator.md` aggregation uses `jq`, not `pnpm tech-lead:metrics` | `docs/knowledge/tech-lead-orchestrator.md:49,56,59,62,65-66,70,92` | 8 `jq` one-liners. grep `tech-lead:metrics` → 0 matches. | PASS |
| A13 | Q.O.D. *contrat sous-agent* | All 5 modified SKILL.md files carry the conditional auto-chain / verdict-emission section, referencing the verdict file location via markdown | `.claude/skills/{specification,technical-conception,implementation,technical-validation,visual-validation}/SKILL.md` | `specification/SKILL.md:161` "Conditional suppression when piloted by `/tech-lead-orchestrator`"; `technical-conception/SKILL.md:139` same; `implementation/SKILL.md:141` `## Verdict émis (when piloted by `/tech-lead-orchestrator`)`; `technical-validation/SKILL.md:101` same; `visual-validation/SKILL.md:161-163` same, plus the verdict-file path: `docs/features/<app>/<slug>/runs/<run-id>/state.json`. No TS imports. | PASS |
| A14 | Plan *Pattern Coherence #2* | ADR-0001 exists and is referenced from `docs/adr/README.md` | `docs/adr/0001-tech-lead-orchestrator-replaces-auto-chain.md` + `docs/adr/README.md:6,10` | `> Written by `/adr-writer`, often triggered by `/tech-lead-orchestrator`.` and `| [0001](./0001-tech-lead-orchestrator-replaces-auto-chain.md) | ...` | PASS |
| A15 | Addendum (both files) | Spec + plan addendums clearly mark the correction at the top | `spec.md:3-15`, `plan.md:5` | Both bracketed-blockquote addendums dated 2026-05-13 explaining how to read the historical text below. | PASS |

## B. Markdown coherence (no dangling TS refs)

| # | Rule | Check | Evidence | Verdict |
|---|---|---|---|---|
| B01 | No `package.json` under `.claude/skills/` | `find .claude/skills -name package.json` | (no results) | PASS |
| B02 | No `*.utils.ts` under `.claude/skills/` | `find .claude/skills -name '*.utils.ts'` | (no results) | PASS |
| B03 | No `*.test.ts` / `vitest.config.ts` / `tsconfig.json` / `biome.jsonc` under `.claude/skills/` | `find .claude/skills -name '*.test.ts' -o -name 'vitest.config.ts' -o -name 'tsconfig.json'` | (no results) | PASS |
| B04 | No `src/` / `tests/` / `bin/` directories under `.claude/skills/` | `find .claude/skills -type d` | Only skill folders + pre-existing `dantotsu/scripts/`. | PASS |
| B05 | Skill files don't reference deleted TS function names | grep `nextAdrNumber\|findConflictingAdrs\|renderAdrMarkdown\|verdict-parser\|journal\.utils\|state\.utils\|adr-trigger\|retry-budget\|nextAction\|appendEvent` across all `.claude/skills/{adr-writer,tech-lead-orchestrator}/*.md` | 0 matches. The only `*.utils.ts` references in skill files are in `implementation/SKILL.md` / `specification/SKILL.md` and concern *app code* (the repo's pure-helpers rule, unrelated to skill internals), plus example artifacts in `sub-agent-contract.md` that describe what a sub-agent's output might list. | PASS |
| B06 | `docs/knowledge/tech-lead-orchestrator.md` purged of `pnpm tech-lead:metrics` | grep | 0 matches; 8 `jq` one-liners present. | PASS |
| B07 | `pnpm exec biome lint` clean | run | Exit 0, 2 infos (pre-existing, advisory only — no errors). | PASS |
| B08 | `pnpm exec knip` clean | run | Exit 0, no output. | PASS |

## C. Tests pass

| # | Workspace | Command | Exit | Verdict |
|---|---|---|---|---|
| C01 | `.claude/skills/tech-lead-orchestrator/` | (no test runner — design is markdown-only) | n/a | N/A |
| C02 | `.claude/skills/adr-writer/` | (no test runner — design is markdown-only) | n/a | N/A |

> The feature ships no code. The five modified SKILL.md files describe markdown prose; the two new skill folders carry markdown only. Per CLAUDE.md *Layout* (this PR's own update) and *Clean code* §"Pure utilities", coverage gates apply only to `*.utils.ts` modules — none exist here. There is no test runner to invoke and no `*.utils.ts` to gate. Tag N/A, not FAIL.

> The unrelated `apps/borsouvertures/**` and `apps/borso-fr/**` changes in the diff predate this feature's branch base and are out of scope for this validation. Their tests are gated by their own coverage rules and are not the responsibility of this run.

## D. Test coverage of spec

| # | Use case | Covering test | Verdict |
|---|---|---|---|
| D01 | All "use cases / edge cases" originally framed as scenario tests | (none — by design after the correction) | N/A |

> The spec's *Test strategy* in its historical body asked for a fixture-driven scenario test and unit tests on TS utilities. The 2026-05-13 addendum supersedes that: the orchestrator's behaviour is described in prose for an LLM runtime to follow, not asserted by a test runner. The corresponding use cases will be validated empirically by the first few `/tech-lead-orchestrator` runs (dogfooding loop, captured in `docs/knowledge/tech-lead-orchestrator.md` and any Dantotsu entries that flow from defects). Tag N/A.

## Notes

- The diff also touches `apps/borsouvertures/**`, `apps/borso-fr/package.json`, several `docs/dantotsus/**` and `docs/knowledge/**` files, and the `learn-by-tree` feature artefacts. These changes are unrelated to the tech-lead-orchestrator feature and arrived because the branch's base diverged from `origin/main`. They are out of scope for this validation; their correctness rides on whichever PR(s) they originated in.
- Biome reports 2 advisory infos (template-literal preference in pre-existing CloudFront Function code under `infra/cdk/`). These are infos, not errors, and pre-date this branch — non-blocking.
- The `.claude/skills/tech-lead-orchestrator/sub-agent-contract.md:84,87` lines mention `palettes.utils.ts` in example sub-agent verdicts. These are illustrative artefacts a sub-agent in a real borso-fr feature might list — not orchestrator-internal modules. They are consistent with the corrected design.
- A previous validation report (`technical-validation-2026-05-13-1530.md`) exists in the same folder. This run supersedes it.

## Verdict: PASS
