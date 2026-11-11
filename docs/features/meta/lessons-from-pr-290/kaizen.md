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

Session: 37e6810c-9136-50e2-95ed-2b7fdd855a2d

- [2026-11-11 18:59] `hook:no-prettier` ran Prettier in a repository that formats with oxfmt
- [2026-11-11 19:02] `hook:no-discarding-reset` ran a git command that would discard uncommitted work
- [2026-11-11 19:07] `hook:no-test-double-dash` passed -- to a pnpm test script, which makes Vitest run every file
- [2026-11-11 19:09] `main` a pre-commit refusal leaves the paths staged, so the next commit with its own git add silently carries the refused commit's files too
- [2026-11-11 19:09] `main` check-dantotsu-front-matter reads every dantotsu on disk, so an uncommitted entry whose eradication paths are not committed yet refuses unrelated commits
- [2026-11-11 19:09] `main` a heredoc commit message followed by a pipe on the operator line was read by the new no-test-double-dash hook as a command
