# KAIZEN — friction log for this task

Append one line per friction event, as it happens, with:

    scripts/kaizen.sh "what went wrong, in one sentence"
    scripts/kaizen.sh --from <your-agent-label> "..."   # from a subagent

The problem only, never the fix. `/after-task-kaizen` sweeps this file when
the work merges, classifies each line, and designs the eradication. Subagents
should append here too, naming themselves, so the sweep can tell one agent
struggling from four agents hitting the same wall.

This file is gitignored and is deleted once the kaizen pull request is open.

- [2026-10-29 15:49] `main` the task brief said deleting a GitHub environment removes its deployments; measured, the deployments survive the deletion
- [2026-10-29 15:49] `main` docs.github.com via WebFetch omits the fine-grained permission table; only the /api/article/body markdown of the permissions page names Administration: write
