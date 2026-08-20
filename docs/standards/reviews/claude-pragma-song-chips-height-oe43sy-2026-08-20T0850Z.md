# Standards review — claude/pragma-song-chips-height-oe43sy against origin/main

Verdict: FINDINGS
Ledger: c9cc14decde4
Reviewed: 9 file(s). Sealed: 7. Findings: 2.

Merge base `15824a34dd15f3be11bc9d652689c45cd9d00c0f`. This is the re-review after
the `0837Z` pass returned two findings. Both of those are fixed, and both files
are now sealed.

**The set grew mid-review.** When I started, the committed diff held five
reviewable files and four more sat uncommitted in the working tree. Commit
`2c55b33` landed while I was reading, so the reviewable set is now nine. I had
already read three of the four newcomers in full off disk, and their content is
byte-identical to what `2c55b33` recorded, so I judged them here rather than
leaving them for another round. The fourth, `setlists.queries.ts`, I also read in
full, and it carries a finding.

Files read in full this session: `SetlistEntryRow.tsx`,
`setlist-entry-energy.core.ts`, `setlists.queries.ts`, `SetlistEditor.tsx`,
`SetlistEntriesList.tsx`, `SetlistEntryDetailsFields.tsx`, `EnergyBar.tsx`.
`energy-bar.utils.ts` and `SetlistToolbar.tsx` keep the seals the `0837Z` pass
gave them — their content has not moved, and I did not re-read them, so I did not
re-seal them either.

## Findings

### apps/pragma/site/src/lib/queries/setlists.queries.ts:264

Bullet: "`reviewer` checks that a mutation whose full result the client already
holds reconciles from the response rather than refetching, because an immediate
read after a write can be served a pre-commit snapshot."

```ts
    onSettled: (_data, _error, variables) => {
      if (!isLastPendingMutation(queryClient.isMutating({ mutationKey: ENTRY_MUTATION_KEY }))) {
        return;
      }
      void queryClient.invalidateQueries({ queryKey: setlistKeys.entriesOf(variables.setlistId) });
    },
```

`useUpdateSetlistEntry` sends a patch the request fully determines and the server
adds nothing to. `patchEntry` (`apps/pragma/api/src/setlists/setlists.service.ts:60-69`)
calls `updateEntry` with the input and returns the row; there is no generated id,
no derived timestamp, nothing the client cannot predict. `onMutate` has already
written that exact state through `applyEntryPatch`, and `mutationFn` returns
`response.json()`, so the authoritative answer is in hand before this line runs.
Standard 06 is explicit: *"When the request itself fully determines the new
state, e.g., a reorder or a toggle, reconcile from the mutation response and do
not add an `onSettled` call to `invalidateQueries`."*

The `isLastPendingMutation` guard does not satisfy the bullet. It solves a
different problem — an early refetch landing after a later optimistic write — and
the file's header says so. The bullet's hazard is a `GET` served by a different
Lambda on a different DSQL connection that still sees the pre-commit snapshot,
and the *last* mutation's invalidate is exposed to that exactly like any other.

The same call sits on `useDeleteSetlistEntry` at line 302. A delete is fully
determined too. The server compacts positions afterwards
(`setlists.service.ts:71-85`), but nothing in `site/` reads `entry.position` from
the cache — `SetlistEntryRow` and `SetlistEntryDragPreview` both take `position`
as a prop computed from the array index — so the compaction changes nothing the
client displays and is not server-generated data the refetch is owed for.

`useAppendSetlistEntry` keeps its refetch correctly: the insert returns an id the
optimistic row guessed. `useReorderSetlist` already drops it, with the reason
written out at line 344.

What would satisfy the bullet: drop `onSettled` from `useUpdateSetlistEntry` and
`useDeleteSetlistEntry` and reconcile in `onSuccess` from the row the response
carries, the way `useCreateSetlist` does at line 146. This branch makes it
sharper rather than academic — a slide across the new `EnergyBar` fires up to ten
of these writes in a gesture, and the invalidate that follows the last one is the
one that can read stale.

Secondary, same file, line 11:

```ts
 * (energy-slider drag, rapid reorder) lands after a later optimistic write
```

The control is no longer a slider. `VOCABULARY.md` was updated on this branch to
say *bar*, which makes this the only place left in the setlist code still calling
it the old noun.

### apps/pragma/site/src/components/organisms/SetlistEditor.tsx:3

Bullet: "`reviewer` checks that a comment documents something the code cannot
say, and is not a restatement, a history note, or a description of what the code
does not do."

```ts
 * Setlist editor. Embedded inside the concert session detail page.
 * Renders the ordered entries; each row carries an inline display
 * (title, artist, tonality, mastery, lineup, energy slider).
```

The parenthetical restates what `SetlistEntryRow` renders, which the row's own
JSDoc says better and its JSX says exactly, and it is now wrong: the branch
replaced the `<input type="range">` with `EnergyBar`, a strip of ten `<span>`s
(`EnergyBar.tsx:150-158`), and `apps/pragma/VOCABULARY.md:74-80` was updated in
this same branch to call it a bar. A restatement that has gone stale is the case
the bullet is guarding — a reader who trusts it goes looking for a range input.

The rest of the header holds up and should stay: the paragraph at lines 11-14 on
why a failure names the action rather than echoing `ApiError` is a decision the
code cannot state, and so is the filtered-mode paragraph at lines 26-31 on why
the transition strips disappear.

What would satisfy the bullet: delete the second sentence. The composition it
lists is one `SetlistEntriesList` element away in the same file.

## Sealed

- `apps/pragma/site/src/components/organisms/SetlistEntryRow.tsx` — the `0837Z`
  finding is fixed. `onUpdate` now takes `SetlistEntryPatch`
  (`SetlistEntryRow.tsx:109`), which `setlists.queries.ts:225-227` derives from
  `Parameters<…$put>[0]['json']`; the endpoint's body is
  `setlistEntryCreateSchema.partial()` (`setlists.schema.ts:59`), so the partial
  bags at lines 136 and 140 type-check and a renamed field on the API is now an
  error where it is written. Comments checked one by one: the tab-order paragraph
  at lines 12-16 records why markup order is load-bearing, which is the thing a
  later reader optimising card height would silently break, and the `useForm`
  paragraph at lines 21-26 explains a form with no `onSubmit`, which reads as a
  bug without it. No effect, no negated boolean, one visual boolean in the prop
  set rather than a family, two energy appearances so no `cva` owed, every string
  through `t()` with keys that name the screen and the element.
- `apps/pragma/site/src/components/organisms/setlist-entry-energy.core.ts` — the
  file is unchanged; what unsealed it was the stale `VOCABULARY.md` definition,
  and that is now fixed. I checked the new wording against the code rather than
  taking it: `ENERGY_DEFAULT` is 5 (line 12), `ENERGY_MIN`/`ENERGY_MAX` are 1 and
  10 (`setlist-entry-form.hook.ts:16-17`) and `buildEnergyLevels` yields one
  level per step, so *ten segments* is right, and `UNSET_APPEARANCE` does draw
  filled segments and readout in the muted palette. I also recomputed the
  contrast numbers in the `EMPTY_SEGMENT_CLASS` comment from
  `styles/tokens.css`: `line-strong` at 22% over `bg-elev` against `bg-sunk` is
  1.363:1, matching the stated 1.36:1, and `ink-500` against `bg-sunk` is 4.96:1
  light and 7.11:1 dark, both clearing the 3:1 the comment claims. `.core.ts` is
  the right half of the 02 choice — energy is a noun the band uses and
  `VOCABULARY.md` has a section for it.
- `apps/pragma/site/src/components/organisms/SetlistEntriesList.tsx` — carries the
  derived `SetlistEntryPatch` on `onUpdate` (line 77). `ListEntry` (lines 53-59)
  is written out by hand, and I checked it against the 03 bullet: it is a
  structural minimum used as a prop constraint, not a replacement for a
  derivation — `SetlistEditor` passes the inferred query rows into it, so a
  renamed API field is still a type error at the call site. That is the opposite
  of the `Record<string, unknown>` the last pass rejected, which accepted
  anything. No effect, no query, no user-facing string, one boolean in the prop
  set.
- `apps/pragma/site/src/components/molecules/SetlistEntryDetailsFields.tsx` —
  `onPatch` now takes `SetlistEntryPatch` (line 30), so `{ capo: … }` and
  `{ keyOverride: … }` are checked against the endpoint. Fields go through
  `form.Field` rather than a `useState` chain, which is what the 06 form bullet
  asks. Keys `setlist.keyOverride`, `setlist.capo`, `setlist.notes` name the
  screen and the element.

Still sealed from the `0837Z` pass, content unmoved, not re-read here:
`EnergyBar.tsx`, `energy-bar.utils.ts`, `SetlistToolbar.tsx`.

## Unclear

None.

## Outside the checklist

- **`SetlistEntryRow` declares a prop it never reads.**
  `readonly currentSongId: string;` at line 100 appears nowhere else in the file —
  `SetlistEntriesList.tsx:164` passes it and nothing consumes it. No bullet covers
  a dead prop and knip does not read interface members, so this changes no
  verdict.
- **`SetlistEntryRow` claims `organism-form` and departs from it in one place.**
  The blueprint has `defaultValues`, `validators` and the payload all coming from
  a `*-form.core.ts`; here the validators live in `setlist-entry-form.hook.ts` but
  `defaultValues` is assembled inline at lines 127-132. Field values are read
  through `form.Field` rather than mirrored into `useState`, which is the part of
  the blueprint that matters most. The blueprint also assumes a submit handler,
  and this form has none by design.
- **375 px was not re-driven in this session.** Nothing layout-bearing moved since
  the `0837Z` pass — the only change to `SetlistEntryRow` was an import and a prop
  type — so the evidence at
  `docs/features/pragma/setlist-card-density/validation/visual-validation-2026-08-19.md`
  still describes the rendered output. I did not open a browser myself.
- **`hotspots.md` and `temporal-coupling.md` name none of these files.** Both are
  read at `be783f1`; no setlist file appears in either, so neither report had
  anything to say about this branch.
- **No disable comments in the branch's source**, so the 12 bullet had nothing to
  judge.
- **Process note.** `seal.ts verify` takes its file list from the committed diff
  but hashes the working tree, so the four files sitting uncommitted when I
  started were invisible to the gate while being squarely part of the change under
  review. Logged to kaizen.
