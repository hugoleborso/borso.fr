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

Session: 3c92f284-1959-50fe-bf3a-4495a34cad85

- [2026-11-23 19:36] `hook:no-prettier` ran Prettier in a repository that formats with oxfmt
- [2026-11-23 19:40] `main` The TypeScript 7 package exposes its compiler API only under typescript/unstable/sync, so a probe written for ts.createProgram failed before the walk worked.
