---
date: 2026-08-21
introduced-at: orchestration
detected-at: mid-run
severity: medium
related-pr: https://github.com/hugoleborso/borso.fr/pull/82
tags: [harness, orchestrator, subagents, tooling]
---

# Parallel agents share one scratchpad, and they pick the same filename

Every agent in a fan-out gets the **same** session scratchpad directory. They
do not get one each.

Agents solving the same task reach for the same obvious filename, so they
overwrite each other's work mid-run, silently. Measured on PR #81, which ran
eight agents stripping comments in parallel — **three of the eight** logged
this independently, each having lost a different file:

| Agent | Lost |
| --- | --- |
| `strip-pragma-site` | `comments.txt`, its analysis |
| `strip-lint` | `strip.mjs`, its helper |
| `strip-scripts` | `strip.py`, its helper |

The failure does not announce itself. `strip-scripts` saw its tool start
failing with **another agent's Python traceback**, which reads as a bug in
your own script rather than as a different script wearing its name.

## What to do

Give every agent its own subdirectory, named after the label it already has
for `scripts/kaizen.sh`:

    <scratchpad>/<your-label>/

Put it in the brief, next to the label. One line prevents all three losses,
and it costs nothing because the label already exists — the agents were
already told to log kaizen entries under it.

## Why not worktree isolation

`isolation: "worktree"` gives an agent its own checkout, which solves file
collisions in the *repository*. It does not give it its own scratchpad, and
it is expensive (a few hundred milliseconds and a disk copy per agent). Reach
for it when agents must not see each other's **source** changes. For scratch
files, a subdirectory is the whole fix.

## Related

- [`two-agents-in-one-working-tree.md`](./two-agents-in-one-working-tree.md) —
  the same class one level down: how a concurrent writer shows itself in the
  repository rather than in the scratchpad.
- [`subagents-that-were-never-told-their-label.md`](./subagents-that-were-never-told-their-label.md)
  — why the label exists, and why this entry could count three victims instead
  of guessing at one.
