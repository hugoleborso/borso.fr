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

Session: 41564db4-cbd8-5a02-8d6c-f354ecfe7000

- [2026-11-04 00:42] `main` Operator had to ask for screenshots: I reported a visible UI change (vote rows, banner, badge) as done without showing it, although the operator always asks for them.
- [2026-11-04 00:42] `main` Operator corrections are not logged as kaizen: a request the operator repeats across sessions (screenshots) never reached a kaizen file, so no hook or skill ever encoded it.
