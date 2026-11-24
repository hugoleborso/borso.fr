#!/usr/bin/env bash
# Exits 1 and lists each <img> that fell back to its alt text and each SVG
# <image> whose source fails to decode on the open agent-browser page.
# Usage: scripts/browser/broken-images.sh [agent-browser flags, such as --session phone]
set -euo pipefail

SCAN="(async () => {
  const tags = [...document.querySelectorAll('img')].filter((img) => img.complete && img.naturalWidth === 0).map((img) => img.src.slice(0, 120));
  const sources = new Set([...document.querySelectorAll('image')].map((image) => image.getAttribute('href') ?? ''));
  const decodes = await Promise.all([...sources].map((source) => Object.assign(new Image(), { src: source }).decode().then(() => [], () => [source.slice(0, 120)])));
  return JSON.stringify([...tags, ...decodes.flat()]);
})()"

result=$(agent-browser "$@" eval "$SCAN")
result="${result//\\\"/\"}"
if [ "$result" != '"[]"' ]; then
  printf '[broken-images] FAIL these images did not render: %s\n' "$result"
  exit 1
fi
echo '[broken-images] every <img> and SVG <image> on the page rendered'
