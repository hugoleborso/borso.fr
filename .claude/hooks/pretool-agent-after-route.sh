#!/usr/bin/env bash
# PreToolUse hook for the Agent tool: refuses an agent that can write code
# in a session that never sized its work with /route.
#
# On PR #410 the session skipped /route, spawned two build agents, and showed
# its first mockup after the API and the site existed. The operator chose this
# hook over a written rule.
# See docs/dantotsus/the-deadline-that-skipped-the-mockups.md.
#
# Output contract (Claude Code PreToolUse hook):
#   - exit 0 → the agent starts.
#   - exit 2 + stderr message → the call is blocked and the message reaches
#     the session.

set -uo pipefail

INPUT="$(cat)"

# A subagent has no Agent tool of its own to misuse; only the main session is checked.
if [[ -n "$(jq -r '.agent_id // ""' <<<"$INPUT")" ]]; then
  exit 0
fi

# Agent types that only read pass without /route.
AGENT_TYPE="$(jq -r '.tool_input.subagent_type // "general-purpose"' <<<"$INPUT")"
case "$AGENT_TYPE" in
  Explore | Plan | claude-code-guide | web-fetch | technical-validator | visual-validator | \
    statusline-setup | impeccable-finish-reviewer)
    exit 0
    ;;
esac

# The skills that size or frame the work. A call to one of them, or the
# operator typing it, counts as the work being sized.
FRAMING_SKILLS='route|specification|tech-lead-orchestrator|feature-pipeline|after-task-kaizen'
TRANSCRIPT="$(jq -r '.transcript_path // ""' <<<"$INPUT")"
if [[ -f "$TRANSCRIPT" ]] &&
  grep -qE "\"skill\": ?\"($FRAMING_SKILLS)\"|<command-name>/($FRAMING_SKILLS)</command-name>" "$TRANSCRIPT"; then
  exit 0
fi

# A branch that already adds a spec has been framed, even in a resumed session.
REPO_ROOT="${CLAUDE_PROJECT_DIR:-$(cd "$(dirname "$0")/../.." && pwd)}"
ADDED_SPECS="$(git -C "$REPO_ROOT" diff --name-only --diff-filter=A origin/main...HEAD -- 'docs/features/*/*/spec/spec.md' 2>/dev/null)"
if [[ -n "$ADDED_SPECS" ]]; then
  exit 0
fi

echo "[agent-after-route] This session has not run /route, and its branch adds no spec.md." >&2
echo "[agent-after-route] A $AGENT_TYPE agent can write code, so size the work first: run /route." >&2
echo "[agent-after-route] A Tier 2 feature shows the operator mockups and a spec before any build agent starts." >&2
"$(dirname "$0")/kaizen-refusal.sh" agent-after-route "a $AGENT_TYPE agent was spawned before /route ran"
exit 2
