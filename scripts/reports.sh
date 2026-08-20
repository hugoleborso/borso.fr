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
#
# Grouped because the map build is fourteen seconds and the blueprint index is
# one: a skill that needs to know which pattern to follow should not pay for
# four applications' graphs to find out.
set -euo pipefail

cd "$(dirname "$0")/.."

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
  *)
    echo "usage: scripts/reports.sh [all|blueprints|standards|maps]" >&2
    exit 2
    ;;
esac

for generator in "${generators[@]}"; do
  echo "[reports] $generator"
  pnpm exec tsx "$generator" >/dev/null
done

echo "[reports] done"
