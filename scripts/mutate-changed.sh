#!/usr/bin/env bash
# Runs Stryker on the gated files a branch changes, one run at a time.
#
# CI calls it on every pull request with the base branch, so a surviving mutant
# fails the pull request instead of the push: Stryker took 194 s of one
# 244 s push on PR #216, and every push that touched a gated file paid it.
# Gated files are the `.core`, `.utils` and `.adapter` modules of each app, the
# `.core` and `.utils` modules under scripts/, and the `.utils` modules of
# infra/cdk. A changed test file pulls in its sibling source, because weakening
# a test is how a mutant comes back to life without the source moving.
#
# `--mutate` takes one comma-separated list of plain paths: the flag does not
# accumulate, and a brace expression matches nothing.
#
# Each run reads and writes Stryker's incremental file, so a mutant whose source
# and tests did not move keeps its verdict from the previous run. CI keeps that
# file in the Actions cache per pull request: a later push re-tests only what
# moved since. Stryker writes the file only when a run completes.
#
# Stryker diffs only the mutated files and the test files. A fixture, a constant
# or a config the tests import can change and every verdict is still reused: a
# fixture that lost its boundary case kept a 100 score, and one that gained it
# kept the survivor (docs/dantotsus/a-fixture-changed-and-stryker-kept-the-verdict.md).
# So the file is named after a fingerprint of what Stryker cannot see: the
# toolchain, the merge base, and every other code file the branch changed in that
# package. When one of those moves, the run starts from an empty file and the old
# one is deleted. A push that moves only gated files and tests keeps the cache.
#
# The changed set is the branch's commits plus the working tree, untracked files
# included, so a local run grades the same files CI will once they are committed.
#
# Paths after the base keep only the changed files under them. Parallel agents
# share one working tree, so an agent grading its own app mutated the others'
# unfinished files too, on PR #290. A path may also be one file. A base below a
# merge of main grades what the merge brought, and on PR #300 three validators
# moved the base by hand to grade one feature.
#
# Usage: scripts/mutate-changed.sh <base-ref> [<path>...]

set -euo pipefail

base="${1:?usage: scripts/mutate-changed.sh <base-ref> [<path>...]}"
shift
# The commits, and the working tree on top of them. Reading the commits alone
# declared a run clean while a brand-new gated file sat untracked beside it, and
# CI mutated the same file once it was committed and found a survivor: PR #281's
# dataset builder. A local run exists to predict that CI run, so it reads what
# CI will see, which is this branch plus whatever is not committed yet. Renames
# print `old -> new`; the new name is the file on disk.
committed=$(git diff --name-only "$(git merge-base "$base" HEAD)" HEAD)
uncommitted=$(git status --porcelain=v1 --untracked-files=all | sed 's/^...//;s/.* -> //')
changed=$(printf '%s\n%s\n' "$committed" "$uncommitted" | sed '/^$/d' | sort -u)
every_change="$changed"
merge_base=$(git merge-base "$base" HEAD)
if [ "$#" -gt 0 ]; then
  changed=$(for scope in "$@"; do
    echo "$changed" | awk -v scope="${scope%/}" '$0 == scope || index($0, scope "/") == 1'
  done | sort -u)
fi
failed=()
runs=0
toolchain=(pnpm-lock.yaml stryker.shared.js stryker-zero-test-guard.js)

# Prints the flags for the incremental file of one run. Arguments: the directory
# the run starts in, a regex for the paths its tests can import, and the files it
# mutates, as paths from the repository root.
incremental_for() {
  local directory="$1" scope="$2" mutated="$3" fingerprint
  fingerprint=$(
    {
      echo "$merge_base"
      cat "${toolchain[@]}" "$directory/stryker.config.js"
      if [ -d patches ]; then find patches -type f | sort | xargs -r cat; fi
      echo "$every_change" |
        { grep -E "$scope" || true; } |
        { grep -E '\.(ts|tsx|js|mjs|cjs|json)$' || true; } |
        { grep -vE '\.(test|spec)\.tsx?$' || true; } |
        { grep -vxF "$mutated" || true; } |
        while read -r input; do
          echo "$input"
          if [ -f "$input" ]; then cat "$input"; fi
        done
    } | sha256sum | cut -c1-16
  )
  mkdir -p "$directory/reports/mutation"
  find "$directory/reports/mutation" -maxdepth 1 -name 'incremental*.json' \
    ! -name "incremental-$fingerprint.json" -delete
  echo "--incremental --incrementalFile reports/mutation/incremental-$fingerprint.json"
}

run_mutation() {
  local label="$1"
  shift
  echo "[mutate-changed] $label"
  runs=$((runs + 1))
  "$@" || failed+=("$label")
}

for app in $(echo "$changed" | sed -n 's|^apps/\([^/]*\)/.*|\1|p' | sort -u); do
  gated_files=$(echo "$changed" |
    sed -n "s|^apps/$app/||p" |
    sed -E 's/\.(core|utils|adapter)\.test\.tsx?$/.\1.ts/' |
    { grep -E '\.(core|utils|adapter)\.tsx?$' || true; } |
    while read -r gated; do if [ -n "$gated" ] && [ -f "apps/$app/$gated" ]; then echo "$gated"; fi; done |
    sort -u)
  [ -z "$gated_files" ] && continue
  # shellcheck disable=SC2046 # the flags hold no space but the one between them
  run_mutation "$app: $(echo "$gated_files" | grep -c .) file(s)" \
    pnpm --filter "@borso-app/$app" exec stryker run \
    $(incremental_for "apps/$app" "^apps/$app/" "$(echo "$gated_files" | sed "s|^|apps/$app/|")") \
    --mutate "$(echo "$gated_files" | paste -sd, -)"
done

tooling_files=$(echo "$changed" |
  sed -E 's/\.(core|utils)\.test\.ts$/.\1.ts/' |
  { grep -E '^scripts/.*\.(core|utils)\.ts$' || true; } |
  while read -r gated; do if [ -n "$gated" ] && [ -f "$gated" ]; then echo "$gated"; fi; done |
  sort -u)
if [ -n "$tooling_files" ]; then
  # shellcheck disable=SC2046 # the flags hold no space but the one between them
  run_mutation "tooling: $(echo "$tooling_files" | grep -c .) file(s)" \
    pnpm exec stryker run $(incremental_for . '^([^/]+$|scripts/|\.claude/)' "$tooling_files") \
    --mutate "$(echo "$tooling_files" | paste -sd, -)"
fi

infra_files=$(echo "$changed" |
  sed -E 's/\.utils\.test\.ts$/.utils.ts/' |
  sed -n 's|^infra/cdk/||p' |
  { grep -E '^src/.*\.utils\.ts$' || true; } |
  while read -r gated; do if [ -n "$gated" ] && [ -f "infra/cdk/$gated" ]; then echo "$gated"; fi; done |
  sort -u)
if [ -n "$infra_files" ]; then
  # shellcheck disable=SC2046 # the flags hold no space but the one between them
  run_mutation "infra-cdk: $(echo "$infra_files" | grep -c .) file(s)" \
    pnpm --filter @borso/infra exec stryker run \
    $(incremental_for infra/cdk '^infra/cdk/' "$(echo "$infra_files" | sed 's|^|infra/cdk/|')") \
    --mutate "$(echo "$infra_files" | paste -sd, -)"
fi

if [ "${#failed[@]}" -gt 0 ]; then
  echo "[mutate-changed] mutation failed for: ${failed[*]}" >&2
  exit 1
fi
if [ "$runs" -eq 0 ]; then
  echo "[mutate-changed] no gated file changed between $base and the working tree, so nothing ran"
  exit 0
fi
echo "[mutate-changed] every changed gated file passed mutation ($runs run(s))"
