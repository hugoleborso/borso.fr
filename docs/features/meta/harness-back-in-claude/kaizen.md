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

Session: 3ddef881-d996-56f3-90ad-fe93d13b9fc3

- [2026-11-05 01:07] `hook:no-broad-kill` reached for pkill or killall on a machine other agents share
- [2026-11-05 01:07] `hook:open-pr` refused gh pr create: no --body / --body-file flag — PRs without a body are rejected.
- [2026-11-05 01:08] `main` Moving skills up one folder broke 70 relative links, and only the pre-commit doc-link check caught it, not the path checks run beforehand.
