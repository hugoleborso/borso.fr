-- Adds the 6 self-punch metadata columns to loop_punches. `source` is the
-- only NOT NULL — every pre-existing row was admin-issued before this
-- migration, so we project them as `source='admin'` then lock the column
-- down. DSQL rejects `ADD COLUMN <name> <type> NOT NULL DEFAULT <value>` in
-- a single statement (it returns "ALTER TABLE ADD COLUMN with constraint
-- not supported" — observed on the preview deploy of PR #23 on 2026-05-15;
-- cf. docs/knowledge/dsql-postgres-compat-gaps.md §10). The local Postgres
-- under `pnpm dev` accepts the compact form, which is why this gap doesn't
-- surface in the back-e2e suite — DSQL must be exercised against preview
-- to catch it. The split below is the canonical fallback: nullable ADD →
-- backfill → SET NOT NULL → SET DEFAULT, all separated by
-- `statement-breakpoint` so the migration runner round-trips each in its
-- own transaction (cf. dsql-postgres-compat-gaps.md §3 on multi-DDL).
ALTER TABLE "loop_punches" ADD COLUMN "source" text;--> statement-breakpoint
UPDATE "loop_punches" SET "source" = 'admin' WHERE "source" IS NULL;--> statement-breakpoint
ALTER TABLE "loop_punches" ALTER COLUMN "source" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "loop_punches" ALTER COLUMN "source" SET DEFAULT 'admin';--> statement-breakpoint
ALTER TABLE "loop_punches" ADD COLUMN "client_lat" double precision;--> statement-breakpoint
ALTER TABLE "loop_punches" ADD COLUMN "client_lng" double precision;--> statement-breakpoint
ALTER TABLE "loop_punches" ADD COLUMN "client_accuracy_m" double precision;--> statement-breakpoint
ALTER TABLE "loop_punches" ADD COLUMN "distance_from_center_m" double precision;--> statement-breakpoint
ALTER TABLE "loop_punches" ADD COLUMN "user_agent" text;
