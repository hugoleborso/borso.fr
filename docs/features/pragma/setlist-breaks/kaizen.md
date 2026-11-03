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

Session: c57a6891-f982-593a-a1bf-0e97311e511c

- [2026-11-03 17:45] `hook:no-broad-kill` reached for pkill or killall on a machine other agents share
- [2026-11-03 17:45] `main` tool-budget.test pins the exact MCP tool count, so a new REST route forces either a new tool or folding into an existing one; the route-coverage gate and the budget gate are only discovered by running the assistant suite
- [2026-11-03 17:45] `main` prettier --write reformatted unrelated files; the repo formatter is oxfmt, and nothing at hand says so before the run
- [2026-11-03 17:46] `technical-validator` The setlist-breaks spec has no Test strategy, Use cases or Files-to-change section, so categories A and D had to be built from the Behaviour and Data shape bullets.
- [2026-11-03 17:48] `hook:no-swallowed-push` piped git push or git commit into another command, throwing away its exit status
- [2026-11-03 17:52] `technical-validator` vitest --coverage in apps/pragma failed with ENOENT on coverage/.tmp/coverage-27.json until I pointed --coverage.reportsDirectory at the scratchpad, likely a parallel run sharing the default directory.
