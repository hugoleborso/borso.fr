CREATE TABLE "app_config" (
	"id" integer PRIMARY KEY NOT NULL,
	"password_hash" text NOT NULL,
	"hmac_key" bytea NOT NULL,
	"rotated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "app_config_singleton" CHECK ("id" = 1)
);
--> statement-breakpoint
CREATE TABLE "auth_attempt" (
	"ip_hash" text PRIMARY KEY NOT NULL,
	"count" integer DEFAULT 0 NOT NULL,
	"window_started_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "member" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"first_name" text NOT NULL,
	"color" text NOT NULL,
	"avatar_s3_key" text
);
--> statement-breakpoint
CREATE TABLE "instrument" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"is_harmonic" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "song" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"status" text NOT NULL,
	"links" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"chart" jsonb,
	"tonality_start" text,
	"tonality_end" text,
	"default_lineup" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mastery_default" (
	"member_id" uuid NOT NULL,
	"instrument_id" uuid NOT NULL,
	"score" integer NOT NULL,
	CONSTRAINT "mastery_default_member_id_instrument_id_pk" PRIMARY KEY("member_id","instrument_id")
);
--> statement-breakpoint
CREATE TABLE "mastery_override" (
	"member_id" uuid NOT NULL,
	"instrument_id" uuid NOT NULL,
	"song_id" uuid NOT NULL,
	"score" integer NOT NULL,
	CONSTRAINT "mastery_override_member_id_instrument_id_song_id_pk" PRIMARY KEY("member_id","instrument_id","song_id")
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" text NOT NULL,
	"date" timestamp with time zone NOT NULL,
	"prepared_concert_id" uuid,
	"venue" text,
	"capacity" integer,
	"gear" text,
	"friends_count_per_member" jsonb
);
--> statement-breakpoint
CREATE TABLE "setlist" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	CONSTRAINT "setlist_session_id_unique" UNIQUE ("session_id")
);
--> statement-breakpoint
CREATE TABLE "setlist_entry" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"setlist_id" uuid NOT NULL,
	"song_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"lineup_override" jsonb,
	"energy" integer
);
--> statement-breakpoint
CREATE INDEX "setlist_entry_setlist_id_position_idx" ON "setlist_entry" ("setlist_id","position");
--> statement-breakpoint
CREATE TABLE "transition_comment" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"song_a_id" uuid NOT NULL,
	"song_b_id" uuid NOT NULL,
	"comment" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "transition_comment_ordered_pair" ON "transition_comment" ("song_a_id","song_b_id");
--> statement-breakpoint
CREATE TABLE "bar" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"status" text NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"last_interaction_at" timestamp with time zone
);
