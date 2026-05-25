-- Adds the GetSongBPM-sourced `bpm` column. Tonality from GetSongBPM
-- lands in the existing `tonality_start` text column (added in 0000,
-- and previously filled from ChordPro derivation only). DSQL §10
-- forbids NOT NULL / DEFAULT on ADD COLUMN, so `bpm` lands nullable;
-- the repository write-side defaults to `null` when the upstream
-- doesn't supply a tempo.
ALTER TABLE "song" ADD COLUMN IF NOT EXISTS "bpm" integer;
