---
date: 2026-11-27
introduced-at: implementation
detected-at: review
severity: low
related-pr: '#421'
fix-commits: [self]
eradication-level: 2
eradication-paths: [scripts/hooks/checks/spec-brief-runs-a-skill.core.ts]
time-to-detect: minutes
tags: [agents, hooks, harness, visual-validation, pragma]
zone: .claude/skills/route
weak-point: prose-stands-in-for-a-check
recurs: [a-review-brief-that-disagreed-with-its-own-gate]
---

# The brief that rewrote the spec in class names

## User impact

The operator waited through two extra validation rounds before PR #421 could
open. Each round failed on a promise the spec made and the code did not keep
(measured, the reports under `docs/features/pragma/visitor-qr-code/validation/`).

| | Seen | Expected |
| --- | --- | --- |
| Technical round 1, rows D11 and D14 | No test read what the QR code encodes or checked its quiet zone | Use cases 4 and 5 each held by an assertion that fails when they are false |
| Visual round 1, row 12 | At 375 px the code was 320 px wide where 343 px were free | "As wide as the sheet allows at 375 px" (use case 5) |

## Causal chain

- At 375 px the QR code was 320 px wide, and no test read what it encodes or its quiet zone.
  - The wrapper capped the code at 20rem on every screen, from the first pixel up.
    - Branch commit `d23d988ee` wrote it in `VisitorQrCodeAction.tsx`, and `4bed7260c` later moved the cap to `sm:` (measured, `git show`):

      ```tsx
      // capped at 320 px at every width, so a 343 px phone sheet shows 320 px
      <div className="w-full max-w-80 overflow-hidden rounded-lg">
      ```

      - The implementing agent copied its brief, which said `className="h-auto w-full max-w-80"` and "a component test (opens the sheet, shows the host, renders an svg)" (measured, its hand-back in session `session_01K69KnDb8qvv4dWNHm4zcQG`).
        - The main session wrote that brief by hand. It translated use case 5, "capped so it stays inside the screen on a computer", into a class with no breakpoint, and the use cases into a test list.
          - The session had built the spec and an ADR by hand, then went straight to implementation with no plan (measured, `docs/features/pragma/visitor-qr-code/` holds `spec/` and `validation/`, no `plan/`). That is the shape of `/route` Tier 1 (inferred, the tier choice is not recorded).
            - Tier 1's step 3 reads "implement, marking new files `// @FollowsBlueprint <id>`" (`.claude/skills/route/SKILL.md:33`). It names no skill and produces no plan, so the brief became the plan. **Method.**

## Root cause of occurrence

**The implementing agent, Material.** *Thought the brief was the contract,
with the spec behind it as background. Actually the brief carried a second
copy of use case 5, and that copy had lost the "on a computer" condition.*
Its wrapper is the brief's `w-full max-w-80`, and its tests are the three the
brief named plus colour and close checks (measured, its hand-back). The right
answer reached it only as a spec path in a brief that also spelled the answer
out wrongly.

**The brief's author, Method.** *Thought someone had to turn the spec into
classes and tests before an agent could code it, and that this was the
orchestrator's job. Actually no step of Tier 1 owns that job.* Step 3 is a
bare "implement". `/implementation`, whose rule "for every numbered
happy-path step … write the assertion" (`.claude/skills/implementation/SKILL.md:93`)
does the job, refuses to run when "the plan is missing"
(`.claude/skills/implementation/SKILL.md:20-21`). Tier 1 makes no plan. So the
brief was the only place left to do the translation. The same instinct
shipped
[`a-review-brief-that-disagreed-with-its-own-gate`](./a-review-brief-that-disagreed-with-its-own-gate.md).

## Detection failure causes

- **Typing, linter:** a brief is prose in a tool call. Nothing read it.
- **Local validation:** the implementer ran the tests it was told to write, and they passed. The test list came from the brief, so it shared the brief's gaps.
- **Review:** both validators caught it, one round each. That is the layer that worked, at the price of two rounds.

## Countermeasure

Tests that compare the drawn code with a reference encoding and check its
4-module margin (commit `6aa6f1968`), and the cap moved to `sm:max-w-80`
(commit `4bed7260c`). Both validators passed on the next round.

## Eradication

**Type:** DevX check (level 2)

**Reference:** the commit adding this file (#422, `79814b4c8`).

```diff
+export const specBriefRunsASkill: Check = {
+  name: 'spec-brief-runs-a-skill',
+  tools: /^(Agent|Task)$/u,
+  run(input) {
+    …
+    if (!SPEC_PATH.test(prompt) || VALIDATORS.has(agentType) || SKILL_NAMED.test(prompt)) {
+      return PASS;
+    }
+    return refuse(RULE, 'a brief names a spec but no skill that reads it', [ … ]);
```

An `Agent` call whose prompt names a `docs/features/*/*/spec/spec.md` must
either go to a validator or name a skill. It is registered in
`scripts/hooks/hook-events.ts`.

**Proof it can fail:** the test `refuses a brief that names a spec and restates
it instead of naming a skill` feeds the shape of PR #421's brief (a spec path,
a `max-w-80` class, `general-purpose`) and gets the refusal. The suite passes
9 of 9 (measured, `vitest run scripts/hooks/checks/spec-brief-runs-a-skill.core.test.ts`).
`pnpm exec stryker run --mutate scripts/hooks/checks/spec-brief-runs-a-skill.core.ts`
scored 100 when it shipped (not rerun).

**What it does not hold:** two gaps keep this from eradicated (measured,
`SKILL_NAMED` in the check and its test). It passes any of nine skills,
`/dantotsu` and `/after-task-kaizen` included, so a brief that restates
`max-w-80` and names `/dantotsu` goes through. And the skill its refusal
recommends, `/implementation`, refuses to run without a plan, which Tier 1
never writes. So on Tier 1 the hook pushes toward a skill whose precondition
fails.

**Proposed:** make Tier 1's step 3 in `.claude/skills/route/SKILL.md` read
`/implementation <spec-path>`. Let `/implementation` run on a spec alone,
walking its numbered use cases when no plan exists, since the assertion rule
needs only the spec. Narrow `SKILL_NAMED` to the skills that turn use cases
into assertions (`/implementation`, `/feature-pipeline`,
`/tech-lead-orchestrator`), deleting the six others. Then no tier leaves the
spec-to-code step to a hand-written brief, and the hook can no longer be
satisfied by naming a skill that never reads the use cases.

**Similar instances:** `grep -l "brief" docs/dantotsus/*.md` lists the entries
on briefs. Two (`a-work-folder-every-brief-named-and-nobody-made`,
`the-lint-gate-each-brief-retyped-without-its-flag`) are about what a brief
leaves out, which this check does not cover.
