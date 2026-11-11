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

Session: d4b94070-98b8-5170-ae92-3efe97db76a9
- [2026-11-11 19:14] `hook:pre-push-conflict` pre-push refused a branch that conflicts with origin/main
- [2026-11-11 19:14] `hook:pre-push-conflict` pre-push refused a branch that conflicts with origin/main
- [2026-11-11 19:57] `hook:merge-on-moved-base` tried to merge a pull request beside base commits no CI run tested with it
- [2026-11-11 20:05] `hook:merge-strands-no-work` merged with uncommitted or stashed work in the container
- [2026-11-11 20:05] `hook:no-discarding-reset` ran a git command that would discard uncommitted work
- [2026-11-11 20:06] `hook:merge-strands-no-work` merged with uncommitted or stashed work in the container
- [2026-11-11 20:06] `main` merge-strands-no-work refuses a merge over a stash and offers only a push to a -wip branch, which a session pinned to one designated branch may not do; a patch file in the scratchpad was the only way through
