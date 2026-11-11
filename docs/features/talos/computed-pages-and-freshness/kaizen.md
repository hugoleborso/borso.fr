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

Session: 2ad21149-51d3-5fff-98e8-0e9474b187e4
- [2026-11-11 19:04] `hook:pre-push-conflict` pre-push refused a branch that conflicts with origin/main
- [2026-11-11 19:48] `computed-pages` pnpm dev never applies a changed test/memory-seed.json to an existing local dev database, because dev-database.setup.ts replays the fixed idempotency key dev-seed, so each feature wipes the database or posts its seed by hand.
- [2026-11-11 19:48] `computed-pages` The brief and the spec say entity.upsert already strips the lines of Faits, Historique and Relations from a body, and no code does, so C3.1 had nothing to extend.
