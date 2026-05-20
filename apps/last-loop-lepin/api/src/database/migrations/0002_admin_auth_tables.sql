-- Replaces the Secrets Manager pair that backed the admin auth flow
-- (`last-loop-lepin/admin-pin-hash` + `…/admin-jwt-secret`, $0.40/mo
-- each) with two DB-resident tables:
--   * admin_credentials: single-row PIN scrypt hash, operator-seeded
--     after the first deploy via psql (`INSERT INTO admin_credentials …`).
--   * admin_sessions: opaque random session ids carried by the
--     `lastloop_admin` cookie. Logout becomes a single DELETE.
--
-- IF NOT EXISTS makes both CREATE TABLE statements idempotent so a
-- half-applied deploy retries cleanly — see the rationale at the top of
-- 0001_self_punch_columns.sql for the broader DSQL ALTER/CREATE
-- caveats. The migration-runner Lambda also rewrites these for
-- idempotency, but writing it explicitly here makes the intent
-- self-evident on read.
CREATE TABLE IF NOT EXISTS "admin_credentials" (
	"id" integer PRIMARY KEY NOT NULL,
	"scrypt_hash" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "admin_sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- drizzle-kit also produced two `ALTER TABLE "loop_punches" ALTER COLUMN
-- "source"` statements alongside this file. They've been removed by hand:
-- they reflect pre-existing snapshot drift (the 0001 migration left
-- `source` nullable on purpose to dodge DSQL's ALTER COLUMN limits, but
-- the older snapshot still marked it NOT NULL DEFAULT 'admin'). The live
-- DB already matches the desired state — running the ALTERs would be a
-- no-op at best, an error on DSQL at worst.
