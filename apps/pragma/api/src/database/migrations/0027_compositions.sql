-- A composition is a piece the band is writing. It becomes a catalogue song
-- only when a member adds it, which sets song_id. Its id is chosen by the
-- device that creates it, so a retried create lands on the same row.
--
-- No foreign keys (ADR-2026-06-06T1326) and no DEFAULT now(): created_at
-- comes from the service's injected clock.
CREATE TABLE IF NOT EXISTS "composition" (
	"id" uuid PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"song_id" uuid,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "composition_song_idx" ON "composition" ("song_id");
--> statement-breakpoint
-- Lanes now belong to a composition, not a song. DSQL refuses DROP COLUMN
-- and DROP NOT NULL, so the NOT NULL song_id of 0026 cannot be relaxed: the
-- table is dropped and created again. Production never ran 0026 with data;
-- only preview schemas held lanes, and their clips go with them.
DROP TABLE IF EXISTS "sketch_lane";
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "sketch_lane" (
	"id" uuid PRIMARY KEY NOT NULL,
	"composition_id" uuid NOT NULL,
	"name" text NOT NULL,
	"position" integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sketch_lane_composition_idx" ON "sketch_lane" ("composition_id");
--> statement-breakpoint
DELETE FROM "sketch_clip";
