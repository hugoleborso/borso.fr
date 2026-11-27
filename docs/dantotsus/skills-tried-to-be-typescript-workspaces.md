---
date: 2026-05-14
introduced-at: conception
detected-at: local
severity: medium
related-pr: '#14'
fix-commits: [959b1e747d]
eradication-level: 5
eradication-paths: [pnpm-workspace.yaml, CLAUDE.md]
time-to-detect: hours (mid-implementation)
tags: [skills, harness, pnpm, workspaces, conception-pivot]
zone: pnpm-workspace.yaml
---

# I tried to make a Claude Code skill a pnpm workspace. It is not one.

## User impact

The operator reviewed PR #14 mid-implementation and found two skills built as TypeScript packages whose code nothing ran.

| | Seen | Expected |
| --- | --- | --- |
| `.claude/skills/tech-lead-orchestrator/` and `.claude/skills/adr-writer/` | A `package.json`, `tsconfig.json`, `vitest.config.ts`, seven `*.utils.ts` modules and their tests, a `tech-lead:metrics` root script (measured: `git show --stat 959b1e747`, 1812 lines deleted) | `SKILL.md`, `standard.md` and their tables, which is what the LLM reads and follows |

The operator's words: *skills are markdown-only, abandon TS scaffolding.*

## Causal chain

- The operator found 64 passing tests on code no runtime imported.
  - `378f81ddc` built `@borso/skill-tech-lead-orchestrator` with five `*.utils.ts` at 100% coverage, and `1791cbe0b` did the same for `adr-writer`. The skill's state machine, verdict lookup and retry policy became TypeScript modules.
    - The LLM, which runs a skill, reads only the markdown. The modules were imported by their own tests and nothing else.
  - `003550953` made that shape the rule. It added `.claude/skills/*` to `pnpm-workspace.yaml` and this bullet to CLAUDE.md:

    ```markdown
    - `.claude/skills/<slug>/` — skills. Markdown-only by default. A skill becomes a **pnpm workspace** (`.claude/skills/*` is listed in `pnpm-workspace.yaml`) the moment it ships testable code — i.e. one or more `*.utils.ts` files.  ← the faulty line
    ```

    - The agent wrote that bullet to fit the CLAUDE.md rule it had in context at `003550953^`: "Any file containing only deterministic, side-effect-free functions ... is named `something.utils.ts` ... The gate applies to every workspace ... There is no exemption" (Material).
    - No document in its context said who executes a skill (Material).

## Root cause of occurrence

*Thought a skill's state machine is pure logic, so the clean-code rule asks for a `*.utils.ts` module tested at 100%. Actually a skill runs only as prose the LLM reads, so a module that only its own test imports runs nowhere.* (Material)

The agent wrote the line. The rule it followed was loaded and unscoped, and the fact that would have stopped it was absent from its context. Source: `git show 003550953^:CLAUDE.md`, line 38, quoted above.

The premise "skills are markdown-only" no longer holds as a rule. `.claude/skills/blueprint/*.ts` and `.claude/skills/dantotsu/scripts/list.ts` live there today with real callers. The misconception is narrower than the category: TypeScript for logic only the LLM executes.

## Detection failure causes

- **Typing, linter, knip, CI:** the code was correct TypeScript. knip treats every `*.test.ts` as an entry point, so a module reached only from its test counts as used.
- **Coverage gate:** it measures a module against its test. A module whose only consumer is that test scores 100%.
- **`/technical-validation`:** it checked the plan, and the plan asked for `*.utils.ts` at 100% because CLAUDE.md did. It had no question about who imports the module.
- **The later caller gate:** `scripts/check-pure-modules-have-callers.sh` now refuses a module imported only by its test. It globs only `apps/**` and `infra/**`, so a test-only module under `.claude/` or `scripts/` still passes (measured, the script's `list_working_tree_files` calls).

## Countermeasure

Commit `959b1e747` deleted the code and the rule that made it look right.

- Deleted `src/`, `tests/`, `bin/` and the workspace configs of both skills.
- Rewrote `SKILL.md` and `standard.md` so each procedure lives in a table.
- Removed `.claude/skills/*` from `pnpm-workspace.yaml` and the two workspaces from `knip.json`.
- Replaced the `tech-lead:metrics` script with a `jq` recipe in `docs/knowledge/tech-lead-orchestrator.md`.
- Replaced the CLAUDE.md bullet.

The operator verified it by reading the rewritten skills in the PR.

## Eradication

**Type:** knowledge (level 5)

**Reference:** commit [`959b1e7`](https://github.com/hugoleborso/borso.fr/commit/959b1e747dfa4e2890ae255a6441c61e2a5fef9a).

```diff
--- a/pnpm-workspace.yaml
+++ b/pnpm-workspace.yaml
-  - '.claude/skills/*'
```

What holds today is a subtraction and a sentence. `pnpm-workspace.yaml` lists only `apps/*` and `infra/*`, so a `package.json` under `.claude/` is no workspace and `pnpm -r test` never runs its tests. CLAUDE.md says `.claude/` holds its harness "as plain files". The "markdown-only" sentence of 2026-05 is gone (measured: `grep -n markdown-only CLAUDE.md` finds nothing). `.claude/skills/blueprint/SKILL.md:121` still cites it.

Nothing refuses a test-only TypeScript module under `.claude/`. That is why the level is 5 and not 1.

**Proposed:** widen `scripts/check-pure-modules-have-callers.sh` from `apps/**` and `infra/**` to every tracked `*.core.ts` and `*.utils.ts`, `.claude/**` and `scripts/**` included. A pure module whose only importer is its test, as `verdict-parser.utils.ts` was, is then refused at commit. It needs no written rule. Measured feasible: a scratch run of the same question over `.claude/` and `scripts/` found 74 such modules and none without a caller outside its test.

**Proof it can fail:** not tried, because the proposal is not built.

**Similar instances:** `git ls-files '.claude/**/*.ts'` lists the blueprint scripts and the dantotsu `list.ts`, each called by a script or a skill command. [`feature-flow-skills-do-not-auto-trigger.md`](./feature-flow-skills-do-not-auto-trigger.md) is the same family: what a skill is, mechanically.
