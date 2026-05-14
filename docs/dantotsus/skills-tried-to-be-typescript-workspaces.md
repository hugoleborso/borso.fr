---
date: 2026-05-14
introduced-at: conception
detected-at: implementation
severity: medium
related-pr: #14
fix-pr: #14
fix-commits: [959b1e7]
eradication-level: 1
time-to-detect: hours (mid-implementation)
tags: [skills, harness, pnpm, workspaces, conception-pivot]
---

# I tried to make a Claude Code skill a pnpm workspace. It is not one.

## Symptom

The `/tech-lead-orchestrator` and `/adr-writer` skills were originally
scaffolded as full pnpm workspaces — `package.json`, `tsconfig.json`,
`vitest.config.ts`, a `src/` folder of `.utils.ts` modules at 100 %
coverage, a `bin/tech-lead-metrics.ts` script wired into the root
`package.json` as `tech-lead:metrics`. The repo's `pnpm-workspace.yaml`
gained a `.claude/skills/*` glob; `knip.json` gained the two skill
workspaces.

This was wrong. Skills are LLM-runtime artefacts: a set of markdown
instructions an LLM follows. There's nothing to import; there's no
runtime to run tests against. The TypeScript was inert ceremony — the
LLM doesn't execute it. Hugo surfaced it mid-implementation:

> *skills are markdown-only — abandon TS scaffolding.*

Commit `959b1e7` drops everything: `src/`, `tests/`, `bin/`, the two
workspace `package.json` / `tsconfig.json` / `biome.jsonc` /
`vitest.config.ts` files, the `pnpm-workspace.yaml` glob, the two
knip workspace entries, the root `tech-lead:metrics` script. SKILL.md
+ standard.md + the verdict-contract / template files become the
*entire* skill.

## Root-cause chain

1. **Why** scaffold a TS workspace for a skill?
   Because every other code unit in the repo is a TS workspace, the
   reflex was to mirror the pattern. State-machine derivation,
   verdict-kind lookup, retry-action mapping all *look* like things
   you'd write as `*.utils.ts` with 100 % coverage tests — that's
   the repo's *Clean code* rule for pure helpers.

2. **Why** does that reflex misfire for skills?
   Because the runtime is the LLM, not Node. The "state machine" of
   the orchestrator is a markdown table the LLM reads and follows;
   the "verdict-kind derivation" is a 5-row lookup table in prose.
   A `verdictKind.ts` with `verdictKind.test.ts` doesn't *run* —
   the LLM never imports it. It's documentation in the wrong
   format.

3. **Why** wasn't this clear at conception?
   CLAUDE.md's *Layout* section said:
   > `.claude/skills/<slug>/` — skills. Promote to a pnpm workspace
   > when there is testable code.
   That bullet was the seed of the misconception. It *implied*
   there is "testable code" in skills. There isn't — the skill is
   the prose; the LLM is the executor. The bullet shouldn't exist.

4. **Why** did it take "mid-implementation" to surface?
   Because the scaffolding *looked right* to a TypeScript-shaped
   audit. The PR's `/technical-validation` pass on the orchestrator
   spec was green — 100 % coverage, biome clean, knip clean. The
   defect was at the level of the *category* the code belonged to,
   not the code itself.

**Root cause:** *thought* "if there's a state machine, there's
testable utils, therefore there's a workspace"; *actually* skills
are markdown documents an LLM reads, and any state machine in a
skill is also a markdown document (a table, a lookup, a procedure)
— never a TypeScript module. The CLAUDE.md hint to "promote to a
pnpm workspace" was *what* made the wrong category feel right.

## Detection failure causes

- **Typing / linter / CI:** the scaffolded TypeScript was correct
  TypeScript. Every gate passed. The defect wasn't in the code's
  *shape*; it was in the code's *category*.
- **`/technical-conception`:** the plan called out `*.utils.ts` at
  100 % coverage because that's CLAUDE.md's standing rule for
  pure helpers. The rule fires unconditionally; it can't see that
  the workspace category itself is wrong.
- **`/technical-validation`:** identical — the validator checked
  what the plan asked for. The plan was wrong about the category.
- **`/visual-validation`:** N/A — no UI.
- **Code review:** Hugo caught it. The standard *Layout* bullet was
  the seed, and reading it triggered "wait, why are we promoting
  skills to workspaces, they have no executor".

## Countermeasure

Commit `959b1e7` does the structural removal:

- Delete `src/`, `tests/`, `bin/`, `package.json`, `tsconfig.json`,
  `biome.jsonc`, `vitest.config.ts` from `.claude/skills/adr-writer/`
  and `.claude/skills/tech-lead-orchestrator/`.
- Rewrite `SKILL.md` + `standard.md` so the procedures (pick number,
  conflict check, render template / derive verdictKind, retry
  policy, journal schema) live in prose with full tables.
- Revert `pnpm-workspace.yaml`'s `.claude/skills/*` glob.
- Drop the two skill workspaces from `knip.json`.
- Drop `tech-lead:metrics` from root `package.json` (replaced by
  a `jq` one-liner in `docs/knowledge/tech-lead-orchestrator.md`).
- Update CLAUDE.md *Layout*: skills are **markdown-only**; the
  "promote to a workspace" bullet is gone.

## Eradication (mandatory — code-level)

**Type:** Structural impossibility (level 1 — the "skill is a
workspace" category no longer exists in the repo's conventions)

**Reference:** PR #14 · commit [`959b1e7`](https://github.com/hugoleborso/borso.fr/commit/959b1e7)

**The actual fix:**

```diff
--- a/CLAUDE.md
+++ b/CLAUDE.md
@@ -<line>,7 +<line>,7 @@
-- `.claude/skills/<slug>/` — skills. A skill is a set of instructions an LLM follows. Promote to a pnpm workspace when there is testable code.
+- `.claude/skills/<slug>/` — skills. **Markdown-only.** A skill is a set of instructions an LLM follows: `SKILL.md`, `standard.md`, `template.md`, `worked-example.md` as needed. **No `package.json`, no test runner, no TS utilities.** Primitives the skill needs (verdict parsing, state transitions, retry budgeting, journal aggregation) are described in prose; the LLM runtime executes them. Skills are not pnpm workspaces.
```

```diff
--- a/pnpm-workspace.yaml
+++ b/pnpm-workspace.yaml
@@ -<line>,1 +<line>,0 @@
-  - '.claude/skills/*'
```

Plus the deletion of every `package.json` / `tsconfig.json` /
`vitest.config.ts` under `.claude/skills/`, plus knip's workspace
entries for the two skills. The category "skill is a workspace" is
**structurally unrepresentable** going forward: the pnpm glob no
longer covers `.claude/skills/*`, knip doesn't list them, CLAUDE.md
forbids it. A future agent that tries to `pnpm add` something to a
skill workspace gets an error from pnpm itself.

**Sibling defects swept:** the `tech-lead:metrics` root script was
broken at the same moment — it imported from the deleted skill
workspace. Replaced with a `jq` one-liner documented in
`docs/knowledge/tech-lead-orchestrator.md`. The spec.md / plan.md
under `docs/features/meta/tech-lead-orchestrator/` get an addendum
explaining how to read the original "Files to change" rows (prose,
not code).

## See also

- [`docs/dantotsus/feature-flow-skills-do-not-auto-trigger.md`](./feature-flow-skills-do-not-auto-trigger.md) —
  same family: "what is a skill, mechanically?". That dantotsu
  established that skills can't auto-trigger; this one establishes
  that they also can't be workspaces.
- [`docs/knowledge/tech-lead-orchestrator.md`](../knowledge/tech-lead-orchestrator.md) —
  operator notes; the `jq` recipe replacing `tech-lead:metrics`
  lives here.
