# Standards review, round 5 — claude/pragma-takes-and-push against origin/main

Verdict: FINDINGS
Ledger: 3843abb31417
Reviewed: 10 file(s). Sealed: 8. Findings: 4, on 2 unsealed file(s) (two introduced by this branch, two pre-existing).

Merge-base `abdee6af`, head `b1f2b2c5`. The review set is the 10 files `seal.ts verify` listed at the start of this round. Each was read in full. Seals are recorded under `standards-reviewer-5`. After sealing, `seal.ts verify` still fails, on `apps/pragma/VOCABULARY.md` and `apps/pragma/api/src/takes/takes.service.ts`.

Round 4's five findings are all closed:

- Take comment: `recordComment` (`takes.service.ts:169-189`) claims the take with `findClaimedTakeWithin`, checks the moment and inserts in one `runInOneTakeTransaction`. `deleteTakeWithComments` (`takes.repository.ts:132-141`) deletes the take row first, inside the retried transaction. *Take comment* in `VOCABULARY.md` carries the matching `Held by:` lines, and the four new test names exist in `takes.controller.test.ts`.
- Instrument reorder: `reorderInstruments` (`instruments.service.ts:57-75`) claims the named instruments, reads the ids again and writes every position in one `runInOneInstrumentTransaction`. A concurrently created instrument is not covered by the claim, and *Instrument* says so: "one created at the same moment keeps the position it was created with."
- `instruments.repository.ts:22,35,37`: `InstrumentRawRow` is `typeof instrumentTable.$inferSelect`, and the two inputs are `z.infer` of `createInstrumentSchema` and `updateInstrumentSchema`.
- `setlists.repository.ts:158-161` and `setlist-entry.repository.ts:79`: both are `Pick<… $inferSelect, …>`.
- `VOCABULARY.md`: the *station* clause is gone, and **ballot** is now reserved for the audience's browser token.

## Findings

### apps/pragma/api/src/takes/takes.service.ts:127

Bullet: "`reviewer` checks that a rule about rows another request can write, or state another process holds, is held by a primary key or a single conditional write rather than by a check over rows read earlier. It is the scale pass of `/technical-validation`."

```ts
  const recording = await recordTake(input, command);
  if (recording.kind !== 'recorded') return recording;
  const take = await findTake(input.id);
  if (take === null) return { kind: 'song-not-found' };
```

This is the case the fixer left, and it is a finding. After the transaction commits, the answer comes from a separate read, `findTake` on `getDatabase()`. That is a postgres.js pool, so the read can run on a different connection. Two things can make it return null:

- another request deleted the take in between, or
- the read saw the snapshot from before the commit. This repository has recorded that DSQL's read-after-write lags across connections (`docs/dantotsus/optimistic-reorder-reverted-by-stale-dsql-read.md`, root-cause step 3).

Either way the API answers 404 `song-not-found` for a song that the transaction has just claimed and that may still exist. The device then gives up on the take: `decideAfterTakeFailure` returns `give-up` for `{ stage: 'create', status: 404 }` (`take-queue.core.test.ts:108`). So a take that was stored is reported to the recorder as refused.

Fix: read the take inside `recordTake` with the same `executor`, after `hasInsertedTakeWithin`. For example, give `findTake` an executor argument the way `findClaimedTakeWithin` has one, and return the view in `{ kind: 'recorded', take, isNewTake }`. The answer then describes what this transaction committed. `findTake` can no longer return null there, so the `song-not-found` fallback goes away. A take deleted after the commit is then answered 201, which is true at commit time and is the same answer an idempotent retry already gets.

Introduced: by this branch. The takes domain does not exist at `abdee6af`.
Fix size: two files (`takes.service.ts`, plus an executor parameter on `findTake` in `takes.repository.ts`). No caller changes outside the takes domain.

### apps/pragma/api/src/takes/takes.service.ts:198

Bullet: same as above.

```ts
  const recording = await recordComment(takeId, input, command);
  if (recording.kind !== 'recorded') return recording;
  const comment = await findComment(takeId, recording.commentId);
  if (comment === null) return { kind: 'take-not-found' };
```

The comment write has the same shape. Round 4's fix introduced it: the comment is inserted inside the transaction, but the answer comes from `findComment` on another pooled connection after the commit. When that read returns null, the API answers 404 `take-not-found`, even though the transaction has just claimed the take and written the comment. Fix: read the comment back with `executor` inside `recordComment`, for example with `insertCommentWithin` returning the projected row through `selectComments(executor)`, and return it in `recorded`.

Introduced: by this branch, in `5739fc47`. Before that commit `insertComment` returned the row itself.
Fix size: the same two files as the finding above.

### apps/pragma/VOCABULARY.md:1085

Bullet: "`reviewer` checks that a definition in a `VOCABULARY.md` is still true, which is prose against code and therefore nothing a rule can do."

```markdown
- **tune**, **number**: the catalogue holds **songs**. **track** is
  Deezer's word for what it returns and appears only as `deezerTrackId`
  and inside `deezer.core.ts`.
```

This is false. `spotifyTrackId` is a column and a field (51 occurrences across `api/src`, `site/src` and `domain`, outside tests), and the same file defines it as a term under `## Spotify track` (line 560). Suggestions also take a `trackId` (`suggestionCreateSchema`, line 22–23 of this file). Fix: say that *track* names a streaming service's recording and appears in `deezerTrackId`, `spotifyTrackId` and the suggestion's `trackId`, and never names a catalogue song.

Introduced: pre-existing. The sentence is at `abdee6af` (line 863 there), and `spotifyTrackId` is already in `songs.schema.ts` at `abdee6af`. This branch's diff on the file is the `Held by:` lines and the round-4 corrections elsewhere.
Fix size: one file, one sentence.

### apps/pragma/VOCABULARY.md:1012

Bullet: same as above.

```markdown
Not to be confused with: a transition comment, which is what the band
wrote about that gap, and with a bar moving from one status to the next,
which the routes comment also calls a transition.
```

No routes comment calls a bar status change a transition, and none could: `borso/no-comments` forbids comments in source. `grep -rni transition site/src/routes/bars api/src/bars` finds only the Tailwind class `transition-colors` (`BarsPage.tsx:242,252`). Fix: drop the clause about bars, or replace it with the identifier that actually names a bar status change, if there is one.

Introduced: pre-existing. The sentence is at `abdee6af` (line 799 there).
Fix size: one file, one clause.

## Sealed

- apps/pragma/api/src/helpers/ordering/reorder.core.ts — `isReorderOfTheSameIds` is shared by the setlist and instrument reorders, so `helpers/ordering/` under `helper-module` fits.
- apps/pragma/api/src/instruments/instruments.repository.ts — round 4's derived-type finding is closed.
- apps/pragma/api/src/instruments/instruments.service.ts — round 4's reorder finding is closed. The created-at-the-same-moment gap is stated in *Instrument*.
- apps/pragma/api/src/setlists/setlist-entry.repository.ts
- apps/pragma/api/src/setlists/setlists.core.ts — the branch only removed `isReorderOfTheSameEntries`, which moved to `reorder.core.ts`.
- apps/pragma/api/src/setlists/setlists.repository.ts
- apps/pragma/api/src/setlists/setlists.service.ts
- apps/pragma/api/src/takes/takes.repository.ts — `findClaimedTakeWithin` returns null when the claim misses, and `deleteTakeWithComments` deletes the take row first, retried.

## Unclear

- None.

## Outside the checklist

- `## Words we do not use` names **role** twice (lines 1080 and 1102) and **poll** and **election** twice (lines 1090 and 1120), each time pointing at a different word. A reader cannot tell from the list which replacement applies. This is pre-existing and not a false claim, so it is not a finding.
- `setlists.core.ts:244-252` `buildSetlistSummaries` declares its row inputs as inline structural shapes. A pure core that takes the minimum shape is defensible, and the file was sealed before in this form, so it is not reported.
