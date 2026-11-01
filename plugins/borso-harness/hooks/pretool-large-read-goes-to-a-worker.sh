#!/usr/bin/env bash
# PreToolUse hook for full reads of large text files.
#
# Refuses a Read with no `limit` on a text file over 350 lines. A full read
# lands the whole file in the main context, and every later turn pays it again
# as cache reads. Most questions about a large file need one function or one
# section, which `Grep`, a `Read` with `offset`/`limit`, or a Haiku subagent
# (`Agent` with `model: "haiku"`) answers for a fraction of the tokens.
#
# Exempt: images, PDFs and notebooks (the Read tool renders them, line count
# means nothing), and `VOCABULARY.md`, which CLAUDE.md asks to be read whole.
# A read that needs the exact content anyway (debugging, architecture) passes
# `limit` set to the file's length, which states the intent on the call.
#
# Output contract: exit 0 lets the read run, exit 2 + stderr blocks it.

set -euo pipefail

MAX_LINES=350
INPUT="$(cat)"

FILE="$(jq -r '.tool_input.file_path // ""' <<<"$INPUT")"
LIMIT="$(jq -r '.tool_input.limit // ""' <<<"$INPUT")"

[[ -z "$FILE" || -n "$LIMIT" || ! -f "$FILE" ]] && exit 0
case "$FILE" in
  *.png|*.jpg|*.jpeg|*.gif|*.webp|*.pdf|*.ipynb|*/VOCABULARY.md) exit 0 ;;
esac

LINES="$(wc -l <"$FILE")"
(( LINES <= MAX_LINES )) && exit 0

{
  echo "[large-read] $FILE has $LINES lines (limit $MAX_LINES for a full read)."
  echo "[large-read] Pick the cheapest tool that answers the question:"
  echo "[large-read]   Grep for the symbol, then Read with offset/limit around it."
  echo "[large-read]   Agent with model \"haiku\" to read it and return only the answer."
  echo "[large-read] Need the exact whole content (debugging, architecture)? Read again with limit: $LINES."
} >&2
"$(dirname "$0")/kaizen-refusal.sh" large-read "tried a full read of a file over $MAX_LINES lines" || true
exit 2
