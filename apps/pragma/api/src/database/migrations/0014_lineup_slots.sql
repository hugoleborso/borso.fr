-- The setlist card shows one fixed slot per instrument, and the whole
-- value of that display is positional: a column always means the same
-- instrument, so an instrument changing hands between two songs reads
-- without any text. Three facts the database did not hold make that
-- possible — which glyph marks an instrument, where it sits in the fixed
-- order, and which instruments deserve a slot at all. See ADR-0021.
--
-- Aurora DSQL accepts `ADD COLUMN column_name data_type` and no
-- constraint clause at all, so all three columns land nullable and stay
-- nullable forever. The read side narrows them through
-- resolveInstrumentIcon and resolveInstrumentPosition in
-- domain/instrument.core.ts, exactly the way `family` above them is
-- narrowed through resolveInstrumentFamily. The drizzle declarations
-- carry no .notNull() and no .default() for the same reason: keeping
-- them would make every future `drizzle-kit generate` emit an
-- ALTER COLUMN ... SET NOT NULL that DSQL rejects.
--
-- The two backfills below are what a band sees on day one, before
-- anybody opens the instruments page. `position` is seeded from the
-- family order — vocal, harmonic, percussive, other — and the read side
-- breaks the tie on the name, which together are the ordering the spec
-- asks for and are never alphabetical across families. `is_primary` is
-- seeded true for every link whose member plays exactly one instrument,
-- which is the honest reading of "their main instrument" and leaves a
-- multi-instrumentalist for the band to resolve.
ALTER TABLE "instrument" ADD COLUMN IF NOT EXISTS "icon" text;--> statement-breakpoint
ALTER TABLE "instrument" ADD COLUMN IF NOT EXISTS "position" integer;--> statement-breakpoint
ALTER TABLE "member_instrument" ADD COLUMN IF NOT EXISTS "is_primary" boolean;--> statement-breakpoint
UPDATE "instrument" SET "position" = CASE COALESCE("family", CASE WHEN "is_harmonic" THEN 'harmonic' ELSE 'other' END) WHEN 'vocal' THEN 0 WHEN 'harmonic' THEN 1 WHEN 'percussive' THEN 2 ELSE 3 END WHERE "position" IS NULL;--> statement-breakpoint
UPDATE "member_instrument" SET "is_primary" = true WHERE "member_id" IN (SELECT "member_id" FROM "member_instrument" GROUP BY "member_id" HAVING COUNT(*) = 1);--> statement-breakpoint
UPDATE "member_instrument" SET "is_primary" = false WHERE "is_primary" IS NULL;
