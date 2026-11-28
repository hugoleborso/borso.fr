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

Session: 3d0f35c1-8d0e-4710-8803-383b3ffe9c1a

- [2026-11-28 11:25] `main` TS2307 for mailchecker, validator and qrcode.react until pnpm install --frozen-lockfile ran; branch was level with origin/main (where: apps/pragma: pnpm run typecheck)
