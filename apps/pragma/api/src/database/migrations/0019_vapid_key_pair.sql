-- The stage's VAPID key pair (ADR-0040, revision 2026-10-24). The API
-- generates it the first time push needs it, always under id 1, so the
-- primary key keeps one pair when two first uses race. The preview clone
-- blocklists this table, so a preview generates a pair of its own and never
-- signs with production's.
CREATE TABLE IF NOT EXISTS "vapid_key_pair" (
	"id" integer PRIMARY KEY NOT NULL,
	"public_key" text NOT NULL,
	"private_key" text NOT NULL
);
