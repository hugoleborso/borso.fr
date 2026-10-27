# ADR-0049: A task names an optional session through a nullable `task.session_id`, claimed like its song and nulled when the session is deleted

- **Status:** accepted
- **Date:** 2026-10-27
- **Ratified:** by the operator in chat on 2026-10-27, as decision D3
- **Deciders:** Hugo Borsoni
- **Tags:** pragma, ux-redesign, data, schema

## Context

Decision D3 of the redesign, ratified on 2026-10-27, puts "who does what" for a practice or a concert on that session's page: the session lists the tasks that belong to it, Home lists the member's tasks with that session's first, and a task is created from the session page. Today a task names at most a member and a song (`apps/pragma/api/src/tasks/tasks.schema.ts`, read this session) and nothing ties it to a session. The tasks screen also offers only compositions as a task's song (`apps/pragma/site/src/routes/tasks/TasksPage.tsx:60`, `selectCompositions`), while the API already accepts any song.

Aurora DSQL has no foreign keys, so every link in pragma is held by the code: a task write "claims" the member and song rows in its own transaction (`didClaimMemberWithin`, `didClaimSongWithin`, an update that touches the row and fails the claim when no row exists), and deleting a member or a song nulls the tasks naming it in the same transaction (`apps/pragma/VOCABULARY.md` › Task). A take already carries a nullable `session_id` with the same behaviour on session delete (`apps/pragma/api/src/database/migrations/0017_takes_and_push.sql`, `detachTakesOfDeletedSession`). DSQL refuses `NOT NULL` and `DEFAULT` on `ADD COLUMN` and refuses `DROP COLUMN` outright (the comments of migrations `0001_song_metadata.sql` and `0002_lineups_families_and_notes.sql`), so a column added here is nullable and stays for good. A schema column is an ADR trigger here.

## Decision

**Add a nullable `session_id uuid` column to `task`, with no foreign key and no default.** The task's create and update claim the session row in the task's transaction, exactly as they claim the assignee and the song, and refuse with `session-not-found` when the claim finds no row. `deleteSessionWithCascade` nulls the `session_id` of the tasks naming the session in its own transaction, after the session row is removed, as it already does for takes. A task belongs to at most one session, which is what D3 describes, and the shape repeats two links pragma already holds the same way, so it adds no new mechanism. In the same slice the task form offers every song, not only compositions; that is a front-end change with no schema impact.

## Consequences

- `+` The session page and Home read a session's tasks with one filter on `task`, with no join table.
- `+` Integrity under concurrent writes uses the claim pattern the task already runs twice and that `tasks.controller.test.ts` already tests for retries and conflicts.
- `-` A task belongs to one session at most. A chore that spans two practices ("bring the PA to both") is two tasks or a task with no session; widening later means a join table and a data move.
- `-` One more cascade to remember: `sessions.repository.ts` must call the task detach, and a future path that deletes sessions in bulk must call it too. Nothing in the schema refuses a dangling `session_id`, so the back-end test that deletes a session and reads its tasks is the only guard.
- `-` The column cannot be dropped: DSQL refuses `DROP COLUMN`, so if the link is abandoned the column stays in the schema, unused.
- `~` `VOCABULARY.md` › Task changes: it names a session as well as a member and a song, and its song may be any song, not only a composition.
- `~` Preview clones copy the column with the rest of `task` (ADR-0009); nothing in it is a secret.

## Alternatives considered

### Option A — Nullable `task.session_id`, claimed and nulled like the song (chosen)

- **Summary:** As described in *Decision*. Migration: `ALTER TABLE "task" ADD COLUMN IF NOT EXISTS "session_id" uuid;`.
- **Strengths:**
  - Matches D3: one task, at most one session.
  - Reuses the claim and the detach that the task's song and the take's session already use.
- **Costs:**
  - One column, one claim in `tasks.service.ts`, one detach in `sessions.repository.ts`, their tests.
- **Rationale:** It meets D3 with the least new shape, and its integrity story is one the code already proves.

### Option B — A `session_task` join table (rejected)

- **Summary:** A table of `(session_id, task_id)` pairs, so a task can belong to several sessions.
- **Strengths:**
  - Allows a task shared between sessions.
- **Costs:**
  - A new table, two claims per link (the session and the task), a cascade on both task delete and session delete, and a join on every read of Home and of the session page.
- **Rejection rationale:** It loses on simplicity and on fit: nothing in D3 or the audit asks for a task in two sessions. It would win if the band started tracking chores across a tour, which no finding records.

### Option C — Keep tasks off sessions and derive the list (rejected)

- **Summary:** No schema change. The session page shows the open tasks whose song is in the session's setlist, or whose due date falls before the session.
- **Strengths:**
  - No migration and no cascade.
- **Costs:**
  - A task with no song ("book the room", "print the setlist") never shows on a session.
  - A due-date rule shows every task due that week on every session that week, so "who does what for Wednesday" is a guess.
- **Rejection rationale:** It loses on fit with D3, the criterion weighted highest: the operator asked for tasks linked to sessions, and a derived list is not a link.

### Option D — Task ids kept in a JSON array on the session (rejected)

- **Summary:** `session.task_ids jsonb`, scrubbed when a task is deleted, the pattern of ADR-0006.
- **Strengths:**
  - The session row alone says which tasks it holds.
- **Costs:**
  - Every task delete must scrub every session's array; every session write races every task write on the same JSON value.
  - Reading "my tasks, this session's first" on Home means unpacking arrays across sessions.
- **Rejection rationale:** It loses on integrity under concurrent writes and on read cost. ADR-0006 used a JSON blob where an ordered list lived inside one row; here the link is one value per task.

## Evaluation rubric

| Criterion | Weight | Why it matters |
|---|---|---|
| Fit with D3 | high | The operator ratified "a nullable session on each task": one task, at most one session, shown on the session, Band and Home. |
| Integrity without foreign keys | high | DSQL enforces no link; a task pointing at a deleted session must not break the session page or Home. |
| Reuse of an existing pattern | medium | One developer maintains the API; a link held the same way as its neighbours is reviewed by analogy. |
| Read cost for Home and the session page | low | The band has tens of tasks; any option is fast, but a join on every Home load is unneeded work. |

|  | A Nullable column | B Join table | C Derived list | D JSON array on session |
|---|---|---|---|---|
| Fit with D3 | ✓ one session per task | ✓ allows more than D3 asks | ✗ no link; song-less tasks never show | ✓ one session per task, if kept consistent |
| Integrity without foreign keys | ✓ claim on write, null on session delete | ✓ but two claims and two cascades | ✓ nothing to keep consistent | ✗ scrub on every task delete, races on one JSON value |
| Reuse of an existing pattern | ✓ same as `task.song_id` and `take.session_id` | ✗ first join table for tasks | ✓ no new pattern | ✗ ADR-0006's pattern for a different shape |
| Read cost | ✓ one filter on `task` | ✗ a join per read | ✓ filters on existing columns | ✗ unpack arrays across sessions |

## Implementation pointers

- Spec: [`docs/features/pragma/ux-redesign/spec/spec.md`](../features/pragma/ux-redesign/spec/spec.md), *Types / domain model*, *Database changes*, *Slices* (slice 5), edge case "a task linked to a session that is then deleted"
- Plan: `docs/features/pragma/ux-redesign/plan/plan.md` (to be written by `/technical-conception`)
- Commit: stamped by `/after-task-kaizen` on merge
- Files: `apps/pragma/api/src/tasks/tasks.schema.ts`, `apps/pragma/api/src/tasks/tasks.service.ts` (`findLinkRefusalWithin`), `apps/pragma/api/src/tasks/tasks.repository.ts` (a `detachDeletedSessionFromTasks` beside `detachDeletedSongFromTasks`), `apps/pragma/api/src/sessions/sessions.repository.ts` (`deleteSessionWithCascade`), a new migration under `apps/pragma/api/src/database/migrations/`, `apps/pragma/site/src/routes/tasks/TasksPage.tsx` (song options), `apps/pragma/VOCABULARY.md` › Task
- Related ADRs: [ADR-0006](./0006-cascade-on-delete-via-json-blob-scrub.md) (the cascade substitute for DSQL), [ADR-0009](./0009-pragma-previews-clone-production.md) (preview clones)
