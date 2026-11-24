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

Session: b8f7afeb-c5c4-5bf7-94da-6a807e9243b4

- [2026-11-23 21:00] `transcript-reader` A list_events page small enough to spill as a .json tool result stores escaped JSON, so the brief's grep for "first_id" and "created_at" cursors finds nothing on it.
- [2026-11-23 21:04] `hook:no-broad-kill` reached for pkill or killall on a machine other agents share
