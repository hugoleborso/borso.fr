---
date: 2026-06-07
introduced-at: implementation
detected-at: local
severity: low
related-pr: 36
fix-pr: 37
fix-commits: [f1f3975]
eradication-level: 2
time-to-detect: minutes
tags: [biome, formatter, hooks, pre-commit, self-improvement-loop]
---

# The formatter only ran at the commit gate, so every drift cost a wasted commit

## Symptom

Shipping PR #36, the first `git commit` was rejected by the
`.husky/pre-commit` Biome gate — a freshly-written test file used a
single-line object/array literal that Biome's formatter wanted reflowed
across multiple lines:

```
× Formatter would have printed the following content:
    130 │ - ····s1:·{·id:·'s1',·title:·'Wagon·Wheel',·...·},
        │ + ····s1:·{
        │ + ······id:·'s1',
        ...
husky - pre-commit script failed (code 1)
```

The fix was mechanical (`biome check --write` then re-`git add` and
re-commit), but it cost a full commit cycle for zero semantic change.

## Root-cause chain

1. **Why was the commit rejected?** The pre-commit hook runs
   `biome check`, which fails (does not auto-fix) when a staged file
   carries format drift.
2. **Why did the file carry drift?** The file was written by hand /
   by the agent without Biome ever touching it between the edit and
   the commit. Biome only entered the loop at commit time.
3. **Why did Biome only enter at commit time?** The repo gated
   formatting at the commit + CI boundary
   (`biome-formatter-was-not-gated`) but had no edit-time formatting
   step — nothing applied the formatter while files were being written.

**Root cause:** *thought "the formatter is wired up" was enough, actually
it was only wired as a **detector** at the commit gate — there was no
**writer** at edit time, so every drift surfaced as a rejected commit
instead of being silently fixed as the file was written.*

## Detection failure causes

- **Typing / linter:** N/A — formatting style, not behaviour.
- **Functional validation locally:** the gate *did* catch it — that's
  the point; it caught it one step too late (at commit, not at edit).
- **CI:** would also have caught it (defence in depth) had the local
  hook been bypassed.
- **Code review:** invisible — drift is per-editor and never reaches a
  reviewer once the gate exists.

## Countermeasure

Add a `PostToolUse` hook (Edit|Write|MultiEdit) that runs
`biome check --write` on each just-edited file, so the working tree
stays continuously formatted and nothing reaches the commit gate dirty.

- **Code:** commit `f1f3975` — `.claude/hooks/posttool-biome-write.sh`
  + the `PostToolUse` block in `.claude/settings.json`.

## Eradication (mandatory — code-level)

**Type:** DevX check (level 2 — an automated edit-time writer that
prevents the misconception's *symptom*; the commit gate remains the
level-1 backstop, so disabling the hook degrades ergonomics, not
correctness).

**Reference:** [PR #37](https://github.com/hugoleborso/borso.fr/pull/37) ·
commit [`f1f3975`](https://github.com/hugoleborso/borso.fr/commit/f1f3975)

**The actual fix:**

```diff
+    "PostToolUse": [
+      {
+        "matcher": "Edit|Write|MultiEdit",
+        "hooks": [
+          {
+            "type": "command",
+            "command": ".claude/hooks/posttool-biome-write.sh",
+            "statusMessage": "Formatting with Biome"
+          }
+        ]
+      }
+    ]
```

The hook is best-effort (always exits 0), filters to the file types
Biome handles in this repo, and runs from the project root so it
resolves the same root + nested `biome.jsonc` the commit-time gate uses.

**Sibling defects swept:** none — single-file behaviour.

## See also

- [`biome-formatter-was-not-gated.md`](./biome-formatter-was-not-gated.md)
  — the layer below this one: it added `biome check` to the commit + CI
  gate (the *detector*). This entry adds the edit-time *writer* above it,
  so drift is fixed before it ever reaches that gate.
- [`biome-lint-was-not-gated-anywhere.md`](./biome-lint-was-not-gated-anywhere.md)
  — the original lint-gating gap in the same lineage.
