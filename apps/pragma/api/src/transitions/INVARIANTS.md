# Invariants — pragma, `api/src/transitions`

The rules the terms of [the vocabulary](../../../VOCABULARY.md) hold in this folder,
and the tests that hold them. A `Held by` path is relative to `apps/pragma/`.

## Transition comment

- One row per ordered pair `(songAId, songBId)`, held by the unique index
  `transition_comment_ordered_pair`, so A into B and B into A are two
  separate rows.
- `comment` is `NOT NULL`, trimmed, 1 to 4 096 characters. `updatedAt` is
  `NOT NULL` and defaults to the write time.
- An assistant reads it, as `transitionComment` on the setlist entry it
  leaves from in `get_setlist`, and never writes it.

Held by: `api/src/transitions/transitions.controller.test.ts` › treats A→B and B→A as distinct rows
Held by: `api/src/transitions/transitions.schema.test.ts` › refuses whitespace alone, which would read as a comment and say nothing
