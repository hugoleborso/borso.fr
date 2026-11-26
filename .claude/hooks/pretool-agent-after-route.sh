#!/usr/bin/env bash
# PreToolUse (Agent): no code-writing agent before /route. See docs/dantotsus/the-deadline-that-skipped-the-mockups.md.
set -uo pipefail
INPUT="$(cat)"
[[ -n "$(jq -r '.agent_id // ""' <<<"$INPUT")" ]] && exit 0
TYPE="$(jq -r '.tool_input.subagent_type // "general-purpose"' <<<"$INPUT")"
[[ "$TYPE" =~ ^(Explore|Plan|claude-code-guide|web-fetch|technical-validator|visual-validator|statusline-setup|impeccable-finish-reviewer)$ ]] && exit 0
SKILLS='route|specification|tech-lead-orchestrator|feature-pipeline|after-task-kaizen'
grep -qsE "\"skill\": ?\"($SKILLS)\"|<command-name>/($SKILLS)</command-name>" "$(jq -r '.transcript_path // ""' <<<"$INPUT")" && exit 0
git -C "${CLAUDE_PROJECT_DIR:-.}" diff --name-only --diff-filter=A origin/main...HEAD -- 'docs/features/*/*/spec/spec.md' 2>/dev/null | grep -q . && exit 0
echo "[agent-after-route] No /route this session and no spec.md on the branch, so a $TYPE agent cannot start. Run /route: a Tier 2 feature shows mockups and a spec before any build agent." >&2
"$(dirname "$0")/kaizen-refusal.sh" agent-after-route "a $TYPE agent was spawned before /route ran"
exit 2
