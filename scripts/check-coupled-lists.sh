#!/usr/bin/env bash
# Two lists that have to say the same thing, and now something says so.
#
# PR #49 shipped the same defect twice. The architecture generator's trigger
# paths lived in `.husky/pre-commit` and in `.github/workflows/architecture.yml`
# and disagreed by one entry for as long as both existed, so a commit touching
# only the blueprint layer table reached CI with a map nothing had regenerated
# (that pair is gone; see section 1). The gated file suffixes lived in `eslint-rules/impurity.js` and in every
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

# 1. The architecture generator's trigger paths used to be checked here, against
# the list `.husky/pre-commit` matched before running it. The generator no longer
# runs on the commit: it measured over three minutes, past every local budget in
# docs/standards/14-tool-runtime-budgets.md, and it now runs only on demand,
# from the `architecture` workflow. There is no pair left to compare.

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
    if [[ "$include" != *"$suffix"* ]]; then
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
unindexed=$(comm -23 \
  <(cd docs/knowledge && printf '%s\n' *.md | grep -vx 'README.md' | sort) \
  <(grep -oE '\./[^)/]+\.md\)' docs/knowledge/README.md | sed -E 's|^\./||; s|\)$||' | sort -u))
while IFS= read -r name; do
  [ -n "$name" ] || continue
  fail "docs/knowledge/$name is not linked from docs/knowledge/README.md, so nobody who does not already know it exists will find it."
done <<<"$unindexed"

# The formatter the repository tells you to run used to be checked here: the
# agent harness rewrote `pnpm exec prettier` into a build of its own. Prettier
# is gone and oxfmt replaced it, so there is no such command left to guard. See
# docs/adr/0045-oxlint-and-oxfmt-replace-eslint-and-prettier.md.

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
  setup_text=$(cat "$setup_file")
  truncate_text=''
  [ -f "$truncate_file" ] && truncate_text=$(cat "$truncate_file")

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
    table_pattern="(^|[^a-z_])${table}([^a-z_]|\$)"
    if ! [[ "$setup_text" =~ $table_pattern ]]; then
      fail "$migrations_dir creates '$table' and $setup_file does not list it. The harness will not drop it, so its CREATE TABLE fails on the second run and passes on the first."
    fi
    if [ -f "$truncate_file" ] && ! [[ "$truncate_text" =~ $table_pattern ]]; then
      fail "$migrations_dir creates '$table' and $truncate_file does not list it. Rows written by one case stay visible to the next."
    fi
  done <<<"$created_tables"
done

# 5. pragma's preview clone and the decision that sets it.
#
# ADR-0009 says which production tables a preview copies and which it leaves
# behind, and `apps/pragma/cdk/lib/stack.ts` is what actually does it. Commit
# 03bd354 moved `app_config` and `member_credential` from one list to the other
# without touching the ADR, and every preview lost its credentials for three
# weeks while the decision still read as in force. Each list in the stack has to
# name exactly the tables on the ADR row of the same name, in both directions,
# so moving a table between lists fails until the ADR moves it too. See
# docs/dantotsus/the-commit-that-reversed-an-adr-without-touching-it.md.
pragma_stack=apps/pragma/cdk/lib/stack.ts
pragma_clone_adr=docs/adr/0009-pragma-previews-clone-production.md

# A list may spread a named constant (`[...SECRET_TABLES, 'take']`), which the
# stack shares with the reader blocklist of ADR-0044, so each `...NAME` is
# resolved to the `const NAME = [...]` it names. A name that resolves to nothing
# stands in the list as `unresolved_<name>`, so the comparison below fails
# rather than reading it as an empty list.
read_stack_clone_list() {
  local flat list reference resolved
  flat=$(tr -d '\n' <"$pragma_stack")
  list=$(grep -oE "$1: \[[^]]*\]" <<<"$flat" || true)
  {
    grep -oE "'[a-z_]+'" <<<"$list" || true
    for reference in $(grep -oE '\.\.\.[A-Z_]+' <<<"$list" | tr -d '.' || true); do
      resolved=$(grep -oE "const $reference = \[[^]]*\]" <<<"$flat" || true)
      if [ -z "$resolved" ]; then
        echo "[check-coupled-lists] $pragma_stack spreads $reference into $1 and declares no 'const $reference = [...]' this check can read" >&2
        echo "'unresolved_${reference,,}'"
      fi
      grep -oE "'[a-z_]+'" <<<"$resolved" || true
    done
  } | tr -d "'" | sort -u
}

read_adr_clone_row() {
  grep -E "^\| \`$1\` \|" "$pragma_clone_adr" |
    cut -d'|' -f3 |
    grep -oE '`[a-z_]+`' | tr -d '`' | sort -u || true
}

for clone_list in tableBlocklist tablesToReplace; do
  stack_tables=$(read_stack_clone_list "$clone_list")
  adr_tables=$(read_adr_clone_row "$clone_list")
  if [ -z "$adr_tables" ]; then
    fail "$pragma_clone_adr has no '| \`$clone_list\` |' row naming a table — the shape of that table changed and this check went blind"
    continue
  fi
  if [ "$stack_tables" != "$adr_tables" ]; then
    fail "$pragma_stack puts [$(echo $stack_tables)] in $clone_list and $pragma_clone_adr puts [$(echo $adr_tables)] there. Amend the ADR in the same commit that changes what a preview copies."
  fi
done

if [ "$failed" -ne 0 ]; then
  echo "[check-coupled-lists] two lists that have to agree do not." >&2
  exit 1
fi

echo "[check-coupled-lists] the coupled lists agree"
