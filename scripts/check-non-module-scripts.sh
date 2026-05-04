#!/usr/bin/env bash
# Pre-push gate: every <script src> in apps/<app>/site/**/*.html must be
# type="module" so Vite bundles it. Non-module references are passed through
# as-is and 404 in production preview / prod builds.
#
# Eradication for docs/dantotsus/vite-non-module-script-tags-arent-bundled.md.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

# Run grep without -P to keep BSD/macOS portability.
matches=$(/usr/bin/grep -rEn '<script[^>]+src=' apps/*/site \
  --include='*.html' 2>/dev/null \
  | /usr/bin/grep -v 'type="module"' \
  || true)

if [ -n "$matches" ]; then
  printf '\033[31m[non-module-scripts] FAIL\033[0m one or more <script src> tags lack type="module".\n'
  printf 'Vite will not bundle these; production will 404 on the asset.\n\n'
  printf '%s\n' "$matches"
  printf '\nFix: add type="module" to the tag.\n'
  exit 1
fi
