#!/usr/bin/env bash
# Pre-commit gate: an installable app's manifest names files that exist.
#
# A web app manifest fails quietly. A misspelled icon path, a manifest that
# stopped parsing, an `apple-touch-icon` link pointing at a file a rename left
# behind — none of it breaks the build, the tests, the linter or the page. The
# app keeps serving; it just stops being installable, or installs with the
# browser's default grey square, and nobody finds out until someone adds it to
# a home screen.
#
# So this asserts what a browser asserts at install time, over every app that
# ships a manifest: the JSON parses, every `src` it names resolves to a file
# under the same `public/`, the two sizes an install prompt requires are
# present, one icon is `maskable` so Android does not letterbox it into a white
# circle, and the `index.html` that ships it links both the manifest and an
# `apple-touch-icon` that exists, since iOS reads neither the manifest's icons
# nor its name.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

REQUIRED_ICON_SIZES=("192x192" "512x512")

failed=0

for manifest in apps/*/site/public/manifest.webmanifest; do
  [ -f "$manifest" ] || continue
  public_dir="$(dirname "$manifest")"
  site_dir="$(dirname "$public_dir")"
  app="$(basename "$(dirname "$site_dir")")"

  if ! node -e 'JSON.parse(require("fs").readFileSync(process.argv[1], "utf8"))' "$manifest" \
    2>/dev/null; then
    printf '\033[31m[pwa-assets] FAIL\033[0m %s: %s is not valid JSON\n' "$app" "$manifest"
    failed=1
    continue
  fi

  # One node pass prints every icon as "<size> <purpose> <src>", so the shell
  # below reads sizes, purposes and paths without re-parsing the JSON.
  icons="$(node -e '
    const manifest = JSON.parse(require("fs").readFileSync(process.argv[1], "utf8"));
    for (const icon of manifest.icons ?? []) {
      console.log([icon.sizes ?? "", icon.purpose ?? "any", icon.src ?? ""].join(" "));
    }
  ' "$manifest")"

  while read -r sizes purpose src; do
    [ -n "$src" ] || continue
    if [ ! -f "${public_dir}${src}" ]; then
      printf '\033[31m[pwa-assets] FAIL\033[0m %s: manifest names %s (%s), which is not in %s\n' \
        "$app" "$src" "$sizes" "$public_dir"
      failed=1
    fi
  done <<< "$icons"

  for size in "${REQUIRED_ICON_SIZES[@]}"; do
    if ! printf '%s\n' "$icons" | grep -q "^${size} "; then
      printf '\033[31m[pwa-assets] FAIL\033[0m %s: no %s icon, so the install prompt is refused\n' \
        "$app" "$size"
      failed=1
    fi
  done

  if ! printf '%s\n' "$icons" | grep -q ' maskable '; then
    printf '\033[31m[pwa-assets] FAIL\033[0m %s: no maskable icon, so Android crops the square\n' \
      "$app"
    failed=1
  fi

  html="${site_dir}/index.html"
  if [ ! -f "$html" ]; then
    printf '\033[31m[pwa-assets] FAIL\033[0m %s: %s ships a manifest and no index.html\n' \
      "$app" "$public_dir"
    failed=1
    continue
  fi

  if ! grep -q 'rel="manifest"' "$html"; then
    printf '\033[31m[pwa-assets] FAIL\033[0m %s: index.html does not link the manifest\n' "$app"
    failed=1
  fi

  apple_icon="$(sed -n 's/.*rel="apple-touch-icon"[^>]*href="\([^"]*\)".*/\1/p' "$html" | head -1)"
  if [ -z "$apple_icon" ]; then
    printf '\033[31m[pwa-assets] FAIL\033[0m %s: index.html has no apple-touch-icon, so iOS\n' "$app"
    printf '  draws a screenshot of the page as the home screen icon\n'
    failed=1
  elif [ ! -f "${public_dir}${apple_icon}" ]; then
    printf '\033[31m[pwa-assets] FAIL\033[0m %s: apple-touch-icon points at %s, which is not in %s\n' \
      "$app" "$apple_icon" "$public_dir"
    failed=1
  fi
done

if [ "$failed" -ne 0 ]; then
  printf '\nA manifest that names a file which is not there installs a grey square,\n'
  printf 'and nothing else in this repository notices. Fix the path or ship the icon.\n'
  exit 1
fi

printf '[check-pwa-assets] every manifest names icons that exist\n'
