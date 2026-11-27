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
    - The session had not run `/technical-validation`, which refuses to run without a spec (its *When not to use*).
      - The session followed `/route`, whose Tier 0 said "No spec, no plan, no task list" and whose Tier 1 list ran from `/code-standards` to `/technical-validation` with no spec step (`git show 572a62640^:.claude/skills/route/SKILL.md`, lines 29 to 36).
        - Commit `572a62640` (PR #276, 2026-11-05) added `pretool-api-change-needs-validation.sh`, a gate whose report needs a spec, and left the route skill as it was. From then on the route sent API fixes straight into a gate it did not prepare them for.

## Root cause of occurrence

*Thought a small API fix needs no spec, actually the gate on API changes needs a review and the review needs a spec.* **Method:** the process the session followed contradicted the gate in front of it. The route skill, written on 2026-08-15, predated the gate. The gate's commit did not update it.

`.claude/skills/technical-validation/SKILL.md:21`, read this session: "Skip the gate when there is no spec and no ADR stands in for one".

## Detection failure causes

- **Hook:** the `api-validation` check, now `scripts/hooks/checks/api-change-needs-validation.core.ts`, holds the order of report then pull request, which is its job. It fires at the last step, so the spec it forces comes after the code.
- **Sweeps:** five earlier sweeps classified the refusal as a no-op because the hook held. None asked why the session reached it.

## Countermeasure

Align the route with the gate. Tier 0 now excludes a change under `apps/<app>/api/`. Tier 1 now starts by writing a short spec, with no `/specification` walk, so the review that ends it has a contract written before the code.

A line in the hook's refusal pointing at that step was drafted and dropped. PR #340, open at the time, rewrote the same block of the hook to add a visual-validation gate for `apps/<app>/site/`. That gate also needs a spec, so the Tier 1 spec step serves front-end changes too.

## Eradication

**Type:** knowledge (level 5)

**Reference:** the commit that adds this file.

```diff
 No spec, no plan, no task list. Write it, test it, commit it.
+A change under `apps/<app>/api/` is Tier 1 at least, whatever its size.
 Task list:
-1. `/code-standards` for the layers you are touching
+1. write `docs/features/<app>/<slug>/spec/spec.md` before the code: who it is for,
+   each behaviour with its evidence, what is out of scope. No `/specification` walk.
```

Both lines are still in `.claude/skills/route/SKILL.md:28-32` (read this session). This is a written instruction, so it holds only when `/route` is run and read.

**Proposed:** move the demand the gate already makes to its earliest moment. Add a check beside `scripts/hooks/checks/lint-write.core.ts`, on Write and Edit of `apps/*/api/**`, that refuses when the branch adds no `docs/features/<app>/*/spec/spec.md` since `origin/main`. The entry first turned this down because it "would add a gate in front of every API one-liner". That premise was wrong: every API change already needs a report, and the report needs a spec, so the cost exists today and only arrives late. With the check, writing API code before the spec becomes impossible, and the route line becomes redundant (level 2).

**Similar instances:** `grep -n "visual" scripts/hooks/checks/api-change-needs-validation.core.ts` shows the same check now also refuses a front-end pull request without a visual-validation report (lines 80 to 84), which also reads a spec. The Tier 1 spec step and the proposed check cover it if the check also matches `apps/*/site/**`.

See also [a-spec-bullet-that-leans-on-what-the-code-already-does](../knowledge/a-spec-bullet-that-leans-on-what-the-code-already-does.md).
