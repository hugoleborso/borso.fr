---
date: 2026-09-16
introduced-at: conception
detected-at: review
severity: medium
related-pr: '#104'
fix-pr: '#105'
fix-commits: []
eradication-level: 2
time-to-detect: hours
tags: [validation, agents, spec, process, meta]
---

# A spec that never said who checks what

## Symptom

Three technical validators ran against one spec, independently, at three
points in the task. All three logged the same line:

> the spec carries no Test strategy section, so the technical/visual routing
> the validator standard depends on had to be invented

Three agents, three inventions, one spec.

## Root-cause chain

1. **Why did each validator have to invent the routing?**
   `/technical-validation` and `/visual-validation` split a spec's assertions
   between them, and the split is supposed to be read off the spec.
2. **Why was it not there?**
   The spec was written by hand, section by section, as the feature grew,
   rather than produced by `/specification`, whose template carries the
   section.
3. **Why did nobody notice while writing it?**
   Its absence reads as brevity. Every section present was correct.
4. **Why does an invented split matter if both validators passed?**
   Because the guesses were independent. A rule both validators judge the
   other's is validated by neither, and nothing in either report would say
   so — each one lists only the rows it claimed.
5. **Why did no gate see it?**
   Nothing read a spec's shape. The validators consume specs; no check
   asserts what a spec must contain.

**Root cause:** thought a spec's assertions were self-routing, actually the
routing is a section a hand-written spec loses silently, and its absence
turns one contract into as many guesses as there are readers.

## Detection failure causes

- **Linter / static analysis:** no rule reads `docs/features/`.
- **Functional validation locally:** each validator ran to completion and
  produced a verdict, which is what makes this quiet.
- **Code review:** the reviewer reads the spec for what it says, not for the
  heading it lacks.
- **The validators themselves:** each logged the gap to the friction log,
  which is the only reason it is written down here — and each then carried
  on rather than failing, correctly, since a missing section is not a defect
  in the feature.

## Countermeasure

The spec gained the section, written from what the two validators actually
divided between them, including one assertion named as neither's: whether
the attribution line satisfies OpenStreetMap's policy is a reading of that
policy, not something a browser or a compiler can answer.

## Eradication (mandatory — code-level)

**Type:** DevX check (level 2 — pre-commit gate)

**Reference:** PR #105

**The actual fix:** `scripts/check-spec-test-strategy.sh`, wired into
pre-commit, refuses a feature spec with no Test strategy section:

```diff
+  if ! grep -qi '^#\+ .*test strategy' "$spec"; then
+    echo "[check-spec-test-strategy] $spec has no Test strategy section, so
+      nothing says which assertions are a code reviewer's and which are a
+      browser's."
```

Three specs predate the rule and are listed in the script rather than
back-filled: inventing a routing for a feature one did not spec is exactly
the guessing the check exists to stop. The list only shrinks.

**Sibling defects swept:** the sweep found the same omission in
`borsouvertures/learn-by-tree`, `pragma/album-artwork` and
`pragma/improvement-backlog`, now named as the baseline rather than left
undiscovered.

## See also

- [`a-review-brief-that-disagreed-with-its-own-gate.md`](./a-review-brief-that-disagreed-with-its-own-gate.md) — another instruction the reader had to reconcile alone.
- [`subagents-that-were-never-told-their-label.md`](../knowledge/subagents-that-were-never-told-their-label.md) — why the three logs could be counted as three, which is what promoted this from an annoyance to a gate.
