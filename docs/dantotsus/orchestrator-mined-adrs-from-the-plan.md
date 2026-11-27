---
date: 2026-05-14
introduced-at: conception
detected-at: local
severity: medium
related-pr: '#14'
fix-commits: [2e64172625]
eradication-level: 5
eradication-paths: [.claude/skills/tech-lead-orchestrator/standard.md]
time-to-detect: hours (mid-implementation)
tags: [orchestrator, skill, adr, state-machine, conception-pivot]
zone: .claude/skills/tech-lead-orchestrator
---

# The orchestrator would have written each ADR after the choice it records

## User impact

The operator reads an ADR to learn why a choice was made and what it was made
against. The orchestrator's first cut would have handed him ADRs that
describe the winner only.

| | Seen | Expected |
| --- | --- | --- |
| Stage order of `/tech-lead-orchestrator` | `spec → plan → adrs → implement` | `spec → adrs → plan → implement` |
| An ADR for the shader source | Written from the plan's row `apps/borso-fr/site/shader-bg.js`, which shows only the vendored option | Written from the spec's row, which names vendored vanilla, `ogl` from npm and from scratch |

The operator caught it while reading the orchestrator's spec, mid
implementation of PR #14.

## Causal chain

- The orchestrator would write ADRs after the plan, from the plan.
  - Its transition table, written in commit `b8d5862ef`, sent the plan to the
    ADR stage:

    ```text
    | plan | adrs | `/technical-conception` returns `done` with `plan.md` next to spec. |
    | adrs | implement | All ADR-trigger candidates have been processed; each ADR number is in `state.adrIndex`. |
    ```

    - Its author drew the stages around the chain that already existed,
      `/specification → /technical-conception → /implementation`, and added
      `/adr-writer` as one more step after the plan (Method).

## Root cause of occurrence

*Thought ADRs document the plan's architectural choices, actually ADRs
constrain the plan, because the plan only projects the spec's decisions onto
code and drops the alternatives they were chosen against.* (Method)

The fix commit `2e64172625` states it: "adrs constrain the plan rather than
being mined from it. candidates are derived from the spec (q.o.d. + changes /
types)". The `/adr-writer` skill at `b8d5862ef^` already listed "Multiple
serious alternatives considered for a single choice" as its first trigger.
Those alternatives live in the spec's Questions / Options / Decisions table,
not in the plan.

## Detection failure causes

- **`/specification`:** its Q.O.D. table lists alternatives and the pick but
  raises no ADR. Recognising a trigger was left to the orchestrator.
- **`/technical-conception`:** it maps Q.O.D. rows onto code. With ADRs after
  the plan, it had no ADR to reference and no reason to ask for one.
- **Gates:** the state machine is prose that an agent follows. No code reads
  it, so no test could show the order was wrong.

## Countermeasure

Commit [`2e64172`](https://github.com/hugoleborso/borso.fr/commit/2e64172625)
reordered the stages to `spec → adrs → plan`. The orchestrator derives ADR
candidates from the spec, the operator ratifies each with `AskUserQuestion`
(write, skip or merge), and `/technical-conception` receives `adrIndex` and
must reference every ADR in it. A spec thin on technical surface goes back to
`/specification`.

## Eradication

**Type:** knowledge (level 5). The order is a transition table in an agent
standard.

**Reference:** commit `2e64172625`. `.claude/skills/tech-lead-orchestrator/standard.md`
holds it today:

```text
**ADRs come before the plan**, because they constrain it. Transitions:
| adrs | plan | Every ADR-qualifying candidate from the spec has been ratified by the human … ADR numbers are in `state.adrIndex`. |
| plan | implement | `/technical-conception` returns `done` with `plan.md` next to spec. The plan references every ADR in `state.adrIndex`. |
```

The first version of this entry called this a level 1 structural
impossibility. No code executes the table: `grep -rl adrIndex` over the
`.ts`, `.js` and `.sh` files finds nothing. Nothing refuses a `plan.md` that
skips an ADR.

**Proposed:** a pre-commit check in the shape of `scripts/check-spec-records.sh`.
For a `plan.md` added on the branch, it reads the spec's Q.O.D. rows and
refuses the plan when a row carries neither an ADR id that resolves under
`docs/adr/` nor a dated "no ADR" answer from the operator. A plan could then
not reach a commit before its decisions were either recorded with their
alternatives or waived by the operator.

**Proof it can fail:** not tried. The proposal is not built.

**Similar instances:** [`orchestrator-agency-overcorrected-on-product-decisions.md`](./orchestrator-agency-overcorrected-on-product-decisions.md)
and [`orchestrator-skipped-validation-between-rounds.md`](./orchestrator-skipped-validation-between-rounds.md)
rest on the same prose state machine.
