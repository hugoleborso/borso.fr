---
status: failed
summary: >-
  Every gate passes and every implementation-bearing decision in the spec landed
  in code. Lint, prettier, typecheck, knip, the vocabulary, convention-drift,
  blueprint and doc-link checks are all clean, and the full pragma suite is 199
  files and 1988 tests at 100 percent on statements, branches, functions and
  lines per file, which covers every new core and utils module. No dependency was
  added anywhere in the repository. The bass glyph's two fretboard edges are
  exactly parallel, both at slope -1 on the shipped path data. Two blockers
  remain, neither behavioural: a dead export in setlist-editor.utils.ts that knip
  and the coverage gate both miss because its own test is its only consumer, and
  a FollowsBlueprint marker on InstrumentsList naming organism-query-owning when
  the file calls no query hook. Both are one-line fixes. One ratified input
  metric, a twenty character title not truncating at 360 px, is a
  visual-validation row and a product decision, and is out of this report's
  scope.
artifacts:
  - docs/features/pragma/setlist-density/validation/technical-validation-2026-09-19-0440.md
blockers:
  - >-
    Delete the dead maximumVisibleLineupMembers export and its two constants from
    apps/pragma/site/src/components/organisms/setlist-editor.utils.ts lines 43 to
    48, delete the matching import and describe block from
    setlist-editor.utils.test.ts lines 9 and 17 to 28, and drop the now-unpassed
    maximumVisible prop and its default from MemberLineupProps in
    apps/pragma/site/src/components/molecules/MemberLineup.tsx line 22, leaving
    the bare MAXIMUM_VISIBLE_MEMBERS constant. The setlist row stopped rendering
    MemberLineup, so the function has no production caller left; knip is silent
    because its own test imports it and the per-file coverage gate reads 100
    percent for the same reason. Plan R10 named this and its mitigation was not
    finished.
  - >-
    Change the marker at apps/pragma/site/src/components/organisms/InstrumentsList.tsx
    line 113 from organism-query-owning to organism-presentational and rerun
    scripts/reports.sh blueprints. The blueprint it names is defined as the lowest
    component allowed to call a query hook, and InstrumentsList calls none: every
    value it draws arrives as a prop from InstrumentsPage, which owns
    useInstrumentsList, useMembersList and useReorderInstruments at lines 53 to
    59. blueprint-indexing --check passes because the id exists, so nothing
    mechanical catches a marker that names the wrong real blueprint.
---

# Technical validation round 1 — the setlist lineup column

Branch `claude/pensive-hamilton-nnllpm`, head `3e47bb1d`, diffed against
`1c1fa6b8`, the merge base with `origin/main` and the commit before the first
feature commit. 69 files, 3174 insertions, 375 deletions.

**Verdict: FAIL, two blockers, both one-line fixes, neither behavioural.**

Full report, with every row and its evidence:
[`../../../validation/technical-validation-2026-09-19-0440.md`](../../../validation/technical-validation-2026-09-19-0440.md).

## What holds

All nine implementation-bearing rows of the spec's decisions table landed, and
all twelve paths in its file list carry the change it described. The three
highest-severity risks in the plan are each mitigated in code and each has a
named back-end end-to-end case: primacy survives a member save inside one
transaction (R1), the instrument reorder settles from its own response with no
invalidation anywhere in the hook (R2), and both instrument projections widened
together (R3).

The three things this validation was asked to check in particular:

- **No dependency was added.** `git diff` over every `package.json`,
  `pnpm-lock.yaml` and `pnpm-workspace.yaml` between the base and the head is
  empty. The six glyphs are path data in the existing registry.
- **The bass glyph's two fretboard edges are exactly parallel.** On the shipped
  path data the deltas are `(6.52, -6.52)` and `(7.12, -7.12)`; both slopes are
  `-1` exactly and the cross product is `7.1e-15`, float noise on a true zero.
- **Every new `*.core.ts` and `*.utils.ts` is at 100 percent.** Eight new gated
  files, each with its sibling test, inside a run that reports 100 on all four
  axes with `perFile: true`.

## What does not hold

Two blockers, both in the front matter above, both cleanliness rather than
behaviour. The first is a dead export that two separate detectors are
structurally unable to see, which is the more interesting of the two: a test
file counts as a consumer for knip and as coverage for the threshold, so an
export whose only remaining caller is its own test reads healthy to both gates.
The second is a blueprint marker naming a pattern the file contradicts.

## Out of scope, recorded so it is not lost

The spec's ratified input metric that a twenty character title not truncate at
360 px is still unmet, by the implementer's own measurement, and was already
unmet before this branch added a column. It is a `/visual-validation` row and
the fix is a product call between the album cover, the position number and the
energy meter's width. It is not scored here and it is not one of the blockers
above.
