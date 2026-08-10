---
date: 2026-08-10
introduced-at: implementation
detected-at: local
severity: low
related-pr: 36
fix-pr: 45
fix-commits: [ebabfe7]
eradication-level: 2
time-to-detect: minutes
tags: [prettier, formatter, hooks, pre-commit, self-improvement-loop]
---

# The formatter was a detector with no writer

## Symptom

A `git commit` rejected by `.husky/pre-commit`, because a freshly written
file carried layout the formatter wanted different:

```
[pre-commit] running prettier on staged files
Checking formatting...
[warn] infra/shared/test/unit/__snapshots__/borso-shared.template.json
[warn] Code style issues found in the above file.
husky - pre-commit script failed (code 1)
```

The remedy is always the same three steps — run the writer, re-`git add`,
re-commit — and it always costs a full cycle for zero semantic change.

This was first written up against Biome in PR #37 (June 2026), a kaizen PR
that never merged. PR #40 replaced Biome with ESLint and Prettier, and the
friction survived the migration unchanged, because it was never about
which formatter was installed.

## Root-cause chain

1. **Why was the commit rejected?** The hook runs `prettier --check`,
   which reports drift and fails. It does not fix it.
2. **Why did the file carry drift?** Nothing ran the formatter between the
   file being written and the commit being attempted.
3. **Why was there no step in between?** The repo gated formatting at the
   commit and CI boundaries — correctly, and after a dantotsu about it not
   being gated at all — and stopped there. Both gates are *detectors*.
   Neither is a *writer*.

**Root cause:** *thought "the formatter is wired up" meant the formatter
was in the loop, actually it was wired only as a detector at the commit
boundary — so every drift surfaced as a rejected commit instead of being
fixed as the file was written.*

## Detection failure causes

- **Typing / linter:** layout, not behaviour. Nothing to catch.
- **Functional validation locally:** the gate *did* catch it. That is the
  point — it caught it one step too late.
- **CI:** would also catch it, defence in depth, if the hook were bypassed.
- **Code review:** structurally invisible. Once the gate exists, drift
  never reaches a reviewer.

Nothing here failed. The layer that was missing was one nobody had built.

## Countermeasure

- **Code:** commit `ebabfe7` — a `PostToolUse` hook on `Edit|Write|MultiEdit`
  that runs Prettier's writer on the file just touched.

## Eradication (mandatory — code-level)

**Type:** DevX check (level 2 — an edit-time writer above the commit-time
detector; the gate stays the enforcement, so disabling the hook costs
ergonomics, not correctness)

**Reference:** [PR #45](https://github.com/hugoleborso/borso.fr/pull/45) ·
commit [`ebabfe7`](https://github.com/hugoleborso/borso.fr/commit/ebabfe7)

**The actual fix:**

```diff
+    "PostToolUse": [
+      {
+        "matcher": "Edit|Write|MultiEdit",
+        "hooks": [
+          {
+            "type": "command",
+            "command": ".claude/hooks/posttool-format-write.sh",
+            "statusMessage": "Formatting with Prettier"
+          }
+        ]
+      }
+    ]
```

The hook always exits 0, filters to the extensions Prettier owns here, and
runs from the project root so it resolves the same config the gate uses.

**Prettier only, deliberately.** `eslint --fix` is not run. Several rules
in this repository autofix by rewriting code rather than layout, and a
silent rewrite between an edit and the next read leaves an agent reasoning
about a file that no longer says what it read. Lint stays a gate that
reports and the author fixes.

**Property this changes:** every Edit/Write now spawns Prettier on the
touched file — a few hundred milliseconds per edit, and the file on disk
can differ from what was just written. Layout moves; semantics do not.

**Sibling defects swept:** none. Single-behaviour gap.

## See also

- [`biome-formatter-was-not-gated.md`](./biome-formatter-was-not-gated.md)
  — the layer below: it added the *detector* to the commit and CI gates.
  This entry adds the *writer* above it.
- [`biome-lint-was-not-gated-anywhere.md`](./biome-lint-was-not-gated-anywhere.md)
  — the original gap in the same lineage.
- [`biome-formatter-trips-line-count-ceiling.md`](../knowledge/biome-formatter-trips-line-count-ceiling.md)
