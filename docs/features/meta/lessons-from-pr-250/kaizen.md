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

Session: e3e87c86-49f6-5f7e-9deb-798589e8e7b4

- [2026-11-03 18:51] `main` auto mode refused writing set -o pipefail into the session env file as unauthorized persistence, so the env-file route could not be proven live
- [2026-11-03 18:51] `main` auto mode refused the live probe of a hook-rewritten git commit as self-modification, so updatedInput could only be proven offline
