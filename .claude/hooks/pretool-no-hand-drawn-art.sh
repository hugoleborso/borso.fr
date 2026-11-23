#!/usr/bin/env bash
# PreToolUse (Write|Edit|MultiEdit): refuse SVG path data an agent draws by hand.
#
# Path data with no `@AssetSource <url> <license>` in the file is a drawing an
# agent made, which the operator rejects on sight. Tests are left alone.
# See docs/dantotsus/the-eye-scar-drawn-by-hand-twice.md.
set -euo pipefail
command -v jq >/dev/null 2>&1 || exit 0

INPUT="$(cat)"
FILE="$(jq -r '.tool_input.file_path // ""' <<<"$INPUT")"
[[ "$FILE" =~ /apps/[^/]+/site/src/.*\.(tsx|ts|svg)$ ]] || exit 0
[[ "$FILE" =~ \.test\.tsx?$ ]] && exit 0

NEW="$(jq -r '[.tool_input.content, .tool_input.new_string, (.tool_input.edits // [] | .[].new_string)] | map(select(. != null)) | join("\n")' <<<"$INPUT")"
grep -qE "\bd(=\{?|: ?)[\"'\`][Mm][^\"'\`]{24,}" <<<"$NEW" || exit 0
grep -q '@AssetSource' <<<"$NEW" && exit 0
[ -f "$FILE" ] && grep -q '@AssetSource' "$FILE" && exit 0

cat >&2 <<'EOF'
[no-hand-drawn-art] This writes SVG path data with no named source, so it is a drawing made by hand.
[no-hand-drawn-art] Search free-licensed art instead: icons already installed (lucide-react), iconify, game-icons.net, CC0 packs.
[no-hand-drawn-art] Composite two to four candidates on the real screen, side by side, publish that image and let the operator pick.
[no-hand-drawn-art] Then put `@AssetSource <url> <license>` in the file and credit it in the app's CREDITS.md.
EOF
"$(dirname "$0")/kaizen-refusal.sh" no-hand-drawn-art "wrote SVG path data with no named source, an illustration drawn by hand"
exit 2
