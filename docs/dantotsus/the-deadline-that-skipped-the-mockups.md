---
date: 2026-11-26
introduced-at: conception
detected-at: review
severity: medium
related-pr: '#410'
fix-commits: [self]
eradication-level: 2
eradication-paths: [.claude/hooks/pretool-agent-after-route.sh, .claude/settings.json]
time-to-detect: hours
tags: [pragma, process, agents, frontend, skill]
zone: .claude/skills/route/SKILL.md
recurs: none (spec-skill-let-perspectives-be-skipped covers a spec walk that ran without a perspective; here no spec walk ran at all)
---

# The deadline that skipped the mockups

## User impact

The operator asked at 09:07 UTC for a concert sign-up page, "on veut faire la
comm ce soir". The session built the API and the site before showing a single
mockup. Times are from the shipping session's transcript, read with
`scripts/kaizen/operator-messages.ts` (measured).

| | Seen | Expected |
| --- | --- | --- |
| 10:31, operator | "J'ai pas vu les maquettes ?" | 3 or 4 mockups before the spec settles (`/specification`, front-end rule) |
| 10:33, operator | "tu as encore mis des trucs dans un scroll infini au lieu d'ajouter un onglet ?" | tabs, as `docs/standards/05-frontend-architecture.md` asks since 2026-11-13 |
| 10:33, operator | the form shown before "Je serai là", the extra questions not optional | a form that appears after the button, optional questions |
| 12:42 to 13:58 | "Tes propositions de maquettes ne sont pas claires", "ça se chevauche" twice, "Problème de marges !" | mockups rendered and checked before he sees them |
| validation | both technical reports mark the plan UNVERIFIABLE, and round 1 lists seven missing or failing checks | a plan that maps each use case to its test |

The landing was redrawn after the code existed, then rebuilt in `8144b86`.

## Causal chain

- The operator corrected layout, form order and tabs after the code was written.
  - No mockup round came before the code.
    - The spec was written at 10:03, after the code of 09:39 (`209394a` after
      `597151d`). `/route` Tier 1 already warns that "a spec written after the
      code describes the code".
      - The session never ran `/route`. Asked why at 09:48, it gave no cause.
        The operator named it at 09:50: a wrong idea of the session's
        capacity and of the time `/route` takes.
        - The deadline in the first message read as a reason to start
          building at once.

## Root cause of occurrence

*Thought a same-day deadline makes `/route` and its mockup round a cost to
skip, actually the corrections that followed cost more than the round would have.*

CLAUDE.md says "Run `/route` on anything that is not obviously one file". A
page crossing API and site is Tier 2, whose first step is `/specification`,
which asks for "3 or 4 alternative mockups before the spec settles". Nothing
refuses a session that skips all of it.

## Detection failure causes

- **Hooks:** `pretool-api-change-needs-validation.sh` and the visual-validation
  hook refused the pull request until reports existed. No hook looks at
  whether `/route` ran before the first build agent was spawned.
- **Mockup hooks:** `pretool-mockup-reads-visual-rules.sh` fires on a design
  quickstart, which came after the code. `pretool-mockup-copy.sh` counts words
  and cannot see an overlap. Mockups edited by regex went out unrendered
  twice, as `main` logged at 14:00.
- **Validator:** it found the missing plan and the third spec shape, and
  could only report them after the code existed.

## Countermeasure

Already shipped in PR #410: the operator's why is answered with its cause
(CLAUDE.md, `77daf04`). Shipped in this sweep: `/route` no longer says that
parallel agents share one checkout. It contradicted CLAUDE.md, which the
session followed.

Options for the eradication, as the operator would live with them:

| Option | What the operator sees | Cost |
| --- | --- | --- |
| A. A PreToolUse hook on `Agent` refuses the first build agent of a session whose transcript holds no `/route` call and whose branch adds no `spec.md` | a feature session shows him mockups or a spec before any code, every time | one hook. Tier 0 edits spawn no agent, so they pass |
| B. No hook | sessions under a deadline may build first again | none now |

The operator chose A on 2026-11-26.

## Eradication

**Type:** DevX check (level 2)

**Reference:** the commit adding this file.

```diff
+      {
+        "type": "command",
+        "command": "\"$CLAUDE_PROJECT_DIR\"/.claude/hooks/pretool-agent-after-route.sh"
+      }
```

The hook passes a subagent's call, a read-only agent type, a transcript that
called `/route`, `/specification`, `/tech-lead-orchestrator`,
`/feature-pipeline` or `/after-task-kaizen`, and a branch that adds a
`spec.md`. It refuses every other agent.

**Proof it can fail:** planted inputs, run with `KAIZEN_LOG_REFUSALS=0`.

| Input | Exit |
| --- | --- |
| `general-purpose`, transcript with no `/route` | 2, "No /route this session and no spec.md on the branch, so a general-purpose agent cannot start." |
| no type given, no `/route` | 2 |
| `fork`, no `/route` | 2 |
| `general-purpose`, transcript with a `route` Skill call | 0 |
| `Explore` or `technical-validator`, no `/route` | 0 |
| a subagent's call (`agent_id` set) | 0 |

**Similar instances:** `grep -l "route" docs/features/meta/lessons-from-pr-*/inventory.md`
lists earlier sweeps that mention `/route`. PR #410 is the first whose
operator asked why it was skipped (measured from its transcript).
