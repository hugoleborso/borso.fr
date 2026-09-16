-- The band's own backlog of improvements to this application: one row per
-- idea, and one vote row per member who wants it.
--
-- `created_at` is written by the application rather than by a DEFAULT now(),
-- which the migration audit refuses for a business column, and which would
-- also make a test unable to place a row in time.
--
-- Aurora DSQL forbids multi-DDL transactions, so every statement here is
-- re-runnable on its own and the runner injects IF NOT EXISTS into the
-- CREATE statements (DSQL section 3 and section 4).
CREATE TABLE "improvement" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"details" text DEFAULT '' NOT NULL,
	"status" text NOT NULL,
	"author_member_id" uuid NOT NULL,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "improvement_vote" (
	"improvement_id" uuid NOT NULL,
	"member_id" uuid NOT NULL,
	"cast_at" timestamp with time zone NOT NULL,
	CONSTRAINT "improvement_vote_improvement_id_member_id_pk" PRIMARY KEY("improvement_id","member_id")
);
--> statement-breakpoint
CREATE INDEX "improvement_vote_improvement_id_idx" ON "improvement_vote" ("improvement_id");
