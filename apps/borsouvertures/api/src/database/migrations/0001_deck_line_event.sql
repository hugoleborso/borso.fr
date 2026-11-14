CREATE TABLE "deck_line_event" (
	"id" uuid PRIMARY KEY NOT NULL,
	"kind" text NOT NULL,
	"side" text NOT NULL,
	"moves_uci" text NOT NULL,
	"opening_name" text,
	"occurred_at" timestamp with time zone NOT NULL,
	"calendar_day" text NOT NULL,
	"device_id" uuid NOT NULL,
	"received_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE INDEX "deck_line_event_received" ON "deck_line_event" USING btree ("received_at","id");