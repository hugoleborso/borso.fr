-- The band tracks what each member owes the next rehearsal, and marks which
-- catalogue entries it wrote itself.
--
-- Aurora DSQL accepts `ADD COLUMN column_name data_type` and no constraint
-- clause at all: no NOT NULL, no DEFAULT, and no ALTER COLUMN afterwards to
-- add either (DSQL §10, and docs/dantotsus/dsql-alter-table-only-add-column).
-- `song.origin` is therefore nullable with no default, and a row written
-- before this migration reads as a cover through `resolveSongOrigin`, the way
-- a null `status` reads as `locked` through `resolveSetlistStatus`.
--
-- `task.assignee_id` and `task.song_id` are nullable on purpose: an unclaimed
-- task is an ordinary state the board shows in its own column, and a task
-- about gear points at no composition. Neither carries a foreign key, because
-- DSQL has none; the service checks the member and the song exist before the
-- write, and both deletion paths null the column back out.
--
-- Every statement is re-runnable on its own: DSQL forbids multi-DDL
-- transactions, so a migration interrupted partway restarts from the first
-- statement with no marker written (DSQL §3, §4).
ALTER TABLE "song" ADD COLUMN IF NOT EXISTS "origin" text;
--> statement-breakpoint
CREATE TABLE "task" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"status" text NOT NULL,
	"assignee_id" uuid,
	"song_id" uuid,
	"due_date" timestamp with time zone
);
--> statement-breakpoint
CREATE INDEX "task_assignee_id_idx" ON "task" ("assignee_id");
--> statement-breakpoint
CREATE INDEX "task_song_id_idx" ON "task" ("song_id");
