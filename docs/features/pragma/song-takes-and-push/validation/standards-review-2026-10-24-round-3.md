# Standards review, round 3 — claude/pragma-takes-and-push against origin/main

Verdict: FINDINGS
Ledger: 3843abb31417
Reviewed: 13 file(s). Sealed: 9. Findings: 4, on 4 unsealed file(s) (none introduced by this branch).

Merge-base `abdee6af`, head `1d0f9d0f`. The review set is the 13 files `seal.ts verify` listed after the round-2 seals. Each file was read in full. Seals are recorded under `standards-reviewer-3`.

Round 2's findings are all closed:

- `TakeUploadForm.tsx:188-195` selects `state.values.file !== null` as `hasFile` and disables on `!hasFile`.
- `VOCABULARY.md` *Deezer track* now says one track belongs to at most one song, names the 409 `deezer-track-taken`, and carries both `Held by:` lines.
- `VOCABULARY.md` *Audience suggestion* names the Deezer `trackId` and `resolveCatalogueSongForTrack`, which matches `audience.schema.ts:54-56` and `songs.service.ts:214-221`.
- `VOCABULARY.md` *Setlist* lists `id`, `name`, `kind`, `status` and `targetSongCount`, which matches `SETLIST_PROJECTION`.
- Setlist attach race: every attach now runs `attachToSessionWithin` (`setlists.service.ts:103-110`), which claims the session row with `claimSessionWithin` before `insertSessionLinkAtEndWithin` reads `max(position)`, inside `runInOneSetlistTransaction`. All three callers (`createSetlist`, `findOrCreateAudienceChoiceSetlist`, `linkSetlistToSession`) go through it. *Session setlist link* carries a `Held by:` line, and the test exists at `setlists.controller.test.ts:363`.
- `audience.repository.ts:10-18` derives all five types from the three tables.
- `setlist-entry.repository.ts:13-19` derives `SetlistEntryRow` and `EntryInsertShape` from `$inferSelect`.
- `members.queries.ts:27-32` derives the create and update bodies from the Hono client.
- From *Outside the checklist*: `getMemberById` is gone (`members.service.ts:17` re-exports `findMemberById`), `orderCommentsByTime` now follows `core-decision`, and the two failure-message tables are one (`TAKE_NOT_SAVED_MESSAGE_KEY`).

The four findings below are on files these fixes put in front of a reviewer. Rounds 1 and 2 did not report any of them.

## Findings

### apps/pragma/api/src/members/members.service.ts:24

Bullet: "`reviewer` checks that a derived type is derived, so a row type comes from `$inferSelect`, a request body from `z.infer`, and a response from the Hono client, rather than being written out by hand beside the thing it mirrors."

```ts
export interface MemberContactInput {
  phone?: string | null;
  email?: string | null;
}

export async function createMember(
  input: {
    firstName: string;
    color?: string;
    avatarS3Key?: string | null;
  } & MemberContactInput,
...
export async function patchMember(
  id: string,
  input: { firstName?: string; color?: string; avatarS3Key?: string | null } & MemberContactInput,
```

These are the parsed `POST` and `PUT` bodies, `createMemberSchema` and `updateMemberSchema` (`members.schema.ts:46-60`), written out by hand. `MemberContactInput` mirrors `memberContactSchema`. Use `z.infer<typeof createMemberSchema>` and `z.infer<typeof updateMemberSchema>`, the way `sessions.service.ts:25-26` and `tasks.service.ts:19-20` do.

Introduced: pre-existing. The branch's diff on this file replaces `getMemberById` with a re-export of `findMemberById` (line 17).
Fix size: one file, three types. The controller already passes the parsed body, so no caller changes.

### apps/pragma/site/src/lib/queries/members.queries.ts:12

Bullet: same as above.

```ts
export interface MemberInstrumentAssignment {
  readonly memberId: string;
  readonly instrumentIds: string[];
  readonly primaryInstrumentIds?: string[];
}
```

This is the `PUT /api/members/:id/instruments` body plus the id, written by hand. It is the same shape round 2 reported at lines 65 and 113 of this file, and round 2 missed it. Use `{ memberId: string } & Parameters<(typeof api.api.members)[':id']['instruments']['$put']>[0]['json']`.

Introduced: pre-existing. Present at `abdee6af`. The branch's diff on this file exports `ListedMember` and derives the create and update bodies.
Fix size: one file, one type. Only `useAssignMemberInstruments` in this file uses it.

### apps/pragma/api/src/setlists/setlists.service.ts:116

Bullet: "`reviewer` checks that a rule about rows another request can write, or state another process holds, is held by a primary key or a single conditional write rather than by a check over rows read earlier."

```ts
  if (input.sessionId !== null) {
    const session = await findSessionById(input.sessionId);
    if (session === null) return { kind: 'session-not-found' };
  }
  const { sessionId } = input;
  const setlist = await runInOneSetlistTransaction(async (executor) => {
    const created = await insertSetlistWithin(executor, input.name, DEFAULT_SETLIST_KIND);
    if (sessionId !== null) await attachToSessionWithin(executor, sessionId, created.id);
```

`linkSetlistToSession` (lines 193-200) has the same shape. The rule "a setlist joins only a session that exists" is decided by a read taken before the transaction. A session deleted between that read and the attach leaves a `session_setlist` row naming a session that is gone, because `claimSessionWithin` (`sessions.repository.ts:97-105`) updates zero rows without telling anyone. DSQL has no foreign key to refuse the link. The claim this branch added already writes the session row, so it can carry the check: have `claimSessionWithin` return whether a row came back (`.returning({ id: sessionTable.id })`), and have `attachToSessionWithin` refuse inside the transaction when it did not, so the setlist insert rolls back too.

Introduced: pre-existing. At `abdee6af`, `createSetlist` and `linkSetlistToSession` read the session with `getSessionById` and then wrote. This branch added the claim on the same row, which makes the fix small.
Fix size: two files (`sessions.repository.ts`, `setlists.service.ts`) plus one controller test. `findOrCreateAudienceChoiceSetlist` is reached only after `openRound` has read the concert.

### apps/pragma/api/src/tasks/tasks.service.ts:52

Bullet: same as above.

```ts
async function isAssigneeKnown(assigneeId: string | null | undefined): Promise<boolean> {
  if (assigneeId === null || assigneeId === undefined) return true;
  return (await findMemberById(assigneeId)) !== null;
}
...
  if (!(await isAssigneeKnown(input.assigneeId))) return { kind: 'assignee-not-found' };
  if (!(await isLinkedSongKnown(input.songId))) return { kind: 'song-not-found' };
  return { kind: 'ok', task: await insertTask(valuesFromCreate(input)) };
```

`createTask` and `patchTask` check that the member and the song exist, then write in a separate statement. A member or song deleted in between leaves the task pointing at it, and the delete's own cleanup (`unassignTasksOfMemberBeingDeleted`, `detachTasksOfSongBeingDeleted`) has already run. *Task* in `VOCABULARY.md` records this as the design ("The service checks the member and the song exist before the write"), so the operator may decide it is accepted. If not, the fix is to claim the member and song rows in the same transaction as the insert, as `claimSessionWithin` does for sessions.

Introduced: pre-existing. The branch's diff on this file renames `getMemberById` to `findMemberById` (lines 3 and 54).
Fix size: about four files: a claim in `members.repository.ts` and `songs.repository.ts`, a transaction in `tasks.service.ts` and `tasks.repository.ts`, plus a concurrency test. That is its own change rather than this branch's.

## Sealed

- apps/pragma/VOCABULARY.md — *Audience suggestion*, *Deezer track*, *Setlist* and *Session setlist link* checked against `audience.schema.ts`, `songs.service.ts`, `setlists.repository.ts` and the tests the `Held by:` lines name.
- apps/pragma/api/src/audience/audience.repository.ts — every row and insert type comes from `$inferSelect` or `$inferInsert`.
- apps/pragma/api/src/sessions/sessions.repository.ts — `claimSessionWithin` has the same shape as `claimSetlistWithin`. See the `setlists.service.ts` finding for the return value it could carry.
- apps/pragma/api/src/sessions/sessions.service.ts
- apps/pragma/api/src/setlists/setlist-entry.repository.ts — `SetlistEntryRow` is `$inferSelect` with `lineupOverride` decoded.
- apps/pragma/api/src/setlists/setlists.repository.ts — `insertSessionLinkAtEndWithin` reads `max(position)` only after its caller claims the session row.
- apps/pragma/api/src/takes/takes.core.ts — `orderCommentsByTime` follows `core-decision`.
- apps/pragma/site/src/components/organisms/TakeUploadForm.tsx — `hasFile`.
- apps/pragma/site/src/components/organisms/recording-sheet.core.ts — `TAKE_NOT_SAVED_MESSAGE_KEY` is the single reason-to-message table.

## Unclear

- None.

## Outside the checklist

- `setlist-entry.repository.ts:181-190` `countEntriesWithin` selects every id of the setlist and returns `rows.length`, where `count()` would return the number from SQL. The claim before it makes the result correct, so this is not a finding.
- `members.queries.ts:27-29` adds `& { color: string }` to the derived create body, which makes `color` required on the site while the API accepts it as optional. That looks deliberate (the optimistic row needs a colour) and is not a hand-written mirror.
