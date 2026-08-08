# Tech-lead-orchestrator dispatch hygiene

Hard-won mechanics for how the orchestrator should spawn its
implementation/validation sub-agents. None of these are defects that
shipped a bug — they're the operating knobs that, set wrong, cost time
across run `2026-05-19-1937-pragma`.

## Pin implementation sub-agents to `model: 'opus'` explicitly

`Agent({ subagent_type: 'claude' })` without a `model` parameter relies
on "inherits from parent". Whether that's actually Opus, and whether the
harness silently downgrades the catch-all agent for cost, is not
something to trust by assumption — implementation is the
highest-capability stage in the pipeline. **Always pass `model: 'opus'`
on implementation dispatches.** Validation sub-agents
(`technical-validator`, `visual-validator`) can ride their agent-def
default — they check against a written spec rather than generating new
code. Audit cheaply on session resume: spot-check one sub-agent
transcript and confirm the model.

## `isolation: "worktree"` for any round ≥ ~4 commits or ≥ ~20 files

A long multi-commit round dispatched _without_ worktree isolation edits
the main working tree. Symptoms: the stop hook fires every turn
flagging in-flight WIP as uncommitted, and the orchestrator can't safely
commit it (the sub-agent races on its own `git add`). Worktree-isolated
rounds stay quiet and commit/push their own branch.

Caveat observed: on some dispatches the `isolation: "worktree"`
parameter appeared to be **ignored** — `git worktree list` showed no new
entry and the edits landed in main. Diagnostic: immediately after
dispatch, run `git worktree list` and confirm a new entry exists. If it
doesn't, the harness dropped the flag — fall back to dispatching one
round at a time so the WIP-in-main only trips the stop hook once.

## Escalate on lack of progress, not on a retry count

A hard "cap of 3 retries" framing causes premature "this is the last
retry before escalation" surfacing. The real failure signal is _lack of
progress_: a round that closes 6 of 10 blockers is progress and should
chain into the next round. Escalate only on a stuck loop (a round closes
0 blockers), a net-negative regression (more new FAILs than closed), or
genuine product ambiguity. Track the retry counter for visibility; don't
let a small integer auto-escalate.

## Dispatch briefs must say `biome check`, not `biome lint`

`biome lint` runs only the lint sub-rule. The pre-commit hook runs the
composite `biome check` (lint + formatter + organize-imports). Twelve
rounds whose briefs said `biome lint` each passed individually, but the
formatter drift accumulated invisibly until 105 files crossed the
threshold together and a catch-up validation found 125 diagnostics.
Briefs and pre-flight gate lists must name `biome check`.

## Verdict claims about routing/auth must name the stage

"same-origin /api: YES" is ambiguous when the property differs by stage
(prod same-origin, preview cross-origin). A verdict that asserts a
routing or auth property must name _where_ it holds — otherwise a later
validator inherits the bare yes/no and flags a FAIL that's actually
by-design. See [`preview-api-cross-origin.md`](./preview-api-cross-origin.md).

## See also

- [`tech-lead-orchestrator.md`](./tech-lead-orchestrator.md)
- [`../dantotsus/orchestrator-skipped-validation-between-rounds.md`](../dantotsus/orchestrator-skipped-validation-between-rounds.md)
- [`../dantotsus/orchestrator-agency-overcorrected-on-product-decisions.md`](../dantotsus/orchestrator-agency-overcorrected-on-product-decisions.md)
