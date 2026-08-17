#!/usr/bin/env bash
# Two lists that have to say the same thing, and now something says so.
#
# PR #49 shipped the same defect twice. The architecture generator's trigger
# paths lived in `.husky/pre-commit` and in `.github/workflows/architecture.yml`
# and disagreed by one entry for as long as both existed, so a commit touching
# only the blueprint layer table reached CI with a map nothing had regenerated.
# The gated file suffixes lived in `eslint-rules/impurity.js` and in every
# application's `vitest.config.ts` and disagreed by one entry on the day both
# were written, so a `.schema.ts` with no test would have been caught by a
# coverage number and by nothing that names it.
#
# Neither is a bug a reviewer can see: both halves read correctly on their own,
# and only the pair is wrong. See
# docs/dantotsus/two-copies-that-had-to-agree-and-nothing-made-them.md.
set -euo pipefail

cd "$(dirname "$0")/.."

failed=0

fail() {
  echo "[check-coupled-lists] $1" >&2
  failed=1
}

# 1. The architecture generator's trigger paths.
#
# The workflow lists them as YAML strings; the hook matches them with one
# `grep -E`. The shapes differ, so the check is containment both ways on the
# path token itself rather than string equality on the whole expression.
workflow_paths=$(
  sed -n '/^  pull_request:/,/^concurrency:/p' .github/workflows/architecture.yml |
    sed -n "s/^      - '\(.*\)'$/\1/p" |
    grep -v '^\.github/workflows/' || true
)

if [ -z "$workflow_paths" ]; then
  fail "read no trigger paths out of .github/workflows/architecture.yml — the shape of that file changed and this check went blind"
fi

while IFS= read -r path; do
  [ -n "$path" ] || continue
  token=${path%\*\*}
  token=${token%/}
  # The hook writes the path into a `grep -E` pattern, where a dot is escaped.
  # Compare against the hook with its backslashes removed, so `blueprint-utils\.ts`
  # and `blueprint-utils.ts` are the same path rather than two.
  if ! tr -d '\\' <.husky/pre-commit | grep -qF -- "$token"; then
    fail "architecture.yml watches '$path' and .husky/pre-commit does not mention '$token'. A commit changing only that path reaches CI with a stale map."
  fi
done <<<"$workflow_paths"

# 2. The suffixes the coverage gate and the sibling-test rule both name.
#
# `isGatedFile` decides which files must ship a sibling test; `coverage.include`
# decides which files must reach full coverage. A suffix in one and not the
# other is a file whose missing test only a number notices.
rule_suffixes=$(
  grep -o 'TESTED_FILE_PATTERN = /\\\.([a-z|]*)' eslint-rules/impurity.js |
    sed 's/.*(//; s/).*//' | tr '|' '\n' | sort -u
)

if [ -z "$rule_suffixes" ]; then
  fail "read no suffixes out of eslint-rules/impurity.js TESTED_FILE_PATTERN — the rule changed shape and this check went blind"
fi

for config in apps/*/vitest.config.ts; do
  workspace=$(dirname "$config")
  # Only the coverage include block, which is the list under discussion.
  include=$(sed -n '/coverage: {/,/thresholds/p' "$config")
  [ -n "$include" ] || continue
  for suffix in $rule_suffixes; do
    # A front end has no `api/src`, so a back-end-only suffix is absent there by
    # construction rather than by omission.
    if ! grep -q "$suffix" <<<"$include"; then
      if [ "$suffix" = 'schema' ] && [ ! -d "$workspace/api" ]; then continue; fi
      fail "$config covers no '*.$suffix.ts' while borso/test-file-has-sibling-source demands a test for one. Add it to coverage.include, or drop it from TESTED_FILE_PATTERN."
    fi
  done
done

if [ "$failed" -ne 0 ]; then
  echo "[check-coupled-lists] two lists that have to agree do not." >&2
  exit 1
fi

echo "[check-coupled-lists] the coupled lists agree"
