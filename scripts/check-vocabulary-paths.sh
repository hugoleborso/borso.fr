#!/usr/bin/env bash
# Fails when an application's VOCABULARY.md points a term at a folder that is
# not there, or sources a claim from a comment.
#
# A vocabulary is prose, so nothing about it can be checked mechanically except
# the one part that is a fact: each term names the folder that owns it, on a
# `Lives in:` line. That line is also the part that rots first, because a slice
# gets renamed by a change that has no reason to open this file.
#
# The second fact is newer: there are no comments in this code, so a vocabulary
# sentence saying a file header names something is citing an artefact that
# cannot exist. That shape is worth refusing because it already decayed once —
# `self-punch.controller.ts` claimed a geofence was the only barrier, the
# vocabulary repeated the claim, and the geofence had been removed months
# earlier in 4bb4b78. See docs/dantotsus/a-comment-decayed-and-took-the-vocabulary-with-it.md.
#
# The rest of the document is a reviewer's job, and deliberately so. A gate that
# tried to check whether a definition is still true would be checking prose
# against code, which is the thing no rule can do.
set -euo pipefail

failed=0
found_any=0

for vocabulary in apps/*/VOCABULARY.md; do
  [ -f "$vocabulary" ] || continue
  found_any=1
  app_directory=$(dirname "$vocabulary")
  while IFS= read -r target; do
    [ -n "$target" ] || continue
    if [ ! -e "$app_directory/$target" ] && [ ! -e "$app_directory/${target%/}" ]; then
      echo "  $vocabulary points at $target, which is not in $app_directory" >&2
      failed=1
    fi
  done < <(grep -oE '^Lives in: `[^`]+`' "$vocabulary" | sed -E 's/^Lives in: `([^`]+)`/\1/')

  while IFS= read -r citation; do
    [ -n "$citation" ] || continue
    echo "  $vocabulary sources a claim from a comment: $citation" >&2
    failed=1
  done < <(grep -nEi '(file )?header (names|says|records|states)|the comment (above|beside|on)' "$vocabulary" || true)
done

if [ "$found_any" -eq 0 ]; then
  echo "[check-vocabulary-paths] no application ships a VOCABULARY.md"
  exit 0
fi

if [ "$failed" -ne 0 ]; then
  echo >&2
  echo "A term whose folder moved is a term nobody will trust again, and a" >&2
  echo "definition sourced from a comment cites something this repository" >&2
  echo "no longer has. State the rule, or point at the test that holds it." >&2
  exit 1
fi

echo "[check-vocabulary-paths] every term names a folder that exists and cites no comment"
