---
date: 2026-10-25
introduced-at: conception
detected-at: local
severity: medium
related-pr: '#193'
fix-commits: [self, 458e886c4]
eradication-level: 2
eradication-paths: [scripts/hooks/checks/validation-runs-as-its-agent.core.ts, scripts/hooks/checks/validation-runs-as-its-agent.core.test.ts, scripts/hooks/hook-events.ts, .claude/commands/feature-pipeline.md, .claude/skills/tech-lead-orchestrator/SKILL.md]
time-to-detect: hours
tags: [orchestrator, agents, harness, validation, git]
zone: .claude/commands/feature-pipeline.md
recurs: [parallel-agents-share-one-index-and-every-generator]
---

# The validator opened a checkout holding only the plan

## User impact

The operator relies on an isolated validator to judge each branch. On the
`/feature-pipeline` run for PR #193 that judgment was missing or late
(measured from the run's `KAIZEN.md` and agent reports).

| | Seen | Expected |
| --- | --- | --- |
| Three validation rounds (`technical-validation-01` to `-03`) | started on a checkout holding only the plan. One validator fast-forwarded and cherry-picked two diverged branches by hand, another was refused the fast-forward by the auto-mode classifier | started on the branch holding every implementation commit |
| Four agents (`visual-validation-02`, `technical-validation-03`, `visual-validation-03`, `open-pr-01`) | validated in their own context, one sealing 68 files | an isolated validator agent ran each review |

## Causal chain

- Validators reviewed nothing, or reviewed in a context that was not
  isolated.
  - Branch: the checkout held only the plan.
    - The four implementation rounds ran with `isolation: 'worktree'`.
      Each committed to a worktree branch of its own, and the run branch
      never moved.
      - The pipeline contract listed the next stage, validation, right after
        the implement rounds, with no step bringing their commits back.
  - Branch: the stage agents had no validator to dispatch.
    - Each was told by `/technical-validation` or `/visual-validation` to
      dispatch the isolated validator agent. A workflow subagent has no
      Agent tool, so each ran the review itself.
      - The contract in `.claude/commands/feature-pipeline.md` was written as
        a list of skills to invoke. Each stage inherited its skill's
        assumptions about who invokes it.
        - The skills were written for a chat session, which has the Agent
          tool and one checkout. The Workflow runtime gives a subagent
          neither, and nothing in the codebase stated that difference where
          the contract was written (Machine).

## Root cause of occurrence

*Thought a workflow stage could do what the skill it invokes says, actually a
subagent has no Agent tool and a worktree round's commits stay on its own
branch, so the orchestrator has to spawn validators by type and integrate
branches itself.* (Machine)

The skills and the runtime disagreed on what a caller can do, and the
contract sat on top of both. The Workflow runtime offered the way out,
`agentType` on `agent()` to spawn a named agent definition, and the contract
never asked for it.

## Detection failure causes

- **Local validation:** each agent worked around its gap and logged it.
  Nothing stopped the run, so the cost showed as repeated friction rather
  than a failure.
- **The contract:** the generated workflow script is written fresh from prose
  at every launch and then discarded, so nothing shows whether a launch read
  a given paragraph.

## Countermeasure

The validators were run inline and the branches integrated by hand during
PR #193.

## Eradication

**Type:** DevX check (level 2)

**Reference:** the commit adding this file, `a83f0a600` (#200), for the
contract. The hook came with the PR #278 kaizen, and commit `458e886c4`
(#411) moved it into `scripts/hooks/checks/validation-runs-as-its-agent.core.ts`.
The shell hook `.claude/hooks/pretool-validation-runs-as-its-agent.sh` is gone.

The integration half holds in prose. `.claude/commands/feature-pipeline.md`
requires one subagent, after every implement round and before any validator,
to fast-forward the run branch onto each round's worktree branch and to name
the resulting SHA in every validator brief. It did not recur on PR #206.

The dispatch half recurred twice under prose alone:

- On PR #206, after the contract change merged, four stage agents again ran
  a validation skill with no Agent tool (`runs/2026-10-27-assistants-act-on-pragma/agents/`).
- On PR #278, `/tech-lead-orchestrator` ran with sequential Agent calls, not
  the Workflow. `tech-val`, `tech-val-2` and `vis-val` again ran inline
  (`docs/features/pragma/open-in-two-calls/validation/`).

So the cause is any subagent loading a skill whose first step dispatches an
agent. That moment is visible to a hook. Claude Code puts `agent_id` on a
hook's input only inside a subagent (read in the installed binary 2.1.318,
not observed live). The `validation-runs-as-its-agent` check, registered for
the `Skill` tool in `scripts/hooks/hook-events.ts`, refuses
`/technical-validation` and `/visual-validation` when `agent_id` is set. It
tells the subagent to escalate and names the `Agent` call the main session
makes instead:

```ts
const VALIDATIONS = [
  { skill: 'technical-validation', validator: 'technical-validator' },
  { skill: 'visual-validation', validator: 'visual-validator' },
];
...
    const isSubagent = input.agent_id !== undefined && input.agent_id !== '';
    if (validation === undefined || !isSubagent) return PASS;
```

The tech-lead skill's validate step loads both skills in the main session.

**Proof it can fail:** `scripts/hooks/checks/validation-runs-as-its-agent.core.test.ts`
covers a subagent input refused and the same skill without `agent_id`
passing. On the shell version, a planted subagent input for
`technical-validation` exited 2, and the same input without `agent_id`
exited 0.

The check reads a list kept by hand, `VALIDATIONS`, with two skills. A third
skill that dispatches an agent would not be covered. `grep -ln "subagent_type\|Dispatch the\|Spawn a fresh" .claude/skills/*/SKILL.md`
finds `tech-lead-orchestrator` too, which spawns sub-agents in its implement
step.

**Proposed:** remove the list. Simplest, delete the dispatch layer: the main
session calls `Agent` with `subagent_type` and the skill's brief template
directly, as the refusal message already tells it to, and the two skills stop
being something a subagent can load to dispatch. Otherwise, each skill would
declare in its front matter that it dispatches an agent, and the check would
read that field instead of `VALIDATIONS`. Either way no dispatching skill
could run inside a subagent unrefused.

**Similar instances:** the search above finds three dispatching skills. Two
are covered, `tech-lead-orchestrator` is not.

**Related.**

- [`parallel-agents-share-one-index-and-every-generator.md`](./parallel-agents-share-one-index-and-every-generator.md)
- [`nine-review-rounds-each-met-a-file-for-the-first-time.md`](./nine-review-rounds-each-met-a-file-for-the-first-time.md)
