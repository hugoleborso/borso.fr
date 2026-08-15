CREATE TABLE IF NOT EXISTS "shelf" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "book" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"author" text NOT NULL,
	"status" text NOT NULL,
	"rating" integer,
	"notes" text DEFAULT '' NOT NULL,
	"started_at" date,
	"finished_at" date,
	"isbn" text,
	"cover_url" text,
	"shelf_id" uuid
);
