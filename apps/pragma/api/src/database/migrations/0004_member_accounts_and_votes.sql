-- Every member gets a credential of their own, and a setlist can spend a
-- while in a voting phase before it becomes a running order.
--
-- Aurora DSQL accepts `ADD COLUMN column_name data_type` and no constraint
-- clause at all: no NOT NULL, no DEFAULT, and no ALTER COLUMN afterwards to
-- add either (DSQL §10, and docs/dantotsus/dsql-alter-table-only-add-column).
-- The two columns added to `setlist_sheet` are therefore nullable with no
-- default, and the application reads a null `status` as `locked` through
-- `resolveSetlistStatus`, the way `resolveInstrumentFamily` already falls
-- back to `is_harmonic`.
--
-- Uniqueness of a username lands as a unique index rather than a table
-- constraint, which is the form DSQL accepts.
--
-- Every statement is re-runnable on its own: DSQL forbids multi-DDL
-- transactions, so a migration interrupted partway restarts from the first
-- statement with no marker written (DSQL §3, §4). The runner injects
-- IF NOT EXISTS into the CREATE statements, and nothing here renames or
-- drops.
ALTER TABLE "setlist_sheet" ADD COLUMN IF NOT EXISTS "status" text;
--> statement-breakpoint
ALTER TABLE "setlist_sheet" ADD COLUMN IF NOT EXISTS "target_song_count" integer;
--> statement-breakpoint
CREATE TABLE "member_credential" (
	"member_id" uuid PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"password_hash" text NOT NULL,
	"session_epoch" integer NOT NULL,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "member_credential_username_idx" ON "member_credential" ("username");
--> statement-breakpoint
CREATE TABLE "member_passkey" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"member_id" uuid NOT NULL,
	"credential_id" text NOT NULL,
	"public_key" bytea NOT NULL,
	"sign_counter" integer NOT NULL,
	"transports" text NOT NULL,
	"label" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "member_passkey_credential_id_idx" ON "member_passkey" ("credential_id");
--> statement-breakpoint
CREATE INDEX "member_passkey_member_id_idx" ON "member_passkey" ("member_id");
--> statement-breakpoint
CREATE TABLE "webauthn_challenge" (
	"challenge" text PRIMARY KEY NOT NULL,
	"member_id" uuid,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "setlist_vote" (
	"setlist_id" uuid NOT NULL,
	"member_id" uuid NOT NULL,
	"song_id" uuid NOT NULL,
	"points" integer NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "setlist_vote_pk" PRIMARY KEY("setlist_id","member_id","song_id")
);
--> statement-breakpoint
CREATE INDEX "setlist_vote_setlist_song_idx" ON "setlist_vote" ("setlist_id","song_id");
