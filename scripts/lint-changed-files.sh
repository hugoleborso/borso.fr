#!/usr/bin/env bash
# Lint a list of files, one ESLint process per workspace they belong to.
#
# ESLint here builds a TypeScript program for every tsconfig a file reaches,
# and holds them all in one heap. scripts/lint-repository.sh splits the whole
# tree by workspace for that reason; the commit hook did not, and on
# 2026-10-25 a commit touching one file in apps/pragma, one in apps/talos and
# two in eslint-rules/ died with "JavaScript heap out of memory" before any
# rule ran. Grouping the same way puts the peak at the largest workspace the
# change touches rather than at the sum of them.
#
# Reads newline-separated paths on stdin; extra arguments go to every ESLint
# run. See docs/dantotsus/five-apps-did-not-fit-in-one-lint-heap.md.

set -euo pipefail

cd "$(dirname "$0")/.."

declare -A files_by_workspace=()
while IFS= read -r path; do
  [ -n "$path" ] || continue
  case "$path" in
    apps/*/* | infra/*/*)
      workspace="$(cut -d/ -f1-2 <<<"$path")"
      ;;
    *)
      workspace='rest'
      ;;
  esac
  files_by_workspace["$workspace"]+="${path}"$'\n'
done

failed=0
for workspace in "${!files_by_workspace[@]}"; do
  cache_name="$(tr '/' '-' <<<"$workspace")"
  if ! printf '%s' "${files_by_workspace[$workspace]}" |
    xargs pnpm exec eslint "$@" --cache --cache-strategy content \
      --cache-location ".eslintcache-changed-${cache_name}"; then
    failed=1
  fi
done

exit "$failed"
