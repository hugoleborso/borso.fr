CREATE TABLE "loop_punch_claims" (
	"edition_slug" text NOT NULL,
	"runner_slug" text NOT NULL,
	"loop_index" integer NOT NULL,
	"punch_id" uuid NOT NULL,
	CONSTRAINT "loop_punch_claims_edition_slug_runner_slug_loop_index_pk" PRIMARY KEY("edition_slug","runner_slug","loop_index")
);
--> statement-breakpoint
INSERT INTO "loop_punch_claims" ("edition_slug", "runner_slug", "loop_index", "punch_id") SELECT "edition_slug", "runner_slug", "loop_index", "id" FROM "loop_punches" WHERE "voided_at" IS NULL ON CONFLICT DO NOTHING;
