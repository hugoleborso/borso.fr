# Invariants of pragma, in `api/src/setlists`

The rules the terms of [the vocabulary](../../../VOCABULARY.md) hold in this folder,
and the tests that hold them. A `Held by` path is relative to `apps/pragma/`.

## Setlist

- The row holds `id`, `name`, `kind`, `status` and `targetSongCount`.
  `name` is `NOT NULL` and defaults
  to the empty string, because a setlist is often written in a hurry and
  named afterwards.
- The physical table is `setlist_sheet`. The original `setlist` table
  declared `session_id` `NOT NULL UNIQUE`, and Aurora DSQL accepts
  neither `DROP COLUMN` nor `DROP CONSTRAINT`, so one setlist per
  session could not be relaxed in place; `0003_setlists_across_sessions.sql`
  moved the rows and left the old table unread.
- `createSetlist` writes the setlist, and the link when the caller names
  a session, in one transaction. Its only refusal is `session-not-found`.
- `kind` is `manual` or `audience_choice` (`resolveSetlistKind` in
  `setlists.core.ts`). The column is nullable in the database because
  Aurora DSQL accepts no `ADD COLUMN ... NOT NULL`, so every read narrows
  a null to `manual`.
- An `audience_choice` setlist is created at the first voting round of a
  concert and refuses `renameSetlist`: its title is the band's promise to
  the room, not an editable field.
- A concert has one `audience_choice` setlist. The setlist is created with
  the concert's id as its own (`selectAudienceChoiceSetlistId`), so the
  primary key refuses a second one when two first rounds open together.
  One created before that rule keeps its random id and is found by its
  link to the concert.

Held by: `api/src/setlists/setlists.controller.test.ts` › refuses to create a setlist on a session that does not exist
Held by: `api/src/setlists/setlists.controller.test.ts` › plays one setlist in two sessions, and lists it under both
Held by: `api/src/setlists/setlists.core.test.ts` › reads a row written before the column existed as manual
Held by: `api/src/audience/audience.controller.test.ts` › creates the audience-choice setlist at the first round and refuses to rename it
Held by: `api/src/audience/audience.controller.test.ts` › creates one audience-choice setlist when two first rounds are opened at the same moment

## Session setlist link

- `session_setlist` holds `session_id`, `setlist_id` and `position`, keyed
  on the first two, so one pair is stored once however many times it is
  attached.
- A setlist joining a session lands one past the highest position already
  taken, so the order the band wrote survives. Every attach first claims
  the session row in the same retried transaction, so two setlists joining
  one session at the same moment read the highest position one after the
  other and never share it.
- A link joins a setlist and a session that both still exist. Attaching an
  existing setlist claims the setlist row and then the session row, each
  claim reporting whether it found its row, and when either did not the
  attach is refused before anything is written, with the same 404 as for
  an unknown id. Deleting a session or a setlist removes its row before
  its links, so an attach that claimed the row first has its link removed
  with it.

Held by: `api/src/setlists/setlists.controller.test.ts` › carries several setlists on one session, in the order they were attached
Held by: `api/src/setlists/setlists.controller.test.ts` › gives two setlists joining one session at the same moment a position each
Held by: `api/src/setlists/setlists.controller.test.ts` › leaves no link behind when the session is deleted while a setlist joins it
Held by: `api/src/setlists/setlists.controller.test.ts` › leaves no link to a setlist deleted while it was joining a session

## Setlist status

- Exactly two values: `voting` and `locked`. The column is nullable with
  no default, because Aurora DSQL cannot add a `NOT NULL` column after
  the table exists, so a row written before the column reads as `locked`.
- `targetSongCount` is how many songs the band wants out of the vote. It
  may be null, and then it reads as 15.
- Closing a vote writes the entries and moves the status to `locked`.
  Reopening moves it back and keeps every vote.

Held by: `api/src/setlists/voting.controller.test.ts` › reads a setlist that was never voted on as locked
Held by: `api/src/setlists/voting.core.test.ts` › falls back to the default target when the setlist names none
Held by: `api/src/setlists/voting.controller.test.ts` › closes a vote into an ordinary setlist, in the order it was handed
Held by: `api/src/setlists/voting.controller.test.ts` › reopens a closed vote with every point still posted

## Setlist entry

- `setlistId`, `songId` and `position` are `NOT NULL`; `notes` is
  `NOT NULL` and defaults to the empty string.
- Optional per-entry values: `energy` (1 to 10), `lineupOverride`,
  `keyOverride` (up to 16 characters) and `capo` (0 to 11).
- An appended entry takes the position after the last item of the
  setlist, entry or **setlist break** (`selectNextItemPosition`).
- Deleting an entry compacts the remaining entries and breaks back to a
  gapless run (`removeEntryAndCompact`).
- A reorder is refused as `stale` unless the submitted ids are exactly the
  entry ids, or the entry and break ids, already stored for that setlist,
  each once (`arrangeReorder`).
- An append, a delete and a reorder each run in one transaction that first
  writes the setlist's own row (`didClaimSetlistWithin`), so two of them on
  one setlist cannot interleave: Postgres makes the second wait, and
  Aurora DSQL aborts it at commit and `runInOneSetlistTransaction` runs it
  again. When the claim finds no row the write is refused with a 404, and
  deleting a setlist removes its row before its entries, so no entry
  outlives its setlist.

Held by: `api/src/setlists/setlists.controller.test.ts` › appends entries with increasing positions
Held by: `api/src/setlists/setlists.controller.test.ts` › compacts positions after a delete
Held by: `api/src/setlists/setlists.controller.test.ts` › refuses a reorder payload whose ids do not match the current set
Held by: `api/src/setlists/setlists.controller.test.ts` › answers 404 when writing the entries of a setlist that does not exist
Held by: `api/src/setlists/setlists.controller.test.ts` › refuses an entry for a setlist deleted while the entry was being written
Held by: `api/src/setlists/setlists.controller.test.ts` › gives each of two entries appended at the same moment a position of its own
Held by: `api/src/setlists/setlists.controller.test.ts` › applies one of two reorders sent at the same moment whole, never a mix of both
Held by: `api/src/setlists/setlists.controller.test.ts` › keeps positions distinct when an append and a reorder land at the same moment

## Setlist break

- `setlistId`, `position` and `label` are `NOT NULL`; `label` defaults to the
  empty string, which the site shows as "Break". It holds up to 80
  characters.
- A break is not a **setlist entry**: `setlist_entry.song_id` is
  `NOT NULL` and Aurora DSQL cannot relax it. So every reader of entries
  (studies, audience, voting, mastery) keeps reading songs only.
- A break shares the `position` sequence of its setlist's entries. An
  append takes the position after the last item, songs or breaks
  (`selectNextItemPosition`), and a delete of either compacts both.
- Inserted right after a named entry (`placeBreakAfter`), in the same
  claimed transaction as any other write to the setlist.
- A reorder naming the song ids only keeps every break in its slot; one
  naming every id moves breaks too (`arrangeReorder`).
- Read with `songsBefore`, the number of songs played before it, which is
  how the site places it.
- Deleting the setlist or closing its vote deletes its breaks.

Held by: `api/src/setlists/setlist-breaks.controller.test.ts` › places a break after the song it names, and counts the songs played before it
Held by: `api/src/setlists/setlist-breaks.controller.test.ts` › keeps every break in its slot when a reorder names the songs only
Held by: `api/src/setlists/setlist-breaks.controller.test.ts` › compacts songs and breaks into one gapless run after either is deleted
Held by: `api/src/setlists/setlist-breaks.controller.test.ts` › deletes the breaks of a deleted setlist
Held by: `api/src/setlists/voting.controller.test.ts` › drops the breaks of a setlist whose vote closes again
Held by: `api/src/setlists/setlist-breaks.controller.test.ts` › keeps every position distinct when a break lands while a song is appended

## Vote

- Keyed on `(setlistId, memberId, songId)`, so a member holds one score
  per song per setlist. `points` is a whole number from 0 to 3, and a
  score of 0 deletes the row rather than storing it.
- A member's budget is three points per targeted song. Unspent points are
  simply not counted; nothing forces a member to spend them.
- Deleted with the member who cast it and with the song it names.

Held by: `api/src/setlists/voting.core.test.ts` › removes a vote scored zero and stores every other score
Held by: `api/src/setlists/voting.controller.test.ts` › deletes the votes of a member with the member
Held by: `api/src/setlists/voting.controller.test.ts` › deletes the votes of a song with the song

## Vote budget

- `total` is `targetSongCount × 3`, `spent` is the sum of that member's
  votes, and `remaining` is the difference.
- A score is refused as `budget-exhausted` when it would exceed what is
  left, counting the points the same song already holds as free again.

Held by: `api/src/setlists/voting.core.test.ts` › gives three points per targeted song
Held by: `api/src/setlists/voting.core.test.ts` › frees the points a song already held when it is rescored
Held by: `api/src/setlists/voting.controller.test.ts` › refuses a score beyond the budget and says what is left
