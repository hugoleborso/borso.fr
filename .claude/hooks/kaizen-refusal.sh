#!/usr/bin/env bash
# Record the friction a PreToolUse hook just refused.
#
# The friction log only ever holds what somebody remembered to write down, and
# the moment a hook fires is exactly the moment nobody does: the agent reads
# the refusal, fixes the call, and moves on with the problem solved and
# therefore, to it, no longer a problem. PR #100 logged one line across a day
# of work, from a subagent that had been told to; the main session hit five
# refusals from these hooks and logged none of them.
#
# A hook knows more than the agent does here. It knows a call was wrong, it
# knows which rule caught it, and it knows it in a script that is already
# running. So the hooks write their own rows and the log stops depending on
# anyone's memory.
#
#   .claude/hooks/kaizen-refusal.sh <rule> "<what the agent tried, one sentence>"
#
# Never fails the hook that calls it: a log that cannot be written is not a
# reason to let a refused call through, and `exit 2` has to stay the last word.
# `KAIZEN_LOG_REFUSALS=0` turns it off, which is what the decisions check sets
# while it feeds every hook the commands they must refuse — those refusals are
# the check working, not friction anyone hit.
set -euo pipefail

[ "${KAIZEN_LOG_REFUSALS:-1}" = "0" ] && exit 0

rule="${1:-hook}"
summary="${2:-a call was refused}"

repo_root="$(cd "$(dirname "$0")/../.." && pwd)"
[ -f "$repo_root/KAIZEN.md" ] || exit 0

"$repo_root/scripts/kaizen.sh" --from "hook:$rule" "$summary" >/dev/null 2>&1 || true
