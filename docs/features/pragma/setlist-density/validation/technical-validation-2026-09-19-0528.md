# Technical validation round 2 — the setlist lineup column

Branch `claude/pensive-hamilton-nnllpm`, head `59c88907`, diffed against
`1c1fa6b8`, the merge base with `origin/main` and the commit before the first
feature commit. 73 files, 3592 insertions, 395 deletions.

**Verdict: PASS.** No FAIL row, no UNVERIFIABLE row.

Round 1 refused this branch on two blockers, both cleanliness rather than
behaviour. Both are closed, verified below by grep and by reading the two fix
commits. Every gate the spec's *Test strategy* names was run again on the
merged tree, and the three checks this round was asked to make in particular
each hold.

## Preamble — what this report does and does not cover

- Four of the spec's assertions are rendered-layout or gesture assertions whose
  ground truth lives in a running browser: at least six songs visible at 375 px,
  a twenty-character title not truncating at 360 px, the energy gesture
  surviving a reload, and two consecutive songs reading their lineup difference
  in one column position. They are routed to `/visual-validation` by the spec's
  own test strategy and are not scored here.
- **`/visual-validation` has not run on this feature.** The validation folder
  carries six screenshots the implementer took, and no visual-validation report
  or agent verdict. Round 1 recorded that the 360 px twenty-character title
  metric was still unmet by the implementer's own measurement, and nothing in
  this round changed the layout. That row is still open and is a product call
  between the album cover, the position number and the energy meter's width.
- The plan is present at `docs/features/pragma/setlist-density/plan/plan.md`, so
  no row is plan-dependent-and-unknowable.

## The three checks asked for in particular

| # | Check | Verdict | Evidence |
|---|---|---|---|
| P1 | No dependency was added | **PASS** | `git diff 1c1fa6b8..HEAD -- '**/package.json' 'package.json' 'pnpm-lock.yaml' 'pnpm-workspace.yaml'` is **0 bytes**. `grep -rn "lucide\|qlementine\|game-icons"` over `apps/pragma/package.json`, `package.json` and `pnpm-workspace.yaml` returns nothing. The six glyphs are path data inside the existing registry, `apps/pragma/site/src/components/atoms/Icon.tsx:191-243`, exactly as ADR-0021 requires |
| P2 | The bass glyph's two fretboard edges are exactly parallel | **PASS** | `Icon.tsx:209-210` carries `M12.35 13.83L18.87 7.31` and `M10.02 12.7L17.14 5.58`. Deltas `(6.52, -6.52)` and `(7.12, -7.12)`; both slopes `-1`; cross product `7.105427357601002e-15`, float noise on a true zero. Computed in this session from the shipped path data |
| P3 | Every new `*.core.ts` and `*.utils.ts` at 100% coverage | **PASS** | Six new or moved gated files, each with its sibling test (list below), inside a run whose config sets `thresholds: { perFile: true, statements: 100, branches: 100, functions: 100, lines: 100 }` (`apps/pragma/vitest.config.ts:33`) and which reports `Statements 100% (2777/2777)`, `Branches 100% (1342/1342)`, `Functions 100% (747/747)`, `Lines 100% (2353/2353)` |

New gated files and their siblings, all present:

```
apps/pragma/api/src/instruments/instrument-players.core.ts
apps/pragma/site/src/components/atoms/energy-meter.utils.ts
apps/pragma/site/src/components/molecules/lineup-slots.core.ts
apps/pragma/site/src/components/molecules/setlist-entry-energy.core.ts   (moved from organisms/)
apps/pragma/site/src/components/organisms/setlist-entry-tone.core.ts
apps/pragma/site/src/lib/queries/member-roster.core.ts
```

Four gated files that already existed and were widened — `domain/instrument.core.ts`,
`setlist-editor.utils.ts`, `optimistic.utils.ts`, `instruments-page.core.ts` —
each kept its sibling and is inside the same per-file run.

## Round 1's two blockers

| # | Blocker | Verdict | Evidence |
|---|---|---|---|
| B1 | Dead `maximumVisibleLineupMembers` export | **CLOSED** | `86e1a49a` deletes the function and both constants from `setlist-editor.utils.ts`, its describe block from the sibling test, and the never-passed `maximumVisible` prop from `MemberLineupProps` at `MemberLineup.tsx:18-22`, leaving the bare `MAXIMUM_VISIBLE_MEMBERS` the component now passes itself. `grep -rn "maximumVisibleLineupMembers\|MAXIMUM_VISIBLE_MEMBERS_WHEN"` over `apps/` and `docs/` returns nothing outside this feature's own run folder. The commit body names the observable property it drops, per the repo's refactor rule: the member budget is no longer overridable per call site |
| B2 | `InstrumentsList` marker named a blueprint the file contradicts | **CLOSED** | `5193e629` changes `InstrumentsList.tsx:113` from `organism-query-owning` to `organism-presentational`. The claim now holds: the component's props (`InstrumentsListProps`, lines 49-58) carry every value it draws, it calls no query hook, and `InstrumentsPage.tsx:53-59` owns `useInstrumentsList`, `useMembersList`, `useReorderInstruments`, `useCreateInstrument`, `useUpdateInstrument`, `useDeleteInstrument` and `useAssignMemberInstruments`. The blueprint it names is defined at `SongCard.tsx:32` as *"a screen region that composes molecules and atoms but owns no state and fetches nothing"* |

`InstrumentsList` does call `useSensors` for the drag sensors. That is library
configuration rather than component state or a fetch, and it does not
contradict the blueprint the file now names.

## A. Gates

| # | Gate | Command | Verdict | Result |
|---|---|---|---|---|
| A1 | Lint, changed files | `node --max-old-space-size=8192 ./node_modules/eslint/bin/eslint.js --no-warn-ignored --max-warnings 0 <50 changed source files>` | **PASS** | exit 0 |
| A2 | Lint, whole workspace | same binary and flags over `apps/pragma` | **PASS** | exit 0 |
| A3 | Format | `pnpm exec prettier --check .` | **PASS** | exit 0, *"All matched files use Prettier code style!"* |
| A4 | Dead code | `pnpm exec knip` | **PASS** | exit 0. Six configuration hints, all pre-existing and none naming a file in this diff |
| A5 | Types | `pnpm --filter @borso-app/pragma run typecheck` (`tsc -p tsconfig.cdk.json --noEmit && tsc --noEmit`) | **PASS** | exit 0 |
| A6 | Tests and coverage | `pnpm --filter @borso-app/pragma run test:coverage` | **PASS** | exit 0. **199 test files, 1985 tests passed**, 100% on all four axes with `perFile: true`. Both projects ran, so the back-e2e suite against the sandbox Postgres is included |
| A7 | Migration audit | `migrations.audit.test.ts`, inside A6 | **PASS** | No business column lands with `DEFAULT now()`, and every whitelisted column is still found. `0014_lineup_slots.sql` adds three columns with literal or no defaults, so it passes untouched |
| A8 | Blueprint annotations | `pnpm exec tsx .claude/skills/blueprint/blueprint-indexing.ts --check` | **PASS** | *"Scanned 1263 source files: 178 blueprint(s), 1175 follower(s). Annotations are complete and the index is up to date."* Run after `scripts/reports.sh blueprints`, since the index is generated and not committed |
| A9 | Convention drift | `pnpm exec tsx scripts/standards/convention-drift.ts --check` | **PASS** | *"No question gained a new answer."* The `layer-marker:pragma` budget did not rise, so plan R12 holds |
| A10 | Vocabulary paths | `bash scripts/check-vocabulary-paths.sh` | **PASS** | *"every term names a folder that exists and cites no comment"* |
| A11 | Comments in styles and markup | `bash scripts/check-no-comments-in-styles-and-markup.sh` | **PASS** | *"no stylesheet or page carries a comment"* |
| A12 | Doc links | `pnpm exec tsx scripts/docs/check-doc-links.ts` | **PASS** | *"every document link names a file that exists"*, which is what resolves the new `docs/knowledge/instrument-icon-provenance.md` link |

**One harness limit, disclosed rather than hidden.** `pnpm exec eslint … .` over
the repository root dies with a V8 heap out-of-memory in this container, and
`NODE_OPTIONS=--max-old-space-size=10240` does not reach the child through
`pnpm exec`. A1 and A2 are the same binary with the same flags invoked directly
through `node` with a raised heap. This diff touches only `apps/pragma/` and
`docs/`, so the two scoped runs cover every file it changes and every file in
the one workspace it changes. Logged to `KAIZEN.md`.

## B. Correctness against the spec's decisions table

Nine rows, all implementation-bearing, none deferred.

| # | Decision | Verdict | Evidence |
|---|---|---|---|
| B1 | **Volume meter.** 32 px of travel is one level, the pointer stays captured past the widget bounds, 44 px target | **PASS** | `energy-meter.utils.ts:3` `const PIXELS_PER_LEVEL = 32;`, consumed by `levelFromTravel` at line 11. `EnergyMeter.tsx:47` `event.currentTarget.setPointerCapture(event.pointerId);`. `EnergyMeter.tsx:87` gives the control `h-11`, which is 44 px, plus `touch-none` so the browser does not claim the drag |
| B2 | **Seam.** A held transition is a 24 px hairline carrying the carriers; a risky one keeps a readable 36 px band with its note | **PASS** | `TransitionStrip.tsx:47` `className="flex h-6 w-full …"` — `h-6` is 24 px — with `<CarrierStack view={view} />` between two hairlines at lines 49 and 52. The risky branch at line 63 is `min-h-9`, which is 36 px, and carries the warning chip and the note |
| B3 | **Inline at 17 px, compressible.** No second row, the cover stays | **PASS** | `LineupSlots.tsx:7` `const LINEUP_SLOT_ICON_SIZE_PX = 17;`. `SetlistEntryRow.tsx:146` still renders `<AlbumCover …>`. The column renders inline in the existing `flex items-center` row at line 192 on a wide viewport, and at line 183 in the slot the artist line vacates on a phone — the artist line is `hidden … sm:flex` (line 154), so the card's line count does not change with the width and the card does not grow. The rendered heights are `/visual-validation`'s row |
| B4 | **Icons**, not codes or chips | **PASS** | `LineupSlots.tsx:26` renders `<Icon name={slot.glyph} size={LINEUP_SLOT_ICON_SIZE_PX} />` per slot. No text node in the slot; the only text the column carries is the `+N` overflow counter at line 32 |
| B5 | **Lucide first, one generated bass**, copied rather than depended on | **PASS** | P1 above for the absence of a dependency. `docs/knowledge/instrument-icon-provenance.md` names `micVocal`, `guitar`, `piano`, `drum` and `music` as Lucide `lucide-static` 1.47.0 copied verbatim and reproduces the ISC notice in full, which is plan R11's mitigation |
| B6 | **Parametric bass, proportions from the trace**, both fretboard edges parallel by construction | **PASS** | P2 above. The provenance document records the same two endpoint pairs and states the property the build exists to guarantee, so a future editor moving an endpoint by hand has been warned in the one place the no-comments rule allows |
| B7 | **A stored position**, not alphabetical and not a front-end name table | **PASS** | `instruments.schema.ts:10-11` adds `icon: text('icon')` and `position: integer('position')` to `instrumentTable`. `instruments.service.ts:17` sorts through `comparePositionThenName` instead of the deleted `byName`. `lineup-slots.core.ts:52-56` sorts by `position` then `name`. The stored value meets the camelCase registry key in one typed table, `INSTRUMENT_ICON_GLYPH … satisfies Record<InstrumentIcon, IconName>` at `lineup-slots.core.ts:6-13`, so a seventh stored icon is a compile error rather than a silent fallback |
| B8 | **The primary ones**, capped at members plus two | **PASS** | `lineup-slots.core.ts:83` `const column = input.instruments.filter(hasPrimaryPlayer).toSorted(byPositionThenName);` and `resolveSlotBudget` at line 66-68 returns `Math.min(memberCount + SLOTS_BEYOND_MEMBER_COUNT, maximumVisibleSlots)` with `SLOTS_BEYOND_MEMBER_COUNT = 2` at line 15 |
| B9 | **Tint**, grey for no lineup and yellow for an override, badge gone from the card | **PASS** | `setlist-entry-tone.core.ts:22-27` returns `unstaffed` before testing `hasOverride`, so grey wins over yellow. `TONE_APPEARANCE` at lines 15-19 maps `unstaffed` to `bg-bg-sunk` and `overridden` to `bg-warn-soft` with `border-warn`. `SetlistEntryRow.tsx:119-120` applies both. The badge is gone: `git show 1c1fa6b8:…/SetlistEntryRow.tsx` carried `{t('lineup.override')}` at line 160 and the current file carries no `Badge` at all. `grep -rn "prominentMemberInstrument" apps/pragma/site` returns nothing |

## C. Correctness against the spec's *Changes* section

| # | Item | Verdict | Evidence |
|---|---|---|---|
| C1 | `INSTRUMENT_ICONS` / `InstrumentIcon` in the shared domain | **PASS** | `apps/pragma/domain/instrument.core.ts:24-26`, one declaration, imported by `instruments.schema.ts` on the API side and by `lineup-slots.core.ts` and `InstrumentsPage.tsx` on the site side through `@domain/instrument.core` |
| C2 | The three database columns | **PASS, with a documented deviation** | `0014_lineup_slots.sql:26-28` adds `instrument.icon text`, `instrument.position integer` and `member_instrument.is_primary boolean`. The spec's sketch writes `NOT NULL DEFAULT`; the migration lands all three nullable and narrows them on read through `resolveInstrumentIcon`, `resolveInstrumentPosition` and `row.isPrimary === true`. Aurora DSQL rejects `NOT NULL` and `DEFAULT` on `ADD COLUMN`, which all thirteen earlier migrations record in the same words — `0001`, `0002`, `0004`, `0005`, `0006`, `0007`, `0008`, `0009`, `0010`, `0011`, `0013`. The observable behaviour is what the spec asked for; the SQL shape is what the platform allows |
| C3 | Existing rows seed `position` from family order, then name | **PASS, verified empirically** | `0014_lineup_slots.sql:29`. Round 1 could not exercise this, because the e2e harness truncates every tracked table before each suite so no row predates the migration. I ran the statement against seeded rows on the local Postgres this session: `Voice/vocal → 0`, `LegacyHarmonic/family NULL, is_harmonic true → 1`, `Zither/harmonic → 1`, `Djembe/percussive → 2`, `Theremin/family NULL, is_harmonic false → 3`. The `COALESCE` branch ranks a row written before the `family` column existed correctly, and the resulting order is not alphabetical |
| C4 | `is_primary` seeded for a member's only instrument | **PASS, verified empirically** | `0014_lineup_slots.sql:30-31`. Same probe: a member with one link gets `true`, a member with two links gets `false` on both and is left for the band to resolve. This is plan R6's mitigation and it behaves as R6 describes |
| C5 | `instruments.schema.ts` — columns and zod | **PASS** | `instrumentIconSchema` and `instrumentPositionSchema` at lines 21-23, both folded into `createInstrumentSchema` and `updateInstrumentSchema`, plus `instrumentOrderSchema`. The file is inside the per-file coverage gate and `instruments.schema.test.ts` carries cases for the new fields |
| C6 | `instruments.repository.ts` — read and write them | **PASS** | `PROJECTION` widened at lines 43-48, `listInstrumentsWithPlayers` at line 72 does the one link read and folds through `foldPlayersIntoInstruments`, `insertInstrument` defaults `position` to `defaultPositionForFamily(input.family)`, and `setInstrumentPosition` is the reorder write |
| C7 | `instruments.controller.ts` — expose them | **PASS** | The controller stays a dispatcher: `.put('/order', zValidator(…), …)` at line 31 validates, calls `reorderInstruments`, maps `kind: 'stale'` to 409 and returns. No filter, map or derivation. It is registered **before** `.put('/:id', …)`, so `/order` is not swallowed by the uuid param route |
| C8 | `members.schema.ts` — `is_primary` on the link | **PASS** | `memberInstrumentTable` gains `isPrimary: boolean('is_primary')` at line 20, and `memberInstrumentAssignmentSchema` widens with `primaryInstrumentIds: z.array(z.string().uuid()).optional()` at line 62 |
| C9 | `Icon.tsx` — instrument glyphs | **PASS** | Six entries added at lines 191-241, all inside the existing `ICONS … as const` map with the shared wrapper, so `IconName` widens with no hand-written type |
| C10 | `LineupSlots.tsx` — the fixed column | **PASS** | New molecule, 38 lines, no state, no query, one conditional for the overflow counter. `// @FollowsBlueprint molecule-presentational` |
| C11 | `lineup-slots.core.ts` — slots from lineup and instruments | **PASS** | New, pure, `// @FollowsBlueprint core-projection`, at 100% |
| C12 | `SetlistEntryRow.tsx` — the column replaces `MemberLineup` | **PASS** | Both `MemberLineup` call sites are gone from the row; only the `LineupMember` type import remains, at line 37, for the prop shape. `LineupSlots` renders in both branches, lines 183 and 192, each inside a button whose `onClick` is `setLineupEditorOpen(true)` |
| C13 | `TransitionStrip.tsx` — the seam carries instruments | **PASS** | `CarrierStack` renders inside both branches, lines 50 and 71 |
| C14 | `InstrumentsPage.tsx` — icon picker, order, primary | **PASS** | The page owns every query and mutation, composes `InstrumentsList` and `InstrumentIconPicker`, and derives its rows in `useMemo`. No `useEffect`. The form is `@tanstack/react-form` |
| C15 | `docs/knowledge/instrument-icon-provenance.md` | **PASS** | New, 75 lines, linked from `docs/knowledge/README.md`, link resolved by A12 |
| C16 | `apps/pragma/VOCABULARY.md` | **PASS** | The **Instrument** section's false claim *"The list is sorted by name"* is rewritten to position then name and gains `icon` and `position`; a new **Lineup slot** section names the fixed column, its cap, its empty tint and the word it is confused with; **Lineup** gains the primacy sentence. A10 passes |

## D. Tests covering what the spec asks

Every row here is a pure-function or deterministic non-DOM behaviour. The four
browser-runtime assertions are named in the preamble and are not scored.

| # | Spec assertion | Verdict | Test |
|---|---|---|---|
| D1 | The column shows one fixed slot per instrument, always in the same order | **PASS** | `lineup-slots.core.test.ts:33` *"orders the column by the stored position, never by name"* and `:48` *"breaks a tie on the name, so two instruments at one position still settle"* |
| D2 | Each slot is tinted with the colour of the member holding it | **PASS** | `lineup-slots.core.test.ts:123` *"tints a slot with the colour of the member holding it on this song"*, `:143` *"settles two members on one instrument on the first in the member order"*, `:208` *"takes the colour of the member holding the slot"* |
| D3 | Edge: the viewport is too narrow, the column drops from the right with `+N` | **PASS** | `lineup-slots.core.test.ts:111` *"yields to the narrow budget when the breakpoint is tighter than the member cap"*, `:186` *"stays hidden when every instrument fits"*, `:196` *"shows as soon as one instrument was dropped"*, plus `setlist-editor.utils.test.ts:16-27` pinning the two budgets at 8 and 4 |
| D4 | Edge: a song has no lineup at all — grey surface, every slot in the empty tint | **PASS** | `setlist-entry-tone.core.test.ts:21` *"reads unstaffed when no member is in the lineup at all"* and `:25` *"reads unstaffed when every member is present but holds nothing"*; `lineup-slots.core.test.ts:153` *"leaves every slot untinted when the song has no lineup at all"*; `:212` *"falls back to the empty tint when nobody holds it on this song"* |
| D5 | Edge: the entry overrides the song's lineup — yellow surface | **PASS** | `setlist-entry-tone.core.test.ts:17` *"reads overridden when the entry carries its own lineup"* and `:43` *"marks an override with the warning colour and an empty lineup with the sunk surface"* |
| D6 | Edge: an override empties the lineup — grey wins over yellow | **PASS** | `setlist-entry-tone.core.test.ts:29` *"prefers unstaffed over overridden, because an override that empties the lineup is still empty"* |
| D7 | Edge: more primary instruments than slots — cap at members plus two | **PASS** | `lineup-slots.core.test.ts:96` *"caps the column at the member count plus two and counts what it dropped"*, `:176` *"takes the member cap when the breakpoint is roomier"*, `:180` *"takes the breakpoint budget when it is tighter"* |
| D8 | Edge: an instrument has no icon yet — fallback glyph, keeps its slot | **PASS** | `lineup-slots.core.test.ts:163` *"keeps a slot for an instrument whose icon was never chosen"*, plus `instrument.core.test.ts` on `resolveInstrumentIcon` |
| D9 | Edge: a member holds two instruments on one song — both slots take their colour | **PASS** | `lineup-slots.core.test.ts:133` *"tints both slots when one member holds two instruments on one song"* |
| D10 | Only the primary instruments get a slot | **PASS** | `lineup-slots.core.test.ts:61` *"leaves out an instrument nobody plays as their main one"* and `:77` *"keeps an instrument one member calls their main one and another does not"* |
| D11 | Error case: a rejected write leaves the row at its previous value | **PASS** | The energy write goes through `props.onUpdate` at `SetlistEntryRow.tsx:116` into the setlist entry mutation in `setlists.queries.ts`, which pairs `onMutate` with an `onError` snapshot restore at lines 168, 194, 223 and 250. The file is untouched by this branch, so the existing failure line is the one that surfaces, as the spec requires |
| D12 | The reorder settles from its own response, never from a refetch (plan R2) | **PASS** | `instruments.queries.ts:118-147`: `onMutate` writes the predicted order through `reorderById`, `onSuccess` writes the response body, `onError` restores the snapshot, and there is no `invalidateQueries` and no refetch anywhere in the hook. `borso/no-refetch-of-optimistically-written-query` is on and A1 passes |
| D13 | Primacy survives a member save that does not carry it (plan R1) | **PASS** | `members.controller.test.ts:166` *"keeps a primacy the member form never sends, so saving a member does not empty the column"*, and `:196` *"drops a primacy on an instrument the member stopped playing"* for the other side. `replaceMemberInstruments` reads the surviving links and re-writes them inside one `database.transaction`, `members.repository.ts:210-243` |
| D14 | Both instrument projections widened together (plan R3) | **PASS** | `instruments.repository.ts:43-48` and `members.repository.ts:50-57` both carry `icon` and `position`, and the second additionally carries `isPrimary` from the link. `MemberInstrumentRow` widened to match at lines 31-37 |
| D15 | The reorder endpoint refuses a stale order | **PASS** | `instruments.controller.test.ts:174` *"reorders the whole list and answers with the settled order, not a stale one"* and `:196` *"refuses a reorder that does not name every instrument, with 409"* |
| D16 | The read carries who plays what | **PASS** | `instruments.controller.test.ts:140` *"reports who plays each instrument, and an empty list for one nobody plays"*, `:108` *"orders the list by family rather than by name, which is what the column reads"*, `:125` *"gives a new instrument the fallback glyph and keeps the one a create names"* |

## E. Cleanliness against the repo's standing rules

| # | Rule | Verdict | Evidence |
|---|---|---|---|
| E1 | No type assertions beyond `as const` and `as unknown` | **PASS** | The diff adds none. The one place a cast would have been reached for, the stored-icon to registry-key table, uses `satisfies Record<InstrumentIcon, IconName>` at `lineup-slots.core.ts:13`, which cannot silently widen |
| E2 | No `any` | **PASS** | None added; `noExplicitAny` is on and A1 passes |
| E3 | No comments in code | **PASS** | Every added `//` or `/*` line in the diff is `@Blueprint`, `@FollowsBlueprint` or `@Feature`. No `eslint-disable` was added anywhere |
| E4 | Magic numbers and strings get names | **PASS** | `PIXELS_PER_LEVEL`, `SHORTEST_BAR_RATIO`, `LINEUP_SLOT_ICON_SIZE_PX`, `SLOTS_BEYOND_MEMBER_COUNT`, `MINIMUM_OVERFLOW_WORTH_A_COUNTER`, `EMPTY_LINEUP_SLOT_COLOR`, `DEFAULT_INSTRUMENT_POSITION`, `FALLBACK_INSTRUMENT_ICON`, `INSTRUMENT_POSITION_MAX`, `DRAG_ACTIVATION_DISTANCE_PX`, `DRAG_TOUCH_DELAY_MS`, `DRAG_TOUCH_TOLERANCE_PX`, `ROW_ICON_SIZE_PX`. The SVG path coordinates are the one set of bare numbers, and they cannot be named inside path data, which is why the provenance document exists |
| E5 | Names carry intent, function names describe the result | **PASS** | `buildLineupSlots`, `resolveSlotBudget`, `slotTintColor`, `decidePrimaryInstrumentIds`, `listInstrumentsWithPlayers`, `foldPlayersIntoInstruments`, `comparePositionThenName`, `levelFromTravel`, `barHeightRatio`, `hasOverflowWorthShowing`. No single-letter local outside a `for (let position = 0; …)` index |
| E6 | No `useEffect` added | **PASS** | `git diff … \| grep "^+.*useEffect"` is empty. The slot budget comes from the existing `useIsMediaQueryMatching` through a pure function, and the reorder from a mutation |
| E7 | Back-end domains are vertical slices | **PASS** | `api/src/instruments/` holds `instruments.controller.ts`, `instruments.service.ts`, `instruments.repository.ts`, `instruments.schema.ts` and the pure `instrument-players.core.ts` **inside** the bounded context. No horizontal aggregator folder was created. The one rule both sides read, the icon vocabulary, is in the workspace-level `apps/pragma/domain/instrument.core.ts` with a real caller on each side |
| E8 | Controllers are dispatchers | **PASS** | C7. The players join is in the repository, the folding in `instrument-players.core.ts`, the stale check in the service |
| E9 | Atomic design | **PASS** | `EnergyMeter` in `atoms/`; `LineupSlots`, `InstrumentIconPicker`, `InstrumentPlayerChips`, `SetlistEntryEnergyField` in `molecules/`; `InstrumentsList` in `organisms/`. `setlist-entry-energy.core.ts` moved from `organisms/` to `molecules/` to sit beside the component that reads it |
| E10 | Server state in TanStack Query, forms in TanStack Form | **PASS** | `useReorderInstruments` and `useAssignMemberInstruments` are mutations; `InstrumentsPage` uses `useForm`; no `useState` chain for fields |
| E11 | Every visible string through i18next, in both catalogues | **PASS** | Eleven keys added to `en.json` and the same eleven to `fr.json` in the same commit. `i18n-parity.core.test.ts` is inside A6 |
| E12 | Every new file under `apps/` carries a blueprint marker naming one that exists | **PASS** | A8. Each of the eleven new source files carries a marker; the pre-existing files the diff modifies keep theirs |
| E13 | Type assertions in the diff: zero, repo-wide count unchanged | **PASS** | E1 |

## Observations, none of them blocking

- `InstrumentsPage.tsx:90` builds a lookup with `const out: Record<…> = {}`.
  `out` is not a one-letter local and the rule does not forbid it, but
  `membersById` would say what the repo's naming rule asks a name to say. A
  reviewer's nit, not a defect.
- Plan **R6**'s named detection — *"back-e2e case on the migrated fixture asserts
  a non-empty slot set with no page visit"* — was not built, because
  `test/setup-postgres.ts` drops every tracked table before each suite, so no row
  can predate the migration inside the harness. The mitigation itself is in the
  SQL and behaves correctly; I proved it by hand instead, in C3 and C4. If the
  band's day-one ordering is worth a standing gate, the honest shape is a test
  that seeds rows and runs the two `UPDATE` statements directly, not an e2e case.
- The spec's decision *"the badge remains in the editor"* holds by
  non-modification: `LineupEditor.tsx` is untouched by this branch and still
  distinguishes the override surface by its title and its reset-to-default
  action.

## Verdict

**PASS.** Both round-1 blockers are closed, every gate the spec names is green
on the merged tree, all nine implementation-bearing decisions and all sixteen
*Changes* entries landed, and every spec assertion inside this validator's scope
has a test that exercises it. No dependency was added, the bass glyph's two
fretboard edges are exactly parallel, and every new `*.core.ts` and `*.utils.ts`
is at 100% inside a per-file run.

The one thing standing between this branch and a merge is not in this report:
`/visual-validation` has not run, and the ratified input metric that a
twenty-character title must not truncate at 360 px was still unmet when round 1
looked. That is its gate, and a product call, not this one's.
