---
description: Launch a Dynamic Workflow that drives a ratified feature spec from plan → opened PR, invoking the existing tech-lead skills as workflow subagents (the Skill stays for spec + ADR ratification; this command starts when those are done).
---

## Pre-conditions (the workflow assumes these are already true)

The Dynamic Workflow **does not** invoke `/specification` or `/adr` — those are
human-bound and stay as chat Skills. Before running `/feature-pipeline`, confirm:

- A `docs/features/<app>/<slug>/spec/spec.md` exists, every perspective
  checkbox is ticked, the _Q.O.D._ table is filled, and you've ratified it.
  If it isn't, run `/specification` first.
- Every ADR-trigger candidate from the spec has been ratified via
  `/adr` (piloted mode), and the resulting ADRs are committed under
  `docs/adr/`. The spec's _Architectural choices_ section names them.
- The branch you want the workflow to push to is checked out
  (typically `claude/<slug>-<short>`).

If any pre-condition is missing, **do not** run this workflow — the runtime
can't pause for mid-run human input, so it would either over-decide
(round-16 anti-pattern, see [ADR-0005](../../docs/adr/0005-dynamic-workflows-for-orchestration.md))
or strand state for a forced exit-and-resume.

## What the workflow does

A single Claude Code Dynamic Workflow drives `plan → implement → validate →
ship` end-to-end. Each stage spawns a subagent that invokes the existing
skill of that name, with the standards files (`.claude/skills/<skill>/standard.md`)
as the durable contract.

The script orchestrates the following stages, in order. The skills named
here are **the existing skills in this repo** — the workflow's job is to
invoke them, not to reimplement them.

### Stage 1 — `plan` (one subagent)

- **Skill invoked:** `/technical-conception`.
- **Standard:** [`.claude/skills/technical-conception/standard.md`](../skills/technical-conception/standard.md).
- **Input:** the spec path passed as `args.specPath`. The ADR numbers from
  the spec's _Architectural choices_ table.
- **Output the subagent writes:** `docs/features/<app>/<slug>/plan/plan.md`,
  referencing every ADR. Verdict YAML at `runs/<run-id>/agents/technical-conception-01.md`.
- **Workflow guard:** if the verdict is `status: question`, exit with
  `outcome: needs-human-input` and the question. If `status: blocked`, exit
  with `outcome: spec-thin-on-tech-surface` — the operator runs
  `/specification` to deepen the spec, then re-launches.

### Stage 2 — `implement` (loop, fix-rounds; `model: 'opus'`, `isolation: 'worktree'`)

- **Skill invoked per round:** `/implementation`.
- **Standard:** [`.claude/skills/implementation/standard.md`](../skills/implementation/standard.md).
- **Hygiene (non-skippable per [`orchestrator-dispatch-hygiene.md`](../../docs/knowledge/orchestrator-dispatch-hygiene.md)):**
  every spawn passes `model: 'opus'` explicitly + `isolation: 'worktree'`.
  The dispatch brief mentions `biome check` (the composite gate), never
  `biome lint`.
- **Loop:** round 1 starts from the plan. Subsequent rounds start from the
  previous validation verdict (`fail-local` rows become the fix list).
- **Workflow guard — ADR trigger:** if any sub-agent emits a verdict
  flagging an ADR trigger (new third-party dep, new secret, attribution-in-prod-UI,
  schema column driven by an external service, feature scope beyond the
  ratified spec — per `tech-lead-orchestrator/standard.md` § _Decision boundary_),
  the workflow **exits** with `outcome: needs-human-adr-ratification`,
  serialises the trigger to `runs/<run-id>/state.json::pendingAdr`, and
  surfaces the trigger to the operator. The operator runs `/adr` (piloted
  mode) in chat, commits the ADR, then re-launches `/feature-pipeline` —
  the script reads `state.json`, sees the ADR is ratified, and continues
  from where it stopped.

### Stage 3 — `validate (technical)` after every `implement` round

- **Skill invoked:** `/technical-validation`.
- **Standard:** [`.claude/skills/technical-validation/standard.md`](../skills/technical-validation/standard.md).
- **Non-skippable** per `tech-lead-orchestrator/standard.md` and the
  dantotsu `orchestrator-skipped-validation-between-rounds.md`. The validator
  runs on the latest SHA after every `/implementation` verdict of `status: done`.
  A runtime smoke-test is explicitly NOT a substitute.
- **Output:** verdict at `runs/<run-id>/agents/technical-validation-<NN>.md`,
  report at `docs/features/<app>/<slug>/validation/technical-validation-<timestamp>.md`.
- **Workflow guard:** `PASS` → advance to visual (or to ship if UI not in
  scope). `PASS_EXCEPT_UNVERIFIABLE` → advance with a disclosure carried
  to the PR body. `FAIL` → loop back to `implement` (consume one fix-round
  budget). Escalation criteria are _progress-based_, not retry-count based:
  exit with `outcome: stuck-loop` if a round closes 0 blockers, or
  `outcome: regression-net-negative` if a round adds strictly more new
  FAILs than it closes.

### Stage 4 — `validate (visual)` once technical is `PASS` (when UI in scope)

- **Skill invoked:** `/visual-validation`.
- **Standard:** [`.claude/skills/visual-validation/standard.md`](../skills/visual-validation/standard.md).
- **Scope:** if the spec's _What the user sees / does_ section is empty
  (back-end-only feature), skip — verdict `not-applicable`, record in
  the journal, advance to ship.
- **Same workflow guards** as technical: `FAIL` → loop back to implement.
- **Section 0** of the standard (per-screen design-bundle fidelity) is
  mandatory when a `design-bundle/` directory exists under the spec.

### Stage 5 — `ship`

- **Skill invoked:** `/open-pr`.
- **Standard:** [`.claude/skills/open-pr/standard.md`](../skills/open-pr/standard.md).
- **Pre-conditions for the spawn:** both validators returned `PASS` (or
  `PASS_EXCEPT_UNVERIFIABLE` with the operator's awareness). The branch is
  pushed to remote.
- **Workflow outcome:** `outcome: pr-opened`, with the PR URL surfaced to
  the operator. The PR opens as a draft when any verdict was
  `PASS_EXCEPT_UNVERIFIABLE`, ready-for-review when both were `PASS`.

## State + persistence

The workflow re-uses the existing orchestrator run-state schema verbatim —
the workflow doesn't re-invent it:

- `docs/features/<app>/<slug>/runs/<run-id>/state.json` — stage, retry
  counters, pending ADR triggers, SHA references. The script reads this
  at start (resume-safe), writes back at every stage transition (via a
  subagent that owns the file write — the workflow runtime itself has no
  filesystem access; agents do).
- `docs/features/<app>/<slug>/runs/<run-id>/journal.md.jsonl` —
  append-only event log: every subagent dispatch, every verdict, every
  stage transition gets a line.
- `docs/features/<app>/<slug>/runs/<run-id>/agents/<skill>-<NN>.md` —
  one verdict YAML per subagent invocation. The script reads the verdict
  front-matter to decide the next stage.

## How to launch — the first time, generate the JS

The runtime hasn't seen this workflow before. On first invocation the
`ultracode` keyword tells Claude to write the JS script in the background,
isolated from the chat context.

```text
ultracode: orchestrate the feature pipeline at docs/features/<app>/<slug>/spec/spec.md

Read .claude/commands/feature-pipeline.md for the full stage-by-stage
contract — every skill named there is the one the workflow must invoke
as a subagent, in the order described. The script:

  1. Loads runs/<run-id>/state.json (creates one if absent; run-id =
     <ISO-date-slug>).
  2. Walks plan → implement → validate (tech, then visual when UI in scope)
     → ship as documented in feature-pipeline.md.
  3. Pins every implementation subagent dispatch to model: 'opus' +
     isolation: 'worktree'.
  4. Loops fix-rounds with progress-based escalation (not a retry count).
  5. On ADR trigger, exits with outcome: needs-human-adr-ratification +
     the trigger details in state.json::pendingAdr.
  6. Writes journal events on every transition.
  7. Returns a structured outcome the operator can read at the end:
     pr-opened (url) | needs-human-adr-ratification (trigger) | stuck-loop
     | regression-net-negative | spec-thin-on-tech-surface.
```

Once the run completes successfully, save the generated script as a
project workflow (`/workflows` → select the run → press `s` →
choose `.claude/workflows/feature-pipeline.js`). Future runs invoke
`/feature-pipeline <spec-path>` and execute the saved script.

## How to relaunch on exit-and-resume

If the workflow exited with `outcome: needs-human-adr-ratification`:

1. Run `/adr` in chat (piloted mode) with the trigger from
   `state.json::pendingAdr`. Commit the resulting `docs/adr/<NNNN>-<slug>.md`.
2. Re-launch `/feature-pipeline <spec-path>`. The script reads `state.json`,
   sees `pendingAdr.status === 'ratified'`, clears the pending marker, and
   continues from the stage where it stopped.

## See also

- [ADR-0005](../../docs/adr/0005-dynamic-workflows-for-orchestration.md) — the substrate decision.
- [`docs/knowledge/dynamic-workflow-feature-pipeline.md`](../../docs/knowledge/dynamic-workflow-feature-pipeline.md) — full operator runbook including dogfooding + saving the generated `.js`.
- [`docs/knowledge/orchestrator-dispatch-hygiene.md`](../../docs/knowledge/orchestrator-dispatch-hygiene.md) — the dispatch knobs (`model: 'opus'`, `isolation: 'worktree'`, `biome check`).
- [`.claude/skills/tech-lead-orchestrator/standard.md`](../skills/tech-lead-orchestrator/standard.md) — the durable contract the workflow honours; updated in PR #30 to reflect the new substrate boundary.
