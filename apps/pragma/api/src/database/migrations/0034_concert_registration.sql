-- A public page lets anyone sign up for an upcoming concert with a first
-- name and an email, and members dress each concert with a poster and a
-- message for that page.
--
-- One mailbox signs up once per concert. canonical_email folds the aliases
-- of one mailbox (canonicalizeEmail: no +tag, no dot on Gmail) so a giveaway
-- cannot be entered twice; email keeps the address as typed, to write back.
-- The rule is a UNIQUE constraint on
-- CREATE TABLE, which DSQL enforces from the first row. A unique index
-- added later is built ASYNC and enforces nothing until its job completes.
-- No foreign keys are declared (ADR-2026-06-06T1326), and registered_at has
-- no DEFAULT now(): the service writes it from one injected clock.
--
-- The edit token is never stored, only its sha256, so a database read
-- cannot amend someone's registration.
--
-- The two session columns stay nullable forever: DSQL accepts ADD COLUMN
-- with no constraint clause only.
CREATE TABLE IF NOT EXISTS "concert_registration" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"first_name" text NOT NULL,
	"email" text NOT NULL,
	"canonical_email" text NOT NULL,
	"edit_token_hash" text NOT NULL,
	"coming_for_member_id" uuid,
	"wished_song_id" uuid,
	"registered_at" timestamp with time zone NOT NULL,
	CONSTRAINT "concert_registration_session_canonical_email_unique" UNIQUE("session_id","canonical_email")
);
--> statement-breakpoint
ALTER TABLE "session" ADD COLUMN IF NOT EXISTS "poster_s3_key" text;
--> statement-breakpoint
ALTER TABLE "session" ADD COLUMN IF NOT EXISTS "public_message" text;
