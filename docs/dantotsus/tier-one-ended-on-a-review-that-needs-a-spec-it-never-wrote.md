---
date: 2026-11-15
introduced-at: conception
detected-at: local
severity: low
related-pr: '#345'
fix-commits: [self]
eradication-level: 5
eradication-paths: [.claude/skills/route/SKILL.md]
time-to-detect: minutes
tags: [process, validation, skill, hooks]
zone: .claude/skills/route
recurs: none (the earlier sweeps of #292, #293, #302, #316 and #324 recorded this refusal as a no-op, and no entry was written)
---

# Tier 1 ended on a review that needs a spec it never wrote

## User impact

The operator gets a review that checks the code against a spec written from the code.

| | Seen | Expected |
| --- | --- | --- |
| PR #345 | Fix commits at 22:58, `api-validation` refusal at 23:00, spec and plan committed at 23:00:49, review at 23:12 (measured, from the commits) | The spec states the two behaviours before the fix is written |
| Earlier sweeps | The same refusal in the friction logs of #292, #293, #302, #316 and #324, each recorded as a no-op (measured, from their `inventory.md`) | A refusal that never fires, because the route already asked for the report |

## Causal chain

- The spec of PR #345 was written after its code, to give the validator something to read.
  - `api-validation` refused the pull request, because the branch changed `apps/pragma/api/` with no review report.
    - The session had not run `/technical-validation`, and `/technical-validation` refuses to run without a spec (its *When not to use*).
      - `/route` Tier 1 ends on `/technical-validation` but has no step that writes a spec, and Tier 0 lets a change under `apps/<app>/api/` skip both.

## Root cause of occurrence

*Thought a small API fix needs no spec, actually the gate on API changes needs a review and the review needs a spec.*

`.claude/skills/route/SKILL.md` said of Tier 0 "No spec, no plan, no task list", and its Tier 1 list ran from `/code-standards` to `/technical-validation` with no spec. `.claude/skills/technical-validation/SKILL.md` lists "There is no spec and no ADR stands in for one" under when not to use it.

## Detection failure causes

- **Hook:** `pretool-api-change-needs-validation.sh` held the order of report then pull request, which is its job. It fires at the last step, so the spec it forces comes after the code.
- **Sweeps:** five earlier sweeps classified the refusal as a no-op because the hook held. None asked why the session reached it.

## Countermeasure

Align the route with the gate. Tier 0 now excludes a change under `apps/<app>/api/`. Tier 1 now starts by writing a short spec, with no `/specification` walk, so the review that ends it has a contract written before the code.

A line in the hook's refusal pointing at that step was drafted and dropped. PR #340, open at the time, rewrites the same block of `pretool-api-change-needs-validation.sh` to add a visual-validation gate for `apps/<app>/site/`. That gate also needs a spec, so the Tier 1 spec step serves front-end changes too.

## Eradication

**Type:** knowledge (level 5)

A level 2 check that refuses an API commit with no spec was considered and not built. It would add a gate in front of every API one-liner, and the existing gate already holds the review. The defect is two instructions that contradicted the gate, so the fix removes the contradiction.

**Reference:** commit `self`

```diff
 No spec, no plan, no task list. Write it, test it, commit it.
+A change under `apps/<app>/api/` is Tier 1 at least, whatever its size.
 Task list:
-1. `/code-standards` for the layers you are touching
+1. write `docs/features/<app>/<slug>/spec/spec.md` before the code: who it is for,
+   each behaviour with its evidence, what is out of scope. No `/specification` walk.
```

See also [a-spec-bullet-that-leans-on-what-the-code-already-does](../knowledge/a-spec-bullet-that-leans-on-what-the-code-already-does.md).
