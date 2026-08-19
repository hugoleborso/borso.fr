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
#
# The existence tests below use `-print -quit` rather than a pipe into the head
# of the output. Under `set -o pipefail` that pipe fails the whole script
# whenever `find` still has output to write when the reader closes it: `find`
# takes SIGPIPE, prints "Broken pipe", and the pipeline's status becomes 141.
# Whether that happens depends on how much of the tree is left to walk, so the
# check passed on the pull request that added it and failed on the next one.
# `-quit` also stops the walk at the first match rather than testing every
# node_modules entry to the end.
set -euo pipefail

cd "$(dirname "$0")/.."

# A workspace may sit here while its mutants are being killed, and the entry
# says which and why. An entry with no reason is not an entry.
#
# Empty since 2026-08-18: `infra/cdk` was the one entry, and its survivors are
# killed. The first run over `src/**/*.utils.ts` scored 80.84 with 69
# survivors and turned up three real defects in the migration rewrites,
# including a lookahead that doubled an `IF NOT EXISTS` the statement already
# carried. It is wired and green now, so the exemption has nothing left to
# excuse.
ALLOWED_WITHOUT_MUTATION=''

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
