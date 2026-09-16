-- How big a night a bar is up for, and what it lends the band when they play.
--
-- Aurora DSQL accepts `ADD COLUMN column_name data_type` and no constraint
-- clause at all: no NOT NULL, no DEFAULT, and no ALTER COLUMN afterwards to
-- add either (DSQL §10, and docs/dantotsus/dsql-alter-table-only-add-column).
-- Both columns are therefore nullable, and the application reads a null
-- `concert_mood` as unknown rather than as a mood, the way
-- `resolveSetlistStatus` reads a null status.
--
-- `available_support` holds a JSON array in a TEXT column, the shape this
-- schema already uses for a lineup, because DSQL has no array type to add
-- here and the list is read and written whole. A null column and an empty
-- array both mean the bar lends nothing.
ALTER TABLE "bar" ADD COLUMN IF NOT EXISTS "concert_mood" text;
--> statement-breakpoint
ALTER TABLE "bar" ADD COLUMN IF NOT EXISTS "available_support" text;
