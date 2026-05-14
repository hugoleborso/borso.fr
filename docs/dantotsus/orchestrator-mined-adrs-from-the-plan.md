---
date: 2026-05-14
introduced-at: conception
detected-at: implementation
severity: medium
related-pr: #14
fix-pr: #14
fix-commits: [2e64172]
eradication-level: 1
time-to-detect: hours (mid-implementation)
tags: [orchestrator, skill, adr, state-machine, conception-pivot]
---

# The orchestrator was going to mine ADRs *out of* the plan. ADRs constrain the plan.

## Symptom

The `/tech-lead-orchestrator` skill's first cut shipped a state machine
ordered `spec → plan → adrs → implement`. The reasoning: `/technical-conception`
produces the plan, the plan reveals architectural choices, the orchestrator
ratifies the ADR-qualifying ones, ADRs are recorded post-hoc, then implementation
proceeds.

That ordering is backwards. An ADR is the *reason* a plan looks like it does — a
decision that constrains "where things land in code". Mining ADRs out of a plan
that already crystallised the decisions means the ADRs document the *result*, not
the *choice*. By the time the plan exists, the choice has been made implicitly;
the ADR is a vestigial recording, not a load-bearing artefact.

Hugo flipped the order in commit `2e64172`:

> *stage order moves from spec / plan / adrs to spec / adrs / plan. adrs
> constrain the plan rather than being mined from it.*

The new flow: `spec → adrs → plan → implement`. Candidates are derived from the
spec's `Questions / Options / Decisions` table and `Changes / Types` section,
ratified by the human via `AskUserQuestion` (write / skip / merge), then
`/adr-writer` runs for each accepted candidate. `/technical-conception` receives
the accepted ADR numbers and *must reference them in the plan*. If the spec is
thin on tech surface, the orchestrator escalates back to `/specification`
rather than guessing the choices itself.

## Root-cause chain

1. **Why** would ADRs come *after* the plan?
   Because the plan is where architectural decisions become visible as
   concrete code locations. The reflex was: read the plan, see "we picked
   Vite", file an ADR. The plan was treated as the *source* of decisions.

2. **Why** is that the wrong source?
   Because by the time the plan is written, the decision is already taken
   implicitly. `/technical-conception` mapped Q.O.D. row "Source du shader =
   vanilla vendored" onto `apps/borso-fr/site/shader-bg.js`. The choice
   between "vendored vanilla vs ogl npm vs from-scratch" was hidden inside
   the Q.O.D. row's narrative; the plan just projected it onto code. If the
   ADR is written *after* the plan, it documents the projection, not the
   choice. The reader who wants to know "why this and not the alternatives"
   doesn't find the alternatives anywhere — the plan only shows the winner.

3. **Why** is "spec drives ADRs" the right framing?
   The spec is where decisions are *taken* (Q.O.D. + Changes / Types). An
   ADR-qualifying choice is one that meets the 4 OR-triggers (multiple
   alternatives, cross-cutting, divergence, looks-standard). Those triggers
   fire when the spec is written, not when the plan is written. The plan's
   job is to project the spec onto code; if there's an architectural choice
   buried in the spec that fires a trigger, the ADR is the right artefact to
   surface it *before* the plan locks it in.

4. **Why** does the human ratify the candidate?
   Because ADRs cost reading time; not every Q.O.D. row deserves an ADR.
   The orchestrator surfaces candidates with the trigger that fires; the
   human picks write / skip / merge per candidate. Without ratification,
   the orchestrator either over-files (every choice becomes an ADR, the
   index becomes noise) or under-files (the LLM's threshold is arbitrary).

5. **Why** didn't this surface in design?
   Because the original state machine was drawn around the
   `/specification → /technical-conception → /implementation` chain that
   already existed. `/adr-writer` was bolted on as "an extra step after
   the plan" without re-asking whether ADRs *constrain* the plan or
   *describe* it.

**Root cause:** *thought* "ADRs document the plan's architectural choices";
*actually* ADRs *constrain* the plan — they're the decisions the plan
projects onto code. Putting them after the plan inverts the dependency: the
plan becomes the source of architecture, the ADR becomes a description of
the plan, and the alternatives that the choice was made *against* disappear
from the record.

## Detection failure causes

- **`/specification`:** the spec's Q.O.D. section names alternatives + the
  picked option, but doesn't trigger an ADR — it just lists. The trigger
  *recognition* belongs to the orchestrator.
- **`/technical-conception`:** the plan mapped Q.O.D. rows onto code. It
  didn't escalate "this row should have an ADR" because the original state
  machine said ADRs come *after* the plan.
- **Code review:** Hugo caught it. The signal was reading the orchestrator
  spec's Q.O.D. and noticing "ADRs are mined from the plan" felt off — the
  alternatives in the Q.O.D. are richer than the plan's narrative will
  ever be.

## Countermeasure

Commit `2e64172` reverses the dependency:

- `state.json` gains `adrIndex: string[]` — populated *before* the plan
  stage transitions to `implement`. The plan must reference every ADR in
  this index.
- `/specification` returns when the spec carries enough Q.O.D. surface to
  surface ADR-qualifying candidates. If it doesn't, the orchestrator
  escalates back to `/specification` (reason: `spec-thin-on-tech-surface`).
- The orchestrator's `adrs` stage walks the Q.O.D. rows, identifies
  candidates against the 4 OR-triggers, and asks the human via
  `AskUserQuestion` (write / skip / merge with existing).
- `/technical-conception` receives `adrIndex` as input. The plan template
  has a "References ADRs" row that's blocked from `done` until each ADR
  in the index appears in at least one *Where it lands* cell.

## Eradication (mandatory — code-level)

**Type:** Structural impossibility (level 1 — the orchestrator's state
machine *cannot* transition `plan → implement` until `adrIndex` is
populated and each entry is referenced in the plan)

**Reference:** PR #14 · commit [`2e64172`](https://github.com/hugoleborso/borso.fr/commit/2e64172)

**The actual fix:**

```diff
--- a/.claude/skills/tech-lead-orchestrator/standard.md
+++ b/.claude/skills/tech-lead-orchestrator/standard.md
@@ -<line>,4 +<line>,4 @@
 The 8 stages are: `spec`, `adrs`, `plan`, `implement`, `validate`,
 `arbitrate`, `ship`, `escalated`. **ADRs come before the plan** — they
-document architectural choices the plan made.
+constrain it.
```

```diff
+| spec | adrs | `spec.md` present (or `/specification` returns `done`). Spec checksum recorded. Spec carries enough tech surface (Q.O.D. + Changes / Types) to surface architectural choices. |
+| adrs | plan | Every ADR-qualifying candidate from the spec has been ratified by the human (tech-lead validation via `AskUserQuestion`) and the confirmed ones have been written via `/adr-writer`. ADR numbers are in `state.adrIndex`. If no candidates, transition immediately. |
+| plan | implement | `/technical-conception` returns `done` with `plan.md` next to spec. The plan references every ADR in `state.adrIndex`. |
```

Plus the matching updates to `SKILL.md` (operating mode lists `adrs` as
stage 2, `plan` as stage 3), to the spec + plan addendums, and to the
test scenarios under `docs/features/meta/tech-lead-orchestrator/`. ADR-0001
itself ("`/tech-lead-orchestrator` replaces the linear skill auto-chain")
gets a wording pass to reflect the corrected ordering.

The category "plan reveals ADRs" is structurally unrepresentable now: the
state machine literally can't go to `implement` without going through
`adrs` first.

**Sibling defects swept:** none — this is a pure state-machine ordering
correction. The PR ships ADR-0002 + ADR-0003 (front-page-redesign) with
the *correct* ordering (ADRs ratified pre-plan, plan references them).
Going forward, every orchestrator-piloted run inherits the fix.

## See also

- [`docs/adr/0001-tech-lead-orchestrator-replaces-auto-chain.md`](../adr/0001-tech-lead-orchestrator-replaces-auto-chain.md) —
  the canonical statement of why the orchestrator exists at all.
- [`docs/dantotsus/skills-tried-to-be-typescript-workspaces.md`](./skills-tried-to-be-typescript-workspaces.md) —
  same PR, same kind of architectural correction. Different surface
  (workspace category vs state-machine order).
