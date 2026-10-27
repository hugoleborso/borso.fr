# KAIZEN — friction log for this task

Append one line per friction event, as it happens, with:

    scripts/kaizen.sh "what went wrong, in one sentence"
    scripts/kaizen.sh --from <your-agent-label> "..."   # from a subagent

The problem only, never the fix. `/after-task-kaizen` sweeps this file when
the work merges, classifies each line, and designs the eradication. Subagents
should append here too, naming themselves, so the sweep can tell one agent
struggling from four agents hitting the same wall.

This file is gitignored and is deleted once the kaizen pull request is open.

- [07:50] `main` the task named docs/contrat-api-memoire.md as the API contract; no such file exists, the contract is apps/talos/CONTRAT.md
- [07:54] `hook:no-swallowed-push` piped git push or git commit into another command, throwing away its exit status
