-- A setlist holds pauses between its songs: a short break or the
-- intermission between two sets. A pause is not a song, and
-- "setlist_entry"."song_id" is NOT NULL, which Aurora DSQL cannot relax
-- (DSQL §10). Pauses therefore get their own table and share the
-- "position" sequence of the setlist's entries, so every reader of
-- "setlist_entry" keeps reading songs only. "label" is free text the band
-- writes ("Intermission", "Tune the bass"); an empty one reads as "Break".
CREATE TABLE "setlist_break" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"setlist_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"label" text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE INDEX "setlist_break_setlist_id_position_idx" ON "setlist_break" ("setlist_id","position");
