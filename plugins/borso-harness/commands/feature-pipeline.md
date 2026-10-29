---
description: Launch a Dynamic Workflow that drives a ratified feature spec from plan → opened PR, invoking the existing tech-lead skills as workflow subagents (the Skill stays for spec + ADR ratification; this command starts when those are done).
---

> **Paths.** `${CLAUDE_PLUGIN_ROOT}` is the borso-harness folder. Claude Code fills it in when the harness loads as a plugin, and the harness's session hook exports it to the shell when a repository links the harness into `.claude/` instead. If it is still unexpanded, the folder is the output of `cd -P .claude/skills/route/../.. && pwd`. Repository paths in this file are borso.fr's layout, which is the default. `${CLAUDE_PLUGIN_ROOT}/scripts/harness-path.sh` prints where the current repository keeps each one (`standards`, `dantotsus`, `knowledge`, `adr`, `features`, `reports`, `prBodyCheck`, `blueprintIndex`, `phone`); read every default through that answer, and when the mapped file is missing, report that step as unverifiable rather than substitute something else. A record of borso.fr's own, such as a dantotsu or ADR cited by name, that this repository does not have is at https://github.com/hugoleborso/borso.fr/tree/main/docs. The harness's agents are dispatched by their bare names, such as `technical-validator`; a session that installed the harness as a plugin lists them as `borso-harness:technical-validator`.

## Pre-conditions (the workflow assumes these are already true)

The Dynamic Workflow **does not** invoke `/specification` or `/adr` — those are
human-bound and stay as chat Skills. Before running `/feature-pipeline`, confirm:

- A `docs/features/<app>/<slug>/spec/spec.md` exists, every perspective
  checkbox is ticked, the *Q.O.D.* table is filled, and you've ratified it.
  If it isn't, run `/specification` first.
- Every ADR-trigger candidate from the spec has been ratified via
  `/adr` (piloted mode), and the resulting ADRs are committed under
  `docs/adr/`. The spec's *Architectural choices* section names them.
- The branch you want the workflow to push to is checked out
  (typically `claude/<slug>-<short>`).

If any pre-condition is missing, **do not** run this workflow — the runtime
can't pause for mid-run human input, so it would either over-decide
(round-16 anti-pattern, see [ADR-0005](../../../docs/adr/0005-dynamic-workflows-for-orchestration.md))
or strand state for a forced exit-and-resume.

## What the workflow does

A single Claude Code Dynamic Workflow drives `plan → implement → validate →
ship` end-to-end. Each stage spawns a subagent that invokes the existing
skill of that name, with the standards files (`${CLAUDE_PLUGIN_ROOT}/skills/<skill>/standard.md`)
as the durable contract.

### Thin orchestrator, fresh agents

The orchestrator does not read code, diffs or report bodies. It reads verdict
front-matter and decides the next step. Each phase and each fix round is a
**fresh** subagent; never resume an earlier agent for a new round, because it
carries that round's context and its conclusions. Every brief is consolidated
and stands alone:

- the original goal, in the operator's words;
- the spec and plan paths;
- every directive the operator gave since, in order;
- the path of the previous report, when there is one;
- the branch and the SHA to work from.

The script orchestrates the following stages, in order. The skills named
here are **the existing skills in this repo** — the workflow's job is to
invoke them, not to reimplement them.

### Stage 1 — `plan` (one subagent)

- **Skill invoked:** `/technical-conception`.
- **Standard:** [`${CLAUDE_PLUGIN_ROOT}/skills/technical-conception/standard.md`](../skills/technical-conception/standard.md).
- **Input:** the spec path passed as `args.specPath`. The ADR numbers from
  the spec's *Architectural choices* table.
- **Output the subagent writes:** `docs/features/<app>/<slug>/plan/plan.md`,
  referencing every ADR. Verdict YAML at `runs/<run-id>/agents/technical-conception-01.md`.
- **Workflow guard:** if the verdict is `status: question`, exit with
  `outcome: needs-human-input` and the question. If `status: blocked`, exit
  with `outcome: spec-thin-on-tech-surface` — the operator runs
  `/specification` to deepen the spec, then re-launches.

### Stage 2 — `implement` (loop, fix-rounds; `model: 'opus'`, `isolation: 'worktree'`)

- **Skill invoked per round:** `/implementation`.
- **Standard:** [`${CLAUDE_PLUGIN_ROOT}/skills/implementation/standard.md`](../skills/implementation/standard.md).
- **Hygiene (non-skippable per [`orchestrator-dispatch-hygiene.md`](../../../docs/knowledge/orchestrator-dispatch-hygiene.md)):**
  every spawn passes `model: 'opus'` explicitly + `isolation: 'worktree'`.
  The dispatch brief names both halves of the gate — oxlint with
  `--type-aware`, and `oxfmt --check` — because a brief naming one half lets
  the other drift a round at a time.
- **Slices:** one fresh subagent per plan slice, in order. Before writing
  code, each names the goal, the smallest change that meets it, and the data
  shape with its organising structure (state machine, table, typed model).
- **Fix round:** after a validation FAIL, one fresh subagent gets the report
  path and triages each finding: fix, dismiss with a concrete reason, or ask
  the operator for a product call.
- **Integrate before validating.** `isolation: 'worktree'` leaves a round's
  commits on that worktree's branch, not on the run branch. After every
  implement round, and before any validator starts, one subagent
  fast-forwards the run branch onto each round's branch (cherry-picking when
  two rounds diverged) and returns the resulting SHA; every validator brief
  names that SHA. On PR #193 three validation rounds opened a checkout that
  held only the plan, because the four implementation rounds and two fix
  rounds had each landed on their own worktree branch.
- **Workflow guard — ADR trigger:** if any sub-agent emits a verdict
  flagging an ADR trigger (new third-party dep, new secret, attribution-in-prod-UI,
  schema column driven by an external service, feature scope beyond the
  ratified spec — per `tech-lead-orchestrator/standard.md` § *Decision boundary*),
  the workflow **exits** with `outcome: needs-human-adr-ratification`,
  serialises the trigger to `runs/<run-id>/state.json::pendingAdr`, and
  surfaces the trigger to the operator. The operator runs `/adr` (piloted
  mode) in chat, commits the ADR, then re-launches `/feature-pipeline` —
  the script reads `state.json`, sees the ADR is ratified, and continues
  from where it stopped.

### Validators are spawned as their own agent type

A workflow subagent has no Agent tool, so a subagent told to run
`/technical-validation` or `/visual-validation` cannot
dispatch the isolated validator those skills describe, and ends up validating
work in the context that is supposed to be blind to it. Four agents on PR #193
hit this. The script spawns the validator directly instead:
`agent(brief, { agentType: 'technical-validator' })`, likewise
`'visual-validator'`, with the brief the skill would have sent.

### Stage 3 — `validate (technical)`, two rounds at most

- **Skill invoked:** `/technical-validation`, whose validator the script spawns
  with `agentType: 'technical-validator'`. It also checks the `reviewer`
  bullets of the `## Enforced by` sections in `docs/standards/`; there is no separate
  standards review.
- **Standard:** [`${CLAUDE_PLUGIN_ROOT}/skills/technical-validation/standard.md`](../skills/technical-validation/standard.md).
- **Round 1** runs once, after the last slice, on the integrated SHA, over
  the whole branch. Its report carries `Reviewed: <sha>`. A runtime
  smoke-test is not a substitute.
- **Findings are typed.** Only `blocking` findings fail the verdict.
  `non-blocking` ones go to the PR body and never start a round.
- **Round 2** runs only when round 1 had blocking findings, after one fix
  round, and reviews `git diff <reviewed-sha>..HEAD` plus each round-1
  blocking finding.
- **Workflow guard:** `PASS` → visual (or ship if UI not in scope).
  `PASS_EXCEPT_UNVERIFIABLE` → advance with a disclosure carried to the PR
  body. `FAIL` after round 2 → exit with `outcome: needs-operator` and the
  report path. There is no round 3.

### Stage 4 — `validate (visual)`, once, at the end (when UI in scope)

- **Skill invoked:** `/visual-validation`, once, after technical validation
  passes. Never per slice.
- **Standard:** [`${CLAUDE_PLUGIN_ROOT}/skills/visual-validation/standard.md`](../skills/visual-validation/standard.md).
- **Scope:** if the spec's *What the user sees / does* section is empty
  (back-end-only feature), skip — verdict `not-applicable`, record in
  the journal, advance to ship.
- **Guard:** `FAIL` → one fresh fix subagent, then one re-run. A FAIL after
  that exits with `outcome: needs-operator`.
- **Section 0** of the standard (per-screen design-bundle fidelity) is
  mandatory when a `design-bundle/` directory exists under the spec.

### Stage 5 — `ship`

- **Skill invoked:** `/open-pr`.
- **Contract:** [`${CLAUDE_PLUGIN_ROOT}/skills/open-pr/SKILL.md`](../skills/open-pr/SKILL.md), whose limits live in `scripts/pr/check-pr-body.ts`.
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
  front-matter to decide the next stage. `<NN>` counts every invocation of
  that skill in the run and never starts again at `01`: the third technical
  validation is `technical-validation-03` even when a fix round came between.
  The same name is the agent's `--from` label and its scratch folder, so a
  reused number lands a second agent in the first one's logs and verdict file,
  as it did on PR #206.

## How to launch — the first time, generate the JS

The runtime hasn't seen this workflow before. On first invocation the
`ultracode` keyword tells Claude to write the JS script in the background,
isolated from the chat context.

```text
ultracode: orchestrate the feature pipeline at docs/features/<app>/<slug>/spec/spec.md

Read ${CLAUDE_PLUGIN_ROOT}/commands/feature-pipeline.md for the full stage-by-stage
contract — every skill named there is the one the workflow must invoke
as a subagent, in the order described. The script:

  1. Loads runs/<run-id>/state.json (creates one if absent; run-id =
     <ISO-date-slug>).
  2. Walks plan → implement (one fresh agent per slice) → validate (tech,
     two rounds at most, then visual once when UI in scope) → ship as
     documented in feature-pipeline.md. Never resumes an agent; every
     brief is consolidated.
  3. Pins every implementation subagent dispatch to model: 'opus' +
     isolation: 'worktree'.
  4. Runs at most two technical rounds; blocking findings after round 2
     exit with outcome: needs-operator.
  5. On ADR trigger, exits with outcome: needs-human-adr-ratification +
     the trigger details in state.json::pendingAdr.
  6. Writes journal events on every transition.
  7. Returns a structured outcome the operator can read at the end:
     pr-opened (url) | needs-human-adr-ratification (trigger) |
     needs-operator (report) | spec-thin-on-tech-surface.
```

Once the run completes successfully, the generated script *may* be saved
as a project workflow (`/workflows` → select the run → press `s` → choose
a path under `.claude/workflows/`), after which future runs execute the
saved script rather than regenerating it.

**Nothing is saved there today**, and three documents described the saved
file as if it were. Until one is committed, every `/feature-pipeline` is a
first-run generation from the contract below — which is the durable
artefact either way, and the reason a missing script costs correctness
nothing.

## How to relaunch on exit-and-resume

If the workflow exited with `outcome: needs-human-adr-ratification`:

1. Run `/adr` in chat (piloted mode) with the trigger from
   `state.json::pendingAdr`. Commit the resulting `docs/adr/<NNNN>-<slug>.md`.
2. Re-launch `/feature-pipeline <spec-path>`. The script reads `state.json`,
   sees `pendingAdr.status === 'ratified'`, clears the pending marker, and
   continues from the stage where it stopped.

## See also

- [ADR-0005](../../../docs/adr/0005-dynamic-workflows-for-orchestration.md) — the substrate decision.
- [`docs/knowledge/dynamic-workflow-feature-pipeline.md`](../../../docs/knowledge/dynamic-workflow-feature-pipeline.md) — full operator runbook including dogfooding + saving the generated `.js`.
- [`docs/knowledge/orchestrator-dispatch-hygiene.md`](../../../docs/knowledge/orchestrator-dispatch-hygiene.md) — the dispatch knobs (`model: 'opus'`, `isolation: 'worktree'`, both halves of the lint gate).
- [`${CLAUDE_PLUGIN_ROOT}/skills/tech-lead-orchestrator/standard.md`](../skills/tech-lead-orchestrator/standard.md) — the durable contract the workflow honours; updated in PR #30 to reflect the new substrate boundary.
