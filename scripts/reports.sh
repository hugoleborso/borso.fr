#!/usr/bin/env bash
# Regenerates the files no commit carries.
#
# None of the reports, indexes or models below is in git — see ADR-0014. A
# fresh clone has none of them, and neither does a subagent given its own
# worktree, for which the SessionStart hook never runs. Anything that reads one
# runs this first.
#
#   scripts/reports.sh                # everything, ~20s
#   scripts/reports.sh blueprints     # the index, the heatmap, the defects page, the hook's lookup
#   scripts/reports.sh standards      # the enforcement ledger, drift, provenance, hotspots, coupling
#   scripts/reports.sh maps           # the architecture maps and models
#   scripts/reports.sh all --missing-only   # only the ones absent from the tree
#
# `--missing-only` exists for a reader that must not pay for a rebuild it does
# not need but must not read a file that is not there either. A checkout where
# every output is present skips every generator; one where a merge just deleted
# them, or a fresh worktree, rebuilds exactly those.
#
# Grouped because the map build is fourteen seconds and the blueprint index is
# one: a skill that needs to know which pattern to follow should not pay for
# four applications' graphs to find out.
set -euo pipefail

cd "$(dirname "$0")/.."

# The file each generator writes, used by --missing-only to decide whether to
# run it. One sentinel per generator is enough: a generator that wrote half its
# outputs is a bug in the generator, not a state this flag has to model.
output_of() {
  case "$1" in
    *blueprint-indexing.ts) echo .claude/skills/blueprint/blueprint-index.md ;;
    *blueprint-context.ts) echo .claude/skills/blueprint/blueprint-context.json ;;
    *blueprint-heatmap.ts) echo .claude/skills/blueprint/blueprint-coverage.html ;;
    *blueprint-defects.ts) echo docs/standards/blueprint-defects.md ;;
    *convention-drift.ts) echo docs/standards/convention-drift.md ;;
    *rule-provenance.ts) echo docs/standards/rule-provenance.md ;;
    *hotspots.ts) echo docs/standards/hotspots.md ;;
    *temporal-coupling.ts) echo docs/standards/temporal-coupling.md ;;
    *enforcement-ledger.ts) echo docs/standards/enforcement-ledger.md ;;
    *architecture-graph.ts) echo docs/architecture/pragma-architecture.json ;;
    *) echo '' ;;
  esac
}

BLUEPRINT_GENERATORS=(
  .claude/skills/blueprint/blueprint-indexing.ts
  .claude/skills/blueprint/blueprint-context.ts
  .claude/skills/blueprint/blueprint-heatmap.ts
  scripts/blueprints/blueprint-defects.ts
)

STANDARDS_GENERATORS=(
  scripts/standards/convention-drift.ts
  scripts/standards/rule-provenance.ts
  scripts/standards/hotspots.ts
  scripts/standards/temporal-coupling.ts
  scripts/standards/enforcement-ledger.ts
)

MAP_GENERATORS=(
  scripts/architecture/architecture-graph.ts
)

missing_only=''
for argument in "$@"; do
  if [ "$argument" = '--missing-only' ]; then missing_only=1; fi
done

case "${1:-all}" in
  blueprints) generators=("${BLUEPRINT_GENERATORS[@]}") ;;
  standards) generators=("${STANDARDS_GENERATORS[@]}") ;;
  maps) generators=("${MAP_GENERATORS[@]}") ;;
  all)
    generators=(
      "${BLUEPRINT_GENERATORS[@]}"
      "${STANDARDS_GENERATORS[@]}"
      "${MAP_GENERATORS[@]}"
    )
    ;;
  --missing-only) generators=(
      "${BLUEPRINT_GENERATORS[@]}"
      "${STANDARDS_GENERATORS[@]}"
      "${MAP_GENERATORS[@]}"
    ) ;;
  *)
    echo "usage: scripts/reports.sh [all|blueprints|standards|maps] [--missing-only]" >&2
    exit 2
    ;;
esac

for generator in "${generators[@]}"; do
  if [ -n "$missing_only" ]; then
    output=$(output_of "$generator")
    if [ -n "$output" ] && [ -e "$output" ]; then continue; fi
  fi
  echo "[reports] $generator"
  pnpm exec tsx "$generator" >/dev/null
done

echo "[reports] done"
