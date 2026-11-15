#!/usr/bin/env bash
# Installs the workspace when pnpm-lock.yaml differs from the lockfile pnpm last
# installed, which pnpm keeps a copy of in node_modules/.pnpm/lock.yaml. The
# comparison is exact and costs nothing when the two agree.
#
# Every gate that reads node_modules needs it. Pre-push has called it since a
# restarted branch made knip misreport a new app's dependencies. Pre-commit
# needs it too: a merge of main that brings a new app commits through
# pre-commit, and on PR #334 oxlint's type-aware rules failed with `type error`
# there until a manual `pnpm install`. See
# docs/dantotsus/the-merge-that-linted-against-dependencies-it-never-installed.md.
#
# Usage: scripts/ensure-installed.sh <hook-name>

set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.."

if ! cmp -s pnpm-lock.yaml node_modules/.pnpm/lock.yaml; then
  echo "[$1] pnpm-lock.yaml changed since the last install; installing before the gates read node_modules" >&2
  pnpm install --frozen-lockfile
fi
