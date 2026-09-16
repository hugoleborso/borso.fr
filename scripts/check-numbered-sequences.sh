#!/usr/bin/env bash
# One number, one file — in every folder where the number is the order.
#
# Some folders in this repository are sequences: the leading number is not a
# label, it is the position. Migrations apply in filename order. ADRs are
# cited by number and never recycled. In both, two files sharing a number
# order nothing, because the sort falls back to whatever follows it.
#
# The collision is invisible from either branch. Two branches open at once
# each read the tree, each see the highest number, each take the next one.
# The files have different names, so git merges them cleanly and the
# duplicate reaches main without a conflict.
#
# This script replaced two earlier ones. `check-migration-numbering.sh` and
# `check-migration-numbers.sh` were written a day apart by two kaizen sweeps
# that could not see each other, ran the same find-sed-sort-uniq over the
# same folders, and were both wired into pre-commit. The third occurrence,
# one ADR number taken twice, had no gate at all — which is what a
# per-folder-family script guarantees, because the next sequence needs a
# third script nobody writes.
#
# Adding a sequence is one line in SEQUENCE_GLOBS.
#
# See docs/dantotsus/the-loop-shipped-the-same-gate-twice.md and
# docs/dantotsus/an-adr-number-goes-to-whoever-writes-it-first.md.
set -euo pipefail

cd "$(dirname "$0")/.."

SEQUENCE_GLOBS=(
  'apps/*/api/src/database/migrations:sql:migration'
  'docs/adr:md:architecture decision record'
)

failed=0

for entry in "${SEQUENCE_GLOBS[@]}"; do
  directory_glob="${entry%%:*}"
  rest="${entry#*:}"
  extension="${rest%%:*}"
  subject="${rest#*:}"

  for directory in $directory_glob; do
    [ -d "$directory" ] || continue

    duplicates="$(
      find "$directory" -maxdepth 1 -name "*.${extension}" -printf '%f\n' |
        sed -n 's/^\([0-9][0-9]*\)[-_].*/\1/p' |
        sort | uniq -d
    )"

    for number in $duplicates; do
      failed=1
      echo "[check-numbered-sequences] $directory: ${number} is claimed by more than one ${subject}:" >&2
      find "$directory" -maxdepth 1 -name "${number}[-_]*.${extension}" -printf '  %f\n' | sort >&2
    done
  done
done

if [ "$failed" -ne 0 ]; then
  echo "[check-numbered-sequences] In these folders the number is the order, so two files" >&2
  echo "  sharing one order nothing. Renumber the one that landed second to the next free" >&2
  echo "  number. A migration is safe to renumber while it has only run against a preview:" >&2
  echo "  every statement is re-runnable, so the file runs again as a no-op under its new" >&2
  echo "  name. An ADR is safe to renumber until it is merged, after which its number is" >&2
  echo "  cited elsewhere and never recycled." >&2
  exit 1
fi

echo "[check-numbered-sequences] every number is claimed once, in $(( ${#SEQUENCE_GLOBS[@]} )) sequence families"
