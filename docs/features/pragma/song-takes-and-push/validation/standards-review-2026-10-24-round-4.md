# Standards review, round 4 — claude/pragma-takes-and-push against origin/main

Verdict: FINDINGS
Ledger: 3843abb31417
Reviewed: 32 file(s). Sealed: 25. Findings: 5, on 7 unsealed file(s) (one introduced by this branch, four pre-existing).

Merge-base `abdee6af`, head `d7f1235b`. The review set is the 32 files `seal.ts verify` listed at the start of this round. Each file was read in full. Seals are recorded under `standards-reviewer-4`. After sealing, `seal.ts verify` still fails, on the 7 files below.

Round 3's four findings are all closed:

- `members.service.ts:20-21` derives `MemberCreateInput` and `MemberUpdateInput` with `z.infer` from `createMemberSchema` and `updateMemberSchema`. `MemberContactInput` is gone.
- `members.queries.ts:27-29` derives `MemberInstrumentAssignment` from the Hono client's `$put` body.
- Setlist attach: `didClaimSessionWithin` (`sessions.repository.ts:104-114`) returns whether a row came back. `attachToSessionWithin` (`setlists.service.ts:103-113`) refuses before writing the setlist when the claim finds nothing, so the insert rolls back with it. `linkSetlistToSession` (`setlists.service.ts:193-209`) claims the setlist and then the session inside the transaction. The read taken before the transaction is gone.
- Tasks: `createTask` and `patchTask` (`tasks.service.ts:72-92`) claim the member and the song in the same `runInOneTaskTransaction` as the write, through `findLinkRefusalWithin`. *Task* in `VOCABULARY.md` now describes this and names three tests, which exist.

## Findings

### apps/pragma/api/src/takes/takes.service.ts:166

Bullet: "`reviewer` checks that a rule about rows another request can write, or state another process holds, is held by a primary key or a single conditional write rather than by a check over rows read earlier."

```ts
  const take = await findTake(takeId);
  if (take === null) return { kind: 'take-not-found' };
  if (!isMomentWithinTake(input.atSeconds, take.durationSeconds)) {
    return { kind: 'moment-past-end' };
  }
  const comment = await insertComment({
```

The rule "a comment belongs to a take that exists" (*Take comment*: "Deleted with its take") is decided by a read taken before the insert, which is a separate statement. A take deleted between the two (`deleteTakeWithComments`, `takes.repository.ts:114-122`, which deletes the comments and then the take) leaves a `take_comment` row naming a take that is gone. DSQL has no foreign key to refuse it. This is the same shape commit `1745ed74` fixed for takes, tasks, studies and setlists ("claim each row a write names"), and the comment write is the one it missed. Fix: add a `didClaimTakeWithin` claim, run the insert in `runInOneTakeTransaction` after it, have `deleteTakeWithComments` delete the take row first and run through `retryingConflictAborts`, and add a concurrency test plus a `Held by:` line on *Take comment*.

Introduced: by this branch. The takes domain does not exist at `abdee6af`.
Fix size: two files (`takes.service.ts`, `takes.repository.ts`), plus one controller test and one `VOCABULARY.md` line.

### apps/pragma/api/src/instruments/instruments.service.ts:53

Bullet: same as above.

```ts
  const existing = await listInstrumentsWithPlayers();
  if (instrumentIds.length !== existing.length) return { kind: 'stale' };
  const existingIds = new Set(existing.map((row) => row.id));
  for (const instrumentId of instrumentIds) {
    if (!existingIds.has(instrumentId)) return { kind: 'stale' };
  }
  for (let position = 0; position < instrumentIds.length; position += 1) {
```

`reorderInstruments` checks the submitted ids against a list read earlier, then writes each position in its own statement, outside any transaction. An instrument created or deleted after the read is either left out of the order or makes the check wrong, and two reorders at the same moment can interleave their position writes. The setlist reorder (`setlists.service.ts:307-324`) is the shape to copy: one retried transaction that claims a row, re-reads the ids inside it, and writes all positions there.

Introduced: pre-existing. Present at `abdee6af`. The branch's diff on this file replaces `isKnownInstrument` with a re-export of `didClaimInstrumentsWithin` and renames the delete.
Fix size: two files (`instruments.service.ts`, `instruments.repository.ts`), plus a concurrency test. Its own change rather than this branch's.

### apps/pragma/api/src/instruments/instruments.repository.ts:29

Bullet: "`reviewer` checks that a derived type is derived, so a row type comes from `$inferSelect`, a request body from `z.infer`, and a response from the Hono client, rather than being written out by hand beside the thing it mirrors."

```ts
interface InstrumentRawRow {
  id: string;
  name: string;
  isHarmonic: boolean;
  family: string | null;
  icon: string | null;
  position: number | null;
}
```

This is `typeof instrumentTable.$inferSelect`, written by hand. The same file and its service also write out the request bodies: `insertInstrument(input: { name; family; icon?; position? })` (line 88), `InstrumentUpdates` (line 108) and `createInstrument(input: {...})` (`instruments.service.ts:22`) mirror `createInstrumentSchema` and `updateInstrumentSchema` (`instruments.schema.ts:25-37`). Use `typeof instrumentTable.$inferSelect` for the raw row and `z.infer<typeof createInstrumentSchema>` / `z.infer<typeof updateInstrumentSchema>` for the inputs, the way `members.service.ts:20-21` now does.

Introduced: pre-existing. Present at `abdee6af`. The branch's diff on this file adds `didClaimInstrumentsWithin` and `deleteInstrumentWithLinks`.
Fix size: two files, four types. The controller already passes the parsed body, so no caller changes.

### apps/pragma/api/src/setlists/setlists.repository.ts:158

Bullet: same as above.

```ts
export interface SetlistSessionLink {
  setlistId: string;
  sessionId: string;
}
```

This is two columns of `sessionSetlistTable.$inferSelect`, written by hand. `listEntryOwners` in `setlist-entry.repository.ts:79-81` has the same shape inline, `Promise<{ setlistId: string }[]>` mirroring `setlistEntryTable.setlistId`. Use `Pick<typeof sessionSetlistTable.$inferSelect, 'setlistId' | 'sessionId'>` and `Pick<typeof setlistEntryTable.$inferSelect, 'setlistId'>`.

Introduced: pre-existing. Both are present at `abdee6af`. Round 3 sealed both files without reporting them. The branch's diff on these files moves the retry into `conflict-abort.core.ts`, makes the setlist claim return a boolean, and threads an executor into `listEntriesOfSongWithin`.
Fix size: two files, one line each. No caller changes.

### apps/pragma/VOCABULARY.md:1080

Bullet: "`reviewer` checks that a definition in a `VOCABULARY.md` is still true, which is prose against code and therefore nothing a rule can do."

```markdown
- **role**, **part**, **station**: what a member holds on a song is an
  **instrument**, and the whole map is a **lineup**. The word *station*
  survives in one comment in `members.schema.ts` and should not spread.
```

`members.schema.ts` has no comment, and `grep -i station apps/pragma/api/src/members/` finds nothing, so the sentence about where *station* survives is false. In the same list, line 1069 names **ballot** as a word not to use for setlist votes, while `## Ballot` (line 70) is a defined term the audience domain uses in `ballot_token`, `mintBallotToken` and `BALLOT_TOKEN_BYTES`. A reader asked not to write *ballot* has to work out that the ban is about setlist votes only. Fix: drop the *station* sentence's last clause, and drop **ballot** from line 1069 or say it is reserved for the audience's browser token.

Introduced: pre-existing. Both lines are present at `abdee6af`, from `001bb1d2`. This branch's diff on the file adds entries and `Held by:` lines elsewhere.
Fix size: one file, two prose edits.

## Sealed

- apps/pragma/api/src/audience/audience.service.ts — `openRound` and `settleIfDue` refuse or write nothing when `didClaimSetlistWithin` finds no row, which matches *Voting round*.
- apps/pragma/api/src/database/schema.ts
- apps/pragma/api/src/helpers/persistence/conflict-abort.core.ts — `retryingConflictAborts` is the one bounded retry the repositories share.
- apps/pragma/api/src/members/members.repository.ts — `replaceMemberInstruments` claims the instruments, then the member, inside one retried transaction. `deleteMemberWithLinks` deletes the row first.
- apps/pragma/api/src/members/members.service.ts — round 3 finding closed.
- apps/pragma/api/src/notifications/notifications.controller.ts
- apps/pragma/api/src/notifications/notifications.repository.ts — `VapidKeyPairRow` derives from `$inferSelect`. The insert is `ON CONFLICT DO NOTHING` under the fixed id.
- apps/pragma/api/src/notifications/notifications.schema.ts
- apps/pragma/api/src/notifications/notifications.service.ts — `readVapidKeys` inserts unless present and reads back what was stored, as *VAPID key pair* says.
- apps/pragma/api/src/notifications/web-push.adapter.ts
- apps/pragma/api/src/sessions/sessions.repository.ts
- apps/pragma/api/src/sessions/sessions.service.ts
- apps/pragma/api/src/setlists/setlists.controller.ts — append and reorder now answer 404 on a missing setlist.
- apps/pragma/api/src/setlists/setlists.service.ts — round 3 finding closed.
- apps/pragma/api/src/songs/songs.repository.ts — `SongRow` is `$inferSelect` with the decoded columns overridden.
- apps/pragma/api/src/songs/songs.service.ts
- apps/pragma/api/src/studies/studies.repository.ts
- apps/pragma/api/src/studies/studies.service.ts — `recordStudy` claims the song and the instrument, reads the lineups and inserts in one retried transaction.
- apps/pragma/api/src/tasks/tasks.controller.ts
- apps/pragma/api/src/tasks/tasks.repository.ts
- apps/pragma/api/src/tasks/tasks.service.ts — round 3 finding closed.
- apps/pragma/cdk/lib/stack.ts — `vapid_key_pair` is in the preview clone's `tableBlocklist`.
- apps/pragma/site/src/components/organisms/NotificationSettings.tsx
- apps/pragma/site/src/components/organisms/notifications-offer.core.ts
- apps/pragma/site/src/lib/queries/members.queries.ts — round 3 finding closed.

## Unclear

- None.

## Outside the checklist

- `studies.service.ts:82-97`, `notifications.service.ts:64-76` and `savePreference` write rows naming the acting member without claiming the member row. A member deleted while their own request is in flight could leave a study, a subscription or a preference behind. The actor is the signed-in member, and no write anywhere claims its actor, so this is not reported as a finding. Note that a leftover `push_subscription` would keep pushing to a former member's device.
- *Song* (`VOCABULARY.md:780`) says "Deleting a song first deletes its mastery overrides …". `deleteSongWithCascade` now deletes the song row first. The "first" reads as "before the audio", so it is not a finding, but it could be reworded.
- `tasks.service.ts:41` names the accumulator `out`.
