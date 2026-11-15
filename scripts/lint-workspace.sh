#!/usr/bin/env bash
# Lint the workspace this is run from, which is what every `pnpm run lint` in
# apps/ and infra/ calls: the same oxlint run as scripts/lint-repository.sh,
# with every rule, over this workspace only.
#
# There is no cache. ESLint's was keyed on each file's own bytes, so a
# type-aware error replayed after the types it depended on were fixed, three
# times in this repository (see
# docs/dantotsus/the-cache-outlived-the-install-it-was-built-against.md).
# oxlint lints a workspace in seconds, so a cache has nothing left to save.

set -euo pipefail

root="$(cd "$(dirname "$0")/.." && pwd)"
workspace="${PWD#"$root"/}"

# The type-aware rules resolve imports through node_modules, so a lockfile this
# checkout never installed fails them with `type error`. #197 dropped the old
# refusal along with the cache; see
# docs/dantotsus/the-merge-that-linted-against-dependencies-it-never-installed.md.
"$root/scripts/ensure-installed.sh" lint
"$root/scripts/ensure-infra-built.sh"

cd "$root"
exec node_modules/.bin/oxlint --type-aware "$@" "$workspace"
