-- A member may connect several calendars, each shown under the name its
-- feed declares (X-WR-CALNAME). "member_calendar_feed" is keyed on
-- "member_id", and Aurora DSQL cannot drop or replace a primary key
-- (DSQL §10), so the rows move to "calendar_feed", keyed on its own id.
--
-- Every statement is re-runnable on its own, because a migration
-- interrupted partway restarts from the first statement (DSQL §3, §4).
-- A copied row takes its old "member_id" as its id: that value was the
-- old primary key, so it is unique, and a second run of the copy meets
-- ON CONFLICT ("id") instead of inserting the address twice.
--
-- The old table is emptied, not dropped, so a retry of the copy still
-- finds it. It stays in the preview and reader blocklists. See ADR-0037.
CREATE TABLE "calendar_feed" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"member_id" uuid NOT NULL,
	"address" text NOT NULL,
	"name" text,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
INSERT INTO "calendar_feed" ("id", "member_id", "address", "name", "updated_at")
	SELECT "member_id", "member_id", "address", NULL, "updated_at" FROM "member_calendar_feed"
	ON CONFLICT ("id") DO NOTHING;
--> statement-breakpoint
DELETE FROM "member_calendar_feed";
--> statement-breakpoint
CREATE INDEX "calendar_feed_member_id_idx" ON "calendar_feed" ("member_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "calendar_feed_member_id_address_unique" ON "calendar_feed" ("member_id","address");
