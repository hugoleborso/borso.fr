CREATE TABLE "app_config" (
	"id" text PRIMARY KEY NOT NULL,
	"hmac_key" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "operator_credential" (
	"id" uuid PRIMARY KEY NOT NULL,
	"password_hash" text NOT NULL,
	"session_epoch" integer NOT NULL,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "review_event" (
	"id" uuid PRIMARY KEY NOT NULL,
	"card_id" text NOT NULL,
	"outcome" text NOT NULL,
	"reviewed_at" timestamp with time zone NOT NULL,
	"calendar_day" text NOT NULL,
	"device_id" uuid NOT NULL,
	"received_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sign_in_attempt" (
	"address_hash" text PRIMARY KEY NOT NULL,
	"attempt_count" integer NOT NULL,
	"window_started_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE INDEX "review_event_received" ON "review_event" USING btree ("received_at","id");