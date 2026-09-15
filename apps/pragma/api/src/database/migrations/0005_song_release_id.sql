-- Persists the MusicBrainz release the song was imported from, which is the
-- identifier Cover Art Archive serves artwork by. DSQL §10 forbids NOT NULL
-- and DEFAULT on ADD COLUMN, so the column lands nullable and a song imported
-- before this migration, or one MusicBrainz had no release for, simply has no
-- cover and falls back to its initials.
ALTER TABLE "song" ADD COLUMN IF NOT EXISTS "release_id" text;
