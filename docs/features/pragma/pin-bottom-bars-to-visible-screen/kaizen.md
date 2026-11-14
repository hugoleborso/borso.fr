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

Session: d8a67332-e90c-5ea3-846c-0c841446e911

- [2026-11-14 14:38] `hook:no-broad-kill` reached for pkill or killall on a machine other agents share
- [2026-11-14 14:38] `main` No iOS WebKit in the sandbox, so an iPhone keyboard and fixed-position bug cannot be reproduced before the preview.
