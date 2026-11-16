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

Session: b0e9dbea-1ef9-476f-b9c4-8fb352ca4aab

- [2026-11-16 11:11] `main` Default shell node was v26, so 75 site tests failed on an undefined localStorage until fnm use 24; nothing warns that node differs from .nvmrc.
- [2026-11-16 11:11] `main` oxfmt run on a folder reformatted an unrelated file (assistant-grants.queries.ts) the main branch leaves unformatted.
