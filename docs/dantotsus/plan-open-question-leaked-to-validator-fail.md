---
date: 2026-05-05
introduced-at: implementation
detected-at: review
severity: medium
related-pr: https://github.com/hugoleborso/borso.fr/pull/8
fix-pr: https://github.com/hugoleborso/borso.fr/pull/9
fix-commits: []
eradication-level: 2
time-to-detect: hours
tags: [spec, plan, implementation, validators]
---

# Open question in the plan leaked all the way to a technical-validator FAIL

## Symptom

The `/technical-conception` plan for the borsouvertures learn-by-tree
feature had this row in its *Open questions / unknowns* section:

> **Visited-leaves persistence scope.** Spec says "the set of leaves
> visited per variation during the current drill." Plan reads this as:
> persist visited-leaves keyed by variationId so a mid-drill reload
> doesn't lose progress; reset clears the set for that variation. If
> Hugo intended "transient, reload = clear," flag it back during step-12
> of the next spec iteration.

I ran `/implementation` against the plan anyway, knowing the question was
unresolved, and landed the "transient" interpretation in code (machine
state, not persisted).

The technical-validator FAIL'd on that exact row:

> **A17 / D18** — *Q5 persistence lists "the set of leaves visited per
> variation during the current drill" as part of persisted state. The
> machine resets `visitedLeafIds = EMPTY_VISITED` on `start`, and
> `useAppState` doesn't round-trip them. Lost on reload.*

Resolution required walking back up the chain: amend the spec to
explicitly say "visited-leaves are intentionally **not** persisted,"
then re-run the validator. Round-trip cost: ~1 hour, ~3 commits.

## Root-cause chain

1. **Why did the validator FAIL?**
   Because the spec read as written required persistence, the code didn't
   implement it, and the validator does its job against the spec.
2. **Why didn't the spec say what the code did?**
   Because the spec was ambiguous and the plan flagged it as an open
   question instead of closing it.
3. **Why did I run `/implementation` with the question still open?**
   Because nothing structurally stopped me. The `/implementation` skill
   walks the plan top-down; it doesn't validate that the plan's
   *Open questions / unknowns* section is empty.
4. **Why is that a load-bearing gap?**
   Because every open question is a place where the implementer picks an
   interpretation and ships it, and the validator (rightly) doesn't trust
   the implementer's pick over the spec. The defect is *predictable* the
   moment the plan ships with non-empty open questions.

**Root cause:** *thought* "I can resolve plan-open-questions during
implementation"; *actually* an unresolved open question in the plan is
a guaranteed validator FAIL waiting to happen — either the spec has to
move to match the code, or the code has to move to match the spec, and
the round trip is most expensive after `/implementation` has built on
top of one interpretation.

## Detection failure causes

- **Typing / linter:** N/A — narrative defect.
- **`/specification`:** Spec text was actually ambiguous; the skill's
  step-12 inconsistency sweep should have caught the wording, but the
  wording read fluent enough to miss.
- **`/technical-conception`:** Did the right thing — flagged the
  ambiguity in *Open questions / unknowns*. The flag was the early
  warning; nothing acted on it.
- **`/implementation`:** No precondition that the plan's open-questions
  section is empty. The walk proceeded with the implementer picking an
  interpretation silently.
- **`/technical-validation`:** Caught it (rightly, as designed) — but
  catching it at this layer means the implementation work has already
  shipped against the wrong interpretation, and the fix costs a round
  trip through spec amendment + re-validation.

## Countermeasure

Spec was amended in [commit on PR #8](https://github.com/hugoleborso/borso.fr/pull/8/commits)
to make visited-leaves explicitly transient. Validator re-run on the
amended spec returned `PASS_EXCEPT_UNVERIFIABLE`.

## Eradication (mandatory — code-level)

**Type:** DevX check (level 2 — `/implementation` skill enforces a
hard precondition before the walk starts).

**Reference:** [PR #9](https://github.com/hugoleborso/borso.fr/pulls?q=is%3Apr+head%3Aclaude%2Flessons-from-pr-8) ·
this kaizen PR.

**The actual fix:**

```diff
 # .claude/skills/implementation/SKILL.md
   "Procedure" section
   1. **Read** `spec.md` and `plan.md` end-to-end. Build a mental model.
+ 1a. **Verify the plan's open questions are closed.** Read the plan's
+     *Open questions / unknowns* section. If it has any unresolved
+     bullets, STOP. The right move is to walk those questions back up
+     to the spec (via `/specification` step-12 sweep) and re-run
+     `/technical-conception`, not to pick an interpretation silently in
+     code. Each unresolved open question is a guaranteed
+     `/technical-validation` FAIL waiting to happen against an
+     interpretation the validator doesn't share.
+
+     Acceptable exception: an open question marked
+     `[resolved-during-implementation: <one-line decision + matching
+     spec amendment commit>]`. The marker forces the spec amendment to
+     happen *with* the implementation rather than after the validator
+     FAILs.
   2. **Inventory** technical surfaces. …
```

Plus the matching cross-link from the `/technical-conception` standard:

```diff
 # .claude/skills/technical-conception/standard.md
   "Open questions / missing technical skills" subsection
+ Open questions that remain unresolved when the plan ships block
+ `/implementation` (see the precondition added to that skill). Either
+ close them by amending the spec via `/specification` step-12 sweep, or
+ explicitly mark them `[deferred-to-future-pr]` with the matching spec
+ note. Implementers are not allowed to silently pick an interpretation
+ — the validator will catch them out.
```

**Sibling defects swept:** none in this PR; the precondition will fire
on every future `/implementation` invocation against a plan with a
non-empty open-questions section.

## See also

- [`docs/dantotsus/built-my-own-before-checking-the-library.md`](./built-my-own-before-checking-the-library.md) —
  the *other* implementation-pacing defect from the same PR.
- The visited-leaves spec amendment in PR #8 (commit `56687de`).
