# Invariants — pragma, `api/src/takes`

The rules the terms of [the vocabulary](../../../VOCABULARY.md) hold in this folder,
and the tests that hold them. A `Held by` path is relative to `apps/pragma/`.

## Take

- The id is chosen by the device that recorded it, so a create retried
  after a lost answer lands on the same row (`hasInsertedTakeWithin`).
- `song_id` is required and `session_id` is optional. Deleting the session
  keeps the take and clears `session_id`; deleting the song deletes the
  take, its comments and its audio object.
- A take names only a song and a session that still exist: the create
  claims both rows in the same retried transaction as the insert, and is
  refused with `song-not-found` or `session-not-found` when a claim finds
  no row.
- The audio is one of the types in `TAKE_CONTENT_TYPES`, at most 200 MiB,
  and S3 enforces that length because the signed upload carries it. The
  object key is `take/<songId>/<takeId>.<extension>` (`buildTakeObjectKey`),
  and a create naming any other key is refused.
- Listed by `recorded_at` descending, not by upload time, so a take
  uploaded a week late sits where it happened.
- Deleting its author keeps the take; `authorName` reads null and the
  screen says *former member*. Any member can delete any take.
- The answer to a create is the take read back inside the transaction that
  stored it (`getWrittenTakeWithin`), never a second read on another
  connection, so a stored take is never answered 404 and the device's
  queue never gives it up.

Held by: `api/src/takes/takes.controller.test.ts` › answers the same take when a create is retried with the same id
Held by: `api/src/takes/takes.controller.test.ts` › keeps one take when two tabs send the same create at the same moment
Held by: `api/src/takes/takes.controller.test.ts` › refuses an object key other than the one the take was signed for
Held by: `api/src/takes/takes.controller.test.ts` › refuses a take one byte over 200 MiB
Held by: `api/src/takes/takes.controller.test.ts` › lists takes by recording time, newest first, whatever order they were uploaded in
Held by: `api/src/takes/takes.controller.test.ts` › lets any member delete another member’s take, its comments and its audio
Held by: `api/src/takes/takes.controller.test.ts` › deleting the song deletes its takes, their comments and their audio
Held by: `api/src/takes/takes.controller.test.ts` › deleting the session keeps its takes and clears their session
Held by: `api/src/takes/takes.controller.test.ts` › deleting the author keeps their takes and comments, with no name to show
Held by: `api/src/takes/takes.controller.test.ts` › refuses a take for a song deleted while the take was being written
Held by: `api/src/takes/takes.controller.test.ts` › refuses a take for a session deleted while the take was being written
Held by: `api/src/takes/takes.controller.test.ts` › writes the take once when its first commit loses a conflict on the claimed song
Held by: `api/src/takes/takes.controller.test.ts` › answers the take it stored even when another connection deletes it before the answer is read

## Take comment

- `at_seconds` is null for a comment in the thread only, and otherwise a
  whole number from 0 to the take's duration (`isMomentWithinTake`).
- `body` is trimmed, 1 to 4 096 characters. Comments are listed oldest
  first, a tie broken on id (`orderCommentsByTime`).
- Deleted with its take; kept, with no author name, when its author is
  deleted.
- A comment names only a take that still exists: the create claims the take
  row, checks the moment against it and inserts in one retried transaction
  (`findClaimedTakeWithin`), and is refused with `take-not-found` when the
  claim finds no row. Deleting a take, alone or with its song, removes the
  take row before its comments, so a comment that claimed the row first is
  removed with the rest.
- The answer to a create or an edit is the comment read back inside the
  transaction that wrote it, so a stored comment is never answered 404.

Held by: `api/src/takes/takes.controller.test.ts` › accepts a moment at the very end and refuses one a second past it
Held by: `api/src/takes/takes.controller.test.ts` › keeps a comment with a moment and one without, oldest first, and counts them
Held by: `api/src/takes/takes.controller.test.ts` › lets another member delete a comment, once
Held by: `api/src/takes/takes.controller.test.ts` › edits a comment’s body and moment, and refuses a moment past the end
Held by: `api/src/takes/takes.controller.test.ts` › leaves no comment on a take deleted while the comment was being written
Held by: `api/src/takes/takes.controller.test.ts` › leaves no comment on a take whose song is deleted while the comment was being written
Held by: `api/src/takes/takes.controller.test.ts` › writes one comment when its first commit loses a conflict
Held by: `api/src/takes/takes.controller.test.ts` › deletes the take once when its first commit loses a conflict
Held by: `api/src/takes/takes.controller.test.ts` › answers the comment it stored even when another connection deletes it before the answer is read
