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

Session: 87c6dab2-47c2-5945-8c05-3ade9bba1711

- [2026-11-14 19:35] `hook:no-discarding-reset` ran a discarding git command on a checkout the hook could not read
- [2026-11-14 19:35] `hook:no-discarding-reset` ran a git command that would discard uncommitted work
- [2026-11-14 19:37] `browser` check-dantotsu-front-matter refuses an eradication path that is not yet tracked, so a subagent forbidden to stage cannot get its dantotsu green before handing back.
- [2026-11-14 19:40] `hook:subagent-no-staging` a subagent ran a git command that writes the shared index
- [2026-11-14 19:40] `process` A process-group kill recipe guarded with $$ terminated its own calling pipeline, because a background job inside a pipeline joins the pipeline's group; $BASHPID is the guard that holds.
- [2026-11-14 19:40] `process` The container has no man pages, so a kill(2) or git-mv quote for a dantotsu has to be fetched from man7.org or git-scm.com.
- [2026-11-14 19:41] `hook:no-prettier` ran Prettier in a repository that formats with oxfmt
- [2026-11-14 19:41] `tooling` Stryker fails with ERR_MODULE_NOT_FOUND vitest in a scratch git worktree whose node_modules is a symlink, so a mutation probe had to run in the shared tree.
- [2026-11-14 19:41] `tooling` The friction line blamed % for db-read failures while the reader truncated any statement ending in a literal, so the symptom named the wrong cause.
