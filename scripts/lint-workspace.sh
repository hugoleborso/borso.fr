#!/usr/bin/env bash
# Lint the workspace this is run from, which is what every `pnpm run lint` in
# apps/ and infra/ calls.
#
# ESLint here is type-aware, so a file's verdict depends on the types it
# imports, including those of installed packages. A cache keyed on each
# file's own content cannot see a dependency change: on PR #153, main brought
# in a new dependency, `pnpm run lint` ran before `pnpm install`, cached 291
# errors for files that could not resolve it, and replayed all 291 after the
# install, until the cache was deleted by hand. That was the third time this
# repository was misled by a replayed type-aware error; see
# docs/dantotsus/the-cache-outlived-the-install-it-was-built-against.md.
#
# Two things make that sequence impossible here:
#
# - The run refuses while the installed dependencies differ from the
#   lockfile. pnpm keeps a copy of the lockfile it installed at
#   node_modules/.pnpm/lock.yaml, and the two are byte-identical after every
#   install. A run against a stale node_modules would only produce errors that
#   are not about the code, and would cache them.
# - The cache file is named after that installed lockfile's digest, so an
#   install starts a fresh cache instead of inheriting the old one. Each
#   workspace also gets a file of its own, because eight scripts sharing one
#   file overwrite each other's entries.

set -euo pipefail

root="$(git -C "$(dirname "$0")" rev-parse --show-toplevel)"
workspace="$(realpath --relative-to="$root" "$PWD")"
installed="$root/node_modules/.pnpm/lock.yaml"

if ! cmp -s "$root/pnpm-lock.yaml" "$installed"; then
  echo "[lint-workspace] the installed dependencies do not match pnpm-lock.yaml." >&2
  echo "[lint-workspace] Run \`pnpm install\` first: linting now would report errors" >&2
  echo "[lint-workspace] about missing types, and cache them." >&2
  exit 1
fi

digest="$(sha256sum "$installed" | cut -c1-12)"
cache_directory="$root/node_modules/.cache/eslint-workspaces"
cache_prefix="${workspace//\//-}"
mkdir -p "$cache_directory"
find "$cache_directory" -name "${cache_prefix}-*" ! -name "${cache_prefix}-${digest}" -delete

cd "$root"
exec pnpm exec eslint "$workspace" "$@" --cache \
  --cache-location "$cache_directory/${cache_prefix}-${digest}"
