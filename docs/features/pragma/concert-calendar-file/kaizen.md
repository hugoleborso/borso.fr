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

Session: 9c2962d1-4876-40d6-aed0-4c98e04db32b

- [2026-11-27 09:24] `hook:no-prettier` ran Prettier in a repository that formats with oxfmt
- [2026-11-27 09:26] `main` Controller lint refuses a slice's own .core import, so a file name constant had to travel through the service outcome
