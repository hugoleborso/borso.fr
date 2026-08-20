-- A setlist stops belonging to one session. It becomes a named running
-- order that any number of sessions can carry, so a rehearsal can work
-- through several of them and a set prepared once can be played again
-- at the concert it was prepared for.
--
-- The rows move to a new table rather than the old one being relaxed.
-- `setlist` declares `session_id` NOT NULL UNIQUE, and Aurora DSQL
-- accepts neither DROP COLUMN nor DROP CONSTRAINT nor ALTER COLUMN
-- (DSQL §10), so that one-per-session rule cannot be lifted in place.
-- The sanctioned remedy is the one the migration gate prints: leave the
-- column alone and stop reading it. `setlist` is therefore left behind,
-- unread, and `setlist_sheet` carries the same ids so every
-- `setlist_entry.setlist_id` still resolves.
--
-- Every statement is re-runnable on its own: DSQL forbids multi-DDL
-- transactions, so a migration interrupted partway restarts from the
-- first statement with no marker written (DSQL §3, §4). The runner
-- injects IF NOT EXISTS into the CREATE statements, and the two copies
-- carry ON CONFLICT DO NOTHING. Nothing here renames or drops, because
-- a rename that already succeeded would make the copy that reads the
-- old table fail forever on the retry.
CREATE TABLE "setlist_sheet" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session_setlist" (
	"session_id" uuid NOT NULL,
	"setlist_id" uuid NOT NULL,
	"position" integer NOT NULL,
	CONSTRAINT "session_setlist_session_id_setlist_id_pk" PRIMARY KEY("session_id","setlist_id")
);
--> statement-breakpoint
INSERT INTO "setlist_sheet" ("id", "name")
	SELECT "id", '' FROM "setlist"
	ON CONFLICT ("id") DO NOTHING;
--> statement-breakpoint
INSERT INTO "session_setlist" ("session_id", "setlist_id", "position")
	SELECT "session_id", "id", 0 FROM "setlist"
	ON CONFLICT ("session_id", "setlist_id") DO NOTHING;
--> statement-breakpoint
CREATE INDEX "session_setlist_session_id_position_idx" ON "session_setlist" ("session_id","position");
