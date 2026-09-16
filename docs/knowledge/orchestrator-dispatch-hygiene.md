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

A long multi-commit round dispatched *without* worktree isolation edits
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
retry before escalation" surfacing. The real failure signal is *lack of
progress*: a round that closes 6 of 10 blockers is progress and should
chain into the next round. Escalate only on a stuck loop (a round closes
0 blockers), a net-negative regression (more new FAILs than closed), or
genuine product ambiguity. Track the retry counter for visibility; don't
let a small integer auto-escalate.

## Dispatch briefs must name every half of the gate, not the loudest one

A brief that names one half of a two-part gate lets the other half drift
one round at a time, invisibly, because each round passes the check its
brief told it to run.

Measured under Biome, where the two halves were sub-commands of one
command: twelve rounds whose briefs said `biome lint` (the lint sub-rule)
each passed individually, while the formatter drift the composite
`biome check` would have caught accumulated until 105 files crossed the
threshold together and a catch-up validation found 125 diagnostics.

[ADR-0007](../adr/0007-eslint-with-type-aware-rules-replaces-biome.md)
replaced Biome with ESLint, and the two halves are now two commands:
`pnpm exec eslint --no-warn-ignored --max-warnings 0` and
`node_modules/.bin/prettier --check`. That makes the trap easier to fall
into, not harder — a brief naming only ESLint reads complete. **Briefs and
pre-flight gate lists name both.**

`--no-warn-ignored --max-warnings 0` is not decoration: ESLint exits 0 on
a warning, so a brief that drops the flags is the same failure in a third
disguise.

## Verdict claims about routing/auth must name the stage

"same-origin /api: YES" is ambiguous when the property differs by stage
(prod same-origin, preview cross-origin). A verdict that asserts a
routing or auth property must name *where* it holds — otherwise a later
validator inherits the bare yes/no and flags a FAIL that's actually
by-design. See [`preview-api-cross-origin.md`](./preview-api-cross-origin.md).

## See also

- [`tech-lead-orchestrator.md`](./tech-lead-orchestrator.md)
- [`../dantotsus/orchestrator-skipped-validation-between-rounds.md`](../dantotsus/orchestrator-skipped-validation-between-rounds.md)
- [`../dantotsus/orchestrator-agency-overcorrected-on-product-decisions.md`](../dantotsus/orchestrator-agency-overcorrected-on-product-decisions.md)
