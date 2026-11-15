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

Session: 78068d17-3d06-5092-8431-705a95f78fe2

- [2026-11-15 21:06] `hook:no-test-double-dash` passed -- to a pnpm test script, which makes Vitest run every file
- [2026-11-15 21:09] `main` add_repo on hugoleborso/talos was refused by the auto-mode classifier, so the delegation procedure that wrote PR #350's French prompt could not be read
- [2026-11-15 21:09] `main` kaizen PR #359's stop-port.sh is named in its squash message but was withdrawn, so reading the message alone sent me to a script that is not there
