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

Session: 32d293bb-4f49-5d4a-b2bc-8371aee85106

- [2026-11-14 22:58] `main` A back-e2e test hardcoded the DSQL retry count (3) instead of importing CONFLICTED_WRITE_MAX_ATTEMPTS, so raising it failed far from the change.
