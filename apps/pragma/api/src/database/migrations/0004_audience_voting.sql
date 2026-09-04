-- The room gets a say in what is played next. A member opens a
-- thirty-second voting round on a concert, the room votes from a phone,
-- and the winner is appended to that concert's audience-choice setlist.
--
-- Every constraint is declared on CREATE TABLE: Aurora DSQL accepts no
-- ADD CONSTRAINT afterwards, and no foreign keys are declared at all
-- (ADR-0006). No business column carries DEFAULT now(), which
-- migrations.audit.test.ts gates: opened_at, closes_at, cast_at and
-- suggested_at are all written by the service from one injected clock.
--
-- One vote is one row. No counter column exists anywhere, because DSQL
-- resolves conflicts at commit under optimistic concurrency and a
-- counter row would be the one place every voter in the room collides.
--
-- The indexes are emitted plain. The migration runner rewrites them to
-- CREATE INDEX ASYNC, which is the only form DSQL accepts.
--
-- setlist_sheet.kind stays nullable at the database level forever: DSQL
-- rejects ADD COLUMN ... NOT NULL and ALTER COLUMN ... SET NOT NULL
-- alike. The write side always supplies a value and the read side
-- narrows null to 'manual' through resolveSetlistKind.
CREATE TABLE "voting_round" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"opened_at" timestamp with time zone NOT NULL,
	"closes_at" timestamp with time zone NOT NULL,
	"settled_at" timestamp with time zone,
	"winning_song_id" uuid
);
--> statement-breakpoint
CREATE TABLE "audience_vote" (
	"round_id" uuid NOT NULL,
	"ballot_token" text NOT NULL,
	"song_id" uuid NOT NULL,
	"cast_at" timestamp with time zone NOT NULL,
	CONSTRAINT "audience_vote_pk" PRIMARY KEY("round_id","ballot_token","song_id")
);
--> statement-breakpoint
CREATE TABLE "audience_suggestion" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"song_id" uuid NOT NULL,
	"ballot_token" text NOT NULL,
	"suggested_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "external_search_cache" (
	"normalized_query" text PRIMARY KEY NOT NULL,
	"hits" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE INDEX "voting_round_session_opened_idx" ON "voting_round" ("session_id","opened_at");
--> statement-breakpoint
CREATE INDEX "audience_vote_round_song_idx" ON "audience_vote" ("round_id","song_id");
--> statement-breakpoint
ALTER TABLE "setlist_sheet" ADD COLUMN "kind" text;
