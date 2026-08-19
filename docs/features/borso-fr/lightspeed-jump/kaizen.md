# KAIZEN — friction log for this task

Append one line per friction event, as it happens, with:

    scripts/kaizen.sh "what went wrong, in one sentence"
    scripts/kaizen.sh --from <your-agent-label> "..."   # from a subagent

The problem only, never the fix. `/after-task-dantotsus` sweeps this file when
the work merges, classifies each line, and designs the eradication. Subagents
should append here too, naming themselves, so the sweep can tell one agent
struggling from four agents hitting the same wall.

This file is gitignored and is deleted once the kaizen pull request is open.

- [18:13] `standards-reviewer` seal.ts record takes one --note for the whole call, so a per-file seal note needs one process per file, while the agent spec asks for a single call naming them all
- [18:25] `main` a conflicted pull request silently stops every workflow run: GitHub cannot build the merge ref, so pushes, closes and reopens all create no run, and nothing anywhere says why — the only signal is mergeable_state: dirty on the API
- [18:25] `main` merging main into a long-lived branch makes pre-push re-gate all of main: the range is remote..HEAD, so 46 commits became 491 changed files, four apps of tests and 78 gated files of mutation, and the push timed out twice before I understood it was working
- [18:25] `main` an agent definition added by main (.claude/agents/standards-reviewer.md) is not dispatchable in a session that started before it, because the agent registry is read at session start; the skill that needs it fails with agent type not found
