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

Session: 54383f24-d986-5f48-b893-2eca9d5f74fa

- [2026-11-13 16:47] `main` Wikimedia upload and API hosts answer 429 to this session's egress, so the Commons original cannot be fetched on first try
- [2026-11-13 16:48] `hook:no-prettier` ran Prettier in a repository that formats with oxfmt
- [2026-11-13 16:51] `hook:no-broad-kill` reached for pkill or killall on a machine other agents share
- [2026-11-13 16:53] `main` Drafted an operator-backlog row to delete the « Talos : message » routine before reading that decisions fire the same routine through fire-url
