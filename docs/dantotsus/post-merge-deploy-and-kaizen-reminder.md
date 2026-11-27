---
date: 2026-05-21
introduced-at: conception
detected-at: review
severity: low
related-pr: '#24'
fix-commits: [9199b11e70, 5d140956dd]
eradication-level: 5
eradication-paths: [CLAUDE.md, scripts/hooks/checks/merge-deploys-prod.core.ts]
time-to-detect: minutes
tags: [harness, workflow, claude-md, deploy, kaizen, self-improvement-loop]
zone: CLAUDE.md
---

# Post-merge follow-ups were implicit, so they almost slipped

## User impact

After PR #24 merged, the operator had to ask twice before the session treated the
kaizen pass as owed. With a less engaged operator, the lessons of the PR would
have been lost.

| | Seen | Expected |
| --- | --- | --- |
| Reply to the `merged` webhook | the deploy reminder as an action, the `/after-task-kaizen` pass as a soft suggestion | both follow-ups as actions in the same reply |
| Next turns | the operator asks « Mergé, good pour toi ? », then « Redonne les 4 leçons ? » | no prompt needed |

## Causal chain

- The operator had to re-ask for the kaizen pass.
  - The session's reply to the merge offered the kaizen as optional and the
    deploy reminder as required.
    - CLAUDE.md held the two follow-ups in two sections written in two moods.
      *Deployments* said "After a PR merges, Claude's deploy-related action is
      to remind the user". *Self-improvement loop* described the loop, "open a
      follow-up PR labelled `kaizen`", with no moment attached.
      - The kaizen rule was written as a description of a practice, not as an
        action tied to the merge event, and no one paired it with the deploy
        reminder when either was added.

## Root cause of occurrence

*Thought a rule stated in CLAUDE.md fires when its moment comes, actually a rule
written as a description, with no event named, competes with every other line
of a long file at the moment the merge arrives.* (Method)

Both rules were in context, since CLAUDE.md loads in every session. The one
phrased as an action at a named moment fired. The one phrased as a description
did not.

## Detection failure causes

- **Harness:** a merge done outside the session arrives as a message, and no
  hook read the reply to it.
- **CLAUDE.md:** the two follow-ups lived one section apart, so nothing showed
  that one of a pair was missing.
- **Operator review:** it caught the gap only by re-asking.

## Countermeasure

The operator invoked `/after-task-kaizen` directly, which produced PR #28.

## Eradication

**Type:** knowledge (level 5), delivered by a hook when the session merges.

**Reference:** commit [`9199b11e70`](https://github.com/hugoleborso/borso.fr/commit/9199b11e70)
paired the two follow-ups in one CLAUDE.md rule. Commit `c54e32da79` later
rewrote CLAUDE.md, and the pair now sits in *Self-improvement loop*: "After a
merge, the same reply carries two follow-ups, and says so when either is not
needed". The deploy half changed meaning. A merge now deploys with no approval
step, so the first follow-up is the `shared-deploy` dispatch when the shared
template moved.

Commit [`5d140956dd`](https://github.com/hugoleborso/borso.fr/commit/5d140956dd)
added the `merge-deploys-prod` hook, today
`scripts/hooks/checks/merge-deploys-prod.core.ts`. When the session itself
merges, it prints "There is no approval step after this call", whether a
`shared-deploy` dispatch is owed, and, since commit `458e886c4`:

```text
After it lands, surface both post-merge follow-ups of CLAUDE.md's
Self-improvement loop, the shared-deploy dispatch and the kaizen, as it
words them.
```

The entry's first reason for staying at level 5, that "the agent itself is the
only place the rule can fire", no longer holds. The hook fires at the merge.

**Proof it can fail:** none. The hook reminds and does not refuse. A merge done
by the operator on GitHub reaches the session as a message, and no hook runs.

**Proposed:** a Stop check in `scripts/hooks/checks/`, registered beside
`screensShown` under `Stop` in `scripts/hooks/hook-events.ts`. When the turn
answers a merged-PR event, it reads the reply from the transcript, as
`screens-shown.core.ts` does, and refuses a reply that names neither the
`shared-deploy` decision nor the kaizen decision. A merge reply missing a
follow-up would then be impossible, whoever merged.

**Similar instances:** `built-my-own-before-checking-the-library.md` has the
same shape, a rule that exists with no trigger at its moment.
