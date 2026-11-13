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

Session: ee799f46-edb5-59dd-ba86-aea5873f99f0

- [2026-11-13 08:53] `hook:no-test-double-dash` passed -- to a pnpm test script, which makes Vitest run every file
- [2026-11-13 08:56] `hook:no-broad-kill` reached for pkill or killall on a machine other agents share
- [2026-11-13 08:58] `hook:api-validation` opened a pull request changing an API without a technical-validation report
- [2026-11-13 09:08] `technical-validator` scripts/mutate-changed.sh filters by the given paths before mapping a changed test to its source, so passing a source path whose test alone changed mutates nothing for it
