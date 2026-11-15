-- The flame counts presence days and session days only, so no code reads
-- or writes the study table of 0015 any more. The operator confirmed the
-- drop of its rows. mastery_score_change, created by the same 0015, stays.
DROP TABLE IF EXISTS "study";
