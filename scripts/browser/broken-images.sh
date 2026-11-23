#!/usr/bin/env bash
# Lists every image on the open agent-browser page that failed to render, and
# exits 1 when there is one. It covers <img> tags that fell back to their alt
# text, and SVG <image> elements, which have no naturalWidth: each of their
# sources is decoded once more and a failed decode is reported.
#
# Usage: scripts/browser/broken-images.sh [agent-browser flags, such as --session phone]
#
# Skull King draws each pirate face as an SVG <image>, which the <img>-only scan
# could not see (PR #400).

set -euo pipefail

SCAN="(async () => {
  const brokenTags = [...document.querySelectorAll('img')]
    .filter((img) => img.complete && img.naturalWidth === 0)
    .map((img) => ({ tag: 'img', src: img.src.slice(0, 120), alt: img.alt }));
  const svgSources = [...document.querySelectorAll('image')]
    .map((image) => image.getAttribute('href') ?? image.getAttribute('xlink:href') ?? '');
  const decodes = await Promise.all([...new Set(svgSources)].map(async (source) => {
    const probe = new Image();
    probe.src = source;
    try { await probe.decode(); return null; } catch { return { tag: 'image', src: source.slice(0, 120) }; }
  }));
  return JSON.stringify([...brokenTags, ...decodes.filter((broken) => broken !== null)]);
})()"

result=$(agent-browser "$@" eval "$SCAN")
result="${result#\"}"
result="${result%\"}"
result="${result//\\\"/\"}"

if [ "$result" != "[]" ]; then
  printf '[broken-images] FAIL these images did not render:\n%s\n' "$result"
  exit 1
fi
printf '[broken-images] every <img> and SVG <image> on the page rendered\n'
