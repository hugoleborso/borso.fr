#!/usr/bin/env bash
# SessionStart hook — runs at the beginning of every Claude Code session.
# Calls the repo's install-repo-deps.sh and persists ~/.local/bin to PATH so
# the user-bin tools the install script puts there are visible to subsequent
# tool calls.

set -euo pipefail

REPO_ROOT="${CLAUDE_PROJECT_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"

bash "$REPO_ROOT/scripts/install-repo-deps.sh"

# Persist user-bin PATH for subsequent tool calls in this session.
if [ -n "${CLAUDE_ENV_FILE:-}" ]; then
  printf 'export PATH="$HOME/.local/bin:$PATH"\n' >> "$CLAUDE_ENV_FILE"
fi
