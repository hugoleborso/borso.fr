# KAIZEN — friction log for this task

Append one line per friction event, as it happens, with:

    scripts/kaizen.sh "what went wrong, in one sentence"
    scripts/kaizen.sh --from <your-agent-label> "..."   # from a subagent

The problem only, never the fix. `/after-task-kaizen` sweeps this file when
the work merges, classifies each line, and designs the eradication. Subagents
should append here too, naming themselves, so the sweep can tell one agent
struggling from four agents hitting the same wall.

This file is gitignored and is deleted once the kaizen pull request is open.

- [14:31] `runtime-budgets` check-claude-harness-active refused a session whose .claude hooks visibly run, because the main checkout's SessionStart predates the --record line and the worktree shares its git dir
- [15:28] `runtime-budgets` pre-push timings swung from 55 s to 323 s on the same fixture because other sessions drove the shared machine to load 11, and the pragma tests timed out under it
