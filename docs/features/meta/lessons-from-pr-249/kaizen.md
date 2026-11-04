# KAIZEN — friction log for this task

Append one line per friction event, as it happens, with:

    scripts/kaizen.sh "what went wrong, in one sentence"
    scripts/kaizen.sh --from <your-agent-label> "..."   # from a subagent

The problem only, never the fix. `/after-task-kaizen` sweeps the archived
copy in a new conversation after the merge, classifies each line, and designs
the eradication. Subagents
should append here too, naming themselves, so the sweep can tell one agent
struggling from four agents hitting the same wall.

This file is gitignored. Before the pull request opens, run
`scripts/kaizen.sh archive <docs-slug>/<feature>` and commit the copy.

Session: 997ce402-4447-59b8-be28-e6944883e8b4

- [2026-11-04 00:54] `hook:no-swallowed-push` sent git push or git commit errors to /dev/null
- [2026-11-04 01:00] `main` the new screens-shown Stop hook blocked the sweep's own reply because it quoted the old report's words
