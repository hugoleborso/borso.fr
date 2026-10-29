-- A task names at most one session (ADR-0050), so the session page and Home
-- read "who does what" for a practice or a concert with one filter on
-- "task". Nullable with no default and no foreign key, as DSQL requires on
-- ADD COLUMN: the task write claims the session row in its own transaction,
-- and deleting a session nulls this column on the tasks naming it.
ALTER TABLE "task" ADD COLUMN IF NOT EXISTS "session_id" uuid;
