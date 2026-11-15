# Invariants of pragma, in `api/src/improvements`

The rules the terms of [the vocabulary](../../../VOCABULARY.md) hold in this folder,
and the tests that hold them. A `Held by` path is relative to `apps/pragma/`.

## Improvement

- `title` is `NOT NULL`, trimmed, 1 to 200 characters. `details` is
  `NOT NULL` and defaults to the empty string.
- `status` is one of `idea`, `planned`, `building`, `shipped`, `declined`
  (`IMPROVEMENT_STATUSES`, declared in `domain/improvement.core.ts` and
  again in `improvements.schema.ts`), and the backlog is ranked in that
  order, then by vote count, then oldest first (`rankImprovements` in
  `domain/improvement.core.ts`).
- `kind` is one of `idea` and `bug` (`IMPROVEMENT_KINDS` in
  `domain/improvement.core.ts`), and a new improvement is an `idea` unless
  the member says otherwise. An **idea** asks for something the
  application does not do yet; a **bug report** is an improvement with
  `kind = 'bug'`, saying something the application already does is
  broken. The column is nullable because DSQL cannot add a column with a
  default, and a null, which only a row filed before the column existed
  carries, reads as an idea (`resolveImprovementKind`). The quality
  dashboard counts bug reports, so a reader outside the application
  filters on `kind = 'bug'` and a null never matches it.
- `authorMemberId` is the member who filed it, taken from the session
  rather than from the request body, and `createdAt` is written by the
  application.
- Deleting one deletes its improvement votes in the same call.

Held by: `api/src/improvements/improvements.controller.test.ts` › files a new improvement as an idea authored by the signed-in member
Held by: `api/src/improvements/improvements.controller.test.ts` › ranks the open statuses first and the most voted first inside a status
Held by: `api/src/improvements/improvements.controller.test.ts` › deletes an improvement with its votes and answers 404 the second time

## Improvement vote

- Keyed on `(improvementId, memberId)`, so a member either wants an
  improvement or does not. There are no points and no budget: casting the
  same vote twice changes nothing but the `castAt` stamp.
- The list endpoint reads every vote once and folds it into a count plus a
  flag for the reader (`summariseVotes` in `improvements.core.ts`).

Held by: `api/src/improvements/improvements.controller.test.ts` › counts one vote per member, however many times it is cast
