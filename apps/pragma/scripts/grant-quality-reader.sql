-- Run once per cluster by the operator, not by the migration runner: a role is
-- cluster state, and migrations run once per schema (ADR-0035). From the
-- psql session `APP=pragma ./scripts/dsql-shell.sh` opens:
--   \set quality_read_role_arn 'arn:aws:iam::<account>:role/QualityReadRole'
--   \i apps/pragma/scripts/grant-quality-reader.sql
CREATE ROLE quality_reader WITH LOGIN;
AWS IAM GRANT quality_reader TO :'quality_read_role_arn';
GRANT USAGE ON SCHEMA prod TO quality_reader;
GRANT SELECT ON prod.improvement TO quality_reader;
