#!/usr/bin/env bash
# PreToolUse hook on the Skill tool.
#
# Refuses `/technical-validation` and `/visual-validation` when a subagent
# loads them. Both skills exist to dispatch an isolated validator agent, and
# a subagent has no Agent tool. So the subagent read the brief and validated
# in its own context, which is the bias the skills exist to remove. Three
# pull requests hit it: #193, #206 and #278, where three validation agents
# logged it again.
#
# Claude Code sets `agent_id` on every hook input fired inside a subagent and
# leaves it out in the main session (read in the installed binary, 2.1.318).
# The main session keeps the skill. A subagent is told which dispatch to ask
# its caller for.
#
# See docs/dantotsus/the-validator-opened-a-checkout-holding-only-the-plan.md.
#
# Output contract (Claude Code PreToolUse hook):
#   - exit 0 + no stderr → the skill loads.
#   - exit 2 + stderr message → the call is blocked and the message reaches
#     the agent.

set -euo pipefail

INPUT="$(cat)"

SKILL="$(jq -r '.tool_input.skill // ""' <<<"$INPUT")"
AGENT_ID="$(jq -r '.agent_id // ""' <<<"$INPUT")"

case "$SKILL" in
  technical-validation) VALIDATOR="technical-validator" ;;
  visual-validation) VALIDATOR="visual-validator" ;;
  *) exit 0 ;;
esac

if [[ -z "$AGENT_ID" ]]; then exit 0; fi

echo "[validation-runs-as-its-agent] /$SKILL dispatches the isolated $VALIDATOR agent, and a subagent has no Agent tool." >&2
echo "[validation-runs-as-its-agent] Validating here would run the review in a context that is not isolated." >&2
echo "[validation-runs-as-its-agent] Stop, and return status blocked with next.kind escalate and reason validator-needs-dispatch." >&2
echo "[validation-runs-as-its-agent] The main session then calls Agent with subagent_type \"$VALIDATOR\" and the brief from .claude/skills/$SKILL/template.md." >&2
"$(dirname "$0")/kaizen-refusal.sh" validation-runs-as-its-agent "a subagent loaded /$SKILL, which needs the Agent tool it does not have"
exit 2
