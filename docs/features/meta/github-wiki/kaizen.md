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

Session: 2631cf96-efc8-505b-82b7-825582815b3b

- [2026-11-12 18:18] `hook:no-broad-kill` reached for pkill or killall on a machine other agents share
- [2026-11-12 18:20] `main` docs/architecture.md and docs/local-dev.md still described four constructs, $5/$20/$50 budgets, Biome and no local Postgres, and no gate flags a doc that names a removed tool or a changed constant
- [2026-11-12 18:20] `main` CARTO began watermarking keyless basemap tiles in late August 2026 and the last-loop-lepin map showed it in production until a README screenshot caught it, because nothing watches third-party tile responses
