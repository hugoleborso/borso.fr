#!/usr/bin/env bash
# Every Postgres startup parameter this repository sends to Aurora DSQL has to
# be one DSQL accepts. DSQL closes the connection on an unsupported one, so the
# failure lands at the first query of a deployed function and never in a test:
# a mocked driver takes any options object, which is how
# default_transaction_read_only passed 100% coverage and 100% mutation and
# failed on the first production read.
#
# The allow-list is what this repository has run against DSQL and seen work.
# Adding a parameter means proving it against a real cluster first, then adding
# it here in the same commit.
set -euo pipefail

PROVEN_PARAMETERS=(search_path application_name)

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

files=("$@")
if [ ${#files[@]} -eq 0 ]; then
  mapfile -t files < <(git ls-files 'apps/*.ts' 'infra/*.ts' | grep -v '\.test\.ts$' || true)
fi

[ ${#files[@]} -gt 0 ] || exit 0

proven_pattern="$(IFS='|'; printf '%s' "${PROVEN_PARAMETERS[*]}")"
violations=0

for file in "${files[@]}"; do
  [ -f "$file" ] || continue
  case "$file" in
    *.test.ts) continue ;;
    apps/*.ts | infra/*.ts) ;;
    *) continue ;;
  esac
  while IFS=: read -r line_number body; do
    [ -n "$line_number" ] || continue
    parameters="${body#*connection:}"
    parameters="${parameters%%\}*}"
    while read -r key; do
      [ -n "$key" ] || continue
      if ! grep -qE "^($proven_pattern)$" <<<"$key"; then
        printf '%s:%s: "%s" is not a DSQL startup parameter this repository has proven.\n' \
          "$file" "$line_number" "$key"
        printf '  DSQL closes the connection on an unsupported one, and a mocked driver accepts it.\n'
        printf '  Prove it against a cluster, then add it to PROVEN_PARAMETERS in %s.\n' \
          "scripts/check-dsql-connection-parameters.sh"
        violations=$((violations + 1))
      fi
    done < <(grep -oE '[A-Za-z_][A-Za-z0-9_]*[[:space:]]*:' <<<"$parameters" | tr -d ' :')
  done < <(grep -nE 'connection:[[:space:]]*\{' "$file" || true)
done

if [ "$violations" -gt 0 ]; then
  printf '[check-dsql-connection-parameters] %d unproven startup parameter(s).\n' "$violations"
  exit 1
fi

printf '[check-dsql-connection-parameters] every DSQL startup parameter is one this repository has proven\n'
