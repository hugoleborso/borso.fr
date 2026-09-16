-- A bar names the band member who carries the conversation with it.
--
-- Aurora DSQL accepts `ADD COLUMN column_name data_type` and no constraint
-- clause at all: no NOT NULL, no DEFAULT, no REFERENCES, and no ALTER COLUMN
-- afterwards to add one (DSQL §10, and docs/dantotsus/dsql-alter-table-only-add-column).
-- The column is therefore a plain nullable uuid, and a bar with no owner is
-- read as unowned rather than as an error. Member deletion clears the column
-- in the same transaction that deletes the member.
ALTER TABLE "bar" ADD COLUMN IF NOT EXISTS "owner_member_id" uuid;
