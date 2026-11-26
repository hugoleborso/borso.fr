-- The gear checklist replaced the free-text gear of a concert. DSQL refuses
-- DROP COLUMN, so the column stays, and this erases the text it held
-- (operator, 2026-11-26). No code reads or writes the column any more.
UPDATE "session" SET "gear" = NULL WHERE "gear" IS NOT NULL;
