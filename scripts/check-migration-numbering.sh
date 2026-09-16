#!/usr/bin/env bash
# One number, one migration.
#
# The runner applies migrations in filename order and records each applied
# name in a table, so two files sharing a numeric prefix both run and their
# relative order is decided by whatever follows the number. That is a coin
# toss dressed as a sequence: `0006_deezer_identifiers.sql` ran before
# `0006_tasks_and_song_origin.sql` because `d` sorts before `t`, and nothing
# said it had to.
#
# It happens without anyone being careless. Two branches open at the same
# time each read the tree, each see the highest number, and each take the
# next one. Neither conflicts with the other — the files have different
# names — so git merges them cleanly and the collision reaches main silently.
# That is PR #100 and PR #101, merged an hour apart on 2026-09-16.
#
# The fix is a rename on the branch that lands second, which costs nothing
# while the migration has only ever run against a preview database whose
# statements are all IF NOT EXISTS. It costs a great deal once the number is
# in prod's applied table under the other file's name.
#
# See docs/dantotsus/two-branches-took-the-same-migration-number.md.
set -euo pipefail

cd "$(dirname "$0")/.."

failed=0

for migrations_dir in apps/*/api/src/database/migrations; do
  [ -d "$migrations_dir" ] || continue

  duplicates="$(
    find "$migrations_dir" -maxdepth 1 -name '*.sql' -printf '%f\n' |
      sed -n 's/^\([0-9][0-9]*\)_.*/\1/p' |
      sort | uniq -d
  )"

  for number in $duplicates; do
    failed=1
    echo "[check-migration-numbering] $migrations_dir: ${number} is taken twice:" >&2
    find "$migrations_dir" -maxdepth 1 -name "${number}_*.sql" -printf '  %f\n' | sort >&2
  done
done

if [ "$failed" -ne 0 ]; then
  echo "[check-migration-numbering] Two migrations sharing a number apply in an order" >&2
  echo "  nobody chose. Renumber the one that landed second to the next free number;" >&2
  echo "  every statement in these migrations is re-runnable, so a file that already" >&2
  echo "  ran on a preview database runs again as a no-op under its new name." >&2
  exit 1
fi

echo "[check-migration-numbering] every migration holds a number of its own"
