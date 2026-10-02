#!/usr/bin/env bash
# Lint the whole repository, one ESLint process per workspace.
#
# ESLint here is type-aware: before it runs a rule it builds a TypeScript
# program for every tsconfig it meets. One `eslint .` holds every
# workspace's program in one heap at once, and once banana-rush became the
# fifth application that heap passed Node's 4 GB default on the CI runner:
# `FATAL ERROR: Reached heap limit`, and main's `build` job was red on every
# push from PR #110 on. Reproduced locally with --max-old-space-size=4096.
#
# Raising the heap would only move the ceiling, and by how much depends on
# the runner's memory, which nothing in this repository can see. One process
# per workspace frees each program when its process exits, so the peak is
# the largest single workspace rather than the sum of all of them.
#
# Coverage is complete by construction: every directory under apps/ and
# infra/ gets its own run, and a last run lints everything else with those
# two folders ignored — scripts/, eslint-rules/, .claude/ and the root
# configs. Adding an application needs no edit here.
#
# Each run keeps its own cache file, `.eslintcache-<name>`, because runs
# sharing one file would each overwrite the others' entries.

set -euo pipefail

cd "$(dirname "$0")/.."

ESLINT_FLAGS=(--max-warnings 0 --cache --cache-strategy content "$@")
failed=0

lint() {
  local name="$1"
  shift
  echo "[lint-repository] ${name}"
  if ! pnpm exec eslint "$@" "${ESLINT_FLAGS[@]}" --cache-location ".eslintcache-${name}"; then
    failed=1
  fi
}

for workspace in apps/*/ infra/*/; do
  [ -f "${workspace}package.json" ] || continue
  name="$(basename "$(dirname "$workspace")")-$(basename "$workspace")"
  lint "$name" "$workspace"
done

lint rest . --ignore-pattern 'apps/**' --ignore-pattern 'infra/**'

if [ "$failed" -ne 0 ]; then
  echo "[lint-repository] at least one workspace has lint errors; they are printed above." >&2
  exit 1
fi

echo "[lint-repository] every workspace and the files outside them lint clean"
