# KAIZEN — friction log for this task

Append one line per friction event, as it happens, with:

    scripts/kaizen.sh "what went wrong, in one sentence"
    scripts/kaizen.sh --from <your-agent-label> "..."   # from a subagent

The problem only, never the fix. `/after-task-dantotsus` sweeps this file when
the work merges, classifies each line, and designs the eradication. Subagents
should append here too, naming themselves, so the sweep can tell one agent
struggling from four agents hitting the same wall.

This file is gitignored and is deleted once the kaizen pull request is open.

- [11:24] `hook:no-swallowed-push` piped git push or git commit into another command, throwing away its exit status
- [16:37] `hook:no-swallowed-push` piped git push or git commit into another command, throwing away its exit status
- [17:20] `hook:no-swallowed-push` piped git push or git commit into another command, throwing away its exit status
- [17:24] `main` kaizen.sh's usage line listed show and not archive, so the archive step CLAUDE.md requires looked like a command that did not exist
