#!/usr/bin/env bash
# Scan every drizzle-kit-emitted migration SQL file for DDL forms that
# Aurora DSQL rejects post-creation. The exhaustive list of supported
# ALTER TABLE actions is at
#   https://docs.aws.amazon.com/aurora-dsql/latest/userguide/alter-table-syntax-support.html
# and translates to: post-creation, the ONLY column-level action that
# accepts a column option is plain `ADD COLUMN <name> <type>` — no
# NOT NULL, no DEFAULT, no CHECK, no UNIQUE, no PK, no REFERENCES.
# Subsequent ALTER COLUMN to add NOT NULL / DEFAULT / TYPE is equally
# rejected; same for ADD CONSTRAINT (anything other than UNIQUE via an
# existing index) and DROP COLUMN.
#
# The local Postgres under `pnpm dev` accepts every one of these
# silently, which is the canonical trap: the back-e2e suite passes,
# preview deploys fail with "ALTER TABLE ADD COLUMN with constraint
# not supported" or similar. First-hand evidence in PR #23 — three
# successive failed deploys before the migration was rewritten.
#
# See docs/dantotsus/dsql-alter-table-only-add-column.md and
# docs/knowledge/dsql-postgres-compat-gaps.md §10.

set -euo pipefail

violations=()
glob_pattern='apps/*/api/src/database/migrations/*.sql'

while IFS= read -r -d '' file; do
  # Strip SQL comments BEFORE scanning so a comment that mentions
  # `NOT NULL DEFAULT 'x'` (documenting the trap, like in
  # 0001_self_punch_columns.sql) doesn't false-positive. The substitution
  # is line-by-line: drops anything from `--` to end-of-line.
  stripped=$(sed -e 's|--.*$||' "$file")

  # ADD COLUMN ... NOT NULL  (with or without DEFAULT)
  if echo "$stripped" | grep -qE -i 'ADD[[:space:]]+COLUMN[[:space:]]+[^,;]*NOT[[:space:]]+NULL'; then
    violations+=("$file: ADD COLUMN ... NOT NULL is rejected by DSQL — drop the constraint, do a separate UPDATE backfill, and rely on app-level invariants for nullability")
  fi

  # ADD COLUMN ... DEFAULT
  if echo "$stripped" | grep -qE -i 'ADD[[:space:]]+COLUMN[[:space:]]+[^,;]*DEFAULT[[:space:]]'; then
    violations+=("$file: ADD COLUMN ... DEFAULT is rejected by DSQL — drop the DEFAULT, set it in the drizzle write path instead")
  fi

  # ALTER COLUMN ... SET NOT NULL / DROP NOT NULL
  if echo "$stripped" | grep -qE -i 'ALTER[[:space:]]+COLUMN[[:space:]]+[^,;]*(SET|DROP)[[:space:]]+NOT[[:space:]]+NULL'; then
    violations+=("$file: ALTER COLUMN ... SET/DROP NOT NULL is rejected by DSQL — column NULL-ability cannot be changed after CREATE TABLE")
  fi

  # ALTER COLUMN ... SET DEFAULT / DROP DEFAULT
  if echo "$stripped" | grep -qE -i 'ALTER[[:space:]]+COLUMN[[:space:]]+[^,;]*(SET|DROP)[[:space:]]+DEFAULT'; then
    violations+=("$file: ALTER COLUMN ... SET/DROP DEFAULT is rejected by DSQL — column default cannot be changed after CREATE TABLE")
  fi

  # ALTER COLUMN ... TYPE
  if echo "$stripped" | grep -qE -i 'ALTER[[:space:]]+COLUMN[[:space:]]+[^,;]*TYPE[[:space:]]'; then
    violations+=("$file: ALTER COLUMN ... TYPE is rejected by DSQL — column type cannot be changed after CREATE TABLE")
  fi

  # ADD CONSTRAINT (any, except UNIQUE USING INDEX which is supported)
  if echo "$stripped" | grep -qE -i 'ADD[[:space:]]+CONSTRAINT' && \
     ! echo "$stripped" | grep -qE -i 'ADD[[:space:]]+CONSTRAINT[[:space:]]+[^,;]*UNIQUE[[:space:]]+USING[[:space:]]+INDEX'; then
    violations+=("$file: ADD CONSTRAINT is rejected by DSQL except in the UNIQUE-USING-INDEX form — rely on app-level invariants instead")
  fi

  # DROP COLUMN
  if echo "$stripped" | grep -qE -i 'DROP[[:space:]]+COLUMN'; then
    violations+=("$file: DROP COLUMN is rejected by DSQL — leave the column in place and stop reading it from the app")
  fi
done < <(find apps -maxdepth 6 -path "$glob_pattern" -print0 2>/dev/null)

if (( ${#violations[@]} > 0 )); then
  echo "DSQL-incompatible migration patterns detected:" >&2
  for violation in "${violations[@]}"; do
    echo "  - $violation" >&2
  done
  echo "" >&2
  echo "Aurora DSQL only accepts plain ALTER TABLE ADD COLUMN <type> post-creation." >&2
  echo "See docs/knowledge/dsql-postgres-compat-gaps.md §10 for the full list." >&2
  exit 1
fi
