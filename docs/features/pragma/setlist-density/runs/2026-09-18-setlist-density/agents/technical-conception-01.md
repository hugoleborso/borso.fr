---
status: done
summary: |
  Wrote the engineering plan for the setlist lineup column, mapping every
  decisions-table row and every Changes entry in the spec to a file, and
  binding it to ADR-0021. Twelve risks carry a detection path. Two are
  findings the spec could not have: replaceMemberInstruments is a delete
  then insert, so adding is_primary silently wipes the column on every
  member save, and the instrument reorder is the exact shape of the
  optimistic-reorder-reverted-by-stale-dsql-read dantotsu. Both spec
  invariants are preserved in the plan: the column renders inline at 17 px
  and yields before the title by dropping slots at a breakpoint budget,
  and the card does not grow, which gate 12 measures. No open question
  blocks implementation.
artifacts:
  - docs/features/pragma/setlist-density/plan/plan.md
  - docs/features/pragma/setlist-density/runs/2026-09-18-setlist-density/agents/technical-conception-01.md
next:
  kind: validate
---

# Technical conception — setlist lineup column

## What the plan adds beyond the spec

The spec settles what the column shows and why. The plan settles where each
piece lands and what breaks. Five things came out of reading the tree that the
spec could not have carried.

1. **`replaceMemberInstruments` deletes then re-inserts.** `is_primary` is the
   first payload column `member_instrument` has ever had, and it defaults to
   `false`. Every save of the member form would therefore empty the lineup
   column for the whole band, with nothing reporting it. The plan puts the
   primacy read inside the same transaction and re-writes it when the payload
   does not carry it. This is risk R1.
2. **The instrument reorder is a known trap here.** An immediate `GET` after the
   `PUT` can be served by a DSQL connection that has not seen the commit, so the
   list snaps back. The plan settles the reorder from its own response and adds
   no invalidation, which `borso/no-refetch-of-optimistically-written-query`
   already enforces. This is R2.
3. **There are two instrument projections, not one.** `instruments.repository.ts`
   and `members.repository.ts` each declare their own. Widening only the first
   leaves the member page drawing the fallback glyph for every instrument. R3.
4. **`api/src/**/*.schema.ts` is inside the per-file 100% coverage gate.** The
   new zod fields need their own cases, not only the core modules. R7.
5. **The vocabulary carries a claim that this feature makes false.** The
   Instrument section says the list is sorted by name; it becomes position then
   name. That is a row in the plan, not a cleanup for later.

## The two spec invariants, and how the plan holds them

- **Inline at 17 px, yields before the title.** The slot count is a budget fixed
  by the breakpoint, the column is `shrink-0` at that budget, and the title keeps
  `min-w-0 flex-1`. The column can only narrow by dropping a slot and showing
  `+N`; it has no way to squeeze the title. Asserted at 360 px on a twenty
  character title.
- **The card must not grow.** `LineupSlots` renders inline in the row that the
  drag handle and the energy meter already size. No second row, no wrapping.
  Gate 12 measures the bounding box at 360 px and is the one gate a person
  decides.

## Decisions taken rather than escalated

Two ambiguities appeared when the spec was projected onto the code. Neither is a
product question, so both were settled in the plan and recorded there.

- Primacy lives on the link, which only the member route writes, while the spec
  and ADR-0021 both put its editor on the instruments page. Settled by keeping
  one write path and giving the instruments page a toggle that calls it.
- The spec says the column drops slots from the right without saying what
  measures the width. Settled as a breakpoint budget through the existing
  `useIsMediaQueryMatching`, not a `ResizeObserver`, which keeps the decision
  pure and keeps a `useEffect` out of the diff.

## One factual gap

The spec points at reference renders under `design/` beside it. That folder is
not in the tree. Not blocking: the implementation works from the spec's prose
and its Result table, and the visual validator asserts against those.

## Missing technical skills

`/drizzle-migration` and `/icon-registry`. Three plan rows had to be derived by
reading `test/setup-postgres.ts` and `migrations.audit.test.ts` directly.
