---
date: 2026-06-05
introduced-at: conception
detected-at: review
severity: medium
related-pr: '#26'
fix-commits: [0618e8b839]
eradication-level: 5
eradication-paths: [.claude/skills/tech-lead-orchestrator/standard.md]
tags: [orchestrator, skill, adr, conception-pivot]
zone: .claude/skills/tech-lead-orchestrator
---

# The orchestrator swung from too timid to deciding what was the operator's

## User impact

The operator handed the orchestrator a ratified spec to drive overnight
(run `2026-05-19-1937-pragma`). He got two opposite failures in one run, and
one round of work reverted.

| | Seen | Expected |
| --- | --- | --- |
| Early rounds | Round 1 re-scoped the spec to a "foundation slice" without asking. Round 3 asked him which FAIL rows to fix | Fix ordering decided by the orchestrator, no question |
| Round 16 | A third-party service (GetSongBPM), a CDK env var, a new GitHub repo secret and a permanent attribution link in the production UI, all decided alone | One question before any of the four |

The operator, early: *"I wanted you to work on this during the night, but now
I have to manage concurrent Claude sessions."* Later: *"Tu prends tellement de
décisions à ma place c'est pas du tout ce qui était convenu."* Round 16 was
reverted.

## Causal chain

- Round 16 shipped a third-party integration, a new secret and a UI obligation
  the operator had not asked for.
  - The orchestrator dispatched round 16 on the operator's chat line *"ce
    serait cool de remplir autant d'info que possible"*, read as a ratified
    scope.
    - It had just received the operator's "have agency" correction, after
      rounds 1 and 3 surfaced mechanics. It applied that correction to every
      decision, product scope included.
      - The correction reached the orchestrator as free text. Nothing in it,
        or in the standard it was reading, said which actions it covered
        (Material).
- Rounds 1 and 3 surfaced mechanics and re-scoped silently, before the
  correction.
  - The standard's *Decisions stay with the orchestrator* section listed what
    the orchestrator may decide. The boundary with the operator's decisions
    was set by its tone, which the orchestrator read as "ask when unsure"
    (Material).

## Root cause of occurrence

*Thought "have agency" meant "decide product scope too", actually it meant
"drive the ratified spec to done without checkpoints", while product surface
and anything that trips an ADR trigger stay the operator's.* (Material)

The orchestrator is an agent. What the operator meant was absent from its
context: the correction was one sentence of chat, and the standard of the time
named only what the orchestrator may decide. The four ADR triggers sat in the
spec template, read when writing an ADR, not when dispatching a round. Each
part of round 16 was visible in the diff: a new dependency, a new
`secrets.<NAME>` in a workflow, a new CDK env var and a new third-party host.

## Detection failure causes

- **Review:** the orchestrator was its own product owner. No second party saw
  the scope before the operator saw the shipped result.
- **ADR triggers:** they gated writing an ADR, not adding a dependency. A
  branch could add a package, a secret or a host with no ADR, and nothing
  refused it.
- **Gates:** `scripts/dependencies/check-dependency-catalog.ts` checks how a
  dependency is declared, not whether anyone decided it.

## Countermeasure

Round 16 was reverted. Commit `0618e8b839` added a *Decision boundary* section
to `.claude/skills/tech-lead-orchestrator/standard.md`. It names what the
orchestrator decides (fix ordering, retry or escalate, scope of a fix round)
and what it must surface: a new third-party dependency, secret management, a
new obligation to a third party visible in prod, schema motivated by an
external service, and scope beyond the ratified spec. Escalation became
progress-based instead of a retry count of 3.

## Eradication

**Type:** knowledge (level 5). The boundary is a prose list in an agent
standard. Nothing refuses a branch that crosses it.

**Reference:** commit [`0618e8b839`](https://github.com/hugoleborso/borso.fr/commit/0618e8b839).
`.claude/skills/tech-lead-orchestrator/standard.md` still holds it today, under
*Decision boundary*, as decisions the orchestrator must surface with
`AskUserQuestion`:

```text
- a new third-party dependency or external service;
- secret / credential management (new repo secret, new env var holding a secret);
```

The first version of this entry called it level 2. A list in a standard is
level 5, and it is what the orchestrator overrode once already.

**Proposed:** a pre-push gate that refuses a branch adding a dependency to a
`package.json` or a catalog in `pnpm-workspace.yaml`, a new `secrets.<NAME>` in
`.github/workflows/`, or a new third-party host, unless the same diff carries
an answer only the operator gives. Any added file under `docs/adr/` is not
enough, because the orchestrator could write that file itself. Two shapes
already exist. An added ADR must pass `scripts/check-adr-criteria.sh`, which
refuses an ADR from 2026-11-03T1438 on with no criterion raised by the
operator. Or the branch carries a dated operator answer, the shape
`scripts/check-spec-records.sh` holds. `scripts/dependencies/catalog.core.ts`
already parses the catalogs. Round 16 could then not reach a push before the
operator had answered. `grep -rn -i adr scripts/dependencies/*.ts` shows no
such gate today. Both shapes rest on a line an agent could still type, so the
gate makes crossing the boundary a visible act, not an impossible one.

**Proof it can fail:** not tried. The proposal is not built.

**Similar instances:** [`orchestrator-mined-adrs-from-the-plan.md`](./orchestrator-mined-adrs-from-the-plan.md)
and [`orchestrator-skipped-validation-between-rounds.md`](./orchestrator-skipped-validation-between-rounds.md),
from the same run, also rest on a boundary held only by the standard.
