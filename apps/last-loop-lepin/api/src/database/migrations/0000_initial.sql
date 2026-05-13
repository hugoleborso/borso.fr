CREATE TABLE "auth_attempts" (
	"ip_address" text PRIMARY KEY NOT NULL,
	"count" integer DEFAULT 0 NOT NULL,
	"window_started_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "editions" (
	"slug" text PRIMARY KEY NOT NULL,
	"display_name" text NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"sunrise_at" timestamp with time zone NOT NULL,
	"sunset_at" timestamp with time zone NOT NULL,
	"interval_min" integer DEFAULT 60 NOT NULL,
	"gpx" text NOT NULL,
	"status" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "loop_punches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"edition_slug" text NOT NULL,
	"runner_slug" text NOT NULL,
	"loop_index" integer NOT NULL,
	"finished_at" timestamp with time zone NOT NULL,
	"corrected_at" timestamp with time zone,
	"voided_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "manual_dnfs" (
	"edition_slug" text NOT NULL,
	"runner_slug" text NOT NULL,
	"out_at_loop" integer NOT NULL,
	"reason" text NOT NULL,
	"decided_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "manual_dnfs_edition_slug_runner_slug_pk" PRIMARY KEY("edition_slug","runner_slug")
);
--> statement-breakpoint
CREATE TABLE "runners" (
	"edition_slug" text NOT NULL,
	"slug" text NOT NULL,
	"display_name" text NOT NULL,
	"photo_key" text,
	"bib" integer,
	CONSTRAINT "runners_edition_slug_slug_pk" PRIMARY KEY("edition_slug","slug")
);
--> statement-breakpoint
CREATE UNIQUE INDEX "loop_punches_active_uq" ON "loop_punches" USING btree ("edition_slug","runner_slug","loop_index") WHERE voided_at IS NULL;