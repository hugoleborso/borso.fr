#!/usr/bin/env bash
# Prints a browsers folder in which the workspace Playwright finds a Chromium.
#
# The image installs its browsers under /opt/pw-browsers for its own global
# Playwright, so the folders carry that version's revision (chromium-1243). The
# workspace Playwright asks for its own revision (chromium_headless_shell-1254
# for 1.65.0), finds nothing and refuses to launch, and `playwright install`
# cannot run here. This builds a folder of links: every entry of the image's
# folder, plus each Chromium and ffmpeg revision a workspace playwright-core
# asks for, linked to the newest build the image has. The SessionStart hook
# exports PLAYWRIGHT_BROWSERS_PATH to it.
#
# Prints nothing and exits 0 where the image folder does not exist (a Mac), so
# the caller leaves PLAYWRIGHT_BROWSERS_PATH alone.
# See docs/dantotsus/the-workspace-playwright-asked-for-a-chromium-the-image-never-had.md.

set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/../.."

IMAGE_BROWSERS=/opt/pw-browsers
ALIGNED_BROWSERS="${BORSO_ALIGNED_BROWSERS:-$HOME/.cache/borso-pw-browsers}"
ALIASED_BROWSERS='^(chromium|chromium-headless-shell|ffmpeg) [0-9]+$'

[ -d "$IMAGE_BROWSERS" ] || exit 0

mkdir -p "$ALIGNED_BROWSERS"
for entry in "$IMAGE_BROWSERS"/*; do
  ln -sfn "$entry" "$ALIGNED_BROWSERS/$(basename "$entry")"
done

newest_build() {
  find "$IMAGE_BROWSERS" -maxdepth 1 -type d -name "$1-[0-9]*" | sort -V | tail -n1
}

for manifest in node_modules/.pnpm/playwright-core@*/node_modules/playwright-core/browsers.json; do
  [ -f "$manifest" ] || continue
  node -e 'for (const b of require(process.argv[1]).browsers) console.log(b.name, b.revision)' "$PWD/$manifest" |
    grep -E "$ALIASED_BROWSERS" |
    while read -r name revision; do
      folder="${name//-/_}"
      if [ -e "$ALIGNED_BROWSERS/$folder-$revision" ]; then continue; fi
      build="$(newest_build "$folder")"
      if [ -n "$build" ]; then ln -sfn "$build" "$ALIGNED_BROWSERS/$folder-$revision"; fi
    done
done

printf '%s\n' "$ALIGNED_BROWSERS"
