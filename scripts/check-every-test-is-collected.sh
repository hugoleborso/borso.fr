#!/usr/bin/env bash
# A test file that no project collects passes every gate by not existing.
#
# `apps/pragma/site/src/sw/service-worker.test.ts` was written, committed and
# run, and vitest answered "No test files found". The core project listed its
# includes by suffix — `*.utils.test.ts`, `*.core.test.ts`, `*.adapter.test.ts`,
# `*.test.tsx` — so a `.test.ts` named after anything else matched nothing. The
# two front-end-only workspaces collected `site/src/**/*.test.{ts,tsx}` and the
# two full-stack ones did not, which is why the same file would have run in
# `borso-fr` and silently not in `pragma`.
#
# Nothing else sees this. ESLint's sibling-test rule reads source to test, never
# test to suite. knip treats every `*.test.ts` as an entry point, so the file is
# reachable by construction. Coverage cannot report a file no test loaded, and a
# green run with one fewer file looks exactly like a green run.
#
# So ask vitest itself which files it would collect, per workspace, and compare
# that against the test files git tracks there. `vitest list --filesOnly` costs
# about a second per workspace and runs no globalSetup, so no database starts.
#
# See docs/dantotsus/the-test-that-no-project-collected.md.
set -euo pipefail

cd "$(dirname "$0")/.."

TEST_FILE_PATTERN='\.test\.tsx?$'

failed=0

for config in apps/*/vitest.config.ts infra/*/vitest.config.ts; do
  [ -f "$config" ] || continue
  workspace="$(dirname "$config")"

  tracked="$(git ls-files -- "$workspace" | grep -E "$TEST_FILE_PATTERN" | sed "s|^${workspace}/||" | sort)"
  [ -n "$tracked" ] || continue

  # `vitest list` prefixes each row with `[project]` when a config declares
  # several projects, and prints the path alone when it declares none.
  collected="$(
    (cd "$workspace" && pnpm exec vitest list --filesOnly 2>/dev/null) |
      sed 's|^\[[^]]*\] ||' |
      grep -E "$TEST_FILE_PATTERN" |
      sort -u || true
  )"

  if [ -z "$collected" ]; then
    echo "[check-every-test-is-collected] $workspace: vitest listed no files at all — the config or the runner changed shape and this check went blind" >&2
    failed=1
    continue
  fi

  uncollected="$(comm -23 <(echo "$tracked") <(echo "$collected"))"
  if [ -n "$uncollected" ]; then
    while read -r file; do
      [ -n "$file" ] || continue
      echo "[check-every-test-is-collected] $workspace/$file is tracked but no project collects it, so it never runs and its absence looks like a pass." >&2
    done <<<"$uncollected"
    failed=1
  fi
done

if [ "$failed" -ne 0 ]; then
  exit 1
fi

echo "[check-every-test-is-collected] every tracked test file is collected by a project"
