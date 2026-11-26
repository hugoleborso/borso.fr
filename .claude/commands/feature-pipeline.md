---
description: Launch a Dynamic Workflow that drives a ratified feature spec from plan → opened PR, invoking the existing tech-lead skills as workflow subagents (the Skill stays for spec + ADR ratification; this command starts when those are done).
---

## Pre-conditions (the workflow assumes these are already true)

The workflow does not invoke `/specification` or `/adr`, which need the human
and stay as chat Skills. Before running `/feature-pipeline`, confirm:

- `docs/features/<app>/<slug>/spec/spec.md` exists, every perspective
  checkbox is ticked, the *Q.O.D.* table is filled, and you've ratified it.
- Every ADR-trigger candidate from the spec has been ratified via `/adr`
  (piloted mode), and the ADRs are committed under `docs/adr/` and named in
  the spec's *Architectural choices* section.
- The branch the workflow pushes to is checked out.

If one is missing, do not run it. The runtime cannot pause for mid-run human
input, so it would over-decide (see
[ADR-2026-06-05T2337](../../docs/adr/2026-06-05T2337-dynamic-workflows-for-orchestration.md))
or strand state for a forced exit-and-resume.

## What the workflow does

One Dynamic Workflow drives `plan → implement → validate → ship`. Each stage
spawns a subagent that invokes the existing skill of that name, whose
`standard.md` is the durable contract. The workflow invokes them and never
reimplements them.

### Thin orchestrator, fresh agents

The orchestrator does not read code, diffs or report bodies. It reads verdict
front matter and decides the next step. Each phase and each fix round is a
**fresh** subagent, because a resumed one carries its earlier round's
conclusions. Every brief stands alone:

- the original goal, in the operator's words;
- the spec and plan paths;
- every directive the operator gave since, in order;
- the path of the previous report, when there is one;
- the branch and the SHA to work from.

### Stage 1 — `plan` (one subagent)

- **Skill:** `/technical-conception`, given `args.specPath` and the ADR ids
  from the spec's *Architectural choices* table.
- **Output:** `docs/features/<app>/<slug>/plan/plan.md`, referencing every
  ADR, and its verdict at `runs/<run-id>/agents/technical-conception-01.md`.
- **Guard:** `status: question` exits with `outcome: needs-human-input` and
  the question. `status: blocked` exits with
  `outcome: spec-thin-on-tech-surface`, and the operator deepens the spec
  with `/specification`, then relaunches.

### Stage 2 — `implement` (loop, fix-rounds; `model: 'opus'`, `isolation: 'worktree'`)

- **Skill per round:** `/implementation`.
- **Hygiene:** every spawn passes `model: 'opus'` and
  `isolation: 'worktree'`, and its brief names both halves of the gate,
  oxlint with `--type-aware` and `oxfmt --check`, per
  [`orchestrator-dispatch-hygiene.md`](../../docs/knowledge/orchestrator-dispatch-hygiene.md).
- **Slices:** one fresh subagent per plan slice, in order. Before writing
  code, each names the goal, the smallest change that meets it, and the data
  shape with its organising structure.
- **Fix round:** after a validation FAIL, one fresh subagent gets the report
  path and fixes, dismisses with a concrete reason, or asks the operator for a
  product call, per finding.
- **Integrate before validating.** `isolation: 'worktree'` leaves a round's
  commits on that worktree's branch. After every implement round, before any
  validator starts, one subagent fast-forwards the run branch onto each
  round's branch (cherry-picking when two diverged) and returns the SHA every
  validator brief names. Without it, validators open a checkout holding only
  the plan.
- **Guard, ADR trigger:** a verdict flagging a decision that
  `tech-lead-orchestrator/standard.md` § *Decision boundary* reserves for the
  human exits with `outcome: needs-human-adr-ratification` and serialises the
  trigger to `runs/<run-id>/state.json::pendingAdr`.

### Validators are spawned as their own agent type

A workflow subagent has no Agent tool, so one told to run a validation skill
would validate in the context meant to be blind to the work. The script spawns
the validator directly, `agent(brief, { agentType: 'technical-validator' })`,
likewise `'visual-validator'`, with the brief the skill would have sent.

### Stage 3 — `validate (technical)`, two rounds at most

- **Skill:** `/technical-validation`, whose validator also checks the
  `reviewer` bullets of `docs/standards/`. There is no separate standards
  review.
- **Round 1** runs once, after the last slice, on the integrated SHA, over the
  whole branch. A runtime smoke test is not a substitute.
- **Round 2** runs only when round 1 had blocking findings, after one fix
  round. Non-blocking findings go to the PR body and never start a round.
- **Guard:** `PASS` → visual (or ship if UI is not in scope).
  `PASS_EXCEPT_UNVERIFIABLE` → advance, carrying the disclosure to the PR
  body. `FAIL` after round 2 → exit with `outcome: needs-operator` and the
  report path.

### Stage 4 — `validate (visual)`, once, at the end (when UI in scope)

- **Skill:** `/visual-validation`, once, after technical validation passes.
- **Scope:** a spec whose *What the user sees / does* section is empty skips
  it with verdict `not-applicable`, recorded in the journal.
- **Guard:** `FAIL` → one fresh fix subagent, then one re-run. A FAIL after
  that exits with `outcome: needs-operator`.
- **Design-bundle fidelity**, row 0 of the visual validator's list, is
  mandatory when a `design-bundle/` directory exists under the spec.

### Stage 5 — `ship`

- **Skill:** `/open-pr`, once both validators returned `PASS` or
  `PASS_EXCEPT_UNVERIFIABLE` and the branch is pushed.
- **Outcome:** `outcome: pr-opened` with the PR URL. The PR opens as a draft
  when any verdict was `PASS_EXCEPT_UNVERIFIABLE`.

## State + persistence

The workflow reuses the orchestrator's run-state schema. The runtime has no
filesystem access, so a subagent owns every file write.

- `runs/<run-id>/state.json`: stage, retry counters, pending ADR triggers,
  SHAs. Read at start (resume-safe), written at every transition.
- `runs/<run-id>/journal.md.jsonl`: one line per dispatch, verdict and
  transition.
- `runs/<run-id>/agents/<skill>-<NN>.md`: one verdict per invocation.
  `<NN>` counts every invocation of that skill in the run and never restarts
  at `01`, because the same name is the agent's `--from` label and scratch
  folder, and a reused number lands a second agent in the first one's files.

## How to launch

No script is saved under `.claude/workflows/`, so every `/feature-pipeline`
generates one from this contract. The `ultracode` keyword has Claude write it
in the background:

```text
ultracode: orchestrate the feature pipeline at docs/features/<app>/<slug>/spec/spec.md

Read .claude/commands/feature-pipeline.md for the stage-by-stage contract.
Every skill named there is the one the workflow invokes as a subagent, in
that order. Load or create runs/<run-id>/state.json (run-id =
<ISO-date-slug>), write journal events on every transition, and return one
outcome: pr-opened (url) | needs-human-input (question) |
needs-human-adr-ratification (trigger) | needs-operator (report) |
spec-thin-on-tech-surface.
```

Saving the generated script, what a run looks like, and the relaunch after
`needs-human-adr-ratification` are in the operator runbook,
[`docs/knowledge/dynamic-workflow-feature-pipeline.md`](../../docs/knowledge/dynamic-workflow-feature-pipeline.md).
