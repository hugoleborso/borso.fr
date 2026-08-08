# ADR-0005 — Dynamic Workflows for the tech-lead orchestration pipeline

- **Status:** Accepted
- **Date:** 2026-06-05
- **Decided in:** PR [#30](https://github.com/hugoleborso/borso.fr/pull/30)
- **Supersedes the substrate of:** [ADR-0001 — Tech-lead-orchestrator replaces auto-chain](./0001-tech-lead-orchestrator-replaces-auto-chain.md) (the orchestrator's *intent* stands; only the *runtime substrate* changes).

## Frame

The tech-lead orchestrator pipeline (`spec → adrs → plan → implement → validate → ship`) currently runs as a chat-bound **Skill** that dispatches sub-**Agents** via the Agent tool inside an interactive Claude Code session. The kaizen sweep of pragma-v1 PR #26 catalogued, in writing, the failure modes that shape produces — see `docs/dantotsus/orchestrator-skipped-validation-between-rounds.md`, `docs/dantotsus/orchestrator-agency-overcorrected-on-product-decisions.md`, `docs/dantotsus/cdk-destroy-all-wipes-the-shared-cluster-stack.md`. Read together, they share one parent: **the orchestrator is a long-lived stateful conversation**, and a long-lived stateful conversation is fragile in ways the kaizen entries enumerate:

- Session-quota limits kill sub-agents mid-run.
- Session resumes terminate background dispatches.
- In-flight WIP from sub-agents leaks into the main worktree and trips the stop hook.
- The orchestrator turn-by-turn can drift on the agency boundary (round-1 too timid, round-16 over-eager).
- Between rounds, the orchestrator can *forget* to dispatch `/technical-validation` and ship a verdict it has no independent confirmation of.
- Code authored after PR-merge gets stranded off-main (the destroy-script fix this very PR carries).

The orchestrator-standard edit in PR #26 added rules to mitigate each — "validate is non-skippable", "model: opus explicit", "isolation: worktree", "biome check not lint". Those are *DevX checks* on a fragile substrate. The substrate itself is the root cause.

## Decision

The pipeline moves from chat-bound Skill + sub-Agents to **Claude Code Dynamic Workflows** for the deterministic stages, with the human-bound stages staying in chat.

Reference: <https://code.claude.com/docs/en/workflows>. Dynamic Workflows are a research-preview Claude Code primitive (v2.1.154+, all paid plans + API + Bedrock + Vertex AI + Foundry) in which Claude writes a JavaScript script that the runtime executes in an isolated environment, separate from the chat context. Intermediate results live in script variables, not the conversation. The script spawns subagents, holds the branching logic, and is saved to `.claude/workflows/<name>.js` once a successful run has been dogfooded and the operator presses `s` in the `/workflows` view.

### Boundary

| Stage | Substrate | Rationale |
|---|---|---|
| `spec` | Skill in chat (`/specification`) | Human-bound — perspective sweeps, AskUserQuestion, ratification. Workflows can't pause for human input mid-run. |
| `adrs` | Skill in chat (`/adr` piloted mode) | Human-bound — criteria, alternatives, score-matrix all need the operator. |
| `plan` | Workflow stage (invokes `/technical-conception` subagent) | Deterministic given spec + ratified ADRs. |
| `implement` | Workflow stage (invokes `/implementation` subagent, looped per fix-round) | Deterministic given plan + verdict. |
| `validate` (technical) | Workflow stage (invokes `/technical-validation` subagent) | Non-skippable per the standard; declarative in the script. |
| `validate` (visual) | Workflow stage (invokes `/visual-validation` subagent when UI in scope) | Same as technical. |
| `ship` | Workflow stage (invokes `/open-pr` subagent) | Final step; surfaces the PR URL to the operator. |
| `arbitrate` (retry / replan / escalate) | Script logic inside the workflow | Progress-based escalation per the standard, codified in the loop. |
| `escalated` (ADR-trigger surface mid-run) | Workflow **exits** with a structured status, operator ratifies in chat, re-launches | Workflows can't pause for human input — exit-and-resume is the documented pattern. |

### Trigger

A saved project workflow at `.claude/workflows/feature-pipeline.js` runs as `/feature-pipeline <spec-path>` once dogfooded. Until the `.js` is saved, the launch surface is a slash command at `.claude/commands/feature-pipeline.md` that expands to the `ultracode:` prompt for Claude to generate the script.

## Alternatives considered

| Option | Why rejected |
|---|---|
| **Keep the chat-bound Skill + sub-Agents.** | Every kaizen-extracted failure traces back to this substrate. Rules-on-a-fragile-base. |
| **GitHub Actions end-to-end** with `claude-code-action`. | The operator (Hugo) explicitly chose Dynamic Workflows over Actions: *"No. Of a script, just Claude workflows, if you do not know about them check your internal doc"*. Workflows live in the same Claude Code substrate the rest of the operator's loop already uses; GHA would have introduced a second surface for the same orchestration. |
| **Local CLI script.** | Same kaizen-failure class as today (a process Hugo babysits). |
| **Hybrid — orchestrator stays Skill, validators become GHA jobs.** | Half-measure: preserves the agency-drift problem the kaizen flagged hardest. |

## Consequences

**Positive:**
- Session-quota / session-resume failures structurally disappear for the deterministic stages — the runtime owns the script, not a chat turn.
- "Forgot to dispatch the validator" is unexpressible — the validator step is a declared stage in the script, not a discretionary call.
- State (`state.json`, `journal.md.jsonl`, `agents/<n>.md`) keeps its current shape — workflows just spawn subagents that read/write those files; no migration of the run-state schema.
- Progress is observable: `/workflows` view shows per-agent token usage, pause/resume, drill into transcripts.
- A successful workflow run produces a reusable `.js` saved as a project command — the orchestration itself becomes a reviewable artefact, not an emergent property of the chat.

**Negative:**
- **The JS API surface for workflow scripts is undocumented** as of 2026-06 (per the official `/en/workflows` docs page; Claude writes the scripts and there is no human-authored contract). Mitigation: the operator launches `/feature-pipeline` once, Claude generates the JS, operator saves with `s`, the resulting script becomes the authoritative reference the repo iterates on.
- **No mid-run user input.** Documented constraint. The pipeline absorbs this by terminating workflows at human-gate points (ADR-trigger fired mid-implement → workflow exits with `status: needs-human-ratification`, operator ratifies in chat, re-launches).
- **Research preview.** API may change. Mitigation: when the API changes, the existing skill standards (`.claude/skills/*/standard.md`) are the durable contract — the workflow regenerates against them.
- **Resumable within the same session only.** Exit Claude Code mid-run, next session starts fresh. Mitigation: the run-state files on the branch are the recovery contract; the workflow re-reads them on relaunch and skips already-completed stages.
- **Higher per-run cost** (many subagents in parallel). Mitigation: dogfood on a small feature first; `/workflows` view shows live token usage; agent caps (16 concurrent / 1000 total per run) bound the runaway-cost risk.

## Implementation in this PR

- `docs/adr/0005-dynamic-workflows-for-orchestration.md` (this file).
- `.claude/commands/feature-pipeline.md` — slash-command launch surface; expands to the `ultracode:` prompt that triggers workflow generation.
- `.claude/skills/tech-lead-orchestrator/standard.md` — updated to reflect that the Skill is now the chat-bound preface (`spec → adrs`) before handoff to the workflow; the workflow owns `plan → ship`.
- `docs/knowledge/dynamic-workflow-feature-pipeline.md` — operator runbook for launch, dogfood, save.
- `CLAUDE.md` — orchestrator pipeline section reflects the new substrate.

## Implementation in the follow-up

- The first successful `/feature-pipeline` run produces a JS workflow Claude generates. The operator saves it (`/workflows` → `s` → `.claude/workflows/feature-pipeline.js`). That commit closes this ADR's implementation.
- The orchestrator standard's "sub-agent dispatch hygiene" section (`model: 'opus'`, `isolation: 'worktree'`, `biome check`) carries forward into the generated workflow as in-line comments at each spawn site.

## See also

- [`docs/dantotsus/orchestrator-skipped-validation-between-rounds.md`](../dantotsus/orchestrator-skipped-validation-between-rounds.md) — the failure shape this substrate decision answers.
- [`docs/dantotsus/orchestrator-agency-overcorrected-on-product-decisions.md`](../dantotsus/orchestrator-agency-overcorrected-on-product-decisions.md) — the agency-boundary failure the workflow's exit-and-resume pattern enforces structurally.
- [`docs/knowledge/orchestrator-dispatch-hygiene.md`](../knowledge/orchestrator-dispatch-hygiene.md) — the dispatch knobs that carry forward into workflow subagent spawns.
- [`docs/knowledge/dynamic-workflow-feature-pipeline.md`](../knowledge/dynamic-workflow-feature-pipeline.md) — operator runbook.
- [Anthropic — Orchestrate subagents at scale with dynamic workflows](https://code.claude.com/docs/en/workflows)
- [Anthropic — Introducing dynamic workflows in Claude Code](https://claude.com/blog/introducing-dynamic-workflows-in-claude-code)
