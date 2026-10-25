#!/usr/bin/env bash
# Lint a list of files, one ESLint process per workspace they belong to.
#
# ESLint here builds a TypeScript program for every tsconfig a file reaches,
# and holds them all in one heap, so one run over files from several
# workspaces can run out of memory before any rule runs. Grouping by workspace,
# as scripts/lint-repository.sh does, puts the peak at the largest workspace the
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
