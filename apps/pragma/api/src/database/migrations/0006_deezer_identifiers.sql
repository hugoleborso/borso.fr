-- Song search moves from MusicBrainz to Deezer, so a song is now identified by
-- a Deezer track id and its cover is served by a Deezer album id. The two
-- identifier spaces do not overlap: a MusicBrainz recording id names nothing on
-- Deezer, so the old values are not migrated and a song imported before this
-- migration keeps its title, artist, album, duration and ISRCs and falls back
-- to its initials tile until it is picked again from the new search.
--
-- The new columns land beside the old ones rather than replacing them. Aurora
-- DSQL accepts neither DROP COLUMN nor RENAME COLUMN (DSQL §10), so `mbid` and
-- `release_id` are left in place and simply stop being read, which is the same
-- remedy 0003 used for `setlist.session_id`. DSQL §10 also forbids NOT NULL and
-- DEFAULT on ADD COLUMN, so both columns land nullable.
ALTER TABLE "song" ADD COLUMN IF NOT EXISTS "deezer_track_id" text;--> statement-breakpoint
ALTER TABLE "song" ADD COLUMN IF NOT EXISTS "deezer_album_id" text;--> statement-breakpoint
CREATE INDEX "song_deezer_track_id_idx" ON "song" ("deezer_track_id");
