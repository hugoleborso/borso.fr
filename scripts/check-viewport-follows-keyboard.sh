#!/usr/bin/env bash
# Every page an app serves lets the on-screen keyboard shrink its layout
# viewport. Without `interactive-widget=resizes-content` the keyboard shrinks
# only the visual viewport, so `position: fixed`, `%` and `dvh` keep measuring
# the full screen and a bar or a field ends up under the keyboard. See
# docs/dantotsus/the-keyboard-shrank-a-screen-css-could-not-see.md.
#
# It reads every tracked HTML file under apps/ that declares a viewport, so a
# new app or a new page is checked without being listed anywhere.

set -euo pipefail

REQUIRED='interactive-widget=resizes-content'
missing=0
checked=0

while IFS= read -r page; do
  viewport=$(tr '\n' ' ' <"$page" | grep -oE '<meta[[:space:]]+name="viewport"[[:space:]]+content="[^"]*"' || true)
  [ -z "$viewport" ] && continue
  checked=$((checked + 1))
  case "$viewport" in
    *"$REQUIRED"*) ;;
    *)
      echo "[check-viewport-follows-keyboard] $page: the viewport meta lacks $REQUIRED." >&2
      echo "    Append it to the content, so the keyboard shrinks what fixed, % and dvh measure." >&2
      missing=$((missing + 1))
      ;;
  esac
done < <(git ls-files 'apps/*.html')

if [ "$missing" -gt 0 ]; then
  exit 1
fi
if [ "$checked" -eq 0 ]; then
  echo "[check-viewport-follows-keyboard] found no viewport meta under apps/, so it checked nothing." >&2
  exit 1
fi
echo "[check-viewport-follows-keyboard] all $checked app pages let the keyboard shrink their layout viewport"
