#!/usr/bin/env bash
# PreToolUse hook for the GitHub MCP calls that write a pull-request body.
#
# The server sanitizes the body before it is stored, and what it removes it
# removes silently: the call succeeds, the PR page renders, and the missing
# half is only visible to whoever reads the body back. Measured on PR #60 on
# 2026-08-18, one probe per form:
#
#   <details> / <summary>      removed, their contents kept and flattened
#   <img src="…">              the src attribute removed, the tag kept
#   ![alt](….png)              the URL wrapped in backticks, so it renders
#                              as code rather than as an image
#   [text](….png)              same, whether or not it is an image tag
#   <https://…>                removed entirely
#   [text](….md), (…/tree/…),  untouched, including at a pinned 40-hex SHA,
#   (…/commit/<sha>)           so the rule is the extension, not the URL
#
# A body that leans on any of those reaches the reader with its evidence
# gone. This hook refuses the call and names the shape that survives.
#
# Output contract (Claude Code PreToolUse hook):
#   - exit 0 + no stderr → the call runs as-is.
#   - exit 2 + stderr message → the call is blocked and the message is
#     surfaced to the agent. Exit 1 does NOT block: the harness treats any
#     non-zero-but-not-2 code as a non-blocking error, prints it, and makes
#     the call anyway.

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
  echo "[pr-body] See docs/knowledge/github-mcp-pr-body-sanitizer.md." >&2
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

exit 0
