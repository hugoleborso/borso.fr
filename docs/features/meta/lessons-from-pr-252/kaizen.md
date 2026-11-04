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

Session: 5c67d2cf-de8c-566a-8c21-b80e63e86b31

- [2026-11-03 23:58] `main` the first draft of the Prettier guard matched the word anywhere and refused a grep that only mentioned it
- [2026-11-03 23:58] `main` the first conflict proof planted a line main had not touched, so the planted defect was not a defect
