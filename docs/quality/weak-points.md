# Engaged weak points

This file lists the weak points this repository has committed to drive to
zero. A person writes it and a person accepts it; no generator rewrites it.
[ADR-0029](../adr/0029-weak-point-management-from-the-dantotsu-record.md)
records why it exists and how it is read.

A weak point is a place in the product or in the factory where defects keep
landing. Every dantotsu names the place it lived in `zone:`. When it belongs
to one of the weak points below, it also names that weak point in
`weak-point:`. `scripts/quality/weak-points.ts` reads both fields and draws
the two maps, with one dot per defect, and a weekly count for each row of the
table. A weak point is closed when its count has stayed at zero long enough
that the operator removes its row.

Status: **draft, to ratify in the pull request that adds this file.** The
three rows were proposed from the data, not chosen by the operator. Each is
the largest group of entries that kept recurring after an eradication was
recorded against it.

| Id | Weak point | Map | Engaged on | Countermeasure under way |
| --- | --- | --- | --- | --- |
| `gate-measures-nothing` | A gate reports green while measuring nothing | factory | 2026-10-10 | Proposed: plant one defect per gate and fail CI when a gate passes it |
| `prose-stands-in-for-a-check` | A document asserts a property that nothing checks or nobody reads | factory | 2026-10-10 | Proposed: route each knowledge entry to the tool call that needs it, and level instruction edits at 5 |
| `optimistic-write-undone` | An optimistic write is undone by a refetch or a stale DSQL read | product | 2026-10-10 | Proposed: extend `borso/no-refetch-of-optimistically-written-query` to `refetchInterval` |

## Why these three

- `gate-measures-nothing` has the most entries of any group: nineteen from
  2026-05-14 to 2026-10-05, each fixing one gate and none fixing the class.
  The first of them already named the class fix, a check that every gate
  fails on a planted defect, and it was never built.
- `prose-stands-in-for-a-check` covers the entries where CLAUDE.md, a skill,
  a comment or a knowledge entry said something true or false that no tool
  read at the moment it mattered: seventeen entries from 2026-05-14 to
  2026-10-02. It recurred after every prose-only fix.
- `optimistic-write-undone` is the one product group that recurred: four
  entries in pragma from 2026-06-06 to 2026-09-16, the last one after the
  ESLint rule existed, through a path the rule did not cover.

## Rules for this file

- An id is lower-case words joined by hyphens. A dantotsu's `weak-point:`
  must name one of the ids above, and `weak-points.ts --check` fails
  otherwise.
- Two or three rows at a time. A longer list is a backlog, not an
  engagement.
- Close a weak point when its weekly count has been zero for as long as the
  operator decides: move its row under a `## Closed` heading at the end of
  this file and say so in the commit message. The generator stops counting
  it, and the dantotsus that name it still resolve.
