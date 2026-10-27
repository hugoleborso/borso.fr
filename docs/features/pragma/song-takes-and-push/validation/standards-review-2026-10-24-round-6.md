# Standards review, round 6 — claude/pragma-takes-and-push against origin/main

Verdict: FINDINGS
Ledger: 3843abb31417
Reviewed: 3 file(s). Sealed: 1. Findings: 2, on 2 unsealed file(s), both introduced by this branch.

Merge-base `abdee6af`, head `853537f9`. The review set is the 3 files `seal.ts verify` listed at the start of this round: `apps/pragma/VOCABULARY.md`, `apps/pragma/api/src/takes/takes.repository.ts` and `apps/pragma/api/src/takes/takes.service.ts`. Each was read in full. The seal is recorded under `standards-reviewer-6`. After sealing, `seal.ts verify` still fails, on `takes.repository.ts` and `takes.service.ts`.

Round 5's four findings are all closed:

- `takes.service.ts` take create: `recordTake` now reads the take back with the transaction's `executor` (`takes.service.ts:92`, `findWrittenTakeWithin`), and `createTake` answers from `recording.take` (line 128). The `findTake` read after the commit and its `song-not-found` fallback are gone.
- `takes.service.ts` comment create: `insertCommentWithin` reads the comment back through `selectComments(executor)` inside the transaction (`takes.repository.ts:174-184`), and `createTakeComment` answers `recording.comment` (line 200). `updateComment` now reads back inside its own transaction as well (`takes.repository.ts:186-200`).
- `VOCABULARY.md` *track*: lines 1302-1306 now say that **track** names a streaming-service entry in `deezerTrackId`, `spotifyTrackId` and the suggestion's `trackId`, and never a catalogue song or a take.
- `VOCABULARY.md` *Transition*: the clause about a bar status change is gone (lines 1201-1202).

## Findings

### apps/pragma/api/src/takes/takes.repository.ts:112

Bullet: "`reviewer` checks the half of the verb table the rule above cannot reach: that a `find…` actually returns `null` rather than throwing, that a `get…` throws, and that a `build…`, `project…` or `select…` returns what its verb says. Those are claims about behaviour, not about the shape of the annotation."

```ts
export async function findWrittenTakeWithin(
  executor: DatabaseExecutor,
  id: string,
): Promise<TakeView> {
  const take = await findTakeOn(executor, id);
  if (take === null) throw new Error('the written take is not visible to its own transaction');
  return take;
}
```

The verb table in `01-naming.md` says a `find…` returns the thing or `null`, and a `get…` returns the thing and throws when it is absent. This function returns `TakeView` and throws when the take is absent, so it is a `get…`. Rename it `getWrittenTakeWithin`. The call site is `takes.service.ts:17,92`.

Introduced: by this branch, in `d6fad810` (the round-5 fix).
Fix size: one rename, two files (`takes.repository.ts`, `takes.service.ts`), no callers outside the takes domain. The Take section of `VOCABULARY.md` names it at line 1036, so that line changes too.

### apps/pragma/api/src/takes/takes.repository.ts:160

Bullet: same as above.

```ts
async function findWrittenCommentWithin(
  executor: DatabaseExecutor,
  takeId: string,
  commentId: string,
): Promise<TakeCommentView> {
  const [comment] = await selectComments(executor)
    .where(and(eq(takeCommentTable.takeId, takeId), eq(takeCommentTable.id, commentId)))
    .limit(1);
  if (comment === undefined) {
    throw new Error('the written comment is not visible to its own transaction');
  }
  return comment;
}
```

This function has the same shape: it returns the comment and throws when the comment is absent. Rename it `getWrittenCommentWithin`. It is module-private, and its two callers are at lines 183 and 198 of the same file.

Introduced: by this branch, in `d6fad810`. It replaced `findComment`, which returned `null` correctly.
Fix size: one file, three lines.

`takes.service.ts` stays unsealed because it imports and calls `findWrittenTakeWithin` (lines 17 and 92). The first rename clears it, and no other finding applies to that file.

## Sealed

- apps/pragma/VOCABULARY.md — read in full. Every one of the 197 `Held by:` lines names a test file that exists and a test title found in that file (checked by script). Spot-checked against the code: the cited identifiers `mapNominatimToBarSearchHits`, `buildBarFormFromPlace`, `createCredentialForMember` (reached only from `__test/test-seed.service.ts` and `test/auth-utils.ts`), `summariseVotes`, `selectCompositions`, `renderOutreachMessage`, `readBusyIntervals`, `buildSearchWindows`, `selectFreeSlots`, `judgeFeedAddress`, `nextSessionEpoch`, `defaultPositionForFamily` and `unassignBarsOwnedByMember`, each in the file the text names; the song delete cascade (`songs.repository.ts:251-264`); the setlist append position (`setlists.service.ts:176`); the comment ordering (`takes.core.ts:28-36`); the 50 MiB take limit; and the routes that skip `requireMemberSession` (`app.ts:46-80`, `auth.controller.ts`, `audience.controller.ts:148-173`). The audit log's verdicts held on every sentence checked. (The seal note gives the track lines as 1310-1314. They are 1302-1306.)

## Unclear

- None.

## Outside the checklist

- `VOCABULARY.md:341`: "a **song note**" is bolded the way the file marks a defined term, but there is no `## Song note` section. The thing it means is the Song section's three note fields (line 932). This is not a false claim, so it is not a finding.
- `takes.service.ts:159` `getCommentsOfTake` answers a `take-not-found` outcome instead of throwing, and `getTakesOfSong` (line 135) returns a list. The verb table has no row for a function that returns an outcome union, and the same `get…` shape is used across pragma's services (`getBarById` and `getAppConfig` return `null`). This file was sealed in that form in earlier rounds, so it is not reported as a finding. Whether the verb table should cover outcome-returning service functions is a question for the standard.
