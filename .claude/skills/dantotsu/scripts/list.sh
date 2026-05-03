#!/usr/bin/env bash
# List dantotsus with metadata extracted from YAML frontmatter.
#
# Default output: markdown table (sortable, paste-able).
# --json: line-delimited JSON (one entry per line, ndjson).
#
# Skips _template.md and README.md. Sorted by date (newest first).
#
# Usage:
#   .claude/skills/dantotsu/scripts/list.sh             # markdown table
#   .claude/skills/dantotsu/scripts/list.sh --json      # ndjson

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../.." && pwd)"
DIR="$REPO_ROOT/docs/dantotsus"
FORMAT="${1:-table}"

if [ ! -d "$DIR" ]; then
  echo "ERROR: $DIR does not exist" >&2
  exit 1
fi

# Extract a single scalar field from the YAML frontmatter at the top of a file.
# Frontmatter is the block between the first two '---' lines.
extract_field() {
  local file=$1
  local field=$2
  awk -v f="$field" '
    /^---$/ { c++; if (c == 2) exit; next }
    c == 1 {
      if (match($0, "^"f": *")) {
        v = substr($0, RLENGTH + 1)
        # strip trailing whitespace + comments
        sub(/[[:space:]]+#.*$/, "", v)
        sub(/[[:space:]]+$/, "", v)
        print v
        exit
      }
    }
  ' "$file"
}

extract_title() {
  awk '/^---$/{c++; next} c==2 && /^# /{sub(/^# /, ""); print; exit}' "$1"
}

json_escape() {
  # Minimal JSON escaping for the fields we emit. Quotes and backslashes only.
  printf '%s' "$1" | sed 's/\\/\\\\/g; s/"/\\"/g'
}

emit_table_header() {
  printf '| %s | %s | %s | %s | %s | %s |\n' \
    File Date Severity Level Tags Title
  printf '| %s | %s | %s | %s | %s | %s |\n' \
    --- --- --- --- --- ---
}

# Collect rows into an array so we can sort by date.
declare -a rows=()
shopt -s nullglob
for file in "$DIR"/*.md; do
  name=$(basename "$file")
  case "$name" in
    _template.md|README.md) continue ;;
  esac

  date=$(extract_field "$file" date)
  severity=$(extract_field "$file" severity)
  level=$(extract_field "$file" eradication-level)
  tags=$(extract_field "$file" tags)
  title=$(extract_title "$file")

  # Tab-separated row; date first so sort -k1 works.
  rows+=("${date}"$'\t'"${name}"$'\t'"${severity}"$'\t'"${level}"$'\t'"${tags}"$'\t'"${title}")
done

# Newest first.
mapfile -t sorted < <(printf '%s\n' "${rows[@]}" | sort -r -k1,1)

case "$FORMAT" in
  --json)
    for row in "${sorted[@]}"; do
      IFS=$'\t' read -r date name severity level tags title <<<"$row"
      printf '{"file":"%s","date":"%s","severity":"%s","level":"%s","tags":"%s","title":"%s"}\n' \
        "$(json_escape "$name")" \
        "$(json_escape "$date")" \
        "$(json_escape "$severity")" \
        "$(json_escape "$level")" \
        "$(json_escape "$tags")" \
        "$(json_escape "$title")"
    done
    ;;
  table|"")
    emit_table_header
    for row in "${sorted[@]}"; do
      IFS=$'\t' read -r date name severity level tags title <<<"$row"
      printf '| `%s` | %s | %s | %s | %s | %s |\n' \
        "$name" "$date" "$severity" "$level" "$tags" "$title"
    done
    ;;
  *)
    echo "Unknown format: $FORMAT (expected --json or no arg)" >&2
    exit 2
    ;;
esac
