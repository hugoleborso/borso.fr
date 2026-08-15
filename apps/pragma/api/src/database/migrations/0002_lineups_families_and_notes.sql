-- Three changes ship together because one product change spans them: a
-- member can now hold several instruments on a song, an instrument
-- declares which family it belongs to, and a song carries the notes the
-- band writes about it.
--
-- No column changes type. `song.default_lineup` and
-- `setlist_entry.lineup_override` already hold JSON as text (DSQL §1),
-- and their values move from `instrumentId | null` to a list of ids —
-- the read path normalises the older shapes, so no row is rewritten
-- here.
--
-- DSQL §10 forbids NOT NULL / DEFAULT on ADD COLUMN and refuses DROP
-- COLUMN outright, so `family` lands nullable and `is_harmonic` stays
-- for good. The UPDATE below backfills `family` from the boolean it
-- replaces, and the repository writes both columns from then on so the
-- legacy one never contradicts the family.
ALTER TABLE "instrument" ADD COLUMN IF NOT EXISTS "family" text;--> statement-breakpoint
UPDATE "instrument" SET "family" = CASE WHEN "is_harmonic" THEN 'harmonic' ELSE 'other' END WHERE "family" IS NULL;--> statement-breakpoint
ALTER TABLE "song" ADD COLUMN IF NOT EXISTS "structure_notes" text;--> statement-breakpoint
ALTER TABLE "song" ADD COLUMN IF NOT EXISTS "gimmick_notes" text;--> statement-breakpoint
ALTER TABLE "song" ADD COLUMN IF NOT EXISTS "notes" text;--> statement-breakpoint
UPDATE "song" SET "structure_notes" = '', "gimmick_notes" = '', "notes" = '' WHERE "structure_notes" IS NULL;
