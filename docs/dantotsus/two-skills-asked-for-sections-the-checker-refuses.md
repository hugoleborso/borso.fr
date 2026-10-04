---
date: 2026-10-02
introduced-at: conception
detected-at: local
severity: low
related-pr: "#107"
fix-pr: "#119"
fix-commits: [50410b2]
eradication-level: 1
time-to-detect: weeks
tags: [skill, pr-body, process, meta]
---

# Two skills asked for sections the checker refuses

## Symptom

Opening PR #107 took three drafts. The first followed `/visual-validation`
to the letter and `check-pr-body.ts` answered with twelve violations,
among them:

```
[pr-body] Validation gaps: unknown section, allowed: Flow, Decisions, Before merge, Validation, Notable, Inventory, Shipped, Patterns
[pr-body] Visual evidence: unknown section, allowed: Flow, Decisions, Before merge, Validation, Notable, Inventory, Shipped, Patterns
```

The second moved the screenshots into the body as the same skill said, and
`pretool-github-pr-body.sh` refused the call, because the GitHub MCP server
strips markdown images.

## Root-cause chain

1. **Why did a skill's own instructions fail the gate?**
   `/visual-validation` prescribed a `## Validation gaps` and a
   `## Visual evidence` section with inline images.
2. **Why were those headings not allowed?** `check-pr-body.ts` was written
   later, as the budget behind `/open-pr`, with its own list of sections.
   `/open-pr` was rewritten to match it; nothing else was.
3. **Why did nothing else get rewritten?** The body's shape was described
   in five documents: `/open-pr`, `/visual-validation`, `/implementation`
   step 8, `/technical-validation`, and the ship stage of
   `/tech-lead-orchestrator`, which prescribed four more headings of its
   own. Only the first was tied to the checker.
4. **Why did the images survive in the skill?** The knowledge entry on the
   MCP sanitizer was written after the skill and never linked back to it.

**Root cause:** thought each skill could describe the part of the body it
cares about, actually one shape described five times drifts the moment one
copy gets a gate.

## Detection failure causes

- **Linter / static analysis:** prose has no build step; a skill is read by
  a model that follows it, then by a checker that refuses it.
- **CI:** nothing checks skills against the checker's section list.
- **Code review:** each skill reads correctly on its own; only the pair is
  wrong.

## Countermeasure

- **Operator action:** the body was rewritten with the gaps as `### Gap:`
  blocks under `## Validation` and the screenshots named by path.

## Eradication (mandatory — code-level)

**Type:** code diff (level 1 — structural impossibility)

**Reference:** commit `50410b2`

**The actual fix:** the body's shape is now written down in one place,
`/open-pr`'s *Validation* step, which says where an unverifiable row goes
and how screenshots are named. The other four documents keep only what
they own, the obligation to disclose and what to disclose, and point at
`/open-pr` for the headings:

```diff
-The operator opening the PR must surface the UNVERIFIABLE rows in the PR description under a `## Validation gaps` heading.
+**Where** they go is `/open-pr`'s to decide — its *Validation* step and `scripts/pr/check-pr-body.ts`
+own the body's shape, and this document does not name a heading.
```

With one copy there is no second copy to drift. The level holds only as
long as no new skill starts describing headings again; `check-pr-body.ts`
still refuses the result at drafting time if one does.

**Sibling defects swept:** `/implementation` step 8,
`/technical-validation`, and `/tech-lead-orchestrator`'s ship stage, all
in `50410b2`.

## See also

- [`github-mcp-pr-body-sanitizer.md`](../knowledge/github-mcp-pr-body-sanitizer.md)
- [`two-copies-that-had-to-agree-and-nothing-made-them.md`](./two-copies-that-had-to-agree-and-nothing-made-them.md)
