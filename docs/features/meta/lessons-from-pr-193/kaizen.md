# KAIZEN — friction log for this task

Append one line per friction event, as it happens, with:

    scripts/kaizen.sh "what went wrong, in one sentence"
    scripts/kaizen.sh --from <your-agent-label> "..."   # from a subagent

The problem only, never the fix. `/after-task-kaizen` sweeps this file when
the work merges, classifies each line, and designs the eradication. Subagents
should append here too, naming themselves, so the sweep can tell one agent
struggling from four agents hitting the same wall.

This file is gitignored and is deleted once the kaizen pull request is open.

- [10:40] `kaizen-193` a subagent running /after-task-kaizen has no Agent tool, so the standards review of the kaizen branch had to be done inline, the same wall four PR #193 agents hit
- [10:40] `kaizen-193` scripts/argent.sh stop uses pkill -f on the CDP port pattern, which killed the calling shell (exit 144) because that shell's own command line named the port
- [10:40] `kaizen-193` eslint on two files aborted with SIGABRT out of heap until NODE_OPTIONS raised the old-space limit
