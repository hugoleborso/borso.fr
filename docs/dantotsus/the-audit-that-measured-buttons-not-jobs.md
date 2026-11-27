---
date: 2026-10-10
introduced-at: self-validation
detected-at: review
severity: medium
related-pr: '#151'
fix-commits: [67bab828]
eradication-level: 4
time-to-detect: days
tags: [pragma, frontend, validation, mobile]
eradication-paths: [apps/pragma/scripts/task-speed/task-speed.setup.ts, apps/pragma/scripts/task-speed/task-speed-journeys.setup.ts]
zone: apps/pragma/site/src
recurs: none (the touch-event entry sent the wrong input; this one measured the wrong unit, buttons instead of jobs)
---

# The audit that measured buttons, not jobs

## User impact

A pragma member on the bars page who pressed *Save* to save a bar could save the outreach message template instead.

| | Seen | Expected |
| --- | --- | --- |
| Bars page | Two buttons labelled *Save*. The first on the page saved the outreach template. | One *Save* for the bar, and a distinct label for the template |
| Mobile audit (`docs/features/meta/mobile-viewport-audit/`) | Both buttons measured and passed | The wrong-target path reported |

Found in review of PR #151. Every member using the bars page was exposed. Other pages were not affected by this pair.

## Causal chain

- A member could reach the wrong *Save*.
  - Both buttons had the same label, and the template's came first in the page. `f3447d969` added the outreach editor with its own *Save*.
  - The mobile audit passed both buttons.
    - It checked each control alone: size, contrast, fit at 375 px. Both passed every check.
      - The audit's method listed screens and controls to measure, and no member jobs to walk in order (Method).

## Root cause of occurrence

*Thought a screen whose every control passes is a usable screen. Actually usability is a property of the path a job takes through the screen, which control is reached first and how far away it is.* (Method)

Source: the audit report's *Results by route and profile*, which scores controls per route and profile and names no job.

## Detection failure causes

- **Visual validation:** it asserted per-control properties only, so two passing controls with one label passed.
- **Code review:** the second *Save* came from a separate component, `OutreachTemplateAction.tsx`, so no single diff showed both.
- **The same unit hid two siblings:** [the empty vote](./the-empty-vote-nobody-could-close.md) and [the unrendered projection](./the-projection-nobody-rendered.md). Each control was fine and the job was broken.

## Countermeasure

PR #151 (`67bab828`) folded the outreach editor and renamed its button *Save the message*. Verified by the harness below, whose bar journey now resolves *Save* to one element.

## Eradication

**Type:** detection (level 4)

**Reference:** commit [`67bab82`](https://github.com/hugoleborso/borso.fr/commit/67bab828) (#151).

`apps/pragma/scripts/task-speed/` drives the member jobs listed in `task-speed-journeys.setup.ts` at 375 × 667 with touch on. It counts, per tap, whether the target needed a scroll, sat in the top quarter or changed the screen. Each tap finds its button by accessible name, and Playwright refuses to act on a name two elements share. A second *Save* on a job's path fails the run.

```diff
+    "task-speed": "tsx scripts/task-speed/task-speed.setup.ts",
```

The gap is when it runs. It needs the dev server and the seeded database, so it runs by hand with `pnpm --filter @borso-app/pragma task-speed`. No CI job runs it (measured, `grep -n task-speed .github/workflows/*.yml` finds nothing). A duplicate name reaches a pull request unless someone remembers to run it.

**Proposed:** run `task-speed` in a CI job of its own on pragma changes. It needs a Postgres service and `DATABASE_URL`, as `app-tests (pragma-e2e)` has, the seed, the dev server on `localhost:5174`, and `playwright install --with-deps chromium`, which the dashboard job already runs (`ci.yml:470`). It should not join `app-tests (pragma-e2e)`: that job finished at 9 min 58 s of its 10-minute limit on PR #222 (its comment, `ci.yml:330`). A second accessible name on a job's path would then fail the pull request instead of waiting for a hand run.

**Proof it can fail:** before the rename, the bar journey's tap on *Save* hit Playwright's strict-mode refusal for two matching elements (inferred from the harness design; the refusal was not pasted at the time).

**Similar instances:** `grep -rn '"save": "Save"' apps/*/site/src/i18n/en.json` finds four generic *Save* keys, all in pragma (lines 262, 404, 594 and 722, measured). Two of them on one job's path is the shape the harness refuses. The other apps have no job harness, so their screens are still checked per control only.
