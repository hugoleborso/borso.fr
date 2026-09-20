---
status: done
summary: >-
  Both round-one blockers are closed and every gate is green on the merged tree.
  The dead maximumVisibleLineupMembers export, its two constants and
  MemberLineup's never-passed prop are gone, and the InstrumentsList marker now
  names organism-presentational, which is what the component is. Eslint on every
  changed file and on the whole pragma workspace, prettier, typecheck, knip,
  blueprint indexing, convention drift, vocabulary paths, the style comment
  sweep and doc links all pass, and the full suite is 199 files and 1985 tests at
  100 percent per file on statements, branches, functions and lines, which
  includes the migration audit. No dependency was added anywhere. The bass
  glyph's two fretboard edges are both at slope -1 with a cross product of
  7.1e-15. All six new gated files carry a sibling test. Every one of the nine
  implementation-bearing spec decisions and all sixteen Changes entries landed,
  and every spec assertion in this validator's scope has a test. This round also
  proved the migration's two backfills by hand against seeded rows, which round
  one could not. Visual validation has not run and the 360 px title metric is
  still open on that side.
artifacts:
  - docs/features/pragma/setlist-density/validation/technical-validation-2026-09-19-0528.md
---

# Technical validation round 2 — the setlist lineup column

Branch `claude/pensive-hamilton-nnllpm`, head `59c88907`, diffed against
`1c1fa6b8`, the merge base with `origin/main` and the commit before the first
feature commit. 73 files, 3592 insertions, 395 deletions.

**Verdict: PASS.** No FAIL row and no UNVERIFIABLE row.

Full report, with every row and its evidence:
[`../../../validation/technical-validation-2026-09-19-0528.md`](../../../validation/technical-validation-2026-09-19-0528.md).

## The two blockers round 1 raised

Both closed, and both closed the way the blocker asked.

`86e1a49a` deletes `maximumVisibleLineupMembers`, its two constants, the
describe block that was its only consumer, and `MemberLineup`'s never-passed
`maximumVisible` prop. A grep over `apps/` and `docs/` finds no live reference
left. The commit body names the observable property the change drops, which the
repo's refactor rule requires: the member budget is no longer overridable per
call site.

`5193e629` changes the `InstrumentsList` marker to `organism-presentational`.
That claim now holds: every value the component draws arrives as a prop and it
calls no query hook, while `InstrumentsPage` owns all seven hooks.

## The three checks this round was asked to make

- **No dependency was added.** The diff over every `package.json`,
  `pnpm-lock.yaml` and `pnpm-workspace.yaml` between the base and the head is
  zero bytes, and no manifest mentions an icon library.
- **The bass glyph's two fretboard edges are exactly parallel.** The deltas are
  `(6.52, -6.52)` and `(7.12, -7.12)`, both slopes are `-1`, and the cross
  product is `7.1e-15`, which is float noise on a true zero.
- **Every new `*.core.ts` and `*.utils.ts` is at 100 percent.** Six new or moved
  gated files, each with its sibling test, inside a run whose config sets
  `perFile: true` at 100 on all four axes and which reports 100 on all four.

## What this round could check that round 1 could not

The migration's two backfills. The end-to-end harness drops every tracked table
before each suite, so no row can predate the migration inside it, which is why
the plan's R6 detection was never built. I ran both statements against seeded
rows on the local Postgres instead. `position` seeds vocal before harmonic
before percussive before other, a row written before the `family` column existed
ranks through the `is_harmonic` fallback, and the result is not alphabetical.
`is_primary` seeds true for a member who plays exactly one instrument and leaves
a multi-instrumentalist for the band to resolve. Both behave exactly as the spec
and the plan describe.

## One harness limit, disclosed

`pnpm exec eslint … .` over the repository root dies with a V8 heap
out-of-memory in this container, and `NODE_OPTIONS` does not reach the child
through `pnpm exec`. The lint evidence is the same binary with the same flags
invoked through `node` with a raised heap, run twice: once over all fifty
changed source files and once over the whole `apps/pragma` workspace. Both exit
0. The diff touches only `apps/pragma/` and `docs/`, so those two runs cover
every file it changes. Logged to `KAIZEN.md`.

## Out of scope, recorded so it is not lost

`/visual-validation` has not run on this feature. The validation folder holds
six screenshots the implementer took and no visual verdict. Round 1 recorded
that the ratified input metric — a twenty character title not truncating at
360 px — was still unmet, and nothing in this round changed the layout. That row
belongs to the visual gate and the fix is a product call between the album
cover, the position number and the energy meter's width. It is not scored here
and it is not a blocker on this report.
