---
date: 2026-11-26
introduced-at: conception
detected-at: review
severity: medium
related-pr: '#410'
fix-commits: [self]
eradication-level: 2
eradication-paths: [scripts/hooks/checks/agent-after-route.core.ts, scripts/hooks/hook-events.ts]
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

- The operator corrected layout, form order and tabs after the code was
  written.
  - The first mockups reached him after the code. The spec was written at
    10:03, after the code of 09:39 (`209394a` after `597151d`).
    - At 09:07 the session spawned a build agent straight from the operator's
      message, and the agent committed code at 09:39.
      - The session read the same-day deadline as a reason to build at once.
        Asked why at 09:48, it gave no cause. The operator named it at 09:50:
        a wrong idea of the session's capacity and of the time `/route`
        takes (Man).

## Root cause of occurrence

*Thought a same-day deadline makes `/route` and its mockup round a cost to
skip, actually the corrections that followed cost more than the round would
have.* (Man)

The rule was in the session's context. CLAUDE.md says "Run `/route` on
anything that is not obviously one file". A page crossing API and site is
Tier 2, whose first step is `/specification`, which asks for "3 or 4
alternative mockups before the spec settles". The prior about time won over
the loaded rule, so under the agentic 4M this is Man, and the fix is a gate,
not another line. CLAUDE.md's "Never block on the human. Do reversible work,
then present it" may have pushed the same way, since code is reversible work
(inferred).

## Detection failure causes

- **Hooks at the time:** the API-change and visual-validation hooks refused
  the pull request until reports existed. No hook looked at whether `/route`
  ran before the first build agent.
- **Mockup hooks:** `mockup-reads-visual-rules` fires on a design quickstart,
  which came after the code. `mockup-copy` counts words and cannot see an
  overlap. Mockups edited by regex went out unrendered twice, as `main` logged
  at 14:00.
- **Validator:** it found the missing plan and the third spec shape, and could
  only report them after the code existed.

## Countermeasure

PR #410 shipped the operator's why answered with its cause (CLAUDE.md,
`77daf04`). This sweep removed the line in `/route` that said parallel agents
share one checkout. It contradicted CLAUDE.md, which the session followed.

The operator chose, on 2026-11-26, a hook that refuses the first build agent
of a session with no `/route` and no added `spec.md`, over no hook.

## Eradication

**Type:** DevX check (level 2). A session cannot change a file under `apps/`
before `/route` or a framing skill ran, or before its branch adds a
`spec.md`.

**Reference:** the commit adding this file shipped the check on `Agent` and
`Task`. Commit `458e886c4` (#411) ported every hook to TypeScript under
`scripts/hooks/checks/`, which removed the `.claude/hooks/*.sh` files.
Commit `9e22f4d59` (#420) moved the check from the `Agent` call to the edit
itself, after PR #417's session wrote code before `/route` without spawning
any agent (`the-hook-that-watched-only-the-agents`).

```diff
 export const agentAfterRoute: Check = {
   name: 'agent-after-route',
-  tools: /^(Agent|Task)$/u,
+  tools: /^(Write|Edit|MultiEdit|NotebookEdit)$/u,
```

**Proof it can fail:** `scripts/hooks/checks/agent-after-route.core.test.ts`
plants an edit under `apps/` with no framing skill in the transcript and no
added spec, and expects the refusal "`<file>` was edited before /route ran".

**Similar instances:** `grep -l agent-after-route docs/dantotsus/*.md` finds
this entry and its recurrence from PR #417. Both are sessions that built
before showing mockups.

**Proposed:** the check gates a proxy. It passes as soon as `/route` appears
in the transcript, even if the session then skips the mockups. Gate the
property instead: refuse an edit that adds a file under `apps/*/site/src` on a
branch that adds no `spec.md`. Editing an existing site file stays open, so a
Tier 0 fix passes. A new screen then cannot be built before its spec, and the
spec carries the mockups.
