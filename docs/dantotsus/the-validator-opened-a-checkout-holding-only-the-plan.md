---
date: 2026-10-25
introduced-at: conception
detected-at: local
severity: medium
related-pr: '#193'
fix-pr: none (opened by the kaizen pull request for #193)
fix-commits: [self]
eradication-level: 5
eradication-paths: [plugins/borso-harness/commands/feature-pipeline.md]
time-to-detect: hours
tags: [orchestrator, agents, harness, validation, git]
zone: plugins/borso-harness/commands/feature-pipeline.md
recurs: [parallel-agents-share-one-index-and-every-generator]
---

# The validator opened a checkout holding only the plan

## Symptom

The `/feature-pipeline` run for PR #193 had two failures that both come from
what a workflow subagent can and cannot do.

- Three validation rounds started on a checkout that held only the plan. The
  four implementation rounds had run with `isolation: 'worktree'` and left their
  commits on worktree branches; the run branch never moved. One validator had
  to fast-forward and cherry-pick two diverged fix branches before it had
  anything to read, and another was refused the fast-forward by the auto-mode
  classifier (`technical-validation-01` to `-03` in `KAIZEN.md`).
- Four agents (`visual-validation-02`, `technical-validation-03`,
  `visual-validation-03`, `open-pr-01`) were told by their skill to dispatch
  the isolated validator agent, and had no Agent tool. They validated, and in
  one case sealed 68 files, in their own context.

## Root-cause chain

1. **Why was there nothing to validate?** Worktree isolation commits to a
   branch of its own, and the contract said nothing about bringing those
   commits back before the next stage.
2. **Why could the agents not dispatch a validator?** A workflow subagent does
   not get the Agent tool; the skills were written for a chat session, which
   has it.
3. **Why did the contract assume both?** It was written as a list of skills to
   invoke, so it inherited each skill's assumptions about who invokes it. The
   Workflow runtime offers what the skills need — `agentType` on `agent()`
   spawns a named agent definition directly, and a stage can integrate a
   branch — but the contract never asked for either.

**Root cause:** thought a workflow stage could do what the skill it invokes
says, actually a subagent has no Agent tool and a worktree round's commits stay
on its own branch, so the script has to spawn validators by type and integrate
branches itself.

## Detection failure causes

- **Functional validation locally:** each agent worked around its gap and
  logged it; nothing stopped the run, so the cost showed up as repeated
  friction rather than a failure.

## Countermeasure

- The validators were run inline and the branches integrated by hand during
  PR #193.

## Eradication (mandatory — code-level)

**Type:** knowledge addition (level 5) — the harness is Markdown-only and the
workflow script is regenerated from this contract on every launch, so the
contract is the code the next run executes.

**Reference:** the commit that adds this file.

**The actual fix:** `feature-pipeline.md` now requires, after every implement
round and before any validator, one subagent to fast-forward the run branch onto
each round's worktree branch (cherry-picking when two diverged) and to name the
resulting SHA in every validator brief; and it requires the script to spawn
validators with `agent(brief, { agentType: 'technical-validator' })`, likewise
`'visual-validator'` and `'standards-reviewer'`. The standards-review skill
says the same, and says how to record an inline review when dispatch is
genuinely impossible.

**Sibling defects swept:** none found beyond the three skills named.

## Recurrence on PR #206

The contract change above merged at 07:33 on 2026-10-27, as `a83f0a60`. The
`/feature-pipeline` run for PR #206 started an hour later from a branch that
contained it, and four of its stage agents logged the same thing again:
`technical-validation-01` (twice, in two runs that shared the label),
`technical-validation-02` and `visual-validation-01` were told to run a
validation skill, had no Agent tool, and validated in their own context. Their
reports say so (`runs/2026-10-27-assistants-act-on-pragma/agents/`).

The branch-integration half did not recur: no agent of that run found a
checkout without the round's commits. That half is something every stage
agent does with tools it has; the dispatch half is a choice the generated
script makes, and the script is written fresh from prose at every launch and
then discarded, so nothing shows whether a given launch read the paragraph.

So a level-5 entry in the one document the script is generated from did not
hold, which is what `prose-stands-in-for-a-check` on the weak-point map
predicts. Moving it up a level needs the generated script to exist somewhere a
check can read it, which CLAUDE.md currently rules out ("No script is
committed"). That is an operator decision, raised by the kaizen pull request
for PR #206 rather than taken here.

## See also

- [`parallel-agents-share-one-index-and-every-generator.md`](./parallel-agents-share-one-index-and-every-generator.md)
- [`nine-review-rounds-each-met-a-file-for-the-first-time.md`](./nine-review-rounds-each-met-a-file-for-the-first-time.md)
