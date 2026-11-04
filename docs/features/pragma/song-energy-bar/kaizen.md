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

Session: dc5d56df-6a65-56a7-8ab2-982f21ea3c22

- [2026-11-03 20:35] `hook:no-broad-kill` reached for pkill or killall on a machine other agents share
- [2026-11-04 00:03] `main` pnpm test:core runs past the 120s Bash timeout, so a full run must go to the background and its tail hides which test failed
