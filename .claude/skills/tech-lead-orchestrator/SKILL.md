---
name: tech-lead-orchestrator
description: |
  Take a feature description from "I want X" to a pushed PR with spec,
  plan, ADRs, implementation, validation reports, and a commit history,
  without continuous human supervision. Use when the user says
  "/tech-lead-orchestrator <feature>", "be my tech lead for X", "drive
  this feature", "ship X end-to-end". Pipelines `/specification`,
  `/technical-conception`, `/adr`, `/implementation`,
  `/technical-validation`, `/visual-validation`; arbitrates failures
  (fix → replan → escalate) with two review rounds at most; never mutates
  `spec.md` without explicit human consent. State is persisted to
  `docs/features/<app>/<slug>/runs/<run-id>/`.
---

# tech-lead-orchestrator skill

One orchestrator pilots every step of the feature flow, arbitrates failures,
decides when to escalate, and writes ADRs along the way. It carries no code.
You are the runtime, and the run's artefacts (`state.json`,
`journal.md.jsonl`, verdict files) are its only state.

The human stays in the loop for **direction** (the spec) and **hard
arbitrage** (escalations). Everything mechanical between them runs
unsupervised. A run that escalates early is a signal the agent is not yet
trusted on this kind of feature.

Invoke for non-trivial features: multi-file, with architectural choices, or
across workspaces. While the user is still discussing direction, keep the
`/specification` loop going on its own.

## Procedure

1. **Read** [`standard.md`](./standard.md), the reference for every table,
   schema and boundary below, and
   [`sub-agent-contract.md`](./sub-agent-contract.md).
2. **Bootstrap state.** Generate a timestamp-based `runId`, derive `<app>`
   (`meta` for repo-internal work) and `<slug>`, write `state.json` per
   [`standard.md`](./standard.md#statejson-schema) to
   `docs/features/<app>/<slug>/runs/<run-id>/`, and append `run_started`.
3. **Walk the stages.** Persist `state.json` and append `stage_changed`
   after every transition, before invoking the next sub-skill, so a crash
   leaves a trail. Before every sub-agent invocation, re-hash `spec.md`
   against `state.specChecksum`, as *Spec immutability* says.
4. **Append `run_completed`** with the final stage, the ADR count and the
   total retries.

## Stages

1. **spec.** If `docs/features/<app>/<slug>/spec/spec.md` is missing,
   invoke `/specification`. Its auto-chain stands down because
   `state.json#pilotedByTechLead` is `true`. Otherwise record its SHA-256 in
   `state.specChecksum`. The spec's *Questions, Options and Decisions*
   (Q.O.D.) and *Changes / Types* sections are the inventory of the next
   stage. A spec with neither escalates back to `/specification` (reason
   `spec-thin-on-tech-surface`), because ADRs derived from invented
   decisions poison the audit trail.
2. **adrs.** Judge each decision in those sections against the
   [ADR triggers](./standard.md#adr-triggers-4-or), have the human ratify the
   candidates as *Tech-lead validation* says, then invoke `/adr` in
   [piloted mode](../adr/SKILL.md#mode-b--piloted-by-tech-lead-orchestrator-or-by-a-session-that-already-chose)
   per confirmed candidate. Copy the slug from the ADR link the spec already
   holds, so that link resolves. Append each id to `state.adrIndex`. ADRs
   land before the plan because they constrain it.
3. **plan.** Invoke `/technical-conception` with the spec path and the ids in
   `state.adrIndex`. The plan references each ADR and shapes its Files, Test
   strategy and Risk register around them. Its auto-chain stands down.
4. **implement.** Spawn a fresh `/implementation` sub-agent per plan slice,
   briefed as *Sub-agent dispatch hygiene* says. It writes its verdict to
   `runs/<run-id>/agents/implementation-<step>.md`. One implementer at a
   time, never parallel, never resumed.
5. **validate.** After the last slice, load `/technical-validation` in this
   session. After it passes, load `/visual-validation` once. Each dispatches
   its own agent, and `validation-runs-as-its-agent` refuses either load in a
   subagent. A feature with no UI surface appends
   `visual_validation_skipped` with a reason and goes on with the technical
   verdict alone.
6. **arbitrate.** Read only each verdict's front matter (`Read` with
   `limit:` about 15). Derive the
   [`verdictKind`](./standard.md#deriving-verdictkind) and take the action
   the [retry policy](./standard.md#retry-policy) names, never one guessed
   from the body. `escalate` writes an escalation message with a proposed
   spec change for the human, and stops.
7. **ship.** All verdicts PASS. Stage `docs/features/<app>/<slug>/runs/`,
   aborted runs included, commit the implementation as
   `feat(<app>): <feature title>`, push, and update an open PR as
   *PR description maintenance* says. A failing `pre-commit` or `pre-push`
   hook is a `fail-local` verdict, back to arbitrate.
