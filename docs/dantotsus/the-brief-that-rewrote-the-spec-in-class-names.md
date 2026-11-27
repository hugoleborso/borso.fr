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
zone: .claude/skills/implementation
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

- The code was capped at 320 px on a phone, and its tests checked only that an `svg` rendered.
  - The implementing agent followed its brief, which said `className="h-auto w-full max-w-80"` and "a component test (opens the sheet, shows the host, renders an svg)".
    - The main session wrote that brief by hand, translating the spec into class names and a test list, and never told the agent to run `/implementation`.
      - `/implementation` already says "for every numbered happy-path step … write the assertion" (`.claude/skills/implementation/SKILL.md:93`), so the skill that would have caught both was never loaded.

## Root cause of occurrence

*Thought a concrete brief, with the classes and the tests spelled out, helps the
agent aim. Actually the agent treats the brief as its contract and the spec as
background, so every detail the brief restates is a second contract that wins
when the two differ.*

The implementer's report shows it (measured, its hand-back in session
`session_01K69KnDb8qvv4dWNHm4zcQG`). Its wrapper is the brief's
`w-full max-w-80`, and its tests are the three the brief named, plus colour and close
checks. The same instinct shipped
[`a-review-brief-that-disagreed-with-its-own-gate`](./a-review-brief-that-disagreed-with-its-own-gate.md),
whose eradication fixed one skill's text and left every other dispatch open.

## Detection failure causes

- **Typing, linter:** a brief is prose in a tool call. Nothing read it.
- **Local validation:** the implementer ran the tests it was told to write, and they passed.
- **Review:** both validators caught it, one round each. That is the layer that worked, at the price of two rounds.

## Countermeasure

Tests that compare the drawn code with a reference encoding and check its
4-module margin (commit `6aa6f196`), and the cap moved to `sm:max-w-80`
(commit `4bed7260`). Both validators passed on the next round.

## Eradication

**Type:** DevX check (level 2)

**Reference:** the commit adding this file.

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
either go to a validator or name the skill that reads the spec, such as
`/implementation`. The brief keeps the goal, the work folder and the kaizen
line. Behaviour stays in the spec, where the skill turns each use case into an
assertion.

**Proof it can fail:** the test `refuses a brief that names a spec and restates
it instead of naming a skill` feeds the shape of PR #421's brief (a spec path
and a `max-w-80` class, `general-purpose`) and gets the refusal.
`pnpm exec stryker run --mutate scripts/hooks/checks/spec-brief-runs-a-skill.core.ts`
scored 100.

**Similar instances:** `grep -l "brief" docs/dantotsus/*.md` lists four entries
on briefs. Two (`a-work-folder-every-brief-named-and-nobody-made`,
`the-lint-gate-each-brief-retyped-without-its-flag`) are about what a brief
leaves out, which this check does not cover.
