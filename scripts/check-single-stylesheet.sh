#!/usr/bin/env bash
# Pre-commit gate: one stylesheet per application.
#
# docs/standards/08-styling.md puts component styles inline as Tailwind
# utilities and allows exactly one CSS file per application, the `@theme` token
# file that bridges the design tokens into Tailwind. A second stylesheet is how
# an application drifts back to global class names, because the first rule that
# does not fit a utility goes there and the rest follow.
#
# docs/standards/08-styling.md named this check under "Enforced by" before it
# existed, which is the same shape as the approval gate that lived only in a
# comment. See docs/dantotsus/an-approval-gate-that-only-existed-in-a-comment.md.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

MAXIMUM_STYLESHEETS_PER_APP=1

failed=0

for app_dir in apps/*/; do
  [ -d "${app_dir}site" ] || continue
  app="$(basename "$app_dir")"

  # Tracked files only. `coverage/` and `.stryker-tmp/` are both generated and
  # gitignored, and both contain CSS, so a filesystem walk would count reports
  # and mutation sandboxes as application stylesheets.
  stylesheets="$(git ls-files -- "${app_dir}site" | { /usr/bin/grep -E '\.css$' || true; })"
  [ -n "$stylesheets" ] || continue

  count="$(printf '%s\n' "$stylesheets" | wc -l | tr -d ' ')"
  if [ "$count" -gt "$MAXIMUM_STYLESHEETS_PER_APP" ]; then
    printf '\033[31m[single-stylesheet] FAIL\033[0m %s ships %s stylesheets:\n' "$app" "$count"
    printf '%s\n' "$stylesheets" | sed 's/^/  /'
    failed=1
  fi
done

if [ "$failed" -ne 0 ]; then
  printf '\nAn application keeps one CSS file, holding `@import "tailwindcss"` and\n'
  printf 'its `@theme` block. Component styles are Tailwind utilities on the JSX.\n'
  printf 'See docs/standards/08-styling.md.\n'
  exit 1
fi
