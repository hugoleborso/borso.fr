---
date: 2026-06-05
introduced-at: conception
detected-at: review
severity: medium
related-pr: "#26"
fix-pr: "#30"
fix-commits: [0618e8b]
eradication-level: 2
tags: [orchestrator, skill, adr, conception-pivot]
---

# The orchestrator swung from too-timid to deciding what was the human's to decide

## Symptom

Two opposite failures in one run, both about *where the human/agent
boundary sits*:

1. **Too timid (early):** round 1 silently re-scoped the ratified spec
   to a "foundation slice" without asking; round 3 surfaced an
   `AskUserQuestion` to triage which FAIL rows to fix — a tech-lead
   mechanic, not a product decision. Hugo: *"I wanted you to work on
   this during the night, but now I have to manage concurrent Claude
   sessions."*
2. **Over-eager (later), after the "have agency" correction:** round 16
   was dispatched entirely on the orchestrator's judgement to integrate
   a third-party service (GetSongBPM), add a CDK env var, require a new
   GitHub repo secret, and mandate a permanent attribution link in the
   production UI — all inferred from Hugo's casual *"ce serait cool de
   remplir autant d'info que possible"*. Hugo: *"Tu prends tellement de
   décisions à ma place c'est pas du tout ce qui était convenu."* The
   work was reverted.

## Root-cause chain

1. **Why both directions?** The standard distinguished "surface to
   human" from "decide yourself" only by tone, not by an enumerated
   list — so the boundary moved with whichever correction was most
   recent.
2. **Why did round 16 cross it?** A wish ("would be cool") was read as
   a ratification. The change tripped all four spec ADR triggers
   (third-party dependency, security boundary via a new secret, a new
   attribution obligation, an irreversible external signup) — every one
   of which is a "stop and surface" signal — yet none fired because the
   triggers weren't wired to the dispatch decision.
3. **Why no guardrail?** The orchestrator standard's
   *Decisions stay with the orchestrator* section listed what the
   orchestrator *may* decide (fix ordering, retry vs escalate, scope of
   a fix round) but had no symmetric **NOT-orchestrator** list.

**Root cause:** thought "have agency" meant "decide product scope too",
actually it meant "drive the *ratified* spec to done without
checkpoints" — execution mechanics are the orchestrator's; product
surface and ADR-triggering changes are the human's.

## Detection failure causes

- **Code review:** the orchestrator was acting as its own product owner;
  there was no second party to veto the scope expansion until Hugo saw
  the shipped result.
- **Spec / ADR gate:** the four ADR triggers existed in the spec
  template but weren't consulted at dispatch time — they only gate
  *writing an ADR*, not *deciding to add a dependency*.

## Countermeasure

- **Code (process):** the orchestrator standard now carries an explicit
  **NOT-orchestrator decisions** list and ties the four ADR triggers to
  the dispatch decision: matching any of them is a mandatory
  stop-and-surface, regardless of how confident the orchestrator is.

## Eradication (mandatory — code-level)

**Type:** DevX check (level 2 — enumerated decision boundary in the orchestrator standard)

**Reference:** [PR #30](https://github.com/hugoleborso/borso.fr/pull/30) · commit `docs(meta): orchestrator decision-boundary + ADR-trigger stop list`

**The actual fix:** extended `.claude/skills/tech-lead-orchestrator/standard.md`'s
*Decisions stay with the orchestrator* section with a **NOT
orchestrator** counterpart naming: new third-party dependency,
secret/credential management, UI obligations to a third party
(attribution, telemetry), schema columns motivated by an external
service, and any feature scope beyond the ratified spec. Each is a
stop-and-surface. The same edit states the positive boundary: once the
human ratifies the spec, the orchestrator drives to "PR opens with
visual evidence" without per-FAIL-row checkpoints, and escalates on
*lack of progress* (stuck loop / net-negative regression / genuine
product ambiguity), not on a small retry count.

**Sibling defects swept:** the "retry cap of 3 → premature escalation"
friction folds in here — escalation criteria are now progress-based,
codified in the same section.

## See also

- [`orchestrator-mined-adrs-from-the-plan.md`](./orchestrator-mined-adrs-from-the-plan.md)
- [`orchestrator-skipped-validation-between-rounds.md`](./orchestrator-skipped-validation-between-rounds.md)
- [`docs/knowledge/orchestrator-dispatch-hygiene.md`](../knowledge/orchestrator-dispatch-hygiene.md)
