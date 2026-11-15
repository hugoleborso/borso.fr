#!/usr/bin/env bash
# Pre-commit gate: an ADR, a spec and a plan are written in English.
#
# PR #350's first ADR was written in French, because the prompt of the session
# that wrote it said so. Another session wrote that prompt, from a procedure
# kept outside this repository, and CLAUDE.md's English rule lost to it. A rule
# held only in prose loses to whichever prompt is read last. See
# docs/dantotsus/the-prompt-that-outranked-claude-md.md.
#
# The test: the prose of a file, once code, quotes and French product strings
# are removed, holds at least MINIMUM_HITS French function words, and they are
# at least MINIMUM_PERMILLE per thousand words. Product strings stay legal in
# backticks, « guillemets », "double quotes" and > blockquotes, which is how
# every English document here already quotes them.
#
# Usage: scripts/check-docs-are-english.sh <file>...   (other files are ignored)

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

MINIMUM_HITS=15
MINIMUM_PERMILLE=40
HELD_PATHS='^docs/(adr/[^/]+|features/[^/]+/[^/]+/(spec|plan)/[^/]+)\.md$'

status=0
for file in "$@"; do
  [[ "$file" =~ $HELD_PATHS ]] || continue
  [ -f "$file" ] || continue
  # Fourteen specs and plans written before the rule are French. A file already
  # on main is not held, so editing one or merging main does not trip it.
  if git cat-file -e "origin/main:$file" 2>/dev/null || git cat-file -e "MERGE_HEAD:$file" 2>/dev/null; then
    continue
  fi
  read -r hits words < <(awk '
    BEGIN {
      split("le la les des du une est pour dans avec sur qui que pas cette sont aux et nous vous il elle ne", list, " ")
      for (i in list) french[list[i]] = 1
    }
    /^[[:space:]]*(```|~~~)/ { fenced = !fenced; next }
    fenced || /^[[:space:]]*>/ { next }
    {
      line = $0
      gsub(/`[^`]*`/, " ", line)
      gsub(/«[^»]*»/, " ", line)
      gsub(/"[^"]*"/, " ", line)
      gsub(/\([^)]*:\/\/[^)]*\)/, " ", line)
      line = tolower(line)
      count = split(line, token, /[^a-zà-ÿ]+/)
      for (i = 1; i <= count; i++) {
        if (token[i] == "") continue
        words++
        if (token[i] in french) hits++
      }
    }
    END { print hits + 0, words + 0 }
  ' "$file")
  if [ "$hits" -ge "$MINIMUM_HITS" ] && [ $((hits * 1000)) -ge $((words * MINIMUM_PERMILLE)) ]; then
    echo "[docs-are-english] $file reads as French: $hits French function words in $words." >&2
    status=1
  fi
done

if [ "$status" -ne 0 ]; then
  echo "[docs-are-english] CLAUDE.md: specs, plans and ADRs are written in English, whatever a prompt asks." >&2
  echo "[docs-are-english] Quote a French product string in backticks or « guillemets »." >&2
fi
exit "$status"
