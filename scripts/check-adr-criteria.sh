#!/usr/bin/env bash
# An ADR lists its criteria before its options, and the operator named at
# least one of them.
#
# ADR-202611031438 was first written with criteria the author chose, in a
# rubric placed after the options. The operator read it and named the two
# that mattered, whether the choice changes the app and how much of it the
# library covers, and neither was there. Criteria written after the options
# justify a choice rather than test it.
#
# This refuses an ADR, from 202611031438 on, that has no `## Criteria`
# section before `## Decision`, no `Raised by` column, or no row raised by
# the operator. Older records keep their shape.
#
# See .claude/skills/adr/standard.md, section 6.
set -euo pipefail

cd "$(dirname "$0")/.."

readonly FIRST_CHECKED_ID=202611031438
failures=0

for record in docs/adr/[0-9]*.md; do
  id="$(basename "$record" | cut -d- -f1)"
  [[ ${#id} -eq 12 && "$id" -ge "$FIRST_CHECKED_ID" ]] || continue
  criteria_line="$(grep -n '^## Criteria$' "$record" | head -1 | cut -d: -f1 || true)"
  decision_line="$(grep -n '^## Decision$' "$record" | head -1 | cut -d: -f1 || true)"
  if [[ -z "$criteria_line" || -z "$decision_line" || "$criteria_line" -gt "$decision_line" ]]; then
    echo "[check-adr-criteria] $record: no ## Criteria section before ## Decision" >&2
    failures=$((failures + 1))
    continue
  fi
  section="$(sed -n "${criteria_line},${decision_line}p" "$record")"
  if ! grep -q '| Raised by |' <<<"$section"; then
    echo "[check-adr-criteria] $record: the criteria table has no Raised by column" >&2
    failures=$((failures + 1))
  elif ! grep -qE '^\|[^|]+\| operator \|' <<<"$section"; then
    echo "[check-adr-criteria] $record: no criterion was raised by the operator; ask for theirs" >&2
    failures=$((failures + 1))
  fi
done

if [[ "$failures" -gt 0 ]]; then
  echo "[check-adr-criteria] Criteria come before the options, and the operator names at least one." >&2
  echo "[check-adr-criteria] See .claude/skills/adr/standard.md, section 6." >&2
  exit 1
fi
echo "[check-adr-criteria] every ADR from ${FIRST_CHECKED_ID} lists its criteria first, with the operator's"
