# Standards review — claude/setlist-creation-bug-025jld against origin/main

Verdict: FINDINGS
Ledger: c9cc14decde4
Reviewed: 28 file(s). Sealed: 25. Findings: 3.

Merge base: `15824a34dd15f3be11bc9d652689c45cd9d00c0f`. Every file below was read in
full off disk this session, not as a diff hunk.

The working tree carries uncommitted edits on top of `HEAD`, and `seal.ts verify`
hashes the file on disk rather than the committed blob, so the review is of the
working tree. That set is the committed diff plus three untracked organisms
(`SessionSetlists.tsx`, `SetlistCatalogList.tsx`, `SetlistHeaderActions.tsx`) and
the staged move of `setlist-index.core.ts` into `site/src/lib/`; all four are
sealed here so committing them does not need a third pass, provided their content
does not change again.

Seven of the ten findings in the 18:40 review are fixed and re-read as fixed: the
two cascades are transactions, `findNextLinkPosition` is gone, `createSetlist`
writes both rows in one transaction owned by `insertSetlist`, `getSetlist` is
`findSetlist`, the `setlists.ts` header pointer is corrected, `SetlistEditor`'s
mount sentence is true again, and both the rename cluster and the index list are
organisms. The three below are what remains.

## Findings

### apps/pragma/api/src/setlists/setlists.repository.ts:54

Bullet: "`reviewer` checks that a derived type is derived, so a row type comes from
`$inferSelect`, a request body from `z.infer`, and a response from the Hono client,
rather than being written out by hand beside the thing it mirrors." (03. Typing)

```ts
interface SetlistEntryRawRow {
  id: string;
  setlistId: string;
  songId: string;
  position: number;
  lineupOverride: string | null;
  energy: number | null;
  keyOverride: string | null;
  capo: number | null;
  notes: string;
}
```

`setlistEntryTable` (`setlists.schema.ts:38-49`) declares exactly these nine
columns with exactly these types, and `ENTRY_PROJECTION` selects all nine, so this
is a hand-written copy of `typeof setlistEntryTable.$inferSelect` sitting eleven
lines above a file that already derives `EntryInsertEncoded` that way (line 105).
`SetlistRow` on line 29 was the same shape and became `$inferSelect` in this round;
the raw entry row is the one that did not. `SetlistEntryRow` and `EntryInsertShape`
are legitimately hand-written, because they carry the decoded lineup rather than
the stored TEXT.

### apps/pragma/api/src/sessions/sessions.repository.ts:31

Bullet: "`reviewer` checks that a derived type is derived, so a row type comes from
`$inferSelect` […]" (03. Typing)

```ts
interface SessionRawRow {
  id: string;
  kind: string;
  date: Date;
  preparedConcertId: string | null;
  venue: string | null;
  capacity: number | null;
  gear: string | null;
  friendsCountPerMember: string | null;
}
```

`sessionTable` (`sessions.schema.ts:16-25`) declares those eight columns, the
`timestamp(... mode: 'date')` giving the `Date`, and `PROJECTION` selects all
eight, so this restates `typeof sessionTable.$inferSelect`. The file already
derives `SessionUpdateEncoded` from `$inferInsert` on line 73. `SessionRow` above
it is legitimately hand-written, because `friendsCountPerMember` is decoded there.

### apps/pragma/site/src/routes/sessions/SessionDetailPage.tsx:143

Bullet: "`reviewer` checks that a route composes organisms and owns no layout
primitive, because the atomic rules read the bucket out of the path and a route is
in no bucket." (05. Front end architecture)

```tsx
      <header className="flex items-end justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <div className="text-xs tracking-wider uppercase text-ink-500 mb-1">
            {t(isConcert ? 'sessions.kindConcert' : 'sessions.kindPractice')}
          </div>
          <h1 className="font-display italic text-[40px] sm:text-[56px] leading-[0.95] tracking-[-0.015em] text-ink-900 m-0 mb-2">
```

Lines 143-179 are a screen region the route builds itself out of raw `header`,
`div` and `span`: display typography, the metadata row with its `·` separators, and
the action slot. This branch shrank it (the setlist button left) and did not move
it out. The reason it matters more here than in another route is line 40: this file
*is* `@Blueprint route-detail-page`, and its own description reads "Everything
after the early returns is a read organism taking plain props, so the page stays a
thin orchestrator over the query hooks" — five followers copy a claim the blueprint
does not keep. A `SessionHeader` organism taking `kind`, `title`, `date`,
`capacity`, `friendsTotal` and an actions slot would make the sentence true; the
rest of the page already composes organisms.

## Sealed

- `apps/pragma/api/src/setlists/setlists.controller.ts` — thirteen handlers, each
  validate / call one service function / shape the response; the only branches map
  an absent or refused resource to 404, 400 or 409, which 02 exempts.
- `apps/pragma/api/src/setlists/setlists.core.ts` — pure, no clock; the three verbs
  keep their promises (`selectNextLinkPosition` chooses, the two `build`/`tally`
  functions assemble), and a setlist with no entry still gets a zero.
- `apps/pragma/api/src/setlists/setlists.schema.ts` — types come from the tables and
  the Zod objects. Judgement recorded, as in the previous pass: the
  `setlist_sheet`-versus-`setlist` paragraph reads close to a history note and is
  kept, because the physical name mismatch is live and unexplainable from the code.
- `apps/pragma/api/src/setlists/setlists.service.ts` — `findSetlist` returns `null`
  as its verb promises; the create's JSDoc claim that "the two rows are written in
  one transaction" is now true, `insertSetlist` owning it in the repository, which
  is the shape standard 11 prescribes rather than the literal wording of the 04
  bullet.
- `apps/pragma/api/src/database/schema.ts`, `…/__test/test-seed.repository.ts`,
  `apps/pragma/test/database-utils.ts`, `apps/pragma/test/setup-postgres.ts` — the
  barrel, the wipe list, the truncate list and the drop list all name
  `session_setlist` and `setlist_sheet`, and all four keep the old `setlist` table
  in the wipe lists so a stale local database still clears.
- `apps/pragma/api/src/__test/test-seed.service.ts` — every write still goes through
  the owning slice's service, and the seeded create names its setlist and its
  session in one call.
- `apps/pragma/site/src/lib/queries/setlists.queries.ts` — every write reconciles
  from its own response; the create is pessimistic on purpose and says why, and no
  `invalidateQueries` follows a write whose result the response carries, which is
  the DSQL bullet in 06.
- `apps/pragma/site/src/lib/queries/setlist-entries.queries.ts` — optimistic
  `onMutate` / rollback / drained `onSettled` on three mutations; the reorder has
  none, and the comment saying so names the DSQL property a reader would otherwise
  undo.
- `apps/pragma/site/src/lib/queries/setlists.utils.ts` — pure; the header now names
  the two real query modules, which was the 18:40 finding.
- `apps/pragma/site/src/components/organisms/SessionSetlists.tsx` — the session's
  setlist region as an organism: the list, the two add paths, the detach, and the
  two dialogs. Owns two booleans, no variant family.
- `apps/pragma/site/src/components/organisms/SetlistCatalogList.tsx` — the index
  list and its empty state, composing `SetlistSummaryRow`.
- `apps/pragma/site/src/components/organisms/SetlistHeaderActions.tsx` — the rename
  and delete cluster the route used to inline; the draft name is one `useState`
  written only from the buttons, not a form's worth of chained state.
- `apps/pragma/site/src/components/organisms/CreateSetlistDialog.tsx` — one
  `useForm` with the Zod validator, per the 06 bullet.
- `apps/pragma/site/src/components/organisms/AttachSetlistDialog.tsx` — the
  candidate list comes from the pure `selectSetlistsNotOnSession`.
- `apps/pragma/site/src/components/organisms/SetlistEditor.tsx` — the mount sentence
  now matches where the editor is rendered.
- `apps/pragma/site/src/components/molecules/SetlistSummaryRow.tsx` — a molecule
  over `Icon` and `Link`, taking its trailing action as a `ReactNode`, so the index
  and the session page share one row instead of forking.
- `apps/pragma/site/src/routes/setlists/SetlistsPage.tsx` — the list is now
  `SetlistCatalogList`, so the `route-list-page` blueprint claim holds.
- `apps/pragma/site/src/routes/setlists/SetlistEditorPage.tsx` — the control cluster
  is now an organism; the route keeps the parameter, the queries, the page header
  and the navigation after a delete.
- `apps/pragma/site/src/routes/setlists/SessionSetlistRedirectPage.tsx` — routing
  only: one parameter, one query, three redirects.
- `apps/pragma/site/src/lib/setlist-index.core.ts`,
  `apps/pragma/site/src/lib/setlist-name.utils.ts` — pure, and the core/utils split
  matches 02: the index ordering is a rule the band would recognise, the
  display-name fallback is a cross-cutting helper.
- `apps/pragma/site/src/App.tsx` — two route lines; the comment about the scene
  route sitting outside `AppShell` names a structural decision the tree cannot
  state.

The 375-pixel bullet is met on the two screens this change adds or reshapes. I
opened the committed phone captures under
`docs/features/pragma/setlists-across-sessions/validation/screenshots-2026-08-19/`:
`setlists-index-phone.png` shows the index rows, the action bar and the tab bar
clear of each other, and `session-two-setlists-phone.png` shows the two setlists
with their detach buttons and the two add buttons wrapping onto one row. The
organisms sealed here move that markup without changing a class.

## Unclear

None.

## Outside the checklist

- `setlists.service.ts:44`, `:53` and `:114` name list reads `getAllSetlists`,
  `getSetlistsOfSession` and `getEntries`. The verb table gives `list…` for an
  array and `get…` for "the thing, and throws when it is absent". I did not treat
  it as a finding: a collection is never absent, so there is no throw to promise,
  and every service in this application reads the table that way (eighteen
  `get…` functions across nine slices). It is a repository-wide naming decision, not
  this branch's; `convention-drift.ts` is where it belongs if it is to move.
- `apps/pragma/site/src/lib/setlist-index.core.ts` is a `.core.ts` in `lib/`, the
  folder 02 illustrates with `.utils.ts` files, and it carries
  `// @FollowsBlueprint utils-pure-module`. The suffix is right — the index order is
  a rule the band would recognise — and three callers in two folders make `lib/` a
  defensible home, so no bullet is failed; noting it because 02's "a core file lives
  beside the code it serves" reads the other way, and the file sat in
  `routes/setlists/` an hour ago.
- `apps/pragma/api/src/sessions/sessions.repository.ts:16` imports
  `sessionSetlistTable` from the setlists slice, so two repositories write
  `session_setlist`. Standard 04 says a repository imports nothing from another
  slice; no reviewer bullet covers it and no lint rule reaches it. Unchanged
  observation from the previous pass.
- `apps/pragma/site/src/routes/setlists/SetlistEditorPage.tsx:76-82` builds the
  subtitle with a ternary plus `map`/`join` inline, and
  `SetlistCatalogList.tsx:43-52` holds the same "name the sessions" rule as
  `describeSessions`. One pure helper would serve both. Advisory: the 05 bullet
  names layout primitives, not derivation.
- `apps/pragma/api/src/__test/test-seed.service.ts` carries French fixture strings
  (`'Le Petit Bain'`, `'Set principal'`, the song notes). Standard 01 puts
  user-visible text in `i18n`, but no reviewer bullet covers seed data and every
  identifier is English.
- `apps/pragma/site/src/components/organisms/SetlistEditor.tsx:118`, `:137`, `:144`
  and `:149` name their accumulators `out`. Advisory; the naming bullets reach
  verbs, booleans, comments and file names only.
