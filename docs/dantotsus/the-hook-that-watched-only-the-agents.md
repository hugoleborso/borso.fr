---
date: 2026-11-27
introduced-at: conception
detected-at: review
severity: medium
related-pr: '#417'
fix-commits: [self]
eradication-level: 2
eradication-paths: [scripts/hooks/checks/agent-after-route.core.ts]
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

The options, as the operator would live with them:

| Option | What the operator sees day to day | Cost |
| --- | --- | --- |
| A. `agent-after-route` also refuses the main session's first Edit or Write under `apps/` until `/route` ran or the branch adds a `spec.md` | every session that changes an app sizes it first. A one-file fix runs `/route`, which answers Tier 0. A feature shows him mockups or a spec before any code | one more branch in an existing check |
| B. As A, only for files under `apps/*/site/` | the same for screens. An API-only fix starts at once | as A, and an API feature can still skip its spec |
| C. No change | a session that codes a feature itself can skip `/route` again | none |

The operator chose A on 2026-11-27. He also asked whether `/route` could
live in CLAUDE.md instead, and chose to keep it a skill, which the hook can
see being called.

## Eradication

**Type:** DevX check (level 2)

**Reference:** the commit adding this file.

```diff
-  tools: /^(Agent|Task)$/u,
+  tools: /^(Write|Edit|MultiEdit|NotebookEdit)$/u,
```

One rule replaces the spawn check. A subagent's hook input carries the main
session's `transcript_path` (measured on 2026-11-27 with a probe in
`hook-runner.adapter.ts`), so a build agent's first app edit meets the same
refusal as the session's own. An edit passes when its path is outside
`apps/`, when the transcript shows `/route` or another framing skill, or when
the branch adds a `spec.md`. A write through Bash, such as a heredoc, is not
seen.

**Proof it can fail:** `node scripts/hooks/hook.ts` in a checkout of main,
with `KAIZEN_LOG_REFUSALS=0` and a transcript holding no skill call.

| Input | Before | After |
| --- | --- | --- |
| Write `apps/pragma/api/src/x.core.ts`, absolute path | 0 | 2, "This session has not run /route, and its branch adds no spec.md." |
| Edit `apps/pragma/site/a.tsx` by a subagent | 0 | 2 |
| Edit `scripts/a.ts` | 0 | 0 |
| the same app Write, transcript with a `route` Skill call | 0 | 0 |
| a `general-purpose` Agent spawn | 2 | 0, its first app edit is refused instead |

**Similar instances:** `grep -l "route" docs/features/meta/lessons-from-pr-*/inventory.md`.
PR #410 and PR #417 are the two sessions known to skip it (measured from
their transcripts).
