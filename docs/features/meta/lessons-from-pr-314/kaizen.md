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

Session: f6bb07b3-1350-5245-8bf0-5c39a6738e83

- [2026-11-12 15:29] `transcript-search` Every list_events page with kinds user,assistant overflowed the tool output limit (85k to 740k chars), so each page needed a custom JSON parser to find tool_use and tool_result pairs and operator text.
- [2026-11-12 15:53] `hook:no-discarding-reset` ran a git command that would discard uncommitted work
- [2026-11-12 15:53] `main` GitHub MCP pull_request_read returned 503 twice, so the merge was checked from main's squash commit instead
- [2026-11-12 15:53] `main` a validator's non-blocking finding asked to rename a boolean function away from a question name that the consistent-boolean-name lint rule requires
