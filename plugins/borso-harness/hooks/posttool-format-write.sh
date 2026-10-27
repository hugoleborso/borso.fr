#!/usr/bin/env bash
# PostToolUse (Edit|Write|MultiEdit) — format the file that was just written, so
# style drift never reaches the pre-commit gate.
#
# The gate checks the format of the staged files and fails on drift; it does
# not fix it. Nothing formatted a file between the edit and the commit, so a
# single misplaced line cost a whole rejected-commit cycle for zero semantic
# change. This hook is the writer that was missing above the detector.
#
# Best-effort by contract: it ALWAYS exits 0. The commit-time gate is the real
# enforcement, so a hiccup here must never block an edit or feed an error back
# to the model.
#
# The formatter only, oxfmt where the repository installs it and Prettier
# otherwise. A lint fix is deliberately not run: this repository's lint
# rules include several whose autofix rewrites code rather than layout, and
# having a rewrite land silently between an edit and the next read is how an
# agent ends up reasoning about a file it no longer has. Lint stays a gate that
# reports, and the author fixes it.
#
# Markdown is excluded for the reason the formatter's ignore list gives — the
# formatters rewrite emphasis markers and pad table cells with no way to stop
# it — but relying on that list alone would still spawn a formatter per
# markdown edit, so the case statement below skips those extensions outright.

if ! command -v jq >/dev/null 2>&1; then
  exit 0
fi

INPUT=$(cat)
FILE=$(jq -r '.tool_input.file_path // empty' <<<"$INPUT")

[ -z "$FILE" ] && exit 0
[ -f "$FILE" ] || exit 0

case "$FILE" in
  *.ts | *.tsx | *.js | *.jsx | *.mjs | *.cjs | *.json | *.jsonc | *.css | *.html | *.yml | *.yaml) ;;
  *) exit 0 ;;
esac

cd "${CLAUDE_PROJECT_DIR:-.}" || exit 0

# Only files of this repository. An agent's scratchpad lives outside it, and
# formatting a mock-up there with this repository's formatter tripled two
# agents' files past the size budget they had been given. See
# docs/dantotsus/the-formatter-reached-outside-the-repository.md.
PROJECT_ROOT=$(pwd -P)
FILE_DIRECTORY=$(cd -- "$(dirname -- "$FILE")" 2>/dev/null && pwd -P) || exit 0
FILE_PATH="$FILE_DIRECTORY/$(basename -- "$FILE")"
case "$FILE_PATH" in
  "$PROJECT_ROOT"/*) ;;
  *) exit 0 ;;
esac

# A repository with neither formatter installed has nothing to format with, and
# this hook ships in a plugin that such a repository can install.
if [ -x node_modules/.bin/oxfmt ]; then
  node_modules/.bin/oxfmt "$FILE" >/dev/null 2>&1 || true
elif [ -x node_modules/.bin/prettier ]; then
  node_modules/.bin/prettier --write --ignore-unknown --cache "$FILE" >/dev/null 2>&1 || true
fi
exit 0
