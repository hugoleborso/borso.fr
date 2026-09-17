#!/usr/bin/env bash
# An ADR number has to resolve to one record, everywhere it appears.
#
# An ADR is cited by number, from the standards, from CLAUDE.md, from other
# ADRs and from `/open-pr`, which pulls every record a branch references into
# the pull-request body. The filename carries the number a citation resolves
# to; the heading carries the number a reader sees. Nothing kept them equal.
#
# They came apart the one way they can: a renumber. Two branches open at once
# each took 0015 and 0016 — one for per-member credentials, one for the
# audience vote — and git merged both because the slugs differ. Resolving it
# renamed the second pair to 0019 and 0020, and the rename moved the filename
# while the heading of `0020-qrcode-react-…` went on reading `ADR-0016:` for a
# day. A reader opening it would have been told, by the document itself, that
# it was a record about passkeys.
#
# The collision itself is refused by check-numbered-sequences.sh. This refuses
# its aftermath, which is the half a gate on numbers cannot see: the rename
# that fixes the folder and forgets the file.
#
# Only the number is checked, not the punctuation around it. Seven records
# predate the `ADR-0018: …` shape and write `ADR 0001 — …` or `ADR-0005 — …`;
# their numbers are right and a gate that renamed seven headings to buy
# consistency would be spending a reviewer's attention on nothing.
#
# See docs/dantotsus/an-adr-number-goes-to-whoever-writes-it-first.md.
set -euo pipefail

cd "$(dirname "$0")/.."

failed=0

for record in docs/adr/[0-9]*.md; do
  [ -f "$record" ] || continue

  filename_number="$(basename "$record" | sed -n 's/^\([0-9][0-9]*\)-.*/\1/p')"
  [ -n "$filename_number" ] || continue

  heading="$(head -n 1 "$record")"
  heading_number="$(echo "$heading" | sed -n 's/^#[[:space:]]*ADR[ -]\{0,1\}\([0-9][0-9]*\).*/\1/p')"

  if [ -z "$heading_number" ]; then
    failed=1
    echo "[check-adr-numbers-resolve] $record: the heading states no number" >&2
    echo "    $heading" >&2
    continue
  fi

  if [ "$heading_number" != "$filename_number" ]; then
    failed=1
    echo "[check-adr-numbers-resolve] $record: the heading says ${heading_number}" >&2
    echo "    $heading" >&2
  fi
done

INDEX="docs/adr/README.md"

for record in docs/adr/[0-9]*.md; do
  [ -f "$record" ] || continue
  filename="$(basename "$record")"
  if ! grep -q "](\./${filename})" "$INDEX"; then
    failed=1
    echo "[check-adr-numbers-resolve] $record is in no row of the index" >&2
  fi
done

for linked in $(sed -n 's/.*](\.\/\([0-9][^)]*\.md\)).*/\1/p' "$INDEX" | sort -u); do
  if [ ! -f "docs/adr/${linked}" ]; then
    failed=1
    echo "[check-adr-numbers-resolve] the index links docs/adr/${linked}, which does not exist" >&2
  fi
done

if [ "$failed" -ne 0 ]; then
  echo "[check-adr-numbers-resolve] An ADR is cited by number. The filename is what" >&2
  echo "  a citation resolves to and the heading is what a reader sees, so the two disagreeing" >&2
  echo "  sends the reader to a record about something else. This happens on a renumber — fix" >&2
  echo "  the heading to match the file it is in. The index is the third place a number" >&2
  echo "  appears, and the one nobody rereads: every record gets a row, and every row a file." >&2
  exit 1
fi

echo "[check-adr-numbers-resolve] every ADR number resolves the same way in its filename, its heading and the index"
