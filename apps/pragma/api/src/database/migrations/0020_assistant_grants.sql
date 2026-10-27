-- pragma is its own OAuth 2.1 authorization server (ADR-0042). These three
-- tables hold what it issues to assistants: the clients that registered
-- themselves, the one-use authorization codes, and the grants a member
-- allowed. Every token and code is stored as its SHA-256 hash, never raw.
--
-- No foreign keys (ADR-0006) and no DEFAULT now(): every timestamp comes
-- from the service's injected clock, which migrations.audit.test.ts gates.
-- The three tables are kept out of every preview's copy of production and
-- out of the read-only reader's reach, so a production token never works on
-- a preview and no agent reads a live credential.
CREATE TABLE IF NOT EXISTS "assistant_client" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"redirect_uris" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "assistant_authorization_code" (
	"code_hash" text PRIMARY KEY NOT NULL,
	"client_id" text NOT NULL,
	"member_id" uuid NOT NULL,
	"redirect_uri" text NOT NULL,
	"code_challenge" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
-- A grant carries the member's session epoch when it was issued, so a
-- password change ends it the way it ends a cookie. The refresh token it
-- rotated away last is kept as previous_refresh_token_hash, which is how a
-- replayed token is recognised and the grant revoked.
CREATE TABLE IF NOT EXISTS "assistant_grant" (
	"id" uuid PRIMARY KEY NOT NULL,
	"client_id" text NOT NULL,
	"member_id" uuid NOT NULL,
	"refresh_token_hash" text NOT NULL,
	"previous_refresh_token_hash" text,
	"refresh_expires_at" timestamp with time zone NOT NULL,
	"access_token_hash" text NOT NULL,
	"access_expires_at" timestamp with time zone NOT NULL,
	"session_epoch" integer NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"last_used_at" timestamp with time zone
);
--> statement-breakpoint
-- Emitted plain: the migration runner rewrites each to CREATE UNIQUE INDEX
-- ASYNC on DSQL. The hashes are 256 random bits, so a collision is not a
-- case the application handles; the indexes make the lookups by hash cheap.
CREATE UNIQUE INDEX IF NOT EXISTS "assistant_grant_refresh_token_hash_unique" ON "assistant_grant" ("refresh_token_hash");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "assistant_grant_previous_refresh_token_hash_unique" ON "assistant_grant" ("previous_refresh_token_hash");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "assistant_grant_access_token_hash_unique" ON "assistant_grant" ("access_token_hash");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "assistant_grant_member_idx" ON "assistant_grant" ("member_id");
