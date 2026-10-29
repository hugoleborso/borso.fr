#!/usr/bin/env bash
# SessionStart hook — runs at the beginning of every Claude Code session.
# Calls the repo's install-repo-deps.sh and persists ~/.local/bin to PATH so
# rtk (and any other user-bin tool the install script puts there) is visible
# to subsequent tool calls — including the existing PreToolUse rtk-rewrite
# hook which depends on `command -v rtk` resolving.
#
# Runs in BOTH local and remote (Claude on the web) sessions intentionally:
# rtk's value is identical in both. If you want to gate this to web-only,
# guard with `if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then exit 0; fi`.

set -euo pipefail

REPO_ROOT="${CLAUDE_PROJECT_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"

bash "$REPO_ROOT/scripts/install-repo-deps.sh"

# Persist user-bin PATH for subsequent tool calls in this session.
if [ -n "${CLAUDE_ENV_FILE:-}" ]; then
  printf 'export PATH="$HOME/.local/bin:$PATH"\n' >> "$CLAUDE_ENV_FILE"
fi
