#!/usr/bin/env bash
# Fails when an application's VOCABULARY.md points a term at a folder that is
# not there.
#
# A vocabulary is prose, so nothing about it can be checked mechanically except
# the one part that is a fact: each term names the folder that owns it, on a
# `Lives in:` line. That line is also the part that rots first, because a slice
# gets renamed by a change that has no reason to open this file.
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
done

if [ "$found_any" -eq 0 ]; then
  echo "[check-vocabulary-paths] no application ships a VOCABULARY.md"
  exit 0
fi

if [ "$failed" -ne 0 ]; then
  echo >&2
  echo "A term whose folder moved is a term nobody will trust again." >&2
  exit 1
fi

echo "[check-vocabulary-paths] every term names a folder that exists"
