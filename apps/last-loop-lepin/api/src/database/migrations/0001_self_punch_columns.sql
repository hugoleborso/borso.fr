-- Adds the 6 self-punch metadata columns to loop_punches. DSQL rejects
-- both `ADD COLUMN <type> NOT NULL DEFAULT <value>` AND the fallback
-- `ALTER COLUMN ... SET NOT NULL` / `ALTER COLUMN ... SET DEFAULT` (cf.
-- docs/knowledge/dsql-postgres-compat-gaps.md §10, sourced from the AWS
-- ALTER TABLE syntax doc). Post-creation, the only ALTER action that
-- takes a column option is plain `ADD COLUMN <type>` — no constraint.
-- The `source` column therefore stays nullable at the DB level forever;
-- the app-level invariant (every INSERT writes 'admin' or 'self') holds
-- the contract. `narrowPunchSource` in punch.repository.ts coerces the
-- rare `null` read to `'admin'`.
--
-- Every ADD COLUMN here carries `IF NOT EXISTS`: a failed deploy that
-- ran a partial set of these statements leaves the DSQL schema (a
-- logical schema in a shared cluster, not a CFN-managed resource —
-- DELETE_COMPLETE on the stack doesn't wipe it) with some columns
-- already present. The re-run must short-circuit on those and continue.
-- The migration-runner Lambda also applies an `IF NOT EXISTS` rewrite
-- (cf. infra/cdk/src/internal/migration-runner/index.ts:makeIdempotent)
-- but writing it explicitly here makes the migration self-evidently
-- idempotent on read, and immune to any synth-time bundling quirk that
-- might skip the rewriter.
ALTER TABLE "loop_punches" ADD COLUMN IF NOT EXISTS "source" text;--> statement-breakpoint
UPDATE "loop_punches" SET "source" = 'admin' WHERE "source" IS NULL;--> statement-breakpoint
ALTER TABLE "loop_punches" ADD COLUMN IF NOT EXISTS "client_lat" double precision;--> statement-breakpoint
ALTER TABLE "loop_punches" ADD COLUMN IF NOT EXISTS "client_lng" double precision;--> statement-breakpoint
ALTER TABLE "loop_punches" ADD COLUMN IF NOT EXISTS "client_accuracy_m" double precision;--> statement-breakpoint
ALTER TABLE "loop_punches" ADD COLUMN IF NOT EXISTS "distance_from_center_m" double precision;--> statement-breakpoint
ALTER TABLE "loop_punches" ADD COLUMN IF NOT EXISTS "user_agent" text;
