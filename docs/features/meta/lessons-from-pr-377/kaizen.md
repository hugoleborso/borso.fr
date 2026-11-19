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

Session: 3f56ffac-0ee9-590a-ae48-632ac93ba661

- [2026-11-19 17:01] `transcript-reader` list_events pages of a busy 8.5h session cover only 3 to 10 minutes each, so reading the operator's words takes dozens of spilled 100k-1M char pages with no server-side filter for typed messages.
- [2026-11-19 17:04] `hook:no-broad-kill` reached for pkill or killall on a machine other agents share
