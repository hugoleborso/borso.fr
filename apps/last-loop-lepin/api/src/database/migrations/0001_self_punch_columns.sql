-- Adds the 6 self-punch metadata columns to loop_punches. DSQL rejects
-- BOTH `ADD COLUMN <type> NOT NULL DEFAULT <value>` (§10) AND the fallback
-- `ALTER COLUMN ... SET NOT NULL` / `ALTER COLUMN ... SET DEFAULT` (§11 of
-- docs/knowledge/dsql-postgres-compat-gaps.md — discovered on the same
-- PR's preview deploy after the §10 fallback was tried). The only ALTER
-- statement DSQL accepts here is the plain `ADD COLUMN <type>` (nullable,
-- no constraint). The `source` column therefore stays nullable at the DB
-- level; the app-level invariant (every INSERT writes 'admin' or 'self')
-- holds the contract instead. Reads coerce missing values via
-- `narrowPunchSource` in punch.repository.ts.
ALTER TABLE "loop_punches" ADD COLUMN "source" text;--> statement-breakpoint
UPDATE "loop_punches" SET "source" = 'admin' WHERE "source" IS NULL;--> statement-breakpoint
ALTER TABLE "loop_punches" ADD COLUMN "client_lat" double precision;--> statement-breakpoint
ALTER TABLE "loop_punches" ADD COLUMN "client_lng" double precision;--> statement-breakpoint
ALTER TABLE "loop_punches" ADD COLUMN "client_accuracy_m" double precision;--> statement-breakpoint
ALTER TABLE "loop_punches" ADD COLUMN "distance_from_center_m" double precision;--> statement-breakpoint
ALTER TABLE "loop_punches" ADD COLUMN "user_agent" text;
