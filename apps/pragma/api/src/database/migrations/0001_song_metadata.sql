-- Adds MusicBrainz-sourced metadata columns to `song`. DSQL §10 forbids
-- NOT NULL / DEFAULT on ADD COLUMN, so each column lands nullable; the
-- repository write-side carries the `[]` default for the two JSON
-- text blobs. DSQL §11 demands `CREATE INDEX ASYNC` for non-primary
-- indexes — the migration runner appends ASYNC automatically, but we
-- write it explicitly here for clarity.
ALTER TABLE "song" ADD COLUMN IF NOT EXISTS "mbid" text;--> statement-breakpoint
ALTER TABLE "song" ADD COLUMN IF NOT EXISTS "album" text;--> statement-breakpoint
ALTER TABLE "song" ADD COLUMN IF NOT EXISTS "duration_seconds" integer;--> statement-breakpoint
ALTER TABLE "song" ADD COLUMN IF NOT EXISTS "isrcs" text;--> statement-breakpoint
ALTER TABLE "song" ADD COLUMN IF NOT EXISTS "tags" text;--> statement-breakpoint
CREATE INDEX "song_mbid_idx" ON "song" ("mbid");
