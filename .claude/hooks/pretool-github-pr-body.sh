#!/usr/bin/env bash
# PreToolUse hook for the GitHub MCP calls that write a pull-request body.
#
# The server strips some forms from the body silently. The forms, measured on
# PRs #49 to #83, are in docs/knowledge/github-mcp-pr-body-sanitizer.md. An
# angle-bracket placeholder goes even inside a code span, so that check reads
# the raw body.
#
# A body that leans on any of those reaches the reader with its evidence
# gone. This hook refuses the call and names the shape that survives.
#
# Output contract: exit 2 with a message on stderr blocks the call; exit 1 does not.

set -euo pipefail

INPUT="$(cat)"

BODY="$(jq -r '.tool_input.body // ""' <<<"$INPUT")"
if [[ -z "$BODY" ]]; then exit 0; fi

# Match markup that renders, not markup that is being written about. A body
# explaining this very sanitizer quotes every form it names, and the first
# body to reach this hook — the sweep that added it — was refused for saying
# the words. Code spans and fenced blocks are dropped before the checks.
BODY_AS_RENDERED="$(printf '%s' "$BODY" | python3 "$(dirname "$0")/strip-markdown-code.py")"

block() {
  echo "[pr-body] $1" >&2
  echo "[pr-body] The GitHub MCP server strips this before storing the body, without failing." >&2
  echo "[pr-body] Screenshots: commit them and link the PR's Files changed tab, which renders" >&2
  echo "[pr-body]   them inline. Collapsed sections: use ### headings instead." >&2
  echo "[pr-body] Then read the body back with pull_request_read and confirm what survived." >&2
  echo "[pr-body] See https://github.com/hugoleborso/borso.fr/blob/main/docs/knowledge/github-mcp-pr-body-sanitizer.md." >&2
  "$(dirname "$0")/kaizen-refusal.sh" pr-body "wrote a pull-request body carrying markup the server silently strips"
  exit 2
}

if grep -qE '!\[[^]]*\]\(' <<<"$BODY_AS_RENDERED"; then
  block "the body carries a markdown image; its URL comes back wrapped in backticks and renders as code."
fi

if grep -qiE '<img[[:space:]]' <<<"$BODY_AS_RENDERED"; then
  block "the body carries an <img> tag; its src attribute is removed and an empty tag is stored."
fi

if grep -qiE '<details>|<summary>' <<<"$BODY_AS_RENDERED"; then
  block "the body carries a <details> toggle; the tag is removed and its contents are flattened into the page."
fi

if grep -qE '\]\([^)]+\.(png|jpe?g|gif|webp|svg)([?#][^)]*)?\)' <<<"$BODY_AS_RENDERED"; then
  block "the body links a file whose extension is an image; the URL comes back wrapped in backticks."
fi

# A markdown link whose target is long comes back wrapped in backticks too,
# whatever the extension. Six samples across PRs #46 and #48 separated cleanly
# at about 150 characters, and PR #100 hit it again on a .md target — a shape
# the entry lists as surviving, because the rule is the length and not the
# extension. The knowledge has been written since 2026-08-14 and stopped
# nothing, which is what moves it from a page into this hook.
LONG_LINK="$(grep -oE '\]\([^) ]{150,}\)' <<<"$BODY_AS_RENDERED" | head -1 || true)"
if [[ -n "$LONG_LINK" ]]; then
  block "the body carries a markdown link whose target is $(( ${#LONG_LINK} - 3 )) characters; past about 150 the URL comes back wrapped in backticks and the anchor is dead. Name a file the branch adds by its path in a code span, since a /blob/main/ link to it is a 404 until merge. Link through /blob/main/ only for a file already on main, or write the bare URL, which autolinks at any length."
fi

# Raw body on purpose: backticks do not protect an angle-bracket placeholder,
# so stripping code spans first would hide the very occurrences that get
# deleted. Everything shaped like a tag goes, whatever it is quoted inside.
PLACEHOLDER="$(grep -oE '<[A-Za-z][A-Za-z0-9._/:-]*>' <<<"$BODY" | head -1 || true)"
if [[ -n "$PLACEHOLDER" ]]; then
  echo "[pr-body] the body carries $PLACEHOLDER, which the server reads as an HTML tag and deletes." >&2
  echo "[pr-body] Backticks do not protect it: the sanitizer strips markup before markdown fencing" >&2
  echo "[pr-body]   is considered, so a code span loses the placeholder too. The sentence around it" >&2
  echo "[pr-body]   stays grammatical and silently changes meaning, which is the worst shape here." >&2
  echo "[pr-body] Write a real example instead (PATH/TO/file.ts, 2026-08-21), or name the thing in" >&2
  echo "[pr-body]   words (\"the generator's path\"). Keep the bracket form for files in the repo." >&2
  echo "[pr-body] See https://github.com/hugoleborso/borso.fr/blob/main/docs/knowledge/github-mcp-pr-body-sanitizer.md." >&2
  "$(dirname "$0")/kaizen-refusal.sh" pr-body "wrote a pull-request body carrying an angle-bracket placeholder the server deletes"
  exit 2
fi

exit 0
