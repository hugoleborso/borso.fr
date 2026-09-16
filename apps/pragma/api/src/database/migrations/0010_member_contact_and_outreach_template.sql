-- Two things the booking pitch needs: the contact details a member signs the
-- message with, and the message itself.
--
-- Aurora DSQL accepts `ADD COLUMN column_name data_type` and no constraint
-- clause at all: no NOT NULL, no DEFAULT, and no ALTER COLUMN afterwards to
-- add either (DSQL §10, and docs/dantotsus/dsql-alter-table-only-add-column).
-- `phone` and `email` are therefore nullable, and a member who has filled in
-- neither simply signs with nothing.
--
-- `outreach_template` holds one row, keyed on a fixed id the way `app_config`
-- already is. No row means the band never edited the pitch and the front end
-- renders the translated default.
--
-- Every statement is re-runnable on its own: DSQL forbids multi-DDL
-- transactions, so a migration interrupted partway restarts from the first
-- statement with no marker written (DSQL §3, §4).
ALTER TABLE "member" ADD COLUMN IF NOT EXISTS "phone" text;
--> statement-breakpoint
ALTER TABLE "member" ADD COLUMN IF NOT EXISTS "email" text;
--> statement-breakpoint
CREATE TABLE "outreach_template" (
	"id" integer PRIMARY KEY NOT NULL,
	"body" text NOT NULL
);
