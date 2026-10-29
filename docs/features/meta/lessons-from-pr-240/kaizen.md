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

Session: bd478bd0-c24b-54be-b537-75942e140826

- [2026-10-29 18:20] `main` git log on PR #240's branch commits failed with unknown revision, because the squash merge left them out of the clone until fetched by SHA
- [2026-10-29 18:20] `main` a commitlint config that sets its own parserPreset replaces the extended preset whole, so a one-option override lost the header pattern
