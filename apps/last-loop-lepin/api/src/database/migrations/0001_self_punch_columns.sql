-- Adds the self-punch metadata columns. Plain `ADD COLUMN IF NOT EXISTS`
-- for DSQL compatibility (cf. docs/knowledge/dsql-postgres-compat-gaps.md §10).
ALTER TABLE "loop_punches" ADD COLUMN IF NOT EXISTS "source" text;--> statement-breakpoint
UPDATE "loop_punches" SET "source" = 'admin' WHERE "source" IS NULL;--> statement-breakpoint
ALTER TABLE "loop_punches" ADD COLUMN IF NOT EXISTS "client_lat" double precision;--> statement-breakpoint
ALTER TABLE "loop_punches" ADD COLUMN IF NOT EXISTS "client_lng" double precision;--> statement-breakpoint
ALTER TABLE "loop_punches" ADD COLUMN IF NOT EXISTS "client_accuracy_m" double precision;--> statement-breakpoint
ALTER TABLE "loop_punches" ADD COLUMN IF NOT EXISTS "distance_from_center_m" double precision;--> statement-breakpoint
ALTER TABLE "loop_punches" ADD COLUMN IF NOT EXISTS "user_agent" text;
