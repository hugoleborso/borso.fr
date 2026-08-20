# Standards review — claude/setlist-creation-bug-025jld against origin/main

Verdict: FINDINGS
Ledger: c9cc14decde4
Reviewed: 25 file(s). Sealed: 17. Findings: 10.

Merge base: `15824a34dd15f3be11bc9d652689c45cd9d00c0f`. Every file below was read
in full this session, not as a diff hunk.

## Findings

### apps/pragma/api/src/setlists/setlists.repository.ts:178

Bullet: "`reviewer` checks that a workflow writing more than one table wraps the
writes in one transaction owned by the service, and that a cascade DSQL will not
enforce is written out explicitly." (11. Database) — and the same claim in
04. Back end architecture.

```ts
export async function deleteSetlistWithEntries(setlistId: string): Promise<DeletionOutcome> {
  const database = getDatabase();
  await database.delete(setlistEntryTable).where(eq(setlistEntryTable.setlistId, setlistId));
  await database.delete(sessionSetlistTable).where(eq(sessionSetlistTable.setlistId, setlistId));
  const deleted = await database
```

Three tables are written on three separate statements with no transaction, so a
failure between them leaves entries deleted and the setlist present, or the
setlist gone and its `session_setlist` links dangling — the exact half-state DSQL
will not undo for you, because it enforces no foreign key. Standard 11 names the
shape from this same application:
`apps/pragma/api/src/members/members.repository.ts:100` opens
`database.transaction(async (transaction) => { … })` and passes the handle down.
Wrapping these three deletes the same way satisfies the bullet.

### apps/pragma/api/src/setlists/setlists.repository.ts:29

Bullet: "`reviewer` checks that a derived type is derived, so a row type comes
from `$inferSelect`, a request body from `z.infer`, and a response from the Hono
client, rather than being written out by hand beside the thing it mirrors."
(03. Typing)

```ts
export interface SetlistRow {
  id: string;
  name: string;
}
```

`setlistTable` declares exactly `id` and `name`, and `SETLIST_PROJECTION` selects
both, so `SetlistRow` is a hand-written copy of `typeof setlistTable.$inferSelect`
sitting eleven lines below the table it mirrors. It already drifted once in this
diff (`sessionId` became `name`), which is the drift the bullet exists to stop.
`SetlistEntryRawRow` (line 57) mirrors `setlistEntryTable` the same way.
`type EntryInsertEncoded = typeof setlistEntryTable.$inferInsert` on line 108
shows the derivation is available in this very file. `SetlistEntryRow` and
`EntryInsertShape` are legitimately hand-written, because they carry the decoded
lineup rather than the stored TEXT.

### apps/pragma/api/src/setlists/setlists.repository.ts:209

Bullet: "`reviewer` checks the half of the verb table the rule above cannot
reach: that a `find…` actually returns `null` rather than throwing […]"
(01. Naming)

```ts
export async function findNextLinkPosition(sessionId: string): Promise<number> {
```

`find…` promises "the thing, or `null` when it is absent", and this function has
no absent case: it always returns a number a rule chose. The pure function it
delegates to is already named `selectNextLinkPosition`, which is the verb the
table gives for "what a rule chooses", so `selectNextLinkPosition` /
`selectNextLinkPositionOf(sessionId)` would keep the promise the name makes.

### apps/pragma/api/src/sessions/sessions.repository.ts:124

Bullet: "`reviewer` checks that a workflow writing more than one table wraps the
writes in one transaction owned by the service […]" (11. Database)

```ts
export async function deleteSessionWithCascade(id: string): Promise<DeletionOutcome> {
  const database = getDatabase();
  await database.delete(sessionSetlistTable).where(eq(sessionSetlistTable.sessionId, id));
```

This diff shrank the cascade from three tables to two, but the two writes are
still unwrapped: a failure after the first leaves the session alive with none of
its setlists attached, silently detaching sets the band still expects to see. One
`database.transaction` around both, as `members.repository.ts` does, satisfies it.

`SessionRawRow` (line 31) is the same hand-written row type as the finding above:
it mirrors all eight columns of `sessionTable` and should come from
`typeof sessionTable.$inferSelect`.

### apps/pragma/api/src/setlists/setlists.service.ts:74

Bullet: "`reviewer` checks that a multi-table write is wrapped in one transaction
owned by the service." (04. Back end architecture)

```ts
  const setlist = await insertSetlist(input.name);
  if (input.sessionId !== null) {
    await attachToSession(setlist.id, input.sessionId);
  }
```

`insertSetlist` writes `setlist_sheet` and `attachToSession` writes
`session_setlist`, so one create spans two tables across two repository calls
with nothing joining them. The JSDoc above claims "a missing session is refused
before the setlist is written so no half-linked row survives", which holds for
the session that vanished and not for the link that failed: the setlist stays,
unattached, on the page the caller is navigating away from. Standard 11 gives the
shape for this exact case — the repository exports a
`runInOneTransaction(work)` and the service composes both writes inside it, so
the transaction is owned by the service without the service importing the client.

### apps/pragma/api/src/setlists/setlists.service.ts:64

Bullet: "`reviewer` checks the half of the verb table the rule above cannot
reach: that a `find…` actually returns `null` rather than throwing, that a
`get…` throws […]" (01. Naming)

```ts
export async function getSetlist(setlistId: string): Promise<SetlistRow | null> {
  return await findSetlistById(setlistId);
}
```

`get…` promises the thing and a throw when it is absent; this one returns `null`,
and the controller then branches on it. The verb for that contract is `find…`, so
`findSetlist` — which also matches the repository function it forwards to —
keeps the table's promise.

### apps/pragma/site/src/lib/queries/setlists.utils.ts:4

Bullet: "`reviewer` checks that a comment documents something the code cannot
say, and is not a restatement, a history note, or a description of what the code
does not do." (01. Naming)

```ts
 * Each mutation in `setlists.ts` snapshots the current `{ entries }`
```

There is no `setlists.ts` in `site/src/lib/queries/`, and there was none at the
merge base either — the entry mutations live in `setlist-entries.queries.ts` and
the setlist mutations in `setlists.queries.ts`. A header that sends a reader to a
file that does not exist documents nothing; naming the two real modules fixes it.

### apps/pragma/site/src/components/organisms/SetlistEditor.tsx:2

Bullet: "`reviewer` checks that a comment documents something the code cannot
say, and is not a restatement, a history note […]" (01. Naming)

```tsx
 * Setlist editor. Embedded inside the concert session detail page.
```

After this branch the editor is mounted only by
`routes/setlists/SetlistEditorPage.tsx:153`, at `/setlists/:setlistId`;
`SessionDetailPage` no longer renders it, and the whole point of the change is
that a setlist is not owned by one session. The sentence now tells a reader the
opposite of where the component lives.

### apps/pragma/site/src/routes/sessions/SessionDetailPage.tsx:8

Bullet: "`reviewer` checks that a comment documents something the code cannot
say, and is not a restatement […]" (01. Naming)

```tsx
 * Reads via useSession, useMembersList, useSessionsList,
 * useSetlistBySession. Writes via useUpdateSession + useCreateSetlist.
```

Two problems in one sentence. It restates the import list, which the reader can
see eighteen lines below; and it is wrong — the hook is `useSetlistsBySession`,
the page no longer calls `useCreateSetlist` (the dialog owns that write), and it
does call `useUnlinkSetlistFromSession`, which the sentence never mentions. A
header that enumerates hooks will always drift; the first paragraph already says
what the page is for.

The same file also owns a screen region the bullet below is about: lines 153-189
are a `<header>` built from raw `div`/`span` with display typography and metadata
separators, and lines 236-271 are the setlists list plus its action pair. The
`@Blueprint route-detail-page` block on line 47 claims "everything after the
early returns is a read organism taking plain props, so the page stays a thin
orchestrator", which this markup contradicts — and because this file *is* the
blueprint, the claim propagates to every follower.

### apps/pragma/site/src/routes/setlists/SetlistEditorPage.tsx:109

Bullet: "`reviewer` checks that a route composes organisms and owns no layout
primitive, because the atomic rules read the bucket out of the path and a route
is in no bucket." (05. Front end architecture)

```tsx
      <div className="flex flex-wrap items-center gap-2 mb-4">
        {draftName === null ? (
          <Button variant="default" onClick={() => setDraftName(setlist.name)}>
```

The route owns a control cluster — an `Input`, three `Button`s, the `draftName`
flow state and the save handler — inside its own flex wrapper. That is a
molecule or a small organism (`SetlistNameEditor`) rendered from `routes/`, where
no atomic rule can see it; `no-components-outside-buckets` only catches a named
component, not markup inlined into the page. The file also carries
`// @FollowsBlueprint route-detail-page`, whose description promises a thin
orchestrator over query hooks.

### apps/pragma/site/src/routes/setlists/SetlistsPage.tsx:85

Bullet: "`reviewer` checks that a route composes organisms and owns no layout
primitive […]" (05. Front end architecture)

```tsx
      <ul className="flex flex-col gap-2">
        {rows.map((row) => (
          <li key={row.id}>
            <SetlistSummaryRow
```

The page builds the list itself out of molecules rather than handing it to a list
organism, and it carries `// @FollowsBlueprint route-list-page`, whose
description reads "the markup below is one list organism, so the page holds no
layout primitive of its own". `CatalogPage`, the blueprint it names, delegates to
`CatalogGrid`; a `SetlistIndexList` organism taking `rows` would make the claim
true and would take `describeSessions` (line 53) with it.

## Sealed

- `apps/pragma/api/src/setlists/setlists.controller.ts` — thirteen handlers, each
  validate / call one service function / shape the response; the only branches
  are absent-resource mappings to 404 / 400 / 409, which 02 exempts.
- `apps/pragma/api/src/setlists/setlists.core.ts` — pure, no clock, three
  functions whose names say their result; `tallySongsPerSetlist` keeps the empty
  setlist at zero, which is what the callers need.
- `apps/pragma/api/src/setlists/setlists.schema.ts` — types come from the tables
  and the Zod objects; the `lineup_override` TEXT note and the
  `setlist_sheet`-versus-`setlist` note both record DSQL constraints a reader
  would otherwise read as a bug. Judgement recorded: the last clause of that
  header is close to a history note, and it is kept because the physical name
  mismatch is live and unexplainable from the code.
- `apps/pragma/api/src/database/schema.ts`, `…/__test/test-seed.repository.ts`,
  `apps/pragma/test/database-utils.ts`, `apps/pragma/test/setup-postgres.ts` —
  each picks up `session_setlist` and `setlist_sheet` consistently, so the
  truncate list, the drop list and the drizzle-kit barrel all know the new tables.
- `apps/pragma/api/src/__test/test-seed.service.ts` — every write still goes
  through the owning slice's service, and the create now names the setlist.
- `apps/pragma/site/src/lib/queries/setlists.queries.ts` — every write
  reconciles from its own response; no `invalidateQueries` after a write whose
  result the response carries, which is the DSQL read-after-write bullet in 06.
- `apps/pragma/site/src/lib/queries/setlist-entries.queries.ts` — optimistic
  `onMutate` / rollback / drained `onSettled` on three mutations, and the reorder
  deliberately has none. The comment explaining that absence is kept: it names a
  DSQL property, and a reader who removed it would reintroduce the reverting
  refetch the dantotsu records.
- `apps/pragma/site/src/components/organisms/CreateSetlistDialog.tsx` — goes
  through `useForm` with the Zod validator, not a `useState` chain (bullet 06).
- `apps/pragma/site/src/components/organisms/AttachSetlistDialog.tsx` — the
  candidate list comes from a pure `selectSetlistsNotOnSession`; one boolean of
  interface state, no variant family.
- `apps/pragma/site/src/components/molecules/SetlistSummaryRow.tsx` — a molecule
  over `Icon` and `Link`, taking its trailing action as a `ReactNode` so the index
  and the session page share it instead of forking.
- `apps/pragma/site/src/routes/setlists/setlist-index.core.ts`,
  `…/lib/setlist-name.utils.ts` — pure, and the core/utils split matches 02: the
  index ordering is a rule the band would recognise, the display-name fallback is
  a cross-cutting helper.
- `apps/pragma/site/src/routes/setlists/SessionSetlistRedirectPage.tsx` — a route
  that owns only routing: parameter, one query, three redirects.
- `apps/pragma/site/src/App.tsx` — two route lines added; the comment about the
  scene route sitting outside `AppShell` names a structural decision the tree
  cannot state.

The 375-pixel bullet is met on the screens this change adds: the committed phone
captures under
`docs/features/pragma/setlists-across-sessions/validation/screenshots-2026-08-19/`
show the index and the two-setlist session page holding at phone width, with the
action bar clear of the tab bar.

## Unclear

None.

## Outside the checklist

- `apps/pragma/api/src/__test/test-seed.service.ts:43` adds
  `const SEED_SETLIST_NAME = 'Set principal';`, one more French user-facing string
  in a fixture full of them. Standard 01 puts user-visible text in `i18n`, but no
  reviewer bullet covers seed data, and the identifiers are English.
- `apps/pragma/api/src/sessions/sessions.repository.ts:16` imports
  `sessionSetlistTable` from the setlists slice, so two repositories now write
  `session_setlist`. Standard 04 says a repository imports nothing from another
  slice; no reviewer bullet covers it and no lint rule reaches it. Worth noting
  because the transaction fix above is the natural moment to move the detach
  behind a setlists-owned function.
- `apps/pragma/site/src/components/organisms/SetlistEditor.tsx:118` and three
  more `useMemo` bodies name their accumulator `out`, which says how the value was
  produced rather than what it holds. Advisory; the naming bullets in the ledger
  cover verbs, booleans, comments and file names only.
- `countEntriesBySetlist` and `findNextLinkPosition` shape their return through a
  `.core.ts` function inside the repository. I read that as within the repo's
  settled practice rather than a projecting repository, because
  `selectDeletionOutcome` does the same in all eight repositories here.
