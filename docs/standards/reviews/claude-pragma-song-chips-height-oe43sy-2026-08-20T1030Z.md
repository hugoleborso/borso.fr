# Standards review — claude/pragma-song-chips-height-oe43sy against origin/main

Verdict: FINDINGS
Ledger: c9cc14decde4
Reviewed: 6 file(s). Sealed: 5. Findings: 1.

Merge base `15824a34dd15f3be11bc9d652689c45cd9d00c0f`. Fifth pass. I ran
`seal.ts verify --base origin/main` first rather than working from the brief:
it named **six** uncleared files, which is what I judged. Each was read in full
this session — `EnergyBar.tsx` (171), `MemberLineup.tsx` (69),
`member-lineup.core.ts` (71), `SetlistEntryRow.tsx` (318),
`setlist-editor.utils.ts` (187), `setlist-entry-energy.core.ts` (52).

The four comments the last pass flagged were all rewritten and all four now
hold: the Remove/Lineup separator sentence is gone, the "both" with one referent
is gone, the twelve-pixels-per-point figure is gone, and the
`@dnd-kit/modifiers` dependency rationale is gone. I re-derived the numeric
claims rather than taking them, including the ones a previous pass already
cleared (working in *Outside the checklist*).

The one finding is a paragraph none of the four rewrites touched, in the file
that changed most. It states two things about the code that the code does not
do.

## Findings

### apps/pragma/site/src/components/organisms/SetlistEntryRow.tsx:23

Bullet: "`reviewer` checks that a comment documents something the code cannot
say, and is not a restatement, a history note, or a description of what the code
does not do."

```tsx
 * Each row owns a small `useForm` instance — the parent
 * (`SetlistEditor`) doesn't centralise per-row state. The form is never
 * submitted: it exists for field state and Zod validation, and every change
 * reaches the parent through `onUpdate` from inside `field.handleChange`, so
 * the live-edit semantics (per-keystroke mutation) are preserved without an
 * effect.
```

Two checkable claims, both false, plus one clause that is only an absence.

**`SetlistEditor` is not this row's parent.** `SetlistEntriesList.tsx:154`
renders `<SetlistEntryRow …>` and supplies every prop the row reads, including
`onUpdate={props.onUpdate}` (`SetlistEntriesList.tsx:177`); `SetlistEditor.tsx:246`
renders `<SetlistEntriesList …>`, one level further out. The same comment uses
"the parent" correctly two paragraphs later — "the parent passes a
`prominentMemberInstrument` chip" is `prominentMemberInstrumentFor(...)` at
`SetlistEntriesList.tsx:147` — so within one comment the word points at two
different components, one of them named and wrong.

**Nothing is called from inside `field.handleChange`.** That is TanStack Form's
own setter, and `useSetlistEntryForm` passes it no `listeners`
(`setlist-entry-form.hook.ts:32-36`: `defaultValues` and `validators` only). The
write sits *beside* it, in the field's own change handler — here:

```tsx
// SetlistEntryRow.tsx:241-244
              const changeEnergy = (next: number): void => {
                field.handleChange(next);
                publishEnergy(next);
              };
```

and identically in the three text fields
(`SetlistEntryDetailsFields.tsx:50-51`, `71-72`, `90-91`). A reader who takes
the sentence literally goes looking for a wrapper or a listener that is not
there.

The remaining clause, "the parent … doesn't centralise per-row state", is a
description of what the code does not do, which the bullet rejects on its own;
"Each row owns a small `useForm` instance" already says it positively.

What would satisfy the bullet: keep the two sentences that carry real content —
the form is never submitted (corroborated by the hook having no `onSubmit`) and
it exists for field state and Zod validation — and say where the write happens
in words that match the code, e.g. "each field writes through `onUpdate` in its
own change handler, next to `field.handleChange`, so a keystroke mutates without
an effect". Drop the parenthetical or name `SetlistEntriesList`.

## Sealed

- `apps/pragma/site/src/components/atoms/EnergyBar.tsx` — every gesture claim in
  the header checks out against the body: nothing is written in `openGesture`
  (line 104), `touch-pan-y` (line 49) is the `touch-action: pan-y` the comment
  names, `abandonGesture` (line 131) writes nothing on `pointercancel`, and the
  `active?.pointerId !== event.pointerId` guards are the "only the pointer this
  bar captured" claim. "Two hundred tab stops" is arithmetic that holds:
  `ENERGY_MIN` 1 to `ENERGY_MAX` 10 (`setlist-entry-form.hook.ts:16-17`) is ten
  segments, twenty rows is two hundred. The forced-colors note on `BAR_CLASS` is
  a platform constraint no name could carry. No effect, no boolean prop family,
  two visual states so nothing owes `cva`, both user-facing strings arrive as
  props from `t(…)`.
- `apps/pragma/site/src/components/molecules/MemberLineup.tsx` — the header's one
  checkable claim, "each chip carries a ring in the card's own colour", holds at
  both call sites: `OVERLAP_CLASS` is `ring-2 ring-bg-elev` and both cards are
  `bg-bg-elev` (`SetlistEntryRow.tsx:153`, `SongCard.tsx:59`). The cap and the
  overlap are named constants, the projection moved out to the sibling core, and
  `shrink-0` on the root is what the row's meta-line rule needs.
- `apps/pragma/site/src/components/molecules/member-lineup.core.ts` — `.core.ts`
  is the right half of the 02 choice: lineup is pragma's own noun
  (`VOCABULARY.md`, *Lineup*), `buildLineupChips` is a name the band would
  recognise, and it sits beside the molecule it serves rather than in a
  horizontal folder. `build…` returns what its verb says. The header's claim —
  the row's height no longer depends on how many people play the song — is what
  `maximumVisible` plus `hiddenCount` deliver.
- `apps/pragma/site/src/components/organisms/setlist-editor.utils.ts` — the
  branch adds `restrictToVerticalAxis` and its types. The JSDoc now keeps only
  the sentence the code cannot say (a setlist is one column, so sideways travel
  leaves every drop target) and has dropped the `@dnd-kit/modifiers` dependency
  rationale the last pass placed in an ADR. Re-checked the older comments too:
  the `formatSetlistOrder` contract matches line for line including the `?`
  placeholder, and the "R1 in the lineup-editor plan" reference resolves —
  `docs/features/pragma/lineup-editor/plan/plan.md:44` is the orphan-member-id
  risk it names.
- `apps/pragma/site/src/components/organisms/setlist-entry-energy.core.ts` — the
  header's rewrite is true as written: the bar always fills to some level, and
  `UNSET_APPEARANCE` says "unset" with `bg-ink-500` where `STORED_APPEARANCE`
  uses `bg-accent`. The contrast block is a measurement the code cannot carry and
  I recomputed all of it from `tokens.css` (figures below).

## Unclear

None.

## Outside the checklist

- **The contrast figures recomputed, independently of the pass that first
  cleared them.** Compositing `--color-line-strong` `rgba(26,22,18,0.22)` over
  `--color-bg-elev` `#fbf7ef` and measuring against the empty segment's
  `--color-bg-sunk` `#ebe5d8` gives **1.3629:1**, the comment's 1.36. `ink-500`
  against `bg-sunk` is **4.9581:1** light and **7.1065:1** dark, so it clears
  both 3:1 for the segment and 4.5:1 for the numeral; `ink-400`, the next token
  up, reaches only **2.9422:1** light, which is what makes "the lightest token
  that clears the ratio" true rather than merely plausible. `accent` against
  `bg-sunk` is **5.1386:1** light, **6.7203:1** dark.
- **375 px, and what I did not drive.** I did not open a browser. I read the
  evidence instead: `02-phone-375-after.png` was regenerated in `ede76a7`, the
  same commit as the facepile and the `shrink-0` rules, and it shows the meta
  line on one line with four overlapping avatars, no readout beside the bar, and
  segments numbered 1 to 10. `visual-validation-2026-08-19.md:20` records the
  meta line at 22 px with no horizontal overflow at 320, 375 and 402 px. That
  covers the bullet for the files sealed here.
- **That validation report has two stale cells.** Lines 25-26 read "the readout
  reads 8" and "the readout reads 2" for the tap and the slide, but the readout
  is the element `226dcf2` deleted; the row below them measures `aria-valuenow`,
  which is what those two should say. No bullet covers a validation document and
  it changed no verdict, but the next reader of that table will look for a
  readout that is not on the card.
- **`currentSongId` is declared and passed and never read.**
  `SetlistEntryRow.tsx:104` declares it, `SetlistEntriesList.tsx:167` passes
  `entry.songId`, and the body of the row does not use it. No ledger bullet
  covers a dead prop and no lint rule sees across the two files, so this changed
  no verdict.
- **The range-input rationale now lives in two files.** `EnergyBar.tsx:6-9` and
  `energy-bar.utils.ts:5-9` make the same argument about a thumb rounding the
  position. The utils copy was sealed on 2026-08-20T08:43Z with that text
  present, so I judged the atom's copy the same way rather than flagging a shape
  a previous pass cleared. One of the two would be enough.
- **`isEnergyStored` still claims `@FollowsBlueprint core-appearance` and is not
  an appearance selector** (`setlist-entry-energy.core.ts:44-47`) — it returns a
  boolean and touches no class name. Its neighbour is the one that follows the
  blueprint, and even that uses a boolean and a ternary rather than the
  `Record<Union, …>` the blueprint describes. Unchanged from the last pass, and
  no ledger bullet covers blueprint fidelity.
- **No `eslint-disable` anywhere in the branch's source**, so the 12 bullet had
  nothing to judge; no back-end or database file changed, so 04 and 11 had
  nothing either. The new test names state behaviour and condition ("writes
  nothing when a vertical swipe that started on it becomes a page scroll"), which
  is the 10 bullet, though test files are outside the seal predicate.
- `pnpm exec tsx scripts/standards/seal.ts verify --base origin/main` now reports
  one uncleared file, `SetlistEntryRow.tsx`, which is exactly the file carrying
  the finding. The gate reflects reality.
