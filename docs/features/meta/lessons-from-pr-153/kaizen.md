# KAIZEN — friction log for this task

Append one line per friction event, as it happens, with:

    scripts/kaizen.sh "what went wrong, in one sentence"
    scripts/kaizen.sh --from <your-agent-label> "..."   # from a subagent

The problem only, never the fix. `/after-task-dantotsus` sweeps this file when
the work merges, classifies each line, and designs the eradication. Subagents
should append here too, naming themselves, so the sweep can tell one agent
struggling from four agents hitting the same wall.

This file is gitignored and is deleted once the kaizen pull request is open.

- [12:16] `hook:no-swallowed-push` piped git push or git commit into another command, throwing away its exit status
- [12:16] `hook:no-broad-kill` reached for pkill or killall on a machine other agents share
- [12:16] `hook:no-swallowed-push` piped git push or git commit into another command, throwing away its exit status
