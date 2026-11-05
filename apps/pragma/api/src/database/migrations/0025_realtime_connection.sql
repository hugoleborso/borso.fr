-- One row per open WebSocket a member's tab holds (live invalidation).
-- "client_id" is the random id the tab drew once, so a write never
-- tells its own tab that its data went stale. No foreign key on
-- "member_id": Aurora DSQL refuses them (DSQL §2).
CREATE TABLE IF NOT EXISTS "realtime_connection" (
	"connection_id" text PRIMARY KEY NOT NULL,
	"member_id" uuid NOT NULL,
	"client_id" text NOT NULL,
	"connected_at" timestamp with time zone DEFAULT now() NOT NULL
);
