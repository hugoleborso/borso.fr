# Standards review — claude/pragma-song-chips-height-oe43sy against origin/main

Verdict: FINDINGS
Ledger: c9cc14decde4
Reviewed: 2 file(s). Sealed: 1. Findings: 1.

Merge base `15824a34dd15f3be11bc9d652689c45cd9d00c0f`. Third pass. The working
tree is clean, so everything under review is committed. Seven of the nine
reviewable files were already sealed against this ledger hash and are untouched
since; the two the gate reported unsealed are the two judged here, and both were
read in full this session:
`apps/pragma/site/src/lib/queries/setlists.queries.ts` (345 lines) and
`apps/pragma/site/src/components/organisms/SetlistEditor.tsx` (303 lines).

I checked the new module header in `setlists.queries.ts` claim by claim rather
than taking it, and it holds — see *Outside the checklist* for the working. The
finding below is elsewhere in the same file, in a JSDoc block the branch did not
touch.

## Findings

### apps/pragma/site/src/lib/queries/setlists.queries.ts:129

Bullet: "`reviewer` checks that a comment documents something the code cannot
say, and is not a restatement, a history note, or a description of what the code
does not do."

```ts
/**
 * `onMutate` intentionally absent: the caller awaits `mutateAsync(...)`
 * to read the server-issued `setlist.id` before navigating to the
 * editor, so a temp-id optimistic record would block on the entries
 * fetch (404) until the real id arrives. The latency is bounded by the
 * single round-trip; optimistic doesn't improve perceived UX here.
```

No caller awaits `mutateAsync`, and no caller reads `setlist.id` off the result.
`useCreateSetlist` has exactly three call sites in `apps/pragma/site/src`, and
all three fire and forget:

```tsx
// routes/setlists/SetlistsPage.tsx:63-64
    createSetlist.mutate({ sessionId });
    navigateTo(`/sessions/${sessionId}/setlist`);
```

```tsx
// routes/setlists/SetlistEditorPage.tsx:86
            onClick={() => createSetlist.mutate({ sessionId })}
```

```tsx
// routes/sessions/SessionDetailPage.tsx:99
    createSetlist.mutate({ sessionId });
```

`SetlistsPage` navigates on the line after the call, synchronously, and the URL
it builds is keyed by `sessionId`, not by the setlist's id. `SetlistEditorPage`
does not navigate at all — it re-renders when `onSuccess` writes the row into
`setlistKeys.bySessionId`.

So the comment is a description of what the code does not do (`onMutate`
intentionally absent, and a hypothetical temp-id record that would block) whose
one supporting fact about the code that *is* there is untrue. A reader following
it goes looking for an awaited `mutateAsync` and an id-keyed navigation, and
finds neither.

The absence itself is not the problem: standard 06's mutation table and the
`query-pessimistic-mutation` blueprint declared on this very block both ask the
header to say why the optimistic path is refused. What would satisfy the bullet
is a reason that is true — the client cannot name the id the insert generates,
so there is nothing to predict, and `onSuccess` writes the row the response
carries into `setlistKeys.bySessionId` so the editor renders without a second
read. That is a claim a reader can check against lines 157-159.

## Sealed

- `apps/pragma/site/src/components/organisms/SetlistEditor.tsx` — the `0850Z`
  finding is fixed: the stale parenthetical listing an "energy slider" is gone,
  replaced by `SetlistEntryRow owns what one of them shows`, which is true.
  I verified the rest of the header against the code rather than re-reading the
  last pass's verdict: `SetlistToolbar.tsx:59` is the `sticky top-0 z-20` bar and
  it takes `energyValues` and the member filter, `BottomActionBar` wraps exactly
  the two set-level actions (copy order, add song), `SetlistEntriesList.tsx:127`
  and `:134` are the `DndContext`/`SortableContext`, `prominentMemberInstrumentFor`
  really does feed `prominentMemberInstrument` at `SetlistEntriesList.tsx:171`,
  and every `ApiError` thrown in `setlists.queries.ts` carries a bare string like
  `` `reorder ${response.status}` ``, which is what the "names the action rather
  than echoing what threw" paragraph claims. The branch's other change here,
  `updateSetlistEntry(entryId, patch: SetlistEntryPatch)` at line 207, satisfies
  the 03 derived-type bullet: `SetlistEntryPatch` comes from
  `Parameters<…entries[':entryId'].$put>[0]['json']`, so it is derived from the
  Hono routes rather than written out. No `useEffect`, no negated boolean, one
  boolean per child rather than a family where a variant string belongs
  (`inFilteredMode`, `isCompact`, `open`), every user-facing string through `t()`
  with keys naming the screen and the element, and no `cva` owed because no
  conditional class expression carries more than two variants. On 375 px I did
  not drive a browser: nothing layout-bearing changed in this file on this
  branch, and
  `docs/features/pragma/setlist-card-density/validation/visual-validation-2026-08-19.md`
  records a PASS driven with `agent-browser` for the measurements and
  `scripts/argent.sh` plus raw CDP touch events for the taps and drags.

## Unclear

None.

## Outside the checklist

- **The new module header in `setlists.queries.ts` is true, and I cleared it.**
  Every claim checks out. Only `useAppendSetlistEntry` invalidates (line 225);
  update, delete and reorder now hold no `onSettled`. The append is the one write
  the client cannot predict — `SetlistEditor.tsx:190` passes
  `optimisticId: crypto.randomUUID()` and the server issues the real id. Patch is
  fully determined: `ENTRY_PROJECTION`
  (`apps/pragma/api/src/setlists/setlists.repository.ts:61-72`) carries no
  timestamp and `patchEntry` derives nothing. Delete is the one with a wrinkle —
  `removeEntryAndCompact` renumbers `position` server-side
  (`setlists.service.ts:71-83`) while `removeEntryById` only filters — but nothing
  in `site/` reads `entry.position` off the cache: `SetlistEntriesList.tsx:153`
  and `:198` pass an array index, and `formatSetlistOrder`
  (`setlist-editor.utils.ts:59`) recomputes from the index too, so the stale field
  reaches no screen and `appendOptimisticEntry` lands the next row at
  `cache.entries.length`, which is what the server would compute anyway. The
  DSQL rationale matches
  `docs/dantotsus/optimistic-reorder-reverted-by-stale-dsql-read.md` step 3, and
  the shape now matches that dantotsu's shipped eradication exactly.
- **The three optimistic mutations reconcile from neither the response nor a
  refetch.** The 06 bullet's wording is "reconciles from the response rather than
  refetching", and strictly these keep the `onMutate` write and ignore
  `response.json()`. I did not treat that as a finding: the hazard the bullet
  names is the refetch, the standard's own prose says "removed the `onSettled`
  refetch", and the response would write the value `onMutate` already wrote. The
  `PUT` does return the persisted row (`setlists.controller.ts:73`), so an
  `onSuccess` reconcile is available if a later reader wants the belt as well as
  the braces.
- **Standard 06's mutation table and the `query-pessimistic-mutation` blueprint
  disagree by one word.** The table says a pessimistic mutation's `onSuccess`
  "invalidates the affected key"; the blueprint — which lives at
  `setlists.queries.ts:140` — says it "writes the row the response carries into
  the affected key", and the code does the latter (line 158). The blueprint is
  the better rule and the code follows it; the table is the one to reword.
- **`SetlistEditor.tsx:81` claims `organism-query-owning` and copies half of it.**
  The blueprint's shape is a query hook at organism level *plus* a covered core
  selector indexing a frozen table of views "so the component body carries no
  branch". The query hooks are at the right level, but the body branches
  (`if (entriesQuery.isLoading)` at line 224, three JSX ternaries). No ledger
  bullet covers blueprint fidelity, so this changed no verdict.
- **`SetlistEditor.tsx:2` says "Embedded inside the concert session detail
  page".** It is also the body of `SetlistEditorPage.tsx:104`. Incomplete rather
  than false, and it still tells a reader something the component cannot say
  about itself, so I did not make it a finding.
- **`docs/standards/hotspots.md` and `docs/standards/temporal-coupling.md`
  name neither file**, so neither page had anything to say about this pass.
- **No `eslint-disable` comments anywhere in the branch's source**, so the 12
  bullet had nothing to judge.
- `scripts/standards/seal.ts verify --base origin/main` now reports one uncleared
  file, `setlists.queries.ts`, which is the file carrying the finding. That is the
  gate reflecting reality.
