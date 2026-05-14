---
date: 2026-05-12
introduced-at: implementation
detected-at: ci
severity: medium
related-pr: 11
fix-pr: 11
fix-commits: [17782f1]
eradication-level: 2
time-to-detect: hours
tags: [skill, implementation, plan, code-quality, technical-validation]
---

# Plan's §3 Code-quality self-check was authored but never re-walked at write time

## Symptom

`/technical-validation` on PR #11 returned **FAIL (5)**. One of the failing rows:

> **B01 (FAIL).** `App.tsx:83-104` declares `ALL_YEARS.map((y) => …)` and uses the 1-letter local `y` six times across a 22-line closure. `App.tsx:34` uses `.find((m) => m.m === selected)`. CLAUDE.md *Clean code* bans 1-letter locals "outside trivial scopes like `for (let i = 0; ...)`". The plan (§Code-quality self-check, last bullet) *named this risk by name* — "Variable `y` in App.tsx's year-switch button has been renamed in v0 review — confirmed in current file; if not, rename in impl." — and the implementation didn't follow through.

Four sibling rows in the same report (D11–D14) were variants of the same shape: the plan said "extract `pickDefaultMonth` to `data.utils.ts` so clock-dependent flows are testable"; implementation shipped it inside `App.tsx`, untestable from `data.utils.test.ts`.

In short: the plan called out the exact risks. The implementation, written from the plan's *table* of code-map rows, never looped back to the plan's *Code-quality self-check* section before pre-flight gates fired.

## Root-cause chain

1. **Why did the implementation ship a one-letter local the plan had named?**
   The implementer walked the plan's "How each spec decision becomes code" table top-down (per the `/implementation` skill's Procedure step 3), wrote the code, ran the pre-flight gates (typecheck / biome / knip / build), and pushed. The plan's §3 Code-quality self-check section was *authored* during `/technical-conception` but never *consulted* during `/implementation`.

2. **Why didn't the pre-flight gates catch it?**
   `biome.jsonc` doesn't ship a one-letter-identifier rule. There's a repo-custom GritQL plugin for the type-assertion ban, but no equivalent for short identifiers — the rule lives in `CLAUDE.md` as prose only.

3. **Why didn't `/technical-validation` catch the *spec*-routed test coverage gap before the FAIL verdict?**
   The clock-sensitive flows (`pickDefaultMonth`, `pickDefaultYear`) and error-throw paths were inside the React component. To unit-test them, they had to be extracted to `data.utils.ts` with `today: Date` injected as a parameter. The plan said "extract", the implementer didn't. The validator did its job — caught it at gate 6 (FAIL), not at gate 5 (write-time).

4. **Why does the plan have a §3 Code-quality self-check if nobody re-reads it?**
   The `/technical-conception` standard ([`.claude/skills/technical-conception/standard.md` §3](../../.claude/skills/technical-conception/standard.md)) requires plan authors to write a checkbox list of standing rules the implementation must satisfy. The `/implementation` skill's standard mentions the rules abstractly ("live with the clean-code rules") but does not require the implementer to *re-walk the plan's specific checklist* before push. The two skills compile their own copies of the rules without a hand-off.

**Root cause:** thought "write the code per the plan + run the gates" was the whole loop; actually the plan's §3 checklist is a third gate the implementation skill never instructed the implementer to re-walk before pushing. The checklist existed, named the right risks, and was never read again.

## Detection failure causes

- **Typing:** no type captures "this identifier name is too short".
- **Linter / static analysis:** Biome doesn't have a one-letter-identifier rule and the repo doesn't ship a custom plugin for it (yet).
- **Functional validation locally:** the code works — single-letter variables are functionally correct, just unreadable.
- **CI (tests / build):** all gates green; the defect is a clean-code violation, not a behavioural one.
- **Code review:** the human reviewer (Hugo) sees the diff, but in an AI-driven loop the validator is supposed to fire *before* the reviewer reads the PR. By design, the validator is the last gate before push, not the human.
- **Self-validation:** the `/implementation` skill's pre-flight gates don't reference the plan's §3 section by name; the implementer ran the gates that were named (`biome`, `tsc`, `vitest`, `knip`, `build`) and nothing else.

## Countermeasure

- **Code:** commit [`17782f1`](https://github.com/hugoleborso/borso.fr/commit/17782f1c4d8b04ac8c8b6c46e83a0e6fb538b08e) — renamed `y` → `candidateYear` / `m` → `candidateMonth` / `n` → `matches`; extracted `pickDefaultMonth`, `pickDefaultYear`, `selectYearData`, `selectFeaturedMonth` to `data.utils.ts` with `today: Date` as an explicit parameter; 4 new unit tests cover the branches that the spec routed to `/technical-validation`.

This restored the FAIL → PASS on re-run, but it doesn't stop the next implementation from doing the same thing. The structural change is upstream.

## Eradication (mandatory — code-level)

**Type:** DevX check (level 2 — implementation skill enforces re-walking the plan's §3 before pre-flight gates)

**Reference:** [PR #11 kaizen](https://github.com/hugoleborso/borso.fr/pull/11) — see kaizen commits on this branch for the skill change.

**The actual fix:**

Adds a procedure step to `.claude/skills/implementation/SKILL.md` between gate-running and validation: *"Re-walk the plan's §3 Code-quality self-check section bullet by bullet, verifying each is satisfied by the diff. Unchecked bullets are blockers — fix the diff, do not run validators."* The standard at [`.claude/skills/implementation/standard.md`](../../.claude/skills/implementation/standard.md) gains a matching paragraph in the "Required behaviours" section.

```diff
   3. **Walk the plan's "How each spec decision becomes code" table top-down.** For each row:
      a. Open the file the row points at (or create it).
      b. Apply the change.
      c. If the change is a pure helper, the file ends in `.utils.ts`; write the matching `.utils.test.ts` alongside it.
      d. Update local commits as you go — do not save the diff for one giant commit.
+  3a. **Re-walk the plan's §3 Code-quality self-check section bullet by bullet.** Each bullet
+      names a repo-rule risk the plan author flagged for this feature ("rename `y` → `candidateYear`",
+      "extract clock-dependent code to `data.utils.ts`", "no `useEffect` to derive `selected`", …).
+      The plan-author wrote them because they predicted this implementation would slip on them. Verify
+      each against the diff. An unchecked bullet is a blocker — fix it now; `/technical-validation`
+      will FAIL on it otherwise.
   4. **Run the plan's pre-flight gates** in order. Fix issues, do not bypass.
```

The DevX nature is: the skill text is the lint. The agent loading `/implementation` reads the procedure and runs it; a step that isn't in the procedure isn't run.

**Sibling defects swept:** the same skill change covers D11–D14 in the same validation report (test-coverage rows for clock-dependent flows) — those were also predicted by the plan's §3 and missed at write time. Spec test-routing decisions that show up in the plan as "extract X to utils so it's testable" now get caught at the same gate.

## See also

- [`docs/dantotsus/plan-open-question-leaked-to-validator-fail.md`](./plan-open-question-leaked-to-validator-fail.md) — the *step 1a* equivalent (open questions in the plan must be answered before write time); this entry adds the *step 3a* (§3 self-check must be re-walked before pre-flight).
- [`docs/dantotsus/spec-skill-let-perspectives-be-skipped.md`](./spec-skill-let-perspectives-be-skipped.md) — same loop family: a section of the upstream skill output was authored and silently skipped downstream.
- [`docs/features/borso-fr/12-travaux/validation/technical-validation-2026-05-12-0028.md`](../features/borso-fr/12-travaux/validation/technical-validation-2026-05-12-0028.md) — the FAIL report that surfaced this.
