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
- [2026-11-15 21:11] `hook:api-validation` opened a pull request changing an API without a technical-validation report
- [2026-11-15 21:17] `technical-validator` vitest --changed at the repository root runs no test for a changed shell gate, so a gate script's only test signal is a hand-written test file nobody is prompted to add
- [2026-11-15 21:22] `technical-validator-r2` Round-1 report cites scripts/quality/check-doc-links.ts as a passing check, but no such file exists on the branch, so the cited command cannot be rerun.
