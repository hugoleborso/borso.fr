#!/usr/bin/env bash
# Pre-commit gate: every table a spec creates has a row in its Records table,
# answered by the operator.
#
# PR #327's spec defined a composition as a song with `origin = original`,
# because the existing screen read songs that way, and created inspirations
# from the library page only. Nobody had asked the operator either question.
# He redrew both on the preview, which cost six commits, two more validation
# passes and a migration that recreated a table. See
# docs/dantotsus/the-operator-redrew-the-feature-on-the-preview.md.
#
# The rule: a spec.md holding `CREATE TABLE <name>` carries, under
# `### Records`, a row `| <name> | <its own record, or part of what> |
# <created from where> | <the operator's answer, dated YYYY-MM-DD> |`. The date
# is the part a script can hold: it says the answer was asked, not assumed.
#
# A spec already on main is not held to it, so editing an old spec, or merging
# main into a branch, does not reopen questions a merged feature settled. The
# check holds a spec while its branch writes it, which is when the operator is
# asked.
#
# Usage: scripts/check-spec-records.sh <file>...   (non-spec files are ignored)

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

DATE_PATTERN='[0-9]{4}-[0-9]{2}-[0-9]{2}'

failed=0
for spec in "$@"; do
  case "$spec" in
    */spec/spec.md | */spec.md) ;;
    *) continue ;;
  esac
  [ -f "$spec" ] || continue

  if git cat-file -e "origin/main:$spec" 2>/dev/null || git cat-file -e "MERGE_HEAD:$spec" 2>/dev/null; then
    continue
  fi

  tables="$(grep -oiE 'CREATE TABLE( IF NOT EXISTS)? [a-z_][a-z0-9_]*' "$spec" | awk '{print tolower($NF)}' | sort -u || true)"
  [ -n "$tables" ] || continue

  records="$(awk '/^### Records/{inside=1; next} /^#/{inside=0} inside' "$spec")"
  while IFS= read -r table; do
    row="$(grep -E "^\|[[:space:]]*\`?${table}\`?[[:space:]]*\|" <<<"$records" | head -1 || true)"
    if [ -z "$row" ]; then
      echo "  $spec creates table $table, and its ### Records table has no row for it" >&2
      failed=1
      continue
    fi
    cells="$(awk -F'|' '{print NF-2}' <<<"$row")"
    answer="$(awk -F'|' '{print $5}' <<<"$row")"
    if [ "$cells" -lt 4 ] || ! grep -qE "$DATE_PATTERN" <<<"$answer"; then
      echo "  $spec: the Records row for $table needs four cells, the last one the operator's dated answer: $row" >&2
      failed=1
    fi
  done <<<"$tables"
done

if [ "$failed" -ne 0 ]; then
  echo >&2
  echo "Ask the operator, one closed question per table, before the plan starts:" >&2
  echo "is it its own record or part of another one, and where is it created from?" >&2
  echo "Write the answer under ### Records as | table | own record or part of | created from | answer, YYYY-MM-DD |." >&2
  echo "See docs/dantotsus/the-operator-redrew-the-feature-on-the-preview.md." >&2
  exit 1
fi
