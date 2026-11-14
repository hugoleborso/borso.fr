-- An inspiration is a passage of a published song, held as a YouTube video
-- id with a start and an end second. No audio is stored. Its id is chosen
-- by the device that creates it, so a retried create lands on the same row.
--
-- No foreign keys (ADR-2026-06-06T1326): the sketch and member cascades run
-- in the repositories, in one transaction. No DEFAULT now(): created_at
-- comes from the service's injected clock. The indexes are emitted plain and
-- the migration runner rewrites them to CREATE INDEX ASYNC.
CREATE TABLE IF NOT EXISTS "inspiration" (
	"id" uuid PRIMARY KEY NOT NULL,
	"youtube_video_id" text NOT NULL,
	"title" text NOT NULL,
	"artist" text DEFAULT '' NOT NULL,
	"deezer_track_id" text,
	"deezer_album_id" text,
	"start_seconds" integer NOT NULL,
	"end_seconds" integer NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"author_member_id" uuid,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
-- A sketch has no row of its own: it is the lanes of one composition and
-- the clips placed on them.
CREATE TABLE IF NOT EXISTS "sketch_lane" (
	"id" uuid PRIMARY KEY NOT NULL,
	"song_id" uuid NOT NULL,
	"name" text NOT NULL,
	"position" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "sketch_clip" (
	"id" uuid PRIMARY KEY NOT NULL,
	"lane_id" uuid NOT NULL,
	"inspiration_id" uuid NOT NULL,
	"offset_seconds" integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sketch_lane_song_idx" ON "sketch_lane" ("song_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sketch_clip_lane_idx" ON "sketch_clip" ("lane_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sketch_clip_inspiration_idx" ON "sketch_clip" ("inspiration_id");
