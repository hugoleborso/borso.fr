-- Adds the 6 self-punch metadata columns to loop_punches. `source` is the
-- only NOT NULL — the DEFAULT 'admin' projects every pre-existing row (all
-- admin-issued before this migration ran) onto the new schema in one
-- statement. DSQL accepts `ADD COLUMN ... NOT NULL DEFAULT` on a non-empty
-- table per the dry-run gate (cf. plan.md R-DSQL); if a future schema
-- change finds the engine rejects it (or leaves rows NULL), switch that
-- column to the 3-statement fallback (ADD nullable → UPDATE … SET
-- source='admin' → ALTER COLUMN SET NOT NULL); the runner already splits
-- on `statement-breakpoint`. No IP column by design (privacy + low
-- contestation value over UA + coordinates — cf. spec Q.O.D. Q8 option (d)).
ALTER TABLE "loop_punches" ADD COLUMN "source" text DEFAULT 'admin' NOT NULL;--> statement-breakpoint
ALTER TABLE "loop_punches" ADD COLUMN "client_lat" double precision;--> statement-breakpoint
ALTER TABLE "loop_punches" ADD COLUMN "client_lng" double precision;--> statement-breakpoint
ALTER TABLE "loop_punches" ADD COLUMN "client_accuracy_m" double precision;--> statement-breakpoint
ALTER TABLE "loop_punches" ADD COLUMN "distance_from_center_m" double precision;--> statement-breakpoint
ALTER TABLE "loop_punches" ADD COLUMN "user_agent" text;
