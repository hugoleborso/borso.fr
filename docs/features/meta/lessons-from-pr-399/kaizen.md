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

Session: f5ecce83-7273-50d1-b4be-054edcaaf6bf

- [2026-11-23 21:10] `transcript-399` list_events pages under 50k characters land inline, so operator-messages.ts cannot read them and six of fifteen pages had to be scanned by eye, and small assistant-filtered pages for context came back empty.
