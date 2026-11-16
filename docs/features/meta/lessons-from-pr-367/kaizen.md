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

Session: 4738e02b-cd56-5b83-93e4-07f3d5df8f80

- [2026-11-16 12:53] `hook:no-prettier` ran Prettier in a repository that formats with oxfmt
- [2026-11-16 12:54] `hook:api-validation` opened a pull request changing an API without a technical-validation report
- [2026-11-16 12:54] `hook:no-swallowed-push` sent git push or git commit errors to /dev/null
