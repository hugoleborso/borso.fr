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

Session: 135e264f-3876-5881-aba6-4ddc0a21fa61

- [2026-11-14 21:00] `main` The auto-mode classifier refused the IAM writes for the borsouvertures reader grant although the session runs as Borso-Admin and the operator asked for backlog tasks
- [2026-11-14 21:00] `main` Preview hosts answer 403 at the session proxy, so the #310 row's curl check cannot run from a cloud session
