# Invariants — pragma, `api/src/mastery`

The rules the terms of [the vocabulary](../../../VOCABULARY.md) hold in this folder,
and the tests that hold them. A `Held by` path is relative to `apps/pragma/`.

## Mastery

- A default row is keyed on `(memberId, instrumentId)`, which is its
  primary key. An override row is keyed on
  `(memberId, instrumentId, songId)`.
- `score` is `NOT NULL` on both tables and validated to 0 to 10.
- The effective score is the override when one exists, and the default
  otherwise (`effective`). A score of 0 is a real answer and wins over the
  default, so the resolution tests for `undefined` explicitly.
- Deleting a song deletes its override rows
  (`deleteSongWithCascade`).

Held by: `api/src/mastery/mastery.controller.test.ts` › respects override score=0 as a legitimate "ne joue pas" — does not duplicate
Held by: `api/src/songs/songs.controller.test.ts` › cascades the mastery overrides on song delete

## Mastery score change

- Appended in the same transaction as every write of a per-song score, and
  never updated. Removing a per-song score appends the default it falls
  back to, when there is one.
- A change to a default score appends nothing, because a default is not
  about any one song.
- Deleted with its song and with its member.

Held by: `api/src/mastery/mastery.controller.test.ts` › appends one history row per override write and none for a default write
Held by: `api/src/mastery/mastery.controller.test.ts` › writes no history row when deleting an override with no default behind it
Held by: `api/src/studies/studies.controller.test.ts` › removes studies and score history with the song
Held by: `api/src/studies/studies.controller.test.ts` › removes studies and score history with the member
