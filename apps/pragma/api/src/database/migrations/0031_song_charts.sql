-- A song holds an ordered list of chord charts, each naming the instruments
-- it is for. DSQL refuses ALTER COLUMN TYPE and DROP COLUMN, so the list gets
-- its own text column. "chart" stays, frozen, and is read only for a row
-- whose "charts" is null (resolveSongCharts).
ALTER TABLE "song" ADD COLUMN IF NOT EXISTS "charts" text;
