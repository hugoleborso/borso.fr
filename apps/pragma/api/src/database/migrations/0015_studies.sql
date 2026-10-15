-- A study is one member saying they worked one song on one instrument
-- on one calendar day in Paris. The four-column primary key is what makes
-- a second tap on the same day a no-op rather than a second row, so the
-- streak cannot be padded by tapping twice.
--
-- mastery_score_change is the history mastery_override never had: the
-- override row is overwritten in place, so until now no member could see
-- a score move. Every override write appends one row here in the same
-- transaction.
--
-- No foreign keys (ADR-0006) and no DEFAULT now(): created_at and
-- changed_at come from the service's injected clock, which
-- migrations.audit.test.ts gates. The index is emitted plain and the
-- migration runner rewrites it to CREATE INDEX ASYNC.
CREATE TABLE IF NOT EXISTS "study" (
	"member_id" uuid NOT NULL,
	"song_id" uuid NOT NULL,
	"instrument_id" uuid NOT NULL,
	"studied_on" date NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	CONSTRAINT "study_pk" PRIMARY KEY("member_id","song_id","instrument_id","studied_on")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "mastery_score_change" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"member_id" uuid NOT NULL,
	"instrument_id" uuid NOT NULL,
	"song_id" uuid NOT NULL,
	"score" integer NOT NULL,
	"changed_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE INDEX "mastery_score_change_song_idx" ON "mastery_score_change" ("song_id");
