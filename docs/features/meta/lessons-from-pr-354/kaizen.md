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

Session: 4b1d4518-a602-5e81-80b4-bb553c007608

- [2026-11-15 17:47] `operator-messages` list_events with kinds [user] returned an inline page of tool results into context, while kinds [user, assistant] spilled every page to a file, so the cheaper sweep is the wider filter plus a parser; the knowledge entry does not say so
