# Running the feature-pipeline Dynamic Workflow

Operator runbook for `/feature-pipeline` — the Claude Code Dynamic Workflow
that drives `plan → ship` for a ratified feature spec. The substrate
choice is in [ADR-0005](../adr/0005-dynamic-workflows-for-orchestration.md);
the stage-by-stage contract is in
[`.claude/commands/feature-pipeline.md`](../../.claude/commands/feature-pipeline.md).

## TL;DR

```text
> /feature-pipeline docs/features/<app>/<slug>/spec/spec.md
```

(First run: prefix with `ultracode:` per the slash command's body —
Claude writes the JS, the runtime executes it, you save the script
with `/workflows` → `s` → `.claude/workflows/feature-pipeline.js`.
Future runs invoke the saved script directly.)

## Before you run

- Spec ratified + every perspective checkbox ticked.
- ADRs ratified, committed under `docs/adr/`, referenced from the spec.
- Branch checked out — the workflow's subagents push to the current branch.
- Workflows enabled in `/config` (Pro plan toggle) or in the `claude.com/admin-settings/claude-code` page (enterprise).

If any of those is missing, **don't launch** — workflows can't pause for
mid-run input, and forcing a relaunch after a half-built spec means the
state file accumulates non-canonical entries.

## What you'll see while it runs

- The session stays responsive — the runtime executes the script in an
  isolated environment, separate from the chat.
- `/workflows` opens the progress view: each phase with its agent count,
  token usage, elapsed time. Arrows navigate phases; Enter drills into a
  specific agent to read its prompt + tool calls + result.
- The task panel below the input shows a one-line progress summary.
- File edits made by spawned subagents auto-approve (workflows run
  subagents in `acceptEdits` mode); shell commands and MCP tools that
  aren't in your allowlist still prompt mid-run, so add them ahead of
  time if you're stepping away.

## Possible exit outcomes

The workflow surfaces a structured outcome at end-of-run. They map to
the actions in [`.claude/commands/feature-pipeline.md`](../../.claude/commands/feature-pipeline.md)
§ "Possible exit outcomes" (the full table is the source of truth).

- `pr-opened` — happy path. PR URL is in the outcome. PR is draft if any
  validator was `PASS_EXCEPT_UNVERIFIABLE`, ready-for-review if both were
  `PASS`.
- `needs-human-adr-ratification` — an ADR-trigger fired mid-implement.
  Run `/adr` (piloted mode) in chat using the trigger details from
  `state.json::pendingAdr`, commit the new ADR, re-launch
  `/feature-pipeline <spec-path>` — the script resumes where it stopped.
- `spec-thin-on-tech-surface` — `/technical-conception` couldn't produce
  a plan because the spec's Q.O.D. is too thin. Run `/specification`
  in chat to deepen, then re-launch.
- `stuck-loop` — a fix-round closed 0 blockers. Inspect the verdict at
  `runs/<run-id>/agents/technical-validation-<NN>.md` to see what didn't
  move; decide whether to re-spec, drop the blocker, or escalate by hand.
- `regression-net-negative` — a fix-round added strictly more new FAILs
  than it closed. The latest implementation verdict has the diff against
  the prior verdict; revert + re-plan.

## Save the script after the first successful run

This is the moment the workflow becomes a repo artefact:

1. After the run finishes (`outcome: pr-opened`), open `/workflows`.
2. Select the run.
3. Press `s`.
4. In the save dialog, `Tab` toggles location. Pick
   **`.claude/workflows/`** (project-shared) so every clone of the repo
   sees `/feature-pipeline` autocomplete.
5. Name: `feature-pipeline`.
6. Commit the resulting `.claude/workflows/feature-pipeline.js`.

From that commit onward, `/feature-pipeline <spec-path>` runs the saved
JS directly; the `ultracode:` keyword and the launch prompt in
`.claude/commands/feature-pipeline.md` are only needed for the first run
or after the script is regenerated.

## When to regenerate the JS

The workflows runtime is in research preview as of 2026-06; the JS API
surface isn't a stable contract. If a future Claude Code release breaks
the saved script:

1. Delete `.claude/workflows/feature-pipeline.js`.
2. Re-run `/feature-pipeline` with the `ultracode:` prefix per the slash
   command's launch instructions.
3. Save the new script. Diff against the previous one in the PR for
   reviewers.

The skill standards (`.claude/skills/<skill>/standard.md`) are the
durable contract — the workflow regenerates against them. Same with the
slash command's stage-by-stage description: that's the spec the
regenerated script honours.

## Cost + caps

- Workflows count toward your plan's usage like any session.
- Up to 16 concurrent subagents, 1000 total per run — per Claude Code
  docs. Our pipeline runs well under both even on a long fix-round
  cycle.
- Run on a small feature first to gauge cost (a slug with one route,
  one component) before launching on a sprawling spec.

## Observability + recovery

- Every stage transition writes a line to
  `runs/<run-id>/journal.md.jsonl`. Tail it during a long run.
- The verdict YAMLs at `runs/<run-id>/agents/<skill>-<NN>.md` are the
  authoritative record of what each subagent decided.
- If the run aborts (Claude Code exit, network drop, runtime crash),
  resume is *not* automatic across sessions. Re-launch
  `/feature-pipeline <spec-path>`; the script reads `state.json`, skips
  already-completed stages, and continues.

## See also

- [ADR-0005](../adr/0005-dynamic-workflows-for-orchestration.md)
- [`.claude/commands/feature-pipeline.md`](../../.claude/commands/feature-pipeline.md)
- [`.claude/skills/tech-lead-orchestrator/standard.md`](../../.claude/skills/tech-lead-orchestrator/standard.md)
- [`docs/knowledge/orchestrator-dispatch-hygiene.md`](./orchestrator-dispatch-hygiene.md)
- [Anthropic — Orchestrate subagents at scale with dynamic workflows](https://code.claude.com/docs/en/workflows)
