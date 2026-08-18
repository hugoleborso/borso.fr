#!/usr/bin/env bash
# A workspace with gated files and no mutation config measures nothing.
#
# `infra/cdk` ships at 100% coverage, and standard 02 said its `.utils.ts` files
# survive Stryker with no surviving mutant. Nothing ran Stryker there: no config
# under `infra/`, and both the push hook and full-suite.yml loop over `apps/`
# only. Pointing it at those five files once reported **90 survivors at 100%
# coverage** — the whole distance between "every line ran" and "an assertion
# would have noticed", sitting inside a number that read as reassurance.
#
# A missing gate is invisible by construction: it produces no output to be
# wrong. This check makes the absence itself the thing that fails.
#
# See docs/dantotsus/the-gate-that-was-never-pointed-at-the-code.md.
set -euo pipefail

cd "$(dirname "$0")/.."

# A workspace may sit here while its mutants are being killed, and the entry
# says which and why. An entry with no reason is not an entry.
#
# infra/cdk — 90 mutants survive at 100% coverage, measured 2026-08-15 over
#   src/**/*.utils.ts. Most are regex-quantifier mutants that are equivalent for
#   every input the function can receive, so closing them means a justified
#   Stryker disable comment each rather than a better assertion. Wiring the gate
#   before that work is done would land a red gate, and a red gate that nobody
#   can make green gets skipped.
ALLOWED_WITHOUT_MUTATION='infra/cdk'

GATED_SUFFIXES='core|utils|adapter'

failed=0

for workspace in apps/*/ infra/*/; do
  workspace=${workspace%/}
  [ -f "$workspace/package.json" ] || continue

  # `-print -quit` rather than a pipe into `head -1`: under the `pipefail` above,
  # `head` closing after the first line leaves `find` still walking the tree, and
  # the SIGPIPE it takes (exit 141) fails the whole script. It is a race on how
  # fast the tree walks, so it passes locally on a warm cache and fails on CI.
  gated=$(find "$workspace" -type f \
    \( -name '*.core.ts' -o -name '*.utils.ts' -o -name '*.adapter.ts' \
    -o -name '*.core.tsx' -o -name '*.utils.tsx' -o -name '*.adapter.tsx' \) \
    -not -path '*/node_modules/*' -not -path '*/.stryker-tmp/*' \
    -not -name '*.test.*' -print -quit)
  [ -n "$gated" ] || continue

  if grep -qx -- "$workspace" <<<"$ALLOWED_WITHOUT_MUTATION"; then
    echo "  $workspace holds gated files and is deliberately unmutated; see the reason in $0"
    continue
  fi

  config="$workspace/stryker.config.js"
  if [ ! -f "$config" ]; then
    echo "[check-mutation-covers-gated-files] $workspace holds $(basename "$gated") and has no stryker.config.js, so its mutation score is not zero — it is unmeasured." >&2
    failed=1
    continue
  fi

  for suffix in ${GATED_SUFFIXES//|/ }; do
    present=$(find "$workspace" -type f -name "*.$suffix.ts" -not -path '*/node_modules/*' \
      -not -path '*/.stryker-tmp/*' -not -name '*.test.*' -print -quit)
    [ -n "$present" ] || continue
    if ! grep -q "\*\.$suffix\.ts" "$config"; then
      echo "[check-mutation-covers-gated-files] $workspace holds *.$suffix.ts and $config does not mutate that suffix." >&2
      failed=1
    fi
  done
done

if [ "$failed" -ne 0 ]; then
  echo "[check-mutation-covers-gated-files] a gate that is not pointed at the code reports nothing, not zero." >&2
  exit 1
fi

echo "[check-mutation-covers-gated-files] every workspace with gated files is mutated, or says why not"
