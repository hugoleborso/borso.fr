-- A take is one recording of one song, optionally from one session. Its
-- id is chosen by the device that recorded it, so a retried create after
-- a lost answer lands on the same row instead of a second one.
--
-- No foreign keys (ADR-0006) and no DEFAULT now(): created_at comes from
-- the service's injected clock, which migrations.audit.test.ts gates. The
-- indexes are emitted plain and the migration runner rewrites them to
-- CREATE INDEX ASYNC.
CREATE TABLE IF NOT EXISTS "take" (
	"id" uuid PRIMARY KEY NOT NULL,
	"song_id" uuid NOT NULL,
	"session_id" uuid,
	"member_id" uuid NOT NULL,
	"object_key" text NOT NULL,
	"content_type" text NOT NULL,
	"duration_seconds" integer NOT NULL,
	"recorded_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "take_song_recorded_idx" ON "take" ("song_id","recorded_at");
--> statement-breakpoint
-- A take comment carries an optional moment in seconds: with one it is a
-- mark on the take's timeline, without one it sits in the thread only.
CREATE TABLE IF NOT EXISTS "take_comment" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"take_id" uuid NOT NULL,
	"member_id" uuid NOT NULL,
	"body" text NOT NULL,
	"at_seconds" integer,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "take_comment_take_created_idx" ON "take_comment" ("take_id","created_at");
--> statement-breakpoint
-- One device of one member that accepted notifications. ADR-0040 keeps
-- this table out of every preview clone, so a preview never pushes to the
-- band's phones.
CREATE TABLE IF NOT EXISTS "push_subscription" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"member_id" uuid NOT NULL,
	"endpoint" text NOT NULL,
	"p256dh" text NOT NULL,
	"auth" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "push_subscription_endpoint_idx" ON "push_subscription" ("endpoint");
--> statement-breakpoint
-- A missing row reads as enabled, so a member who turns push on for the
-- first time needs no row per category.
CREATE TABLE IF NOT EXISTS "notification_preference" (
	"member_id" uuid NOT NULL,
	"category" text NOT NULL,
	"enabled" boolean NOT NULL,
	CONSTRAINT "notification_preference_pk" PRIMARY KEY("member_id","category")
);
--> statement-breakpoint
-- When a notification group last sent, so a burst of writes to the same
-- setlist or session sends once per window.
CREATE TABLE IF NOT EXISTS "notification_dispatch" (
	"group_key" text PRIMARY KEY NOT NULL,
	"last_sent_at" timestamp with time zone NOT NULL
);
