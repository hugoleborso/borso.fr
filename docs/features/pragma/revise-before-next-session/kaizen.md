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

Session: 7bdb2074-f047-5f01-88d8-e58955f64981

- [2026-11-15 22:34] `hook:no-prettier` ran Prettier in a repository that formats with oxfmt
- [2026-11-15 22:38] `hook:no-broad-kill` reached for pkill or killall on a machine other agents share
- [2026-11-15 22:42] `technical-validator` The back-e2e --changed run on a site-only diff prints 'No test files found, exiting with code 0', which reads the same as a run that silently found nothing because of a bad base ref.
- [2026-11-15 22:48] `technical-validator-2` pnpm knip --workspace apps/pragma fails with 'Workspace directory not found' when run from apps/pragma, and only works from the repo root
- [2026-11-15 22:53] `visual-validator` pragma reads go through POST /api/read-batch, so agent-browser network route cannot empty or delay one resource (sessions, tasks) to test a not-loaded or empty state
