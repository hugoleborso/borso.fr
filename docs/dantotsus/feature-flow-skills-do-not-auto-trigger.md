---
date: 2026-05-04
introduced-at: conception
detected-at: review
severity: medium
related-pr: '#6'
fix-commits: [c578c5a9b]
eradication-level: 5
eradication-paths: [.claude/commands/feature-pipeline.md, CLAUDE.md]
time-to-detect: hours
tags: [skills, harness, workflow]
zone: .claude/skills
---

# The operator typed every next step of the feature flow

## User impact

Across PR #6 the operator had to tell the agent to start each skill of the feature flow. Counted from the PR #6 session by the sweep that wrote this entry, about five times.

| When | Seen | Expected |
| --- | --- | --- |
| Spec finished | The agent stopped. The operator said "now create the [plan]". | The agent starts `/technical-conception`. |
| Plan finished | The agent stopped. The operator said "Using /implementation yes". | The agent starts `/implementation`. |
| Implementation finished | The operator started `/visual-validation` and `/technical-validation` by hand each round. | The agent runs both validations. |
| PR merged | The operator said "You should auto start the use of the tool /after-task-kaizen. You did not." | The agent starts the sweep on merge. |

## Causal chain

- The operator typed the next skill at each transition of PR #6.
  - The agent finished each skill, answered the operator, and ended its turn.
    - The only pointer to the next skill was a paragraph at the end of the current skill. Commit `0bde2842e` (2026-05-03) wrote it into `/specification`:

      ```markdown
      ## What comes next

      Once every perspective has been confronted and no `> ⚠️ Missing …` flag
      remains, the spec is **ready for `/technical-conception`**.
      ```

      - The agent read that paragraph at the start of a long skill, then ran the skill in the same session. When the skill ended, the operator's last message ("looks good") read as a natural stop.
    - Branch for the merge. The session ended its last turn before the merge. The operator then merged on GitHub, and no message reached the session until the operator typed the next one.

## Root cause of occurrence

*Thought a line at the end of each skill naming the next one makes the flow run itself, actually skills do not chain, so the whole sequence rested on one long session remembering it.* (Method)

The flow was a process held in prose, carried by the main session across six skills. Seen from the agent, the next-step paragraph was in its context when it stopped. The prior to end the turn after a finished task won over it in a saturated session (Man, worker's state). Under the agentic 4M, the fix is a change to the worker's conditions, never one more paragraph.

## Detection failure causes

- **Self-validation:** each skill's closing check asks whether its own procedure is complete. It has no opinion on what comes next.
- **Review:** the operator was the only gate, and caught each skip by typing the next command. Every feature therefore cost the operator one nudge per transition.

## Countermeasure

The operator typed the next skill at each transition during PR #6, and the agent caught up after each prompt. No code changed for the recovery.

## Eradication

**Type:** knowledge (level 5)

The transitions from plan to ship no longer depend on one session's memory. Commit `c578c5a9b` (2026-06-05) shipped `/feature-pipeline` (`.claude/commands/feature-pipeline.md`). Launched once, a Dynamic Workflow runs plan, implement, validate and ship, one fresh subagent per stage, and reads each verdict to choose the next step. `CLAUDE.md` *Feature flow* says the same for a session run by hand: "The main session orchestrates. It hands each phase (spec, plan, implementation, validation) and each fix round to a fresh subagent". The level is 5 because both live in markdown. No workflow script is saved under `.claude/workflows/` (its `README.md` says so), so every launch regenerates the script from the contract.

The merge transition holds by instruction only. `CLAUDE.md` *Self-improvement loop* says "After a merge, the same reply carries two follow-ups", and the session hears of the merge through the pull request webhook `subscribe_pr_activity` delivers.

The Stop hook this entry first proposed, `.claude/hooks/stop-skill-chain-reminder.sh`, was never committed. No commit on `main` contains it.

**Proposed:** save the generated script as `.claude/workflows/feature-pipeline.js`, so the order of plan, implement, validate and ship lives in code and not in a regenerated contract. That makes the plan-to-ship transitions structural. For the merge, a `UserPromptSubmit` hook that matches the GitHub event envelope of a merged pull request could inject the `/after-task-kaizen` hand-off into the turn that event wakes (inferred feasible, not tried). The sweep would then start from the event itself, not from a line in `CLAUDE.md`.

**Similar instances:** `grep -rln 'What comes next' .claude/skills/` finds no skill that still ends on that heading (run 2026-11-27). The merge transition above is the one left held by prose.
