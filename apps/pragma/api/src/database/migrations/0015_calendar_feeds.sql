-- A member's secret iCal address, read by the free-slot calculator.
-- It lives in a table of its own, not as a column on "member", so the
-- per-stage database role and the preview clone's tableBlocklist can
-- treat it on its own, and no read of "member" ever carries it. See
-- ADR-0023 and ADR-0024.
CREATE TABLE "member_calendar_feed" (
	"member_id" uuid PRIMARY KEY NOT NULL,
	"address" text NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
-- Records where a session was created from, so the share of practices
-- booked from a free slot can be read back. Nullable for every session
-- created before this column, and for every session created by hand.
ALTER TABLE "session" ADD COLUMN "origin" text;
