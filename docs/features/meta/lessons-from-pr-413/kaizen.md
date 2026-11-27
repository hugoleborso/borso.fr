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

Session: 0fc6c4f9-3844-5d0d-a801-0a39c703a92b

- [2026-11-26 22:33] `transcript-reader` list_events with kinds user still returns pages of 50-480k characters because subagent tool results count as user events, so paging a 13-hour session for typed messages takes one spilled file and one parse per page
