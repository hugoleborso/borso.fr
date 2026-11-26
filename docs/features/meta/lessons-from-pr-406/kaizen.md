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

Session: f1ea7e18-f81e-5656-9d42-7ac0b70a3ab1

- [2026-11-26 09:51] `hook:no-prettier` ran Prettier in a repository that formats with oxfmt
- [2026-11-26 09:52] `hook:no-swallowed-push` skipped the git hooks with --no-verify or HUSKY=0
- [2026-11-26 09:59] `main` The first fix for the token test assumed a raw-text glob puts files in vitest's module graph; vitest related showed it does not, and only a module-level lazy glob does.
