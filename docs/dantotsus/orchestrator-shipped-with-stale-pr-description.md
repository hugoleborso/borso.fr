---
date: 2026-05-14
introduced-at: implementation
detected-at: review
severity: medium
related-pr: #14
fix-pr: <to-be-filled-by-kaizen-pr>
fix-commits: [<to-be-filled-by-kaizen-commit>]
eradication-level: 2
time-to-detect: minutes (user asked)
tags: [orchestrator, skill, pr-description, github]
---

# The orchestrator shipped a feature, then went silent while the PR's description still said something else

## Symptom

PR #14 was opened on the branch `claude/tech-lead-orchestrator-skill-dVKSm`
with the title `feat(meta): seed meta slug + .claude/skills/* workspace
pattern` and a body describing the seed commit. Twenty-three commits
later, the branch had grown into a full feature redesign of
`apps/borso-fr` (galaxy WebGL apex landing), two ADRs (one of them
superseding the other mid-PR), a dantotsu with a structural eradication,
a merge resolution against `main`, and two late-cycle fixes (font +
mobile warp). The orchestrator walked all of this end-to-end and stopped
at the `ship` stage — push done, deploy reminder issued, no objection
from the standard.

The PR description still said `feat(meta): seed meta slug + …`. A
reader scanning `is:pr` on GitHub would see the wrong title, click in,
read the wrong body, and have to scroll commits to reconstruct what
was actually about to merge.

The user surfaced it in one sentence:

> *N'oublie pas aussi de changer la description de la PR.*

The fix took two minutes (one `update_pull_request` call). The fact
that it required a human prompt is the defect.

## Root-cause chain

1. **Why** did the PR description go stale?
   The orchestrator's `ship` stage in `standard.md` did three things:
   commit run artefacts, push, issue the deploy reminder. It did not
   touch the PR title or body. So when the work scope shifted mid-branch
   — orchestrator's `arbitrate → fix → retry`, ADR 0002→0003 supersession,
   merge against `main` — the PR body never caught up.

2. **Why** wasn't "update the PR body" part of `ship`?
   The original orchestrator design implicitly assumed one feature ≈
   one PR opened *after* the orchestrator run. In practice, the PR
   gets opened *during* the work (often before the orchestrator was
   even invoked, as a placeholder branch in Claude Code's web UI).
   The standard treated PR description as an artefact owned by
   something else (the human, an earlier session, a separate
   "open PR" step).

3. **Why** is that a problem and not just a preference?
   The PR description is the **only** thing a reviewer reads before
   approving. The validators write reports under `docs/features/<app>/
   <slug>/validation/`; ADRs land under `docs/adr/`. None of those
   surface in the GitHub PR view unless the body links to them. A
   stale body silently divorces the PR view from the work.

4. **Why** did it bite this PR specifically?
   Because this PR was the first end-to-end dogfooding of the
   orchestrator on a real feature. Every prior orchestrator-piloted PR
   had been a smaller scope where the original title still roughly
   matched the shipped scope. The redesign here actually swapped the
   architecture twice (vendor vanilla → react-bits Galaxy component +
   ogl) — the body and title from "seed meta slug" had nothing left
   in common with the final diff.

**Root cause:** the `ship` stage *thought* its job was to land the
code; *actually* its job is to land the code **and surface what
landed to the next reader**. The PR description is part of "what
landed" — it's the reader's first contact with the work and the only
contact most reviewers ever have.

## Detection failure causes

- **Typing / linter / CI:** N/A — text artefact on GitHub.
- **Validator reports:** the technical-validator and visual-validator
  don't read the PR body, they read the diff. So the stale body
  passed every gate without ever being looked at.
- **Tech-lead orchestrator standard:** `ship` stage was specified as
  "push successful, deploy reminder issued" with no mention of PR
  surface. The omission was the defect.
- **Code review:** the user catches it in 30 seconds when they look
  at the PR list. That's exactly the spot the standard is supposed
  to keep clean of human intervention.

## Countermeasure

The orchestrator standard's `ship` stage gains an explicit PR-description
maintenance step. When the run is on a branch with an open PR, the
orchestrator updates title + body — Summary, Validation gaps, Visual
evidence, Test plan — before issuing the deploy reminder. When the
branch has no open PR, the step is skipped (the orchestrator never
opens PRs on its own).

- **Code:** commit `<sha>` — `.claude/skills/tech-lead-orchestrator/
  standard.md` gains a *PR description maintenance (stage `ship`)*
  section, plus the `ship` row in the stage-transition table now
  reads "Push successful, deploy reminder issued, **PR description
  updated to reflect what the run actually shipped**".

## Eradication (mandatory — code-level)

**Type:** DevX check (level 2 — skill standard update with explicit
checklist the agent can't compress past)

**Reference:** this kaizen PR · commit `<this-commit>`

**The actual fix:**

```diff
--- a/.claude/skills/tech-lead-orchestrator/standard.md
+++ b/.claude/skills/tech-lead-orchestrator/standard.md
@@ -22,2 +22,2 @@
 | arbitrate | ship | All verdicts PASS. |
-| ship | (end) | Push successful, deploy reminder issued. |
+| ship | (end) | Push successful, deploy reminder issued, **PR description updated to reflect what the run actually shipped** (see *PR description maintenance* below). |
```

```diff
+## PR description maintenance (stage `ship`)
+
+If the run is happening on a branch with an **open PR**, the orchestrator
+updates the PR title + body as part of the `ship` stage — before issuing
+the deploy reminder. PR descriptions are the reader's window into a
+merged PR; they go stale instantly when the work scope evolves
+mid-branch (a `feat(meta): seed X` PR that quietly grew a full feature
+redesign + two ADRs + a dantotsu reads like the wrong PR if its body
+still says "seed X").
+
+Check `mcp__github__list_pull_requests state=open` for a PR whose
+`head.ref` matches the current branch. If one exists:
+
+1. **Title** — rewrite to reflect what now lands. …
+2. **Body** — at minimum these sections, in order:
+   - `## Summary` …
+   - `## Validation gaps` …
+   - `## Visual evidence` …
+   - `## Test plan` …
+
+If no PR is open, skip — the orchestrator never opens PRs on its own
+unless the user explicitly asks. The deploy reminder still fires.
+
+Rung-2 eradication of `docs/dantotsus/orchestrator-shipped-with-stale-pr-description.md`.
```

The standard now explicitly directs the orchestrator to look up the
open PR by `head.ref`, rewrite the title to conventional-commit
format with the dominant scope of what actually shipped, and emit the
4-section body (Summary / Validation gaps / Visual evidence / Test
plan). The Visual evidence section's URLs must be SHA-pinned to the
PR head, not `main`.

**Sibling defects swept:** none in-PR — every prior orchestrator
run that left a stale PR description is now historical; this update
applies prospectively. The next run that hits the `ship` stage will
walk the new checklist.

## See also

- [`docs/dantotsus/believed-the-bundle-readme-not-the-live-package-json.md`](./believed-the-bundle-readme-not-the-live-package-json.md)
  — same PR. Shows the same pattern from a different angle: the
  orchestrator's standards needed *additions*, not corrections, for
  the loop to be tight.
- [`docs/dantotsus/feature-flow-skills-do-not-auto-trigger.md`](./feature-flow-skills-do-not-auto-trigger.md) —
  ancestor: feature-flow skills not auto-firing was the seed that
  created the orchestrator. This dantotsu is the orchestrator
  catching its own next blind spot.
- [`docs/knowledge/pr-body-from-cc-ui-skips-skill-sections.md`](../knowledge/pr-body-from-cc-ui-skips-skill-sections.md) —
  adjacent: PR body composition has its own pitfalls.
