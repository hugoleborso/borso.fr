# Standards review — claude/pragma-song-chips-height-oe43sy against origin/main

Verdict: FINDINGS
Ledger: c9cc14decde4
Reviewed: 5 file(s). Sealed: 3. Findings: 2.

Merge base `15824a34dd15f3be11bc9d652689c45cd9d00c0f`. Five files are in the
sealing set: the two new energy files, the two organisms the change touched, and
the appearance core. Each was read in full, not as a hunk. Blueprints read
before judging shape: `atom-plain`, `utils-pure-module`, `organism-form`,
`organism-presentational`, `core-appearance`.

## Findings

### apps/pragma/VOCABULARY.md:74

Bullet: "`reviewer` checks that a definition in a `VOCABULARY.md` is still true,
which is prose against code and therefore nothing a rule can do."

```markdown
- An entry with no energy anywhere draws its slider and readout in the
  muted palette, and the slider rests at `ENERGY_DEFAULT`, which is 5
  (`site/src/components/organisms/setlist-entry-energy.core.ts`).
```

The definition names a slider, and the file it cites no longer describes one.
The branch replaced the `<input type="range">` with `EnergyBar`, a strip of one
`<span>` per level, and `EnergyAppearance` lost `sliderClassName` for
`filledClassName` / `emptyClassName` (`setlist-entry-energy.core.ts:14`). The
rest of the sentence still holds — the muted palette is still what an unset
entry draws, and `ENERGY_DEFAULT` is still 5 (`setlist-entry-energy.core.ts:12`)
— so what is stale is the noun, and the noun is the thing the vocabulary exists
to fix. What would satisfy the bullet: say bar, and say it draws its filled
segments and readout in the muted palette and rests at `ENERGY_DEFAULT`.

Note that `role="slider"` survives in `EnergyBar.tsx:136`, which is correct —
that is the ARIA role name, not the band's word for the control.

This is what keeps `setlist-entry-energy.core.ts` unsealed. The file's own
content is clean; the fix is three words in `VOCABULARY.md`, after which the
file reseals at the same hash with no edit of its own.

### apps/pragma/site/src/components/organisms/SetlistEntryRow.tsx:108

Bullet: "`reviewer` checks that a derived type is derived, so a row type comes
from `$inferSelect`, a request body from `z.infer`, and a response from the Hono
client, rather than being written out by hand beside the thing it mirrors."

```ts
  readonly onUpdate: (entryId: string, patch: Record<string, unknown>) => void;
```

`patch` is the request body of `PUT /api/setlists/:id/entries/:entryId`. It
travels untouched from here into `updateSetlistEntry`
(`SetlistEditor.tsx:207`), which spreads it into `useUpdateSetlistEntry`, whose
variables type *is* derived from the Hono client
(`setlists.queries.ts:225-227`). Widening it to `Record<string, unknown>` at the
component boundary throws that derivation away: `props.onUpdate(props.entryId,
{ energy: next })` on line 139 and `{ lineupOverride: … }` on line 135 would
both still compile if the endpoint renamed either field, and the mutation's
derived type cannot catch it because the bag arrives already widened.

What would satisfy the bullet: export the derived patch type from
`setlists.queries.ts` — `Partial<Parameters<(typeof
api.api.setlists)[':id']['entries'][':entryId']['$put']>[0]['json']>` under a
name — and use it for the four sites that carry the bag today
(`SetlistEntryRow.tsx:108`, `SetlistEntriesList.tsx:76`,
`SetlistEditor.tsx:207`, `SetlistEntryDetailsFields.tsx:29`). The prop predates
this branch, and the branch is what puts a second writer through it, so it is
in scope of the content being sealed rather than of the diff.

## Sealed

- `apps/pragma/site/src/components/atoms/EnergyBar.tsx` — comments checked one
  by one against the "documents something the code cannot say" bullet: the
  `pointerdown`/`pointercancel` paragraph and the forced-colors note on
  `BAR_CLASS:40` are both runtime constraints a reader cannot deduce, and none
  of the block restates the code or narrates history. No effect, two visual
  states so no `cva` owed, no boolean family in the prop set, every user-facing
  string arrives as a prop.
- `apps/pragma/site/src/components/atoms/energy-bar.utils.ts` — `.utils.ts` is
  the right half of the 02 choice: pointer geometry and key stepping are
  cross-cutting and carry no band noun. `buildEnergyLevels` returns the array
  its verb promises, `isDragIntent` a boolean, and `levelFromPointerRatio`
  returns `null` on unmeasurable width rather than an end value.
  `noUncheckedIndexedAccess` is on for pragma, so the `step === undefined`
  branch on line 76 is live and covered.
- `apps/pragma/site/src/components/organisms/SetlistToolbar.tsx` — the only
  change is `ENERGY_HEIGHT_COMPACT_PX` 36 → 56 and the paragraph justifying it.
  I checked the numbers in that paragraph against the code it names:
  `VERTICAL_PADDING` is 6 at `energy-sparkline.utils.ts:15` over two edges, so
  the claimed 12 px of padding and 44 px of range at 56 px are both right. Still
  a presentational organism — every value a prop, no state, no query.

## Unclear

None.

## Outside the checklist

- **`bar` now means two things in pragma.** `VOCABULARY.md` reserves *Bar* for a
  venue in the CRM and its *Words we do not use* section pushes readers off
  *venue* towards it. `EnergyBar` and the prose around it introduce a second
  sense in the same tree. Nothing is wrong with the component name — a bar of
  segments is what it is — but the vocabulary is where a homonym gets recorded,
  and the *Bar* entry's "Not to be confused with" line is the place for it.
  No bullet asks for a homonym check, so this changes no verdict.
- **`EnergyBar.tsx` claims `atom-plain` and copies most of it.** It merges the
  caller's `className` through `composeClassName`, imports no component and
  knows no domain type. It does not forward the remaining props or a ref onto
  the DOM node, and it holds a gesture in a `useRef`, which no atom blueprint
  currently describes. The tag is the closest fit available rather than a wrong
  one; if a gesture-owning atom appears twice, it is worth its own blueprint.
- **375 px was not re-driven in this session.** The bullet asks for
  `agent-browser` for measurement and `scripts/argent.sh` for touch. The branch
  carries that evidence at
  `docs/features/pragma/setlist-card-density/validation/visual-validation-2026-08-19.md`
  — 231 px → 189 px cards, a tap, a sideways drag, a vertical swipe that scrolls
  and writes nothing, all driven through argent and raw CDP touch events. I read
  the report and `02-phone-375-after.png`, which shows the card holding together
  at 375 px with no horizontal overflow, and I did not re-run a browser myself.
- **Test names, for the record.** Tests are outside the sealing set, but the 10
  bullet covers them and they pass it: every name in `EnergyBar.test.tsx`,
  `energy-bar.utils.test.ts` and `setlist-entry-energy.core.test.ts` states a
  behaviour and its condition ("writes nothing when a vertical swipe that
  started on it becomes a page scroll"), with none named after the method it
  calls.
- **No disable comments in the branch's source**, so the 12 bullet had nothing
  to judge.
