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
- [2026-11-11 20:27] `technical-validator` gh pr list answers HTTP 403 because GraphQL is not available in the session, so the validator had to rebuild the REST call from the remote URL to learn whether a pull request exists.
- [2026-11-11 20:51] `closeness-scale` The brief and spec S1.2 assume entity.upsert may omit kind (the kind stored), but the schema has always required kind, so the stored-kind branch cannot be reached or tested without a contract change.
- [2026-11-11 20:51] `closeness-scale` pnpm dev still never applies a changed test/memory-seed.json to an existing dev database, so the new seed rows were posted by hand again with a one-off tsx script.
