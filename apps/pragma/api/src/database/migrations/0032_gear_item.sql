-- A gear item is one thing the band needs at one concert, planned a week
-- ahead. It is held by exactly one of a member (status have), the venue
-- (status asked_of_venue) or nobody yet (status to_find), so member_id is
-- set if and only if status is have. Its id is chosen by the device that
-- creates it, so a retried create lands on the same row.
--
-- No foreign keys (ADR-2026-06-06T1326): the service claims the concert and
-- the member in the same transaction as the write. The index is emitted
-- plain and the migration runner rewrites it to CREATE INDEX ASYNC.
CREATE TABLE IF NOT EXISTS "gear_item" (
	"id" uuid PRIMARY KEY NOT NULL,
	"session_id" uuid NOT NULL,
	"label" text NOT NULL,
	"status" text NOT NULL,
	"member_id" uuid,
	"position" integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "gear_item_session_position_idx" ON "gear_item" ("session_id","position");
