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

Session: a474fadf-91ea-5d41-ba73-85b7711f48af

- [2026-11-04 00:48] `main` list_events on the swept session returned 245k characters nested under ccr.data, and the first parse of the saved file printed nothing.
- [2026-11-04 00:48] `main` The merge hook printed unknown for every hosted merge since PR #245 because gh pr view asks GraphQL, which the proxy refuses.
