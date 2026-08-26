# KAIZEN — friction log for this task

Append one line per friction event, as it happens, with:

    scripts/kaizen.sh "what went wrong, in one sentence"
    scripts/kaizen.sh --from <your-agent-label> "..."   # from a subagent

The problem only, never the fix. `/after-task-dantotsus` sweeps this file when
the work merges, classifies each line, and designs the eradication. Subagents
should append here too, naming themselves, so the sweep can tell one agent
struggling from four agents hitting the same wall.

This file is gitignored and is deleted once the kaizen pull request is open.

- [20:40] `implement-02` a fresh worktree has no node_modules and scripts/reports.sh blueprints exits 0 while printing 'Command tsx not found', so the index silently never gets written
- [20:59] `implement-02` pre-commit fails on a stale blueprint index that is gitignored, so every commit adding a blueprint costs one rejected commit plus a manual regenerate before it can land
