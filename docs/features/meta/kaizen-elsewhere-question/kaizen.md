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

Session: 4dccd480-4bbd-5405-848c-ed560b08283e

- [2026-11-16 17:59] `main` I read the operator's 'does that reveal a design flaw elsewhere' as 'is the same rock copied elsewhere' and shipped a search-for-copies column; he meant 'is this friction a symptom of a problem in another place'
