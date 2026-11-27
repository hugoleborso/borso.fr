---
date: 2026-11-27
introduced-at: conception
detected-at: review
severity: medium
related-pr: '#417'
fix-commits: none (analysis mode, waiting on the operator's choice)
eradication-level: 5
eradication-paths: [docs/dantotsus/the-hook-that-watched-only-the-agents.md]
time-to-detect: hours
tags: [pragma, process, hooks, frontend, skill]
zone: scripts/hooks/checks/agent-after-route.core.ts
recurs: [the-deadline-that-skipped-the-mockups]
---

# The hook that watched only the agents

## User impact

The operator asked at 09:19 UTC for an "ajouter à mon calendrier" button on
pragma's home page. The session wrote code at 09:21 and the spec at 09:28,
once `/technical-validation` asked for one. It never ran `/route` or
`/specification`, and showed no mockup (measured from the shipping session's
assistant events).

| | Seen | Expected |
| --- | --- | --- |
| 09:48, visual validation | FAIL: the French label pushes the button out of the ticket from 640 px, and the page scrolls sideways | the label's width settled before the code |
| 09:56, visual validation | FAIL: "Ajouter à mon calendrier" never fits beside "Je serai là !" on a desktop | the same |
| 10:10, operator | a product question on the label, after two rebuilds | the same question asked with the first mockups |
| 09:28, technical validation | FAIL: two spec bullets no test held, and no plan | tests written from a spec that came first |

The button shipped as "Agenda", the third layout.

## Causal chain

- The operator answered a layout question only after two failed rebuilds.
  - The button's label was never measured against the ticket before the code.
    - No mockup round ran, because neither `/route` nor `/specification` did.
      - The PR #410 eradication, `agent-after-route`, refuses a build *agent*
        spawned before `/route`. This session wrote every file itself and
        spawned only validators, which the hook lets through.

## Root cause of occurrence

*Thought code is written by build agents, so guarding the agent spawn guards
the code, actually the main session writes code with Edit and Write and no
agent is spawned.*

`scripts/hooks/checks/agent-after-route.core.ts` matches `tools: /^(Agent|Task)$/u`.
The PR #410 entry chose it while noting "Tier 0 edits spawn no agent, so they
pass". This feature crossed the API and the site, a Tier 2 change, with no
agent at all.

## Detection failure causes

- **Hooks:** `agent-after-route` never ran, since no build agent was spawned.
  The validation hooks refused the pull request until reports existed, which
  is after the code.
- **Validators:** both caught the gaps and could only report them once the
  code existed.

## Countermeasure

None shipped yet. The choice changes when the operator is asked for
something, so it is his.

| Option | What the operator sees day to day | Cost |
| --- | --- | --- |
| A. `agent-after-route` also refuses the main session's first Edit or Write under `apps/` until `/route` ran or the branch adds a `spec.md` | every session that changes an app sizes it first. A one-file fix runs `/route`, which answers Tier 0 and lets the edit through. A feature shows him mockups or a spec before any code | one more matcher and branch in an existing check |
| B. As A, only for files under `apps/*/site/` | the same for screens. An API-only fix starts at once | as A, and an API feature can still skip its spec |
| C. No change | a session that codes a feature itself can skip `/route` again | none now |

Recommended: A. It closes the gap for every app change, and `/route` already
sorts a one-file fix out.

## Eradication

**Type:** knowledge (level 5), until the operator picks an option.

**Reference:** none yet.

**Proof it can fail:** none yet. The option he picks ships with planted
inputs, as the PR #410 entry's table does.

**Similar instances:** `grep -l "route" docs/features/meta/lessons-from-pr-*/inventory.md`.
PR #410 and PR #417 are the two sessions known to skip it (measured from
their transcripts).
