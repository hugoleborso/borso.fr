# Technical validation — the setlist lineup column

**Verdict: FAIL (2 blockers).**

| | |
|---|---|
| Spec | [`../spec/spec.md`](../spec/spec.md) |
| Plan | [`../plan/plan.md`](../plan/plan.md) |
| ADR | [ADR-0021](../../../../adr/0021-instruments-carry-their-own-icon-order-and-primacy.md) |
| Branch | `claude/pensive-hamilton-nnllpm`, head `3e47bb1d` |
| Base | `1c1fa6b8`, the merge base with `origin/main` and the commit before the first feature commit `95a4b437` |
| Diff | 69 files, 3174 insertions, 375 deletions |

Both blockers are one-line deletions or one-word edits. Neither touches
behaviour, and everything the spec asks the code to do, the code does.

## Preamble

- Every use case and edge case the spec numbers is a browser assertion and is
  routed to `/visual-validation` by the spec's own *Test strategy*. **Nine rows
  are therefore out of scope for this report** and carry no tag here.
- The implementer records, in
  [`../runs/2026-09-18-setlist-density/agents/implementation-01.md`](../runs/2026-09-18-setlist-density/agents/implementation-01.md),
  that one ratified input metric is still unmet: at 360 px a twenty character
  title truncates, and did so before this branch added a column. That is a
  `/visual-validation` row and a product decision. It is named here so it is not
  lost, not scored here.
- The spec says reference renders live under `docs/features/pragma/setlist-density/design/`.
  That folder does not exist in the tree. The plan already recorded this. It
  blocks nothing this validator checks.

## A. Correctness against the spec

### A1. Questions, Options and Decisions

| # | Decision | Tag | Evidence |
|---|---|---|---|
| A1.1 | Energy is a volume meter: 32 px of travel is one level, the pointer stays captured past the widget bounds, 44 px target | PASS | `apps/pragma/site/src/components/atoms/energy-meter.utils.ts:3` `const PIXELS_PER_LEVEL = 32;` and `:18` `startLevel + Math.round(horizontalTravel / PIXELS_PER_LEVEL)`. Capture at `apps/pragma/site/src/components/atoms/EnergyMeter.tsx:47` `event.currentTarget.setPointerCapture(event.pointerId)`. The 44 px target is `h-11` at `EnergyMeter.tsx:87` |
| A1.2 | Transitions become a seam: held is a 24 px hairline carrying the carriers, risky keeps a readable 36 px band with its note | PASS | `apps/pragma/site/src/components/organisms/TransitionStrip.tsx:47` `flex h-6 w-full` (24 px) with `<span className="h-px flex-1 bg-line" />` either side of `CarrierStack` at `:49-52`; risky at `:63` `flex min-h-9 w-full` (36 px) with the note at `:78` |
| A1.3 | The lineup column sits inline at 17 px, compressible; no second row; the album cover stays | PASS | `apps/pragma/site/src/components/molecules/LineupSlots.tsx:7` `const LINEUP_SLOT_ICON_SIZE_PX = 17;`. The column renders inside the existing `flex items-center` row at `apps/pragma/site/src/components/organisms/SetlistEntryRow.tsx:136` and `:192`; `AlbumCover` is still at `:146`. No wrapper adds a second row |
| A1.4 | An instrument is marked by an icon, not a code or a chip | PASS | `LineupSlots.tsx:26` renders `<Icon name={slot.glyph} …>` and nothing else per slot |
| A1.5 | Icons are Lucide first plus one generated bass, copied as path data, no dependency | PASS | Six entries added to the one registry at `apps/pragma/site/src/components/atoms/Icon.tsx:191-242` (`micVocal`, `guitar`, `bass`, `piano`, `drum`, `music`). `git diff 1c1fa6b8..HEAD -- '**/package.json' 'pnpm-lock.yaml' 'pnpm-workspace.yaml'` is **empty**: no dependency was added or moved anywhere in the repository |
| A1.6 | The bass is parametric, both fretboard edges exactly parallel | PASS | `Icon.tsx:207-208`: the edges run `M12.35 13.83L18.87 7.31` and `M10.02 12.7L17.14 5.58`. Deltas are `(6.52, -6.52)` and `(7.12, -7.12)`; both slopes are exactly `-1.000000000000` and the cross product is `7.1e-15`, which is float representation noise on an exact zero. **Exactly parallel, verified by arithmetic on the shipped path data.** The construction and the warning not to move an endpoint by hand are recorded at `docs/knowledge/instrument-icon-provenance.md` |
| A1.7 | The column is ordered by a stored position, never alphabetically and never by a front-end name table | PASS | `position` is a real column (`apps/pragma/api/src/instruments/instruments.schema.ts:11`), sorted server side by `comparePositionThenName` (`apps/pragma/api/src/instruments/instrument-players.core.ts:38`) and again client side by `byPositionThenName` (`apps/pragma/site/src/components/molecules/lineup-slots.core.ts:53`). The old `byName` sort is gone from `instruments.service.ts`. Back-e2e case: *"orders the list by family rather than by name, which is what the column reads"* (`instruments.controller.test.ts`) |
| A1.8 | Only primary instruments get a slot, capped at members plus two | PASS | `lineup-slots.core.ts:83` `input.instruments.filter(hasPrimaryPlayer)`, cap at `:66-68` `Math.min(memberCount + SLOTS_BEYOND_MEMBER_COUNT, maximumVisibleSlots)` with `SLOTS_BEYOND_MEMBER_COUNT = 2` at `:15` |
| A1.9 | An override reads as a tint, not a badge; grey for no lineup, yellow for an override; grey wins | PASS | `apps/pragma/site/src/components/organisms/setlist-entry-tone.core.ts:15-19` maps `unstaffed → bg-bg-sunk` and `overridden → bg-warn-soft`; `:26` returns `unstaffed` before testing `hasOverride`. The badge is gone: `grep -rn "prominentMemberInstrument" apps/pragma/site` returns nothing, and `SetlistEntriesList.tsx` lost both the prop pair and the call |

### A2. Changes → Files to change

Every one of the twelve paths the spec lists exists in the diff and carries the
change the spec described. `docs/knowledge/instrument-icon-provenance.md` is new
and is linked from `docs/knowledge/README.md`; `pnpm exec tsx scripts/docs/check-doc-links.ts`
resolves it.

| # | Item | Tag | Evidence |
|---|---|---|---|
| A2.1 | `INSTRUMENT_ICONS` / `InstrumentIcon` land once and are read from both sides | PASS | Declared at `apps/pragma/domain/instrument.core.ts:24-26`; imported by `apps/pragma/api/src/instruments/instruments.schema.ts:3` and by `apps/pragma/site/src/components/molecules/InstrumentIconPicker.tsx:3`. One declaration, both sides |
| A2.2 | The three database columns exist | PASS *(deviation, see F3)* | `apps/pragma/api/src/database/migrations/0014_lineup_slots.sql:26-28`. They land **nullable**, not `NOT NULL DEFAULT` as the spec's SQL block writes, because Aurora DSQL accepts no constraint clause on `ADD COLUMN` — recorded in `docs/knowledge/dsql-postgres-compat-gaps.md` and `docs/dantotsus/dsql-alter-table-only-add-column.md`, and already avoided by all thirteen earlier migrations. The read side narrows through `resolveInstrumentIcon` and `resolveInstrumentPosition` (`domain/instrument.core.ts:36-43`). The implementation is right and the spec's SQL is wrong |
| A2.3 | Existing rows seed `position` from family order then name | PASS | `0014_lineup_slots.sql:29`, ranking `vocal, harmonic, percussive, other` through `COALESCE("family", CASE WHEN "is_harmonic" …)`; the name tiebreak is the read side's `comparePositionThenName` |
| A2.4 | Saving a member's instruments does not wipe primacy (plan R1, the highest-severity risk) | PASS | `apps/pragma/api/src/members/members.repository.ts:213-244`: one `database.transaction`, reading the surviving links' primacy before the delete and re-writing it on insert through `decidePrimaryInstrumentIds`. Back-e2e case: *"keeps a primacy the member form never sends, so saving a member does not empty the column"* |
| A2.5 | Both instrument projections widen (plan R3) | PASS | `instruments.repository.ts` `PROJECTION` gains `icon` and `position`; `members.repository.ts` `INSTRUMENT_PROJECTION` gains `icon`, `position` and `isPrimary`, with `MemberInstrumentRow` widened to match |
| A2.6 | The reorder settles from its own response, never from a refetch (plan R2) | PASS | `apps/pragma/site/src/lib/queries/instruments.queries.ts:117-146`: `onMutate` writes the predicted order through `reorderById`, `onSuccess` overwrites from `data.instruments`, `onError` restores the snapshot, and there is **no** `invalidateQueries` and no refetch anywhere in the hook. `borso/no-refetch-of-optimistically-written-query` passes |
| A2.7 | The Lucide ISC notice ships with the artwork (plan R11) | PASS | `docs/knowledge/instrument-icon-provenance.md` names `lucide-static` 1.47.0, the five copied glyphs, and reproduces the ISC notice in full |
| A2.8 | Vocabulary is updated for the three new facts | PASS | `apps/pragma/VOCABULARY.md`: the Instrument section's *"The list is sorted by name"* is replaced by position-then-name with the reason, `icon` and `position` are defined, a new **Lineup slot** section names the cap, the fallback and the confusion with **Lineup**. `scripts/check-vocabulary-paths.sh` passes |

## B. Code cleanliness

| # | Rule | Tag | Evidence |
|---|---|---|---|
| B1 | `pnpm exec eslint --no-warn-ignored --max-warnings 0` over the repository | PASS | exit 0 |
| B2 | `pnpm exec prettier --check .` | PASS | exit 0, *"All matched files use Prettier code style!"* |
| B3 | `pnpm --filter @borso-app/pragma run typecheck` | PASS | exit 0 |
| B4 | `pnpm exec knip` | PASS | exit 0, no unused export reported — but see F1: knip cannot see the dead export because its own test imports it |
| B5 | No type assertion outside `as const` / `as unknown`; no `any` | PASS | The icon glyph table is `satisfies Record<InstrumentIcon, IconName>` (`lineup-slots.core.ts:13`), the family rank is `as const satisfies Record<InstrumentFamily, number>` (`instrument.core.ts:50`), and the two label tables the same way. No `as Foo` anywhere in the diff |
| B6 | No `useEffect` added | PASS | `git diff 1c1fa6b8..HEAD -- apps/pragma/site \| grep '^+.*useEffect'` returns nothing. The slot budget comes from the existing `useIsMediaQueryMatching` through `maximumVisibleLineupSlots`, the reorder from a mutation |
| B7 | Magic numbers named | PASS | `PIXELS_PER_LEVEL`, `SLOTS_BEYOND_MEMBER_COUNT`, `MINIMUM_OVERFLOW_WORTH_A_COUNTER`, `LINEUP_SLOT_ICON_SIZE_PX`, `NARROW_LINEUP_SLOT_BUDGET`, `WIDE_LINEUP_SLOT_BUDGET`, `DRAG_ACTIVATION_DISTANCE_PX`, `ROW_ICON_SIZE_PX`, `PICKER_ICON_SIZE_PX` are all declared, every one of them named in the plan's self-check |
| B8 | No comments in code | PASS | The only comment-shaped text added is the `0014_lineup_slots.sql` header, and `.sql` is the one file type this repository comments by convention — thirteen of the fourteen earlier migrations carry the same header, and neither `borso/no-comments` nor `check-no-comments-in-styles-and-markup.sh` covers `.sql` |
| B9 | Back-end vertical slices, controller stays a dispatcher | PASS | Both touched folders are bounded contexts with the full triad. The new pure rules live inside their context (`instruments/instrument-players.core.ts`), not in an aggregator. `instruments.controller.ts:31-36` parses, calls `reorderInstruments`, maps `kind: 'stale'` to 409 and returns — no derivation, no query |
| B10 | Atomic design buckets | PASS | `LineupSlots`, `InstrumentIconPicker`, `InstrumentPlayerChips` are molecules composing atoms; `InstrumentsList` is an organism composing them; `InstrumentsPage` is the route that owns the queries |
| B11 | Every layout-bearing class carries a responsive prefix where it differs by width | PASS | `SetlistEntryRow.tsx:45-48` pairs `hidden sm:inline-flex` with `flex sm:hidden`; `InstrumentsList.tsx:74` `sm:gap-3 sm:px-3`; `InstrumentsPage.tsx:164` `grid-cols-1 md:grid-cols-[1fr_360px]` |
| B12 | i18n parity | PASS | Eleven keys added to `en.json` and the same eleven to `fr.json` in the same commit; `i18n-parity.core.test.ts` passes in the run below |
| B13 | Every new file carries `@FollowsBlueprint` naming a blueprint that exists | PASS | `blueprint-indexing.ts --check`: *"Scanned 1263 source files: 178 blueprint(s), 1175 follower(s). Annotations are complete and the index is up to date."* |
| B14 | Every `@FollowsBlueprint` marker names the blueprint the code actually follows | **FAIL** | See F2 |
| B15 | No dead code left behind by the pattern this change absorbs (plan R10) | **FAIL** | See F1 |
| B16 | `convention-drift.ts --check` — no file lands without a layer suffix (plan R12) | PASS | *"No question gained a new answer."* |

## C. Tests pass

`pnpm --filter @borso-app/pragma run test:coverage` — exit 0.

```
 Test Files  199 passed (199)
      Tests  1988 passed (1988)
   Duration  271.17s

Statements   : 100% ( 2780/2780 )
Branches     : 100% ( 1344/1344 )
Functions    : 100% (   748/748 )
Lines        : 100% ( 2356/2356 )
```

The thresholds in `apps/pragma/vitest.config.ts:29` are `perFile: true` at 100 on
all four axes, over an include list that covers `domain/**/*.core.ts`,
`api/src/**/*.{core,utils,adapter,schema}.ts` and
`site/src/**/*.{core,utils,adapter}.ts`. Every file this branch adds under those
globs is inside the gate and inside that 100%:

| New gated file | In the gate |
|---|---|
| `apps/pragma/domain/instrument.core.ts` | `domain/**/*.core.ts` |
| `apps/pragma/api/src/instruments/instrument-players.core.ts` | `api/src/**/*.core.ts` |
| `apps/pragma/site/src/components/molecules/lineup-slots.core.ts` | `site/src/**/*.core.ts` |
| `apps/pragma/site/src/components/molecules/setlist-entry-energy.core.ts` | `site/src/**/*.core.ts` |
| `apps/pragma/site/src/components/organisms/setlist-entry-tone.core.ts` | `site/src/**/*.core.ts` |
| `apps/pragma/site/src/lib/queries/member-roster.core.ts` | `site/src/**/*.core.ts` |
| `apps/pragma/site/src/routes/instruments/instruments-page.core.ts` | `site/src/**/*.core.ts` |
| `apps/pragma/site/src/components/atoms/energy-meter.utils.ts` | `site/src/**/*.utils.ts` |

Each has its sibling `*.test.ts` and each is at 100% on statements, branches,
functions and lines. **The task's coverage question is answered yes.**

The run is both projects, so the migration audit ran with it:
`apps/pragma/api/src/database/migrations.audit.test.ts` — *"asserts no business
column lands in prod with DEFAULT now()"* and *"finds every whitelisted column,
so a removed column does not leave a stale entry"*, both passing. Migration 0014
uses three bare `ADD COLUMN` and two `UPDATE`, so it needs no allow-list entry.

## D. Test coverage of what the spec asks

Nine numbered use cases and edge cases are browser assertions routed to
`/visual-validation`; they are not scored here. The spec's *Test strategy* names
six behaviours for `lineup-slots.core.ts`. All six have a test.

| # | Behaviour the spec names | Tag | Test |
|---|---|---|---|
| D1 | The fixed order | PASS | `lineup-slots.core.test.ts:33` *"orders the column by the stored position, never by name"*, and `:48` *"breaks a tie on the name, so two instruments at one position still settle"* |
| D2 | The cap at members plus two | PASS | `:96` *"caps the column at the member count plus two and counts what it dropped"*; `:111` *"yields to the narrow budget when the breakpoint is tighter than the member cap"*; `:176`, `:180` on `resolveSlotBudget` |
| D3 | The overflow count | PASS | `:186` *"stays hidden when every instrument fits"*, `:196` *"shows as soon as one instrument was dropped"* |
| D4 | A slot with no holder | PASS | `:153` *"leaves every slot untinted when the song has no lineup at all"*; `:212` on `slotTintColor` |
| D5 | A member holding two slots | PASS | `:133` *"tints both slots when one member holds two instruments on one song"* |
| D6 | An instrument with no icon | PASS | `:163` *"keeps a slot for an instrument whose icon was never chosen"*, backed by `instrument.core.test.ts:72` *"falls back to the generic glyph when the column holds a name nobody ships"* |
| D7 | Grey wins over yellow (spec says the existing core already covers it) | PASS | `setlist-entry-tone.core.test.ts:29` *"prefers unstaffed over overridden, because an override that empties the lineup is still empty"* |
| D8 | Plan R1 has a named back-e2e case | PASS | `members.controller.test.ts` *"keeps a primacy the member form never sends, so saving a member does not empty the column"* and *"drops a primacy on an instrument the member stopped playing"* |
| D9 | Plan R6, the migrated fixture gives a non-empty slot set with no page visit | PASS | `instruments.controller.test.ts` *"reports who plays each instrument, and an empty list for one nobody plays"* and *"orders the list by family rather than by name"* |

The column-order test also settles a case the spec leaves open — two members
holding the same instrument on one song — at `:143` *"settles two members on one
instrument on the first in the member order"*. Deterministic, tested, and worth a
sentence in the spec's edge-case list.

## Findings

### F1 — blocker. A dead export survives because its own test keeps it alive

`apps/pragma/site/src/components/organisms/setlist-editor.utils.ts:43-48`:

```ts
const MAXIMUM_VISIBLE_MEMBERS_WHEN_CONDENSED = 3;
const MAXIMUM_VISIBLE_MEMBERS_WHEN_ROOMY = 8;

export function maximumVisibleLineupMembers(isCondensed: boolean): number {
  return isCondensed ? MAXIMUM_VISIBLE_MEMBERS_WHEN_CONDENSED : MAXIMUM_VISIBLE_MEMBERS_WHEN_ROOMY;
}
```

This fed `MemberLineup`'s `maximumVisible` on the setlist row. That call site is
gone — `SetlistEntriesList` now passes `maximumVisibleSlots` and `SetlistEntryRow`
renders `LineupSlots`. A repository-wide grep finds exactly one consumer left,
its own test at `setlist-editor.utils.test.ts:9,17,19,23,27`.

Plan **R10** named this risk and its mitigation was *"Delete the call sites, then
let knip name what is left over and delete that too in the same commit"*. The
call site was deleted; the function was not. Knip is silent because a test file
counts as a consumer, and the per-file coverage gate reads 100% on the file for
the same reason. Both detectors the plan relied on are blind to this shape, which
is why it lands here.

`MemberLineup`'s `maximumVisible` prop (`apps/pragma/site/src/components/molecules/MemberLineup.tsx:22`)
is now passed by nobody either — `SongCard.tsx:87` and `CompositionDetail.tsx:58`
both take the default.

**Fix:** delete `maximumVisibleLineupMembers` and its two constants from
`setlist-editor.utils.ts`, delete the `describe('maximumVisibleLineupMembers')`
block and the import at `setlist-editor.utils.test.ts:9,17-28`, and drop the
now-unpassed `maximumVisible` prop from `MemberLineupProps` along with its
default, replacing it with the bare `MAXIMUM_VISIBLE_MEMBERS` constant.

### F2 — blocker. `InstrumentsList` claims a blueprint it does not follow

`apps/pragma/site/src/components/organisms/InstrumentsList.tsx:113`:

```tsx
// @FollowsBlueprint organism-query-owning
export function InstrumentsList({ rows, listLabel, onReorder, ...rowProps }: InstrumentsListProps)
```

The index defines `organism-query-owning` as *"Use for the lowest component
allowed to call a query hook, where a screen region needs server data"*.
`InstrumentsList` calls no query hook and fetches nothing: every value it draws
arrives as a prop from `InstrumentsPage`, which is the component that actually
owns `useInstrumentsList`, `useMembersList`, `useReorderInstruments` and the rest
(`InstrumentsPage.tsx:53-59`). The marker claims the opposite of what the file
does, and it claims it on the one axis that blueprint decides.

`blueprint-indexing.ts --check` passes, because the id exists and sits above a
declaration. A marker naming the wrong existing blueprint is precisely the
residue that check cannot see, and it lands in `blueprint-coverage.html` as a
follower of a pattern this file does not demonstrate.

**Fix:** change the marker to `organism-presentational` — *"a screen region that
composes molecules and atoms but owns no state and fetches nothing"*, which is
what this file is — and rerun `scripts/reports.sh blueprints`. If the dnd sensor
ownership is judged to put it outside that pattern, the honest alternative is a
new blueprint, not a borrowed one.

### F3 — not a blocker. The spec's SQL prescribes something the platform rejects

The spec's *Changes → Database* block writes all three columns as
`NOT NULL DEFAULT`. Aurora DSQL accepts no constraint clause on `ADD COLUMN`
at all. The implementation shipped them nullable and narrows on read, which is
correct and is what all thirteen earlier migrations do. Nothing in the code needs
changing; the spec text does, so the next reader does not copy it. One sentence.

### F4 — observation, no action required

`InstrumentsList.tsx:30` imports `restrictToVerticalAxis` from
`./setlist-editor.utils`, so a file tagged `@Feature instruments` depends on one
tagged `@Feature setlists` for a generic drag modifier. It type-checks, it lints
and the modifier is genuinely feature-neutral. If a third caller appears, the
modifier belongs beside the other drag helpers rather than in the setlist
editor's utils.

## Gate log

| Command | Exit | Result |
|---|---|---|
| `pnpm exec eslint --no-warn-ignored --max-warnings 0` | 0 | clean |
| `pnpm exec prettier --check .` | 0 | *All matched files use Prettier code style!* |
| `pnpm --filter @borso-app/pragma run typecheck` | 0 | clean |
| `pnpm exec knip` | 0 | no unused export (see F1 for why this is not conclusive) |
| `pnpm --filter @borso-app/pragma run test:coverage` | 0 | 199 files, 1988 tests, 100/100/100/100 per file |
| `apps/pragma/api/src/database/migrations.audit.test.ts` | 0 | inside the run above |
| `bash scripts/check-vocabulary-paths.sh` | 0 | *every term names a folder that exists and cites no comment* |
| `pnpm exec tsx scripts/standards/convention-drift.ts --check` | 0 | *No question gained a new answer.* |
| `pnpm exec tsx .claude/skills/blueprint/blueprint-indexing.ts --check` | 0 | *Annotations are complete and the index is up to date.* |
| `pnpm exec tsx scripts/docs/check-doc-links.ts` | 0 | *every document link names a file that exists* |
| `git diff 1c1fa6b8..HEAD -- '**/package.json' 'pnpm-lock.yaml' 'pnpm-workspace.yaml'` | — | **empty: no dependency added** |
