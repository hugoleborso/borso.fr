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

Session: bf8f89bb-f672-5432-8e00-e4bdc749a3b0

- [2026-11-21 11:58] `hook:visual-validation` opened a pull request changing a front end without a visual-validation report
- [2026-11-21 12:02] `visual-validator` The pragma seed has no session task with an assignee, no setlist lineup change tonight, no friends counts and no open vote, so four spec screens needed data created through the UI before they could be seen.
