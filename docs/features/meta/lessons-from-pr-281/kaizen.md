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

Session: 8df1a3cb-c28c-5fba-8e2c-09ef37832304

- [2026-11-09 22:00] `hook:no-discarding-reset` ran a git command that would discard uncommitted work
- [2026-11-09 22:03] `main` The dantotsu front-matter checker reported eradication-paths as missing when it was present as a multi-line YAML list, so the message pointed at the wrong fault
