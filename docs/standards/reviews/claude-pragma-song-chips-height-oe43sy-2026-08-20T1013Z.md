# Standards review — claude/pragma-song-chips-height-oe43sy against origin/main

Verdict: FINDINGS
Ledger: c9cc14decde4
Reviewed: 5 file(s). Sealed: 1. Findings: 4.

Merge base `15824a34dd15f3be11bc9d652689c45cd9d00c0f`. Fourth pass. The brief
named four unsealed files; `seal.ts verify --base origin/main` named **five** —
`apps/pragma/site/src/components/atoms/EnergyBar.tsx` is also uncleared, because
it is new on this branch and commit `226dcf2` touched it after the last pass.
I followed the gate rather than the brief and judged all five. Each was read in
full this session: `EnergyBar.tsx` (170), `SetlistEntriesList.tsx` (207),
`SetlistEntryRow.tsx` (313), `setlist-editor.utils.ts` (189),
`setlist-entry-energy.core.ts` (53).

The four findings are all the same bullet, and all in comments the newest commit
either wrote or left behind when the code under them moved. Three of them state
something a reader can check and that is not true; the fourth is true and in the
wrong place. I checked every numeric claim rather than taking it — the contrast
figures in `setlist-entry-energy.core.ts` hold to two decimals, and the pixel
figure in `EnergyBar.tsx` does not. The working is in *Outside the checklist*.

## Findings

### apps/pragma/site/src/components/organisms/SetlistEntryRow.tsx:31

Bullet: "`reviewer` checks that a comment documents something the code cannot
say, and is not a restatement, a history note, or a description of what the code
does not do."

```tsx
 * Removing a row asks first, and a rule separates it from Lineup and Edit: the
 * write has no undo, and a destructive target one pixel row away from an
 * ordinary one is a slip waiting to happen.
```

There is no rule, and there is no Edit button. The panel holds exactly two
buttons, side by side with nothing between them:

```tsx
// SetlistEntryRow.tsx:269-285
            <div className="flex items-center gap-2">
              <button ... onClick={() => setLineupEditorOpen(true)} className={MENU_ITEM_CLASS}>
                <Icon name="members" size={15} />
                {t('lineup.edit')}
              <button ... onClick={() => setIsRemovalPending(true)}
                className={composeClassName(MENU_ITEM_CLASS, 'text-danger hover:border-danger')}>
```

The separator the sentence describes was a real element until commit `226dcf2`
deleted it — `<span className="w-6 h-px sm:w-px sm:h-6 bg-line shrink-0" />` in
the old action stack — and "Edit" was the old `⋯` button's own label
(`aria-label={t('common.edit')}`, now `t('common.actions')`). The card's only
rule is `border-t border-line pt-2` at line 264, which separates the whole
disclosure panel from the row above it, not Remove from Lineup. The branch's own
validation report agrees: it reads the open panel's buttons as
`Drag to reorder`, `Actions`, `Lineup`, `Remove`.

The paragraph is now a history note about a layout that is gone, and it promises
a safeguard a reader will look for and not find. What would satisfy the bullet is
either putting the separator back and keeping a sentence that is true of it, or
deleting the paragraph — the `ConfirmDialog` at line 300 says "asks first" by
itself, so the surviving half needs no comment.

### apps/pragma/site/src/components/organisms/setlist-entry-energy.core.ts:4

Bullet: "`reviewer` checks that a comment documents something the code cannot
say, and is not a restatement, a history note, or a description of what the code
does not do."

```ts
 * The bar always fills up to some level, so the row cannot show "no energy" by
 * leaving it blank: a filled bar beside a number reading an em dash is two
 * controls saying opposite things. Both read the value the control would
 * write, and an unset row says so by drawing its filled segments in the muted
 * palette rather than the accent one.
```

"Both" has one referent. The row draws no number beside the bar: the energy
block in `SetlistEntryRow.tsx:227-262` is a label span and an `<EnergyBar>`, and
the value is only ever shown inside the segments (`EnergyBar.tsx:157-167`). The
branch's own `apps/pragma/VOCABULARY.md:76-79` states the same thing as fact —
"the value is the last number still filled, so **the row shows it nowhere else**".
The "number reading an em dash" is the readout commit `226dcf2` removed, so what
is left is a rejected design described in the present tense, plus a plural
pronoun pointing at it.

The first clause is worth keeping — the bar's inability to render "unset" is
exactly what the two appearance records exist for, and no reader deduces it from
`STORED_APPEARANCE` / `UNSET_APPEARANCE`. What would satisfy the bullet is
stopping after it: the bar always fills to some level, so an unset row says so
with the muted palette rather than with blankness.

### apps/pragma/site/src/components/atoms/EnergyBar.tsx:6

Bullet: "`reviewer` checks that a comment documents something the code cannot
say, and is not a restatement, a history note, or a description of what the code
does not do."

```tsx
 * is the level the caller receives. A range input over the same width offers
 * a thumb and no boundary instead — about twelve pixels per point on a phone,
 * with every level's edge half a step from the tick beside it.
```

Twelve is wrong for "the same width", by about a factor of three. Decoding the
branch's own 375 px screenshot
(`docs/features/pragma/setlist-card-density/validation/screenshots-2026-08-19/04-phone-375-actions-open.png`,
375 × 812), the ten segments run from x=25 to x=349 — ten runs of 28-29 px
separated by 4 px `gap-1` — so the bar is 325 px wide and nine intervals across
it is about 36 px per point, not twelve. Twelve was true of the *previous* row,
where the slider shared its line with a label, two 44 px steppers and an 18 px
readout; the deleted `ENERGY_STEP_BUTTON_CLASS` JSDoc said so in those words
("Nine intervals over the width a phone leaves this row is about twelve pixels
per energy point"). The number outlived the layout it measured.

Beyond the number, the sentence is a description of the control this file does
not implement — standard 01 puts a pattern-versus-pattern rationale in an ADR,
not beside the code. The paragraph's first half is fine and carries the real
content ("the segment the eye aims at is the level the caller receives"). What
would satisfy the bullet is deleting the range-input sentence, or moving the
comparison into `docs/adr/` where the measurement can be dated.

### apps/pragma/site/src/components/organisms/setlist-editor.utils.ts:183

Bullet: "`reviewer` checks that a comment documents something the code cannot
say, and is not a restatement, a history note, or a description of what the code
does not do."

```ts
 * reads as the card escaping the list. Written here rather than taken from
 * `@dnd-kit/modifiers`, because the whole of `restrictToVerticalAxis` is this
 * one line and a dependency is a thing to keep.
```

Unlike the three above, both facts are true — I checked them. `@dnd-kit/modifiers`
is not among pragma's dependencies (`apps/pragma/package.json:34-36` declares
`core`, `sortable` and `utilities` only), and the upstream function really is
this one line:

```js
// @dnd-kit/modifiers@9.0.0/dist/modifiers.esm.js:72-78
const restrictToVerticalAxis = _ref => {
  let { transform } = _ref;
  return { ...transform, x: 0 };
```

The finding is the location, not the content. Standard 01's *Comments* section
is unconditional on this shape — "A comment fails review when it … explains why
we chose a library, or describes what the code does not do … a library choice
belongs in an [architecture decision record]" — and "Written here rather than
taken from `@dnd-kit/modifiers`" is both at once. The reason it is worth moving
rather than deleting is that it will be re-litigated: the next reader who wants
`restrictToWindowEdges` or `restrictToParentElement` faces the same call with
none of the working. What would satisfy the bullet is keeping the first
paragraph, which says something the code genuinely cannot — a setlist is one
column, so sideways travel takes the card away from every drop target it could
reach — and moving the dependency sentence to an ADR or dropping it.

## Sealed

- `apps/pragma/site/src/components/organisms/SetlistEntriesList.tsx` — read in
  full. Its diff since the last seal is two things: the `onUpdate` prop moved
  from `Record<string, unknown>` to `SetlistEntryPatch`, which satisfies the 03
  derived-type bullet because that type is
  `Parameters<(typeof api.api.setlists)[':id']['entries'][':entryId']['$put']>[0]['json']`
  (`setlists.queries.ts:238-240`) rather than a hand-written mirror; and
  `DRAG_MODIFIERS` on both the `DndContext` (line 131) and the `DragOverlay`
  (line 183), which is what makes the overlay track the same constrained
  transform as the card under it. Otherwise: no `useEffect`; no negated boolean
  (`inFilteredMode`, `isDragging`); one boolean prop rather than a family where
  a variant string belongs; no conditional class expression, so nothing owes
  `cva`; no user-facing string, so the i18n bullet has nothing to judge here;
  every magic number named (`DRAG_TOUCH_DELAY_MS`, `SONG_ID_FALLBACK_LENGTH`).
  On 375 px I did not drive a browser myself, and did not need to: the
  validation report was re-run *in commit `226dcf2` itself*, the same commit as
  the layout change, and it records the vertical-axis constraint measured
  directly — a CDP mouse drag 220 px right and 100 px down reading
  `matrix(1, 0, 0, 1, 0, 100)` mid-drag — which is exactly what this file's two
  `modifiers` props do.

## Unclear

None.

## Outside the checklist

- **The contrast block in `setlist-entry-energy.core.ts:19-26` holds, and I
  cleared it.** Every figure checks out against `apps/pragma/site/src/styles/tokens.css`,
  which is why it is not a finding despite sitting next to a line of code. The
  `1.36:1` is `line-strong` composited over the card (`rgba(26,22,18,0.22)` on
  `#fbf7ef` → `rgb(201.5, 197.5, 190.4)`) against the empty segment's `bg-sunk`
  `#ebe5d8`: relative luminances 0.5638 and 0.7866, ratio **1.3629**. The
  "lightest token that clears the ratio" claim holds because the next token up,
  `ink-400` `#8c8478`, reaches **2.94:1** against `bg-sunk` and so misses 3:1,
  while `ink-500` `#6a5f53` reaches **4.96:1** in light and `#a39c8e` against
  `#100d0a` reaches **7.11:1** in dark. The numeral claim is the same pair, and
  4.96 and 7.11 both clear 4.5:1. For completeness the stored appearance clears
  it too (`accent` `#2d5fa0` vs `bg-sunk` is **5.14:1**, and `bg-elev` on
  `accent` is **6.03:1** for the numeral). This is a comment documenting a
  measurement the code cannot carry, which is what the bullet asks for.
- **`DragTransform` in `setlist-editor.utils.ts:11-16` duplicates a type the
  tree already has.** `@dnd-kit/utilities` exports `Transform`
  (`dist/index.d.ts:6`) and pragma already depends on that package —
  `SetlistEntryRow.tsx:45` imports `CSS` from it. The 03 derived-type bullet
  names four sources (Drizzle select and insert, Zod, the Hono client) and a
  library-authored interface is not one of them, so this changed no verdict. It
  is still the cheaper shape: `import type { Transform } from '@dnd-kit/utilities'`
  and `import type { Modifier } from '@dnd-kit/core'` would type both the
  argument and the return without either local interface, and would fail loudly
  if dnd-kit ever adds a field to the transform.
- **`docs/standards/hotspots.md:39` names `SetlistEntriesList.tsx`** — five
  changes, "follows no recorded pattern", i.e. it carries no `@FollowsBlueprint`
  tag while every file around it does. The 00 bullet asks the reviewer to read
  that page before deciding which pattern to write down next, and this is the
  answer it gives: a five-times-changed organism that composes a dnd context, a
  sortable list and a drag overlay is the branch's best blueprint candidate.
  Nothing gates it and it changed no verdict. `temporal-coupling.md` names none
  of the five files.
- **`isEnergyStored` at `setlist-entry-energy.core.ts:45` claims
  `@FollowsBlueprint core-appearance` and is not an appearance selector.** The
  blueprint is "reads the colours out of frozen records keyed by the domain
  union"; `isEnergyStored` returns a boolean and touches no class name. Its
  neighbour `selectEnergyAppearance` is the one that follows the blueprint,
  though with a boolean and a ternary rather than a `Record<Union, …>` — which
  is defensible for a two-state union but is not the shape the blueprint
  describes. No ledger bullet covers blueprint fidelity, so neither changed a
  verdict.
- **No `eslint-disable` comment anywhere in the branch's source**, so the 12
  bullet had nothing to judge, and no back-end file changed, so 04, 10 and 11
  had nothing either.
- `pnpm exec tsx scripts/standards/seal.ts verify --base origin/main` now reports
  four uncleared files, which are exactly the four carrying findings. The gate
  reflects reality.
