#!/usr/bin/env bash
# Two migrations claiming the same number, and now something says so.
#
# Two branches open at once each added `0006_…sql`, `0007_…sql` and
# `0008_…sql` to the same folder. Nothing failed: the runner tracks applied
# migrations by filename, so every file still ran exactly once, and the
# duplicates only surfaced when a human read the folder. But the number is
# the only thing that orders one migration against another, and two files
# sharing one number order nothing — the sort falls back to the slug, so
# `0006_bar_owner.sql` runs before `0006_deezer_identifiers.sql` because "b"
# precedes "d", which is not a fact anybody decided.
#
# The collision is invisible to each branch on its own and appears only in
# the merge, which is exactly when nobody is looking at migration numbers.
#
# See docs/dantotsus/two-branches-that-both-claimed-migration-0006.md.
set -euo pipefail

cd "$(dirname "$0")/.."

failed=0

for migrations_dir in apps/*/api/src/database/migrations; do
  [ -d "$migrations_dir" ] || continue

  duplicates=$(
    find "$migrations_dir" -maxdepth 1 -name '*.sql' -printf '%f\n' |
      sed -n 's/^\([0-9][0-9]*\)_.*/\1/p' |
      sort | uniq -d
  )

  while IFS= read -r number; do
    [ -n "$number" ] || continue
    claimants=$(find "$migrations_dir" -maxdepth 1 -name "${number}_*.sql" -printf '%f ' )
    echo "[check-migration-numbers] $migrations_dir: ${number} is claimed by more than one migration: ${claimants}" >&2
    failed=1
  done <<<"$duplicates"
done

if [ "$failed" -ne 0 ]; then
  echo "[check-migration-numbers] renumber the later migration so the sequence orders itself." >&2
  exit 1
fi

echo "[check-migration-numbers] every migration number is claimed once"
