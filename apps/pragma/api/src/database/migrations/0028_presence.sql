-- A presence is one member opening the app on one calendar day in Paris.
-- It lights that member's flame the way a study did, and replaces the
-- study as the way a member keeps the flame alive. The two-column primary
-- key makes every later opening of the same day a no-op rather than a row.
--
-- No foreign keys (ADR-2026-06-06T1326) and no DEFAULT now(): created_at
-- comes from the service's injected clock, which migrations.audit.test.ts
-- gates.
CREATE TABLE IF NOT EXISTS "presence" (
	"member_id" uuid NOT NULL,
	"present_on" date NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	CONSTRAINT "presence_pk" PRIMARY KEY("member_id","present_on")
);
