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

Session: a022c8a5-879d-5854-8738-d6a4d9aeb4ac

- [2026-11-04 01:03] `main` Sentry search_traces returned nothing for natural-language aggregate queries; explicit fields and sort were needed
- [2026-11-04 01:03] `main` A dantotsu sentence (DML cannot meet OC001) was accepted without checking the AWS page and steered later code
