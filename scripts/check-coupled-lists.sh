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

# 3. The knowledge corpus and its index.
#
# `docs/knowledge/README.md` carries a one-line entry per file, and an entry
# that never gets written makes the file unfindable by anyone who did not
# already know it existed — which is the entire audience. Three had drifted out
# before this check existed.
#
# `docs/dantotsus/README.md` is deliberately not a per-entry index; it says so,
# and points at `ls` and a listing script instead. So it is not checked here.
for entry in docs/knowledge/*.md; do
  name=$(basename "$entry")
  [ "$name" = 'README.md' ] && continue
  if ! grep -qF -- "./$name)" docs/knowledge/README.md; then
    fail "docs/knowledge/$name is not linked from docs/knowledge/README.md, so nobody who does not already know it exists will find it."
  fi
done

# 4. The formatter the repository tells you to run.
#
# The agent harness rewrites a literal `pnpm exec prettier` and substitutes its
# own build — 3.8.1 against the 3.9.6 this repository pins, measured 2026-08-17.
# The substitute formats at prettier's default 80 columns instead of the 100 in
# `.prettierrc.json`, so a `--write` reformats every file it is handed and every
# file it is not. Eight unrelated files were rewritten that way, one of them
# losing an escaped character inside a package.json.
#
# The repository cannot change the harness. It can stop publishing the shape
# that breaks: `pnpm run format` and `node_modules/.bin/prettier` are both
# unambiguous, and neither is rewritten.
# `--exclude` on this file: it necessarily contains the string it forbids.
if grep -rn --exclude="$(basename "$0")" 'pnpm exec prettier' .husky .github scripts 2>/dev/null; then
  fail "the lines above invoke prettier through a command shape the agent harness rewrites to a different version. Use 'pnpm run format:check' or 'node_modules/.bin/prettier'."
fi

# 4. The tables a migration creates, and the two lists the back-e2e harness
#    keeps of them.
#
# `test/setup-postgres.ts` drops the tables it knows before replaying every
# migration, and `test/database-utils.ts` truncates the tables it knows between
# cases. A table missing from the first is not dropped, so its `CREATE TABLE`
# fails on the second run of the suite with 42P07 while the first run passed —
# which is how it reached a pull request. A table missing from the second keeps
# one case's rows visible to the next.
#
# See docs/dantotsus/a-table-the-harness-never-dropped-passed-the-first-run.md.
for migrations_dir in apps/*/api/src/database/migrations; do
  [ -d "$migrations_dir" ] || continue
  workspace=${migrations_dir%/api/src/database/migrations}
  setup_file="$workspace/test/setup-postgres.ts"
  truncate_file="$workspace/test/database-utils.ts"
  [ -f "$setup_file" ] || continue

  created_tables=$(
    grep -ho 'CREATE TABLE[[:space:]]*"[a-z_]*"' "$migrations_dir"/*.sql |
      sed 's/.*"\(.*\)"/\1/' | sort -u
  )

  if [ -z "$created_tables" ]; then
    fail "read no CREATE TABLE out of $migrations_dir — the migrations changed shape and this check went blind"
  fi

  while IFS= read -r table; do
    [ -n "$table" ] || continue
    # One harness names the tables as a quoted array, the other inside one
    # DROP statement, so the check is the name itself rather than a spelling.
    if ! grep -qE "(^|[^a-z_])$table([^a-z_]|$)" "$setup_file"; then
      fail "$migrations_dir creates '$table' and $setup_file does not list it. The harness will not drop it, so its CREATE TABLE fails on the second run and passes on the first."
    fi
    if [ -f "$truncate_file" ] && ! grep -qE "(^|[^a-z_])$table([^a-z_]|$)" "$truncate_file"; then
      fail "$migrations_dir creates '$table' and $truncate_file does not list it. Rows written by one case stay visible to the next."
    fi
  done <<<"$created_tables"
done

if [ "$failed" -ne 0 ]; then
  echo "[check-coupled-lists] two lists that have to agree do not." >&2
  exit 1
fi

echo "[check-coupled-lists] the coupled lists agree"
