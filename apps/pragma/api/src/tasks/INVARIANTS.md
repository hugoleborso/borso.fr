# Invariants — pragma, `api/src/tasks`

The rules the terms of [the vocabulary](../../../VOCABULARY.md) hold in this folder,
and the tests that hold them. A `Held by` path is relative to `apps/pragma/`.

## Task

- `title` and `status` are `NOT NULL`; `notes` is `NOT NULL` and defaults
  to the empty string.
- `status` is one of `todo`, `doing`, `done` (`TASK_STATUSES` in
  `domain/task-status.core.ts`). Every status but `done` counts as open.
- `assigneeId` and `songId` are both nullable, and neither carries a
  foreign key, because DSQL has none. A task names only a member and a
  song that still exist: the write claims both rows in the same
  transaction as the task, which runs again when Aurora DSQL aborts it at
  commit, and is refused with `assignee-not-found` or
  `song-not-found` when a claim finds no row. Deleting a member or a song
  removes its row first and then nulls the tasks naming it, in one
  transaction, so a task write that claimed the row first is nulled with
  the rest.
- The list comes back ordered by what is most urgent: in progress first,
  then waiting, then done; within a status, by the nearest due date, with
  a task carrying no date behind every dated one; then by title
  (`compareTasksByUrgency`).
- The tasks screen draws one column per member, in the order the members
  come back, and adds an unclaimed column only when something is
  unassigned.

Held by: `api/src/tasks/tasks.controller.test.ts` › orders the list by what is most urgent
Held by: `site/src/routes/band/band-tasks.core.test.ts` › adds the unassigned column only when something is unassigned
Held by: `api/src/tasks/tasks.controller.test.ts` › keeps a task when the member it was assigned to is deleted
Held by: `api/src/tasks/tasks.controller.test.ts` › never leaves a task assigned to a member deleted while the assignment was written
Held by: `api/src/tasks/tasks.controller.test.ts` › writes the task once when its first two commits lose a conflict on the claimed member
Held by: `api/src/tasks/tasks.controller.test.ts` › gives up and writes nothing once every commit has lost a conflict
