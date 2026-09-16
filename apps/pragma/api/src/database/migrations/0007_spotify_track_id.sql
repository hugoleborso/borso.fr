-- A song linked to Deezer also names a Spotify track, so the listen dialog can
-- open the recording rather than a search. The value is resolved once, by the
-- ISRC Deezer already returned, and stored here; see ADR-0017.
--
-- Nullable, and ordinarily so: Spotify carries no track for every ISRC Deezer
-- does, a song typed in by hand names no ISRC at all, and every song that
-- predates this migration has none until it is re-linked. Each of those falls
-- back to the Spotify search address the dialog used before. DSQL §10 forbids
-- NOT NULL and DEFAULT on ADD COLUMN in any case.
ALTER TABLE "song" ADD COLUMN IF NOT EXISTS "spotify_track_id" text;
