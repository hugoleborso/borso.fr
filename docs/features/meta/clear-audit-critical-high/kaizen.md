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

Session: 0844dfc2-cfda-5ca1-941e-13a51b52dbcb

- [2026-11-05 01:49] `main` pnpm 10.0 'update --depth Infinity' and a plain install left transitive deps at stale versions inside their ranges; only a temporary override or an explicit devDependency moved them
- [2026-11-05 01:49] `main` zod 4 applies .default() inside .partial(), so update schemas derived from create schemas silently reset omitted fields; only two of six slices had a test that caught it
- [2026-11-05 01:49] `main` zod 4 ZodError serialises without issues, so @hono/zod-validator's default 400 body lost the field list the last-loop-lepin admin form reads, and no test covered the wire shape
