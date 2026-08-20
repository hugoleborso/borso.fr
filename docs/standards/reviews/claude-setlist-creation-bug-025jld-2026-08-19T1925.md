# Standards review — claude/setlist-creation-bug-025jld against origin/main

Verdict: FINDINGS
Ledger: c9cc14decde4
Reviewed: 29 file(s). Sealed: 24. Findings: 4.

Merge base: `15824a34dd15f3be11bc9d652689c45cd9d00c0f`. Every file named below was
read in full off disk this session, not as a diff hunk.

Third pass on this branch. The three findings of the 19:05 review are fixed and
re-read as fixed: `setlists.repository.ts:54` is now
`type SetlistEntryRawRow = typeof setlistEntryTable.$inferSelect`,
`sessions.repository.ts:31` is now `typeof sessionTable.$inferSelect`, and
`SessionDetailPage.tsx` no longer builds its own header — lines 150-162 compose the
`PageHeader` molecule.

The four below are new. Three of them were reachable in the earlier passes and
were missed; one (the repository projection) is a bullet neither earlier pass
applied to this file.

## Findings

### apps/pragma/VOCABULARY.md:216

Bullet: "`reviewer` checks that a definition in a `VOCABULARY.md` is still true,
which is prose against code and therefore nothing a rule can do." (01. Naming)

```markdown
## Setlist

The ordered run of songs for one session.

Lives in: `api/src/setlists/`

- `sessionId` is `NOT NULL` and carries a unique constraint, so a session
  has at most one setlist.
- Asking for a second one answers `already-exists` rather than creating it
  (`createSetlistForSession`).
```

Every claim in that section is now false, and this branch is what made it false.
`setlistTable` (`setlists.schema.ts:23-26`) declares two columns, `id` and `name`,
and no `sessionId` at all; the attachment lives in `sessionSetlistTable`
(`setlists.schema.ts:28-36`) whose primary key is the `(sessionId, setlistId)`
pair, so a session carries any number of setlists and a setlist is carried by any
number of sessions. `createSetlistForSession` no longer exists — `setlists.service.ts:75`
is `createSetlist`, and its only refusal is `session-not-found`, never
`already-exists`. A setlist is no longer "the ordered run of songs for one
session"; it is a named running order that exists on its own, which is what
`setlists.schema.ts:2-5` and the migration header both say.

The Session section carries the same defect, at line 208:

```markdown
- Deleting a session deletes its setlist and that setlist's entries first
  (`deleteSessionWithCascade`).
```

`sessions.repository.ts:115-125` deletes the `session_setlist` rows and the
session, and nothing else; the setlists and their entries survive on purpose, as
the file header states.

What satisfies the bullet: rewrite both sections against the shipped schema —
Setlist as a standalone named running order with the link table's invariants and
`createSetlist`'s one refusal, and Session's delete as a detach. The picker rule
in `selectSetlistsNotOnSession` and the position rule in `selectNextLinkPosition`
are two new invariants the section should carry. *Words we do not use* is worth a
line too: this branch introduced "attach" and "detach" as the verbs for the link,
against "add" and "remove".

Seals withheld on `apps/pragma/api/src/sessions/sessions.repository.ts` for this.
`setlists.schema.ts` and `setlists.service.ts` carry the same finding, and both
already hold a seal from the 19:05 pass at exactly this content, so no gate will
stop on them — the report is the only place this lands. The fix is in
`VOCABULARY.md`, which no seal reaches at all.

### apps/pragma/api/src/setlists/setlists.repository.ts:251

Bullet: "`reviewer` checks that a repository returns rows, arrays and counts rather
than a shape it derived, because a repository that projects is a service."
(04. Back end architecture)

```ts
export async function countEntriesBySetlist(
  setlistIds: readonly string[],
): Promise<SetlistSongCount[]> {
  if (setlistIds.length === 0) return [];
  const database = getDatabase();
  const rows = await database
    .select({ setlistId: setlistEntryTable.setlistId })
    .from(setlistEntryTable)
    .where(inArray(setlistEntryTable.setlistId, [...setlistIds]));
  return tallySongsPerSetlist(setlistIds, rows);
}
```

The query returns one row per entry. `tallySongsPerSetlist` turns those into one
`{ setlistId, songCount }` per setlist *and* invents a zero for every setlist the
query returned nothing for — a shape the database never produced. Standard 04 is
explicit about where that goes: "When it would return a shape the database does
not have, the mapping moves into a `.core.ts` function that the service calls."
The function is in `.core.ts` already; it is the repository calling it that fails
the bullet.

Either fix works. Return the rows (`listEntrySetlistIds`) and let
`getAllSetlists` / `getSetlistsOfSession` call `tallySongsPerSetlist` — they
already call `buildSetlistSummaries` from the same module, so the tally sits
naturally beside it. Or make the count a real count with `count(*)` and a
`groupBy`, and let the core keep only the zero-filling.

Not a finding, and worth saying so here so the fix does not overreach:
`attachAtEnd` (line 172) calls `selectNextLinkPosition` inside the repository too,
and that one belongs there. The `max(position)` read and the insert have to sit in
one transaction for the position to be sound, and the executor never leaves the
repository.

### apps/pragma/site/src/lib/queries/setlists.utils.ts:2

Bullet: "`reviewer` checks that a comment documents something the code cannot say,
and is not a restatement, a history note, or a description of what the code does
not do." (01. Naming)

```ts
/**
 * Pure cache transforms for the setlist entries query.
 *
 * Each mutation in `setlist-entries.queries.ts` snapshots the current `{ entries }`
 * cache, applies one of these helpers in `onMutate`, and rolls back to
 * the snapshot in `onError`. …
 */
```

That header describes lines 20-114. It does not describe lines 116-194, which this
branch added: `appendSetlistToCache`, `removeSetlistFromCache`,
`renameSetlistInCache` and `applySessionLinkInCache` transform the `{ setlists }`
cache, not the `{ entries }` one; their caller is `setlists.queries.ts`, not
`setlist-entries.queries.ts`; and they run in `onSuccess` with no snapshot and no
rollback, which is the opposite of the sentence above them —
`setlists.queries.ts:7-11` says so in as many words. `selectSetlistsNotOnSession`
(line 189) is not a cache transform at all; it filters the attach picker's
candidates for `AttachSetlistDialog`.

A comment that is wrong costs more than a comment that restates, because a reader
trusts it. The 18:40 review corrected this header's module pointer and the 19:05
pass read it as fixed; the scope claim underneath is what neither caught, and the
branch that widened the file is the branch that should have widened the sentence.
Two sentences fix it: name the two halves, and say that the entry half rolls back
while the setlist half reconciles from the response.

This content already carries a seal from the 19:05 pass, so the gate will not stop
on it.

## Sealed

Twenty-four files, one `seal.ts record` call, all read in full this session.

- `apps/pragma/api/src/setlists/setlists.controller.ts` — thirteen handlers, each
  one validate / one service call / one response. The branches map an absent,
  refused or stale resource onto 404, 400 and 409 and hold no business condition.
  `{ id, deleted: true }` is the envelope every controller in this application
  writes, not an inline DTO.
- `apps/pragma/api/src/setlists/setlists.core.ts` — pure, no clock, no import but
  its own types. The three verbs keep their promises against the bodies:
  `selectNextLinkPosition` chooses one of two numbers, `tallySongsPerSetlist` and
  `buildSetlistSummaries` assemble from parts, and a setlist nothing points at
  still comes back with a zero and an empty session list.
- `apps/pragma/api/src/database/schema.ts` — the barrel re-exports the two new
  tables; `setlist_sheet` and `session_setlist` both reach drizzle-kit.
- `apps/pragma/api/src/__test/test-seed.repository.ts`,
  `…/__test/test-seed.service.ts` — the wipe deletes `setlist_entry`,
  `session_setlist` and `setlist_sheet` in an order no foreign key would refuse,
  and every seeded write still goes through the owning slice's service, the setlist
  now being created and attached in one `createSetlist` call.
- `apps/pragma/test/database-utils.ts`, `apps/pragma/test/setup-postgres.ts` — both
  lists name `session_setlist` and `setlist_sheet` and both keep the retired
  `setlist`, so a local database from before the migration still truncates and
  still drops.
- `apps/pragma/site/src/lib/queries/setlists.queries.ts` — every one of the five
  writes reconciles from its own response and none of them refetches, which is the
  06 bullet about DSQL's per-connection read-after-write. The create is pessimistic
  on purpose because the caller needs the server-issued id before it navigates, and
  the blueprint block says why rather than leaving the missing `onMutate` looking
  like an oversight.
- `apps/pragma/site/src/lib/queries/setlist-entries.queries.ts` — three optimistic
  mutations with snapshot, rollback and a drained `onSettled`; the reorder has no
  refetch and the comment naming the DSQL property is the one a future reader needs
  before they "fix" the omission.
- `apps/pragma/site/src/lib/setlist-index.core.ts` — pure, no clock. The ordering
  rule (unattached first, then by latest session, name breaking the tie) is one the
  band would recognise, which is what puts it in `.core.ts` rather than `.utils.ts`.
- `apps/pragma/site/src/lib/setlist-name.utils.ts` — the display fallback for an
  unnamed setlist, cross-cutting and used by three surfaces.
- `apps/pragma/site/src/routes/sessions/session-facts.core.ts` — takes its labels
  as arguments, so the rule is which facts earn the line and not how they read in a
  language.
- `apps/pragma/site/src/components/organisms/SessionSetlists.tsx` — the session's
  setlist region: the list, both add paths, the detach and the two dialogs. Two
  booleans of interface state, no variant family among the props.
- `apps/pragma/site/src/components/organisms/SetlistCatalogList.tsx` — the index
  list and its empty state over `SetlistSummaryRow`.
- `apps/pragma/site/src/components/organisms/SetlistHeaderActions.tsx` — rename and
  delete; the draft name is one `useState` written only from the buttons, which is
  a control's own state rather than a form's worth of chained state.
- `apps/pragma/site/src/components/organisms/CreateSetlistDialog.tsx` — one
  `useForm` with a Zod validator and a `form.Subscribe` on the submit state, per the
  06 bullet about forms.
- `apps/pragma/site/src/components/organisms/AttachSetlistDialog.tsx` — the
  candidates come from the pure `selectSetlistsNotOnSession`, so the picker offers
  only what it can actually attach.
- `apps/pragma/site/src/components/organisms/SetlistEditor.tsx` — the mount
  sentence in the header matches where the editor is now rendered, and the entry
  hooks come from the module that owns them.
- `apps/pragma/site/src/components/molecules/SetlistSummaryRow.tsx` — a molecule
  over `Icon` and `Link` taking its trailing action as a `ReactNode`, so the index
  and the session page share one row rather than forking it.
- `apps/pragma/site/src/routes/setlists/SetlistsPage.tsx`,
  `…/SetlistEditorPage.tsx`, `…/SessionSetlistRedirectPage.tsx` — parameters,
  queries, navigation and one composed organism each. The page shell
  (`px-4 sm:px-9 py-7 pb-20 max-w-[1280px]`) is the same one the `route-list-page`
  blueprint carries at `CatalogPage.tsx:164`, so it is not the layout primitive the
  05 bullet is about. The redirect page's header explains why an address with no
  component behind it still needs a component: the band's phones have the
  application installed and the old address is in their bookmarks.
- `apps/pragma/site/src/routes/sessions/SessionDetailPage.tsx` — the header block
  the 19:05 pass found is gone; the route now owns the parameter, five query hooks,
  two callbacks and a composition of read organisms.
- `apps/pragma/site/src/App.tsx` — two route lines, and the old address rebound to
  the redirect.

No `useEffect` is added anywhere in the branch, so the 07 bullet has nothing to
judge. Every new touch target goes through `Button`, whose every size carries
`min-h-11` (`button.variants.ts:32-34`), and the two picker rows in
`AttachSetlistDialog` carry it themselves.

On the 375-pixel bullet: I opened the three committed phone captures under
`docs/features/pragma/setlists-across-sessions/validation/screenshots-2026-08-19/`,
all three 375 × 812. `setlists-index-phone.png` shows the index rows, the action
bar and the tab bar clear of one another; `setlist-in-two-sessions-phone.png` shows
the setlist page with its rename, delete and member filter wrapping cleanly;
`session-two-setlists-phone.png` shows the session page's setlist region, where the
row is `flex` with the link at `flex-1 min-w-0` and a `truncate` title, so the
detach action holds its width and the name gives way rather than the row
overflowing.

## Unclear

- No `scripts/argent.sh` pass is recorded for this branch, and the checklist asks
  for one for "anything touched". The captures are `agent-browser`-shaped, which
  the same bullet says is not a tap. I did not treat it as a finding because the
  branch adds no gesture — every new control is a `Button` or an anchor, the
  reorder gesture it inherits is untouched, and the tap floor is met in the variant
  table rather than per call site. A phone pass through `argent` on
  `/setlists`, `/setlists/:id` and a session page would settle it; nothing in the
  code makes me expect it to find anything.

## Outside the checklist

- `setlists.service.ts:44` and `:53` name two list reads `getAllSetlists` and
  `getSetlistsOfSession`, where the verb table gives `list…` for an array. The
  19:05 review ruled this outside the checklist — a collection is never absent, so
  there is no throw for `get…` to promise, and eighteen `get…` functions across
  nine slices read the same way. I am holding to that ruling rather than
  re-litigating it per branch. Worth noticing that the same slice's repository says
  `listSetlists`, `listSetlistsOfSession` and `listEntries` for the same three
  reads, so the two layers disagree on the verb inside one folder;
  `convention-drift.ts` is where that belongs if it is ever to move.
- `SessionDetailPage.tsx:199` keeps one `<h3 className="font-display italic
  text-2xl …">` above `SessionSetlists`. It reads to me as the heading of the
  region the organism draws, and it would sit more naturally inside it. Advisory
  only: the `route-list-page` blueprint itself owns a layout wrapper
  (`CatalogPage.tsx:172`), so a route holding a section title is not what the 05
  bullet is aimed at.
- `SetlistEditorPage.tsx:76-82` builds its subtitle with a ternary plus
  `map`/`join`, and `SetlistCatalogList.tsx:43-52` holds the same "name the
  sessions" rule as `describeSessions`. One pure helper would serve both surfaces
  and would be covered. Unchanged observation from the 19:05 pass.
- `sessions.repository.ts:16` imports `sessionSetlistTable` from the setlists
  slice, so two repositories now write `session_setlist`. Standard 04 says a
  repository imports nothing from another slice; no reviewer bullet covers it and
  no lint rule reaches it. The alternative — a `detachEverySetlist` in the setlists
  slice that the sessions *service* calls — would cost the single transaction the
  delete now has, which is why I am not calling it a defect.
- `test-seed.service.ts` carries French fixture strings (`'Le Petit Bain'`,
  `'Set principal'`, the song notes). Every identifier is English; no reviewer
  bullet covers seed data.
- `SetlistEditor.tsx:118`, `:137`, `:144` and `:149` name their accumulators `out`.
  Advisory; the naming bullets reach verbs, booleans, comments and file names only.
