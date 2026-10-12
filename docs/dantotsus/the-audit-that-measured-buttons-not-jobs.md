---
date: 2026-10-10
introduced-at: self-validation
detected-at: review
severity: medium
related-pr: '#151'
fix-pr: '#151'
fix-commits: [4d18fb9]
eradication-level: 4
time-to-detect: days
tags: [pragma, frontend, validation, mobile]
---

# The audit that measured buttons, not jobs

## Symptom

The bars page had two buttons labelled *Save*, and the first one on the page
saved the outreach template, not the bar. The earlier mobile audit
(`docs/features/meta/mobile-viewport-audit/`) had measured both buttons and
passed them.

## Root-cause chain

1. **Why did a member reach the wrong Save?** Both had the same label, and the
   template's came first in the page.
2. **Why did the audit pass it?** It checked each control in isolation: its
   size, its contrast, whether it fit at 375 px. Both buttons passed every one
   of those.
3. **Why did it check controls in isolation?** It had no list of what a member
   comes to do, so it had nothing to walk through the page in order.

**Root cause:** we thought a screen whose every control passes is a usable
screen, and actually usability is a property of the path a job takes through
it: which control is reached first, and how far away it is.

## Detection failure causes

- **Visual validation:** asserted per-control properties only.
- **Code review:** the second Save came from a separate component, so no
  diff showed both.
- The same blindness hid [the empty vote](./the-empty-vote-nobody-could-close.md)
  and [the unrendered projection](./the-projection-nobody-rendered.md): each
  control was fine, and the job was broken.

## Countermeasure

- **Code:** commit `c229a98` (PR #151) folded the outreach editor and renamed
  its button *Save the message*.

## Eradication (mandatory — code-level)

**Type:** detection (level 4 — a harness that walks the jobs)

**Reference:** [PR #151](https://github.com/hugoleborso/borso.fr/pull/151) · commit `4d18fb9`

**The actual fix:** `apps/pragma/scripts/task-speed/` drives ten member jobs
at 375 × 667 with touch on and counts, per tap, whether the target needed a
scroll, sat in the top quarter, or changed the screen. Every tap finds its
button by accessible name, and Playwright refuses to act on a name two
elements share, so a second *Save* on a job's path fails the run.

**Limits:** it needs the dev server and the seeded database, so it runs by
hand and not in CI. Standard 05's reviewer bullet on 375 px screens is where a
reviewer asks for it.

## See also

- [`../features/pragma/task-speed/spec/spec.md`](../features/pragma/task-speed/spec/spec.md)
