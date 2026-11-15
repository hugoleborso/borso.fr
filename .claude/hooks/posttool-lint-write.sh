#!/usr/bin/env bash
# PostToolUse (Edit|Write|MultiEdit) — lint the code file that was just written
# and hand its errors back while the change is still one edit old.
#
# The repository's custom rules carry the lessons of its dantotsus, and each
# rule's message names its entry. They spoke only at the commit, after a whole
# implementation stood on the shape they forbid. In PR #343 the first draft made
# pragma's <main> scroll, which no-scroll-container-on-main and
# docs/dantotsus/the-shell-that-scrolled-inside-a-window-that-still-could.md
# already forbade, and only the lint run before the commit said so. See
# docs/dantotsus/the-rule-that-spoke-only-at-the-commit.md.
#
# Every rule but the type-aware ones. tsgolint builds the program of the whole
# workspace, about 4 s for one pragma component against about 1 s without it
# (measured on 2026-11-15). The type-aware rules stay with the commit gate. The
# config without them is derived from .oxlintrc.json and kept at the root,
# because oxlint resolves its plugins and its override globs from the config's
# own folder. It is rebuilt whenever .oxlintrc.json is newer.
#
# Unused-directive reports are off here: without type information an
# eslint-disable naming a type-aware rule reads as unused. See
# docs/knowledge/oxlint-without-type-aware-reads-type-aware-directives-as-unused.md.
#
# Best-effort by contract: it ALWAYS exits 0 and never blocks an edit. The
# commit gate is the enforcement; this only moves the first warning earlier.

command -v jq >/dev/null 2>&1 || exit 0

INPUT=$(cat)
FILE=$(jq -r '.tool_input.file_path // empty' <<<"$INPUT")

[ -n "$FILE" ] && [ -f "$FILE" ] || exit 0

case "$FILE" in
  *.ts | *.tsx | *.js | *.jsx | *.mjs | *.cjs) ;;
  *) exit 0 ;;
esac

ROOT="$(cd "$(dirname "$0")/../.." && pwd -P)"
cd "$ROOT" || exit 0
[ -x node_modules/.bin/oxlint ] && [ -f .oxlintrc.json ] || exit 0

FILE_DIRECTORY=$(cd -- "$(dirname -- "$FILE")" 2>/dev/null && pwd -P) || exit 0
FILE_PATH="$FILE_DIRECTORY/$(basename -- "$FILE")"
case "$FILE_PATH" in
  "$ROOT"/*) ;;
  *) exit 0 ;;
esac

CONFIG=.oxlintrc.write.json
if [ ! -f "$CONFIG" ] || [ .oxlintrc.json -nt "$CONFIG" ]; then
  STAGING="$(mktemp "$ROOT/.oxlintrc.write.XXXXXX")" || exit 0
  if jq '.options.typeAware = false | .options.reportUnusedDisableDirectives = "off"' \
    .oxlintrc.json >"$STAGING" 2>/dev/null; then
    mv -f "$STAGING" "$CONFIG"
  else
    rm -f "$STAGING"
    exit 0
  fi
fi

REPORT="$(node_modules/.bin/oxlint -c "$CONFIG" --quiet --format=unix "${FILE_PATH#"$ROOT"/}" 2>/dev/null)"
[ $? -eq 1 ] || exit 0
REPORT="$(grep -E '^[^ ].*:[0-9]+:[0-9]+: ' <<<"$REPORT" | head -n 10)"
[ -n "$REPORT" ] || exit 0

CONTEXT="[lint] The file just written breaks a rule the commit gate enforces. Each message names the lesson behind it; fix the shape now rather than build on it:

$REPORT"

jq -n --arg context "$CONTEXT" \
  '{hookSpecificOutput: {hookEventName: "PostToolUse", additionalContext: $context}}'
exit 0
