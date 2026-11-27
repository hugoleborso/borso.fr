---
name: route
description: Decide how much machinery a task deserves before starting it, and lay out the task list that follows. Use at the start of any non-trivial request, when the user says "/route", "how should we do this", "is this a big one", or when you are about to reach for /specification or /feature-pipeline and are not sure the task is worth them. Sizes the work on five axes, picks one of four tiers from direct edit to fanned-out workflow, and writes the task list for the tier it picked.
---

# Route

Pick the tier on evidence, before the work starts. No edit under `apps/`, by this session or its agents, can start before this skill runs (`scripts/hooks/checks/agent-after-route.core.ts`).

## Size it first

Answer all five. Answer them by **looking**, not by guessing: run the greps, open the folder, read the blueprint index. A tier chosen from a guess about blast radius is the same mistake as no tier at all.

| Axis | Question | How to answer it |
| --- | --- | --- |
| Blast radius | How many files, layers and applications? | `rg` for the symbol, list the folder. The architecture maps run on demand only, through the `architecture` workflow, so do not wait on them |
| Decisions | Is anything genuinely open about what to build? | If you can name two defensible answers and the user has not picked, it is open |
| Precedent | Does a blueprint already cover every layer this touches? | `.claude/skills/blueprint/blueprint-index.md`, after `scripts/reports.sh blueprints` |
| Reversibility | Does it touch a schema, a shared construct, a secret, prod infrastructure? | A migration, `infra/shared/`, or anything in `docs/adr/`'s trigger list |
| Proof | What would convince you it works? | A unit test, a browser pass, a device pass, or nothing available |

## The tiers

**Tier 0 — do it.** One or two files, no open decision, a blueprint exists, and a test can prove it.
No spec, no plan, no task list. Write it, test it, commit it. Reaching for a skill here is the waste this repo's north star names.
A change under `apps/<app>/api/` is Tier 1 at least, whatever its size. The `api-validation` hook refuses its pull request without a `/technical-validation` report, and that report reads a spec.

**Tier 1 — chained.** Several files inside one application, no open product decision, precedent exists.
Task list:
1. write `docs/features/<app>/<slug>/spec/spec.md` before the code: who it is for, each behaviour with its evidence, what is out of scope. No `/specification` walk. Step 5 reviews the code against it, and a spec written after the code describes the code
2. `/code-standards` for the layers you are touching
3. implement, marking new files `// @FollowsBlueprint <id>`
4. the affected tests (`pnpm --filter <app> exec vitest run --project core --changed <base>`, or `exec vitest run --changed <base>` on a front-end-only app); coverage, mutation and the whole suites run in CI
5. `/technical-validation`, which also checks what lint cannot, two rounds at most

**Tier 2 — specified.** New user-visible behaviour, or a change crossing back end and front end, or any open decision.
Task list:
1. `/specification` — this is the stage that needs the human, so do not skip to the plan
2. `/adr` for each decision matching a trigger: a new third-party dependency, a new secret, a schema column driven by an external service, a cross-cutting structural choice
3. `/feature-pipeline <spec-path>` — plan, implement, validate and open the PR

**Tier 3 — fanned out.** The same change repeated across applications, a migration, an audit, or anything where coverage matters more than depth.
Use a Workflow, not a chain. The shape that fits this repository:
- one agent per application or per dimension, in parallel
- a barrier only where a later stage genuinely needs every earlier result at once
- an adversarial verify pass on anything the agents claim to have found
Give each agent a **disjoint file ownership list**, and follow CLAUDE.md's *Parallel agents*.

## Escalate when you find out you were wrong

Sizing happens before the work, so it is sometimes wrong. These are the signals, and each one means stop and re-route rather than push on:

- You are about to touch a fourth file you did not predict → Tier 0 becomes Tier 1.
- You cannot write the code without deciding something the user has not decided → any tier becomes Tier 2. Ask; do not pick quietly.
- A change that was one application turns out to need the same edit in another → Tier 3.

De-escalating is equally allowed and rarer. A Tier 2 whose spec resolves to "add the field and render it" is a Tier 1; say so and drop the ceremony.

## Write the task list

Whatever tier you pick, create the tasks for it before starting, and say which tier and why in one sentence. The tier is a claim about the work, and writing it down is what lets you notice later that it was wrong.
