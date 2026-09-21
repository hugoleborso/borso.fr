# Plan — the setlist lineup column

> Early quality check. Pair with [`../spec/spec.md`](../spec/spec.md) and
> [ADR-0022](../../../../adr/0022-instruments-carry-their-own-icon-order-and-primacy.md).
> When a defect lands and a Dantotsu traces back here, the chain is visible: the
> plan either named the risk and we missed mitigating it, did not name the risk
> at all, or named it correctly and the defect comes from elsewhere.

**Intent.** Ship the instrument column on the setlist card, the glyphs it draws,
and the three database columns that order it, without growing the card and
without letting the column push the title.

**Scope note.** The density half of the spec (54 px card, 24/36 px seam, the
volume-style energy meter) already shipped on this branch in `95a4b43` and
`093a690`. Everything below is the remaining half: the column, its icons, its
data and its editor.

## What the workspace actually is

Read from the tree, not from the spec, per the standard's step 2.

| Surface | Live state | Consequence for the plan |
|---|---|---|
| Workspace | One package `@borso-app/pragma`, `site/` + `api/` + `cdk/` + `domain/` under it. No `site/package.json` | Every gate runs with `--filter @borso-app/pragma`; there is no separate site filter |
| `instrument` table | `id`, `name`, `is_harmonic`, `family` (nullable). Reads go through `resolveInstrumentFamily(family, isHarmonic)` | The migration adds to a table that already carries one legacy column pair; do not touch it |
| `member_instrument` | `(member_id, instrument_id)` composite primary key, no payload columns | `is_primary` is the first payload column the link has ever had |
| Link write path | `replaceMemberInstruments` deletes every row for the member then re-inserts from `instrumentIds: string[]` | **Delete-then-insert erases `is_primary` on every member save.** This is the highest-severity finding in this plan; see R1 |
| Instrument projection | `PROJECTION` in `instruments.repository.ts` *and* a second `INSTRUMENT_PROJECTION` in `members.repository.ts` | Two projections to widen, not one; missing the second makes the member roster draw the fallback glyph |
| Icon atom | `Icon.tsx`, one `as const` map, `IconName = keyof typeof ICONS`, camelCase keys, shared `viewBox="0 0 24 24"`, `stroke="currentColor"`, `strokeWidth="1.6"` | Lucide paths drop in unchanged, per ADR-0022. Registry keys stay camelCase; the stored values do not |
| Responsive decisions | `useIsMediaQueryMatching(BREAKPOINT_BELOW_LG)` feeds `maximumVisibleLineupMembers(isNarrow)`, a pure function with its own test | The column's yielding reuses this shape. No `ResizeObserver`, no `useEffect` |
| Coverage gate | Per file 100% on `domain/**/*.core.ts`, `api/src/**/*.core.ts`, `api/src/**/*.utils.ts`, **`api/src/**/*.schema.ts`**, `site/src/**/*.core.ts`, `site/src/**/*.utils.ts` | A new zod schema in `instruments.schema.ts` is itself under the gate, not only the core modules |
| Migration runner | `test/setup-postgres.ts` drops `TRACKED_TABLES` and replays every `.sql` in name order; `DsqlSchema` applies the same files in prod | Additive `ALTER TABLE` only, next number is `0014`. No `TRACKED_TABLES` edit, since no new table |
| Migration audit | `migrations.audit.test.ts` scans `ADD COLUMN … DEFAULT now()` against an allow list | Literal defaults (`'music'`, `0`, `false`) pass untouched |
| i18n | `en.json` + `fr.json` with `i18n-parity.core.test.ts` | Every new key lands in both files in the same commit |

## Pattern coherence pass

| Question | Answer |
|---|---|
| New dependency? | **None.** ADR-0022 forbids `lucide-react`; the paths are copied into `Icon.tsx`. `@dnd-kit/*` is already a dependency and already drives setlist reordering, so instrument reordering reuses it rather than adding a second drag library |
| New state pattern? | **None.** Server state stays in TanStack Query, the slot budget stays a pure function of a media-query boolean, the form stays `@tanstack/react-form`. Nothing here needs a store |
| Pattern this absorbs | `MemberLineup` (overlapping avatar chips) stops being rendered by `SetlistEntryRow` in both the wide branch and the phone `moreOpen` branch, and so does the `prominentMemberInstrument` chip beside it. `MemberLineup` itself stays, because `LineupEditor` and other callers still use it; the row is the only call site that goes away. If knip reports it unused after the change, delete it in the same commit rather than keep a dead molecule |
| Duplication this creates | Two instrument projections (see above). Widen both in the same commit; the alternative, one shared projection module, crosses the slice boundary for no gain |

## How each spec decision becomes code

| Spec ref | Decision | Where it lands | Self-check |
|---|---|---|---|
| ADR-0022, Changes → Database | `icon` and `position` on `instrument`, `is_primary` on `member_instrument` | `apps/pragma/api/src/database/migrations/0014_lineup_slots.sql`, three additive `ALTER TABLE … ADD COLUMN … NOT NULL DEFAULT` | `pnpm --filter @borso-app/pragma run test` boots Postgres, replays every migration and passes back-e2e |
| Changes → Database, seeding | Existing rows seed `position` from family order then name | One `UPDATE instrument SET position = …` in the same file, ranking `vocal, harmonic, percussive, other` then `name`, reading `COALESCE(family, CASE WHEN is_harmonic THEN 'harmonic' ELSE 'other' END)` so rows written before `family` existed rank correctly | A back-e2e case seeds four instruments across three families and asserts the returned order is not alphabetical |
| Changes → Types | `INSTRUMENT_ICONS` and `InstrumentIcon` | `apps/pragma/domain/instrument.core.ts`, beside `INSTRUMENT_FAMILIES`. Both the api zod schema and the site import it through `@domain/instrument.core` | `grep -rn "INSTRUMENT_ICONS" apps/pragma` shows one declaration and imports on both sides |
| Q: how is the column ordered → a stored position | `icon` and `position` reach the wire | `instruments.schema.ts` (drizzle columns + `instrumentIconSchema`, `instrumentPositionSchema`, both folded into create and update), `instruments.repository.ts` (`PROJECTION` widened, `InstrumentRow` widened), `instruments.service.ts` (`getInstrumentsSorted` sorts by `position` then `name` instead of `name`), `instruments.controller.ts` (unchanged shape, wider row flows through `hc`) | `pnpm --filter @borso-app/pragma typecheck`; the site's `InstrumentRow` gains the fields with no hand-written type |
| Q: which instruments get a slot → the primary ones | The read carries who plays what and whether it is primary | `instruments.repository.ts` gains `listInstrumentsWithPlayers()`, one left join on `member_instrument`, folded into rows as `players: { memberId, isPrimary }[]`. `GET /api/instruments` returns it | A back-e2e case asserts an instrument nobody plays returns `players: []` and one played by two members returns both |
| Q: which instruments get a slot, cap | Cap at members plus two | `apps/pragma/site/src/components/molecules/lineup-slots.core.ts`, `buildLineupSlots({ instruments, lineup, members, maximumSlots })` | Unit case: 7 primary instruments, 3 members, cap resolves to 5 slots and `overflowCount` 2 |
| Edge: viewport too narrow, column yields | Slot budget is a pure function of the breakpoint, and the column drops from the right with `+N` | `setlist-editor.utils.ts` gains `maximumVisibleLineupSlots(isNarrow)` beside the existing `maximumVisibleLineupMembers`; `SetlistEditor` passes it down through `SetlistEntriesList` to `SetlistEntryRow`, exactly the path `maximumVisibleMembers` already takes. The final count is `Math.min(memberCount + 2, breakpointBudget)`, computed in `lineup-slots.core.ts` | Unit cases on both caps; `/visual-validation` at 360 px asserts `+N` is present and the title of a 20 character song is not truncated |
| Edge: title never truncates to feed the column | The title keeps `min-w-0 flex-1`, the column keeps `shrink-0` with a fixed slot count | `SetlistEntryRow.tsx`: the title block already carries `min-w-0 flex-1`; `LineupSlots` renders `shrink-0` with a budget, never `flex-1` | `/visual-validation` at 360 px, title at 20 characters, asserts no ellipsis |
| Q: what marks an instrument in a slot → icons | `LineupSlots` draws one `Icon` per slot, 17 px, tinted with the holder's colour | `apps/pragma/site/src/components/molecules/LineupSlots.tsx`, `// @FollowsBlueprint molecule-presentational` | The molecule holds no state, no query and no conditional beyond the empty tint |
| Q: where do icons come from → Lucide first, one generated bass | Six glyph entries added to the one registry, no new dependency | `Icon.tsx` `ICONS` gains `micVocal`, `guitar`, `bass`, `piano`, `drum`, `music`. `lineup-slots.core.ts` holds `INSTRUMENT_ICON_GLYPH` as `satisfies Record<InstrumentIcon, IconName>`, which is where the stored `'mic-vocal'` meets the camelCase registry key | `grep -n "lucide" apps/pragma/package.json` returns nothing; the record is exhaustive by type, so a seventh stored icon is a compile error |
| Q: how is the bass drawn → parametric | The bass path is written as coordinates whose fretboard edges are parallel by construction | `Icon.tsx`, `bass` entry. Named constants for the body radius and the neck offsets rather than bare numbers inside the `d` string is not possible inside path data, so the provenance and the construction live in `docs/knowledge/instrument-icon-provenance.md` | Visual: the two fretboard edges read parallel at 17 px in the 360 px screenshot |
| Changes → Files, provenance | Lucide ISC attribution | `docs/knowledge/instrument-icon-provenance.md`, new, linked from the knowledge index | `pnpm exec tsx scripts/docs/check-doc-links.ts` resolves the link |
| Edge: a song has no lineup, and override empties it | Grey wins over yellow | `setlist-entry-tone.core.ts` unchanged, it already returns `unstaffed` before testing `hasOverride` | Existing `setlist-entry-tone.core.test.ts` cases still pass; no new code |
| Q: how does an override read now → tint | The override badge leaves the card | `SetlistEntryRow.tsx`: remove the `prominentMemberInstrument` chip block and both `MemberLineup` call sites; `SetlistEntriesList.tsx` stops computing `prominentMemberInstrumentFor`; the `ProminentMemberInstrument` interface goes with it. The badge stays inside `LineupEditor` | `grep -rn "prominentMemberInstrument" apps/pragma/site` returns nothing; `pnpm exec knip` reports no newly unused export |
| Happy path 5: pressing the column opens the lineup editor | The column is the button | `SetlistEntryRow.tsx`: the existing lineup button keeps `onClick={() => setLineupEditorOpen(true)}` and loses `hidden sm:inline-flex`, because the column is the phone affordance now | `/visual-validation` at 360 px taps the column and asserts the editor opens |
| Changes → Files, `is_primary` write | Marking an instrument primary for a member | `members.schema.ts`: `memberInstrumentTable` gains `isPrimary`; `memberInstrumentAssignmentSchema` widens to `{ instrumentIds: string[], primaryInstrumentIds?: string[] }`. `members.repository.ts`: `replaceMemberInstruments` takes the primary set and writes it on insert; **when `primaryInstrumentIds` is absent it reads the surviving rows' current primacy first and re-writes it**, which is what keeps the member form from wiping the column. See R1 | Back-e2e case: mark an instrument primary, then save the member form with only `instrumentIds`, then read back and assert the flag survived |
| Changes → Files, instruments page | Icon picker, drag order, primary toggle | `InstrumentsPage.tsx`: each row gains a `@dnd-kit` handle, a six-way icon picker built from `INSTRUMENT_ICONS`, and one primary toggle per member chip drawn from `players`. The toggle calls the existing `PUT /api/members/:id/instruments` with that member's full list plus the new primary set, which is why the read carries `players` | `/visual-validation` at 1280 px sets an icon and reorders two rows; a reload shows both survived |
| Reorder write | The reorder settles from its own response, never from a refetch | `instruments.queries.ts`: `useReorderInstruments` follows `query-optimistic-mutation`, writes the predicted order in `onMutate`, reconciles from the response in `onSuccess`, restores the snapshot in `onError`, and **calls no `invalidateQueries` and no refetch** | `pnpm --filter @borso-app/pragma run lint` passes `borso/no-refetch-of-optimistically-written-query`. See R2 |
| Test strategy → unit | `lineup-slots.core.ts` at 100% on four axes | Sibling `lineup-slots.core.test.ts` covering the fixed order, the cap at members plus two, the breakpoint budget, the overflow count, a slot with no holder, a member holding two slots, and an instrument whose icon is the fallback | `pnpm --filter @borso-app/pragma run test:core` with coverage |
| Test strategy → visual | Every numbered step and edge case at 360 px and 1280 px | `/visual-validation` against this spec | Its report lands under `docs/features/pragma/setlist-density/validation/` |
| Vocabulary | Three new facts about nouns the app already names | `apps/pragma/VOCABULARY.md`: the **Instrument** section's claim *"The list is sorted by name"* becomes false and must be rewritten to position then name, and gains `icon` and `position`; a new **Lineup slot** section names the fixed column, its cap and its fallback; the **Lineup** section gains the primacy sentence | `scripts/check-vocabulary-paths.sh` passes; every `Lives in:` line names a folder that exists |
| Out of scope | Reordering instruments from the setlist screen, per-member icons, glyphs beyond the bass, the scene screen, dark-mode tints | (out of scope) | `grep -rn "instrument" apps/pragma/site/src/routes/scene` shows no new call site |

## Risk register

| # | Risk | Severity | Mitigation in plan | Detection if it slips |
|---|---|---|---|---|
| R1 | Saving a member's instruments wipes every `is_primary`, emptying the whole lineup column for the band, silently. `replaceMemberInstruments` is a delete then insert and the new column defaults to `false` | **high** | `replaceMemberInstruments` reads the surviving links' primacy inside the same transaction and re-writes it when the payload does not carry `primaryInstrumentIds`. The read and the write are one transaction, not two statements | Back-e2e case named for it: mark primary, save the member form with the legacy payload shape, read back and assert the flag survived. A regression fails `pnpm --filter @borso-app/pragma run test` |
| R2 | The instrument reorder reverts on screen, because the `GET` after the `PUT` is served by a DSQL connection that has not seen the commit | **high** | No `invalidateQueries` on the reorder mutation. `onMutate` writes the order, `onSuccess` reconciles from the response body. This is the shape [`optimistic-reorder-reverted-by-stale-dsql-read`](../../../../dantotsus/optimistic-reorder-reverted-by-stale-dsql-read.md) records | `borso/no-refetch-of-optimistically-written-query` fails lint at push. Visually: drag two rows, and the list snaps back after roughly a second |
| R3 | The member roster and the mastery matrix draw the fallback glyph, because only `instruments.repository.ts`'s projection was widened and `members.repository.ts` keeps its own | medium | Both projections widen in the same commit, and `MemberInstrumentRow` gains the same fields as `InstrumentRow` | `pnpm --filter @borso-app/pragma typecheck` catches it only if the site reads the field off the member roster; otherwise the member page renders `music` for every instrument. `/visual-validation` opens the member page at 1280 px and asserts a non-fallback glyph |
| R4 | The column pushes the title into truncation at 360 px, which is the one thing the spec forbids | **high** | The slot count is a budget the breakpoint fixes, the column is `shrink-0` at that budget, and the title block keeps `min-w-0 flex-1`. The column can only shrink by dropping a slot, never by squeezing the title | `/visual-validation` at 360 px on a 20 character title asserts no ellipsis. A pure case in `lineup-slots.core.test.ts` pins the narrow budget |
| R5 | The card grows taller than 54 px once the column lands | **high** | `LineupSlots` renders inline in the existing `flex items-center` row at 17 px, inside the height the drag handle and the energy meter already set. No wrapping, no second row | `/visual-validation` measures the card's bounding box at 360 px and at 1280 px and fails above 54 px. A second row would show immediately as a doubled height |
| R6 | A band that never opens the instruments page sees every instrument at position 0 and no primary flag, so the column is empty and reads worse than the avatars it replaced. ADR-0022 names this consequence | medium | The migration seeds `position` from family order then name, so day one ordering is sensible. Primacy has no equivalent seed, so the migration also marks primary every link whose instrument is the member's only instrument, which is the honest reading of "their main instrument" and is right for the seeded band | Back-e2e case on the migrated fixture asserts a non-empty slot set with no page visit. `/visual-validation` on the seeded set asserts at least one tinted slot |
| R7 | The new zod schemas drop below the per-file 100% coverage gate, because `api/src/**/*.schema.ts` is inside the coverage include list and most people read it as a type file | medium | `instruments.schema.test.ts` and `members.schema.test.ts` both gain cases for the new fields, including the rejected values, in the same commit as the schema change | `pnpm --filter @borso-app/pragma run test:coverage` fails on the file, naming it |
| R8 | The migration passes locally and fails on DSQL, because DSQL rejects something Postgres accepts | medium | Three additive `ALTER TABLE … ADD COLUMN`, one `UPDATE`, all of which the existing thirteen migrations already use. No index, no constraint, no type change | The preview deploy runs `DsqlSchema` against the real cluster on the first push to the pull request; a failure shows there, not in prod |
| R9 | `+N` counts slots the reader cannot see, and the reader cannot tell which instrument is missing | low | The `+N` marker carries a `title` listing the dropped instrument names, the same way `MemberLineup`'s counter does today | `/visual-validation` hovers the marker at 1280 px and reads the title |
| R10 | `MemberLineup` or `prominentMemberInstrumentFor` becomes dead code and stays | low | Delete the call sites, then let knip name what is left over and delete that too in the same commit | `pnpm exec knip` at pre-push |
| R11 | The copied Lucide artwork ships with no attribution, which the ISC licence does not permit | medium | `docs/knowledge/instrument-icon-provenance.md` is written in the same commit as the glyphs, because the no-comments rule keeps the notice out of `Icon.tsx` | `/technical-validation` reads ADR-0022 and the diff together; a glyph commit with no provenance file is a FAIL row |
| R12 | A new file lands with no layer suffix and raises the `layer-marker:pragma` budget | low | Every new file ends in a suffix the inference knows: `.core.ts`, `.sql`, or a component filename | `pnpm exec tsx scripts/standards/convention-drift.ts --check` at pre-commit |

## Code-quality self-check

- [ ] Repo lint passes: `pnpm exec eslint --no-warn-ignored --max-warnings 0`.
- [ ] Type assertions: only `as const` and `as unknown`. The icon glyph table uses `satisfies Record<InstrumentIcon, IconName>`, not a cast.
- [ ] No `any`.
- [ ] No abbreviations or single-letter locals outside `for (let i = 0; …)`.
- [ ] Magic numbers named: `FALLBACK_INSTRUMENT_ICON`, `DEFAULT_INSTRUMENT_POSITION`, `SLOTS_BEYOND_MEMBER_COUNT`, `LINEUP_SLOT_ICON_SIZE_PX`, `NARROW_LINEUP_SLOT_BUDGET`, `WIDE_LINEUP_SLOT_BUDGET`, `MINIMUM_OVERFLOW_WORTH_A_COUNTER`.
- [ ] No comments in code. The machine-read annotations stay: `@Blueprint`, `@FollowsBlueprint`, `@Feature`, `@DependsOnExternal`.
- [ ] No JSDoc on internals.
- [ ] Function names describe the result: `buildLineupSlots`, `maximumVisibleLineupSlots`, `listInstrumentsWithPlayers`, not `computeSlots` or `getIcons`.
- [ ] Pure modules carry the suffix and a sibling test at 100%: `lineup-slots.core.ts` + `lineup-slots.core.test.ts`, `setlist-editor.utils.ts` additions covered in the existing sibling.
- [ ] The controller stays a dispatcher. The players join lives in the repository, the row folding in a pure helper, not in the route.
- [ ] No `useEffect` added. The slot budget comes from the existing `useIsMediaQueryMatching`, the reorder from a mutation.
- [ ] Every new visible string goes through i18next and lands in both `en.json` and `fr.json`.
- [ ] Every new file in `apps/` carries `// @FollowsBlueprint <id>` naming a blueprint that exists.
- [ ] Every layout-bearing class on the new column carries a responsive prefix where it differs by width.

## Pre-flight gates

Run, in order, before push:

1. `pnpm install`.
2. `scripts/reports.sh blueprints` — the index a `@FollowsBlueprint` marker is checked against is generated, and a blueprint added this session is not in it until this runs.
3. `pnpm --filter @borso-app/pragma run typecheck`.
4. `pnpm exec eslint --no-warn-ignored --max-warnings 0`.
5. `pnpm exec prettier --check .`.
6. `pnpm --filter @borso-app/pragma run test:coverage` — per file 100% on every `.core.ts`, `.utils.ts` and `.schema.ts`, and the back-e2e suite against the sandbox Postgres, which is where R1, R6 and the migration are proved.
7. `pnpm --filter @borso-app/pragma run build`.
8. `pnpm exec knip` — no unused entries, which is where R10 is caught.
9. `bash scripts/check-vocabulary-paths.sh`.
10. `pnpm exec tsx scripts/standards/convention-drift.ts --check`.
11. `/visual-validation docs/features/pragma/setlist-density/spec/spec.md` at 360 px and 1280 px, plus `scripts/argent.sh` for the two touch assertions, because a synthetic click is not a tap and the column and the energy meter are both thumb targets.
12. `human:` read the 360 px screenshot and confirm the card is no taller than it was and the title of the longest seeded song is not truncated. This is the one gate no command decides.
13. `/technical-validation docs/features/pragma/setlist-density/spec/spec.md`.

## Open questions / unknowns

- None blocking. Two things were resolved during planning rather than escalated,
  and are recorded here so a later Dantotsu can see they were decided and not
  overlooked:
  - **Where primacy is edited.** The spec's file list and ADR-0022 both put it on
    the instruments page, while the column itself lives on `member_instrument`,
    which only the member form writes today. Resolved by keeping the write on the
    existing `PUT /api/members/:id/instruments` route and giving the instruments
    page a toggle per member chip that calls it. No new route, and the link keeps
    a single write path, which is also what makes R1 fixable in one place.
  - **How the column yields.** The spec says it drops slots from the right and
    shows `+N`, without saying what measures the width. Resolved as a breakpoint
    budget through the existing `useIsMediaQueryMatching`, not a `ResizeObserver`,
    because the repo's `useEffect` rule points there and the decision stays pure
    and testable.
- One factual gap, not blocking: the spec says *"Reference renders live beside
  this spec under `design/`"*, and `docs/features/pragma/setlist-density/design/`
  does not exist in the tree. The implementation works from the spec's prose and
  the numbers in its Result table; the visual validator asserts against those, not
  against renders it cannot open.

## Missing technical skills

- **`/drizzle-migration`** — nothing under `.claude/skills/` covers writing an
  additive migration for this repo: the numbering, the `--> statement-breakpoint`
  convention `setup-postgres.ts` splits on, the `DEFAULT now()` audit, and the
  DSQL restrictions. Three of this plan's rows had to be derived by reading
  `test/setup-postgres.ts` and `migrations.audit.test.ts` directly.
- **`/icon-registry`** — the rules for adding a glyph to the one `as const` map
  (shared `viewBox`, `stroke="currentColor"`, no `fill` except where the existing
  entries set it explicitly, provenance for copied artwork) are spread across
  `Icon.tsx`'s blueprint block and ADR-0022.
