# KAIZEN — friction log for this task

Append one line per friction event, as it happens, with:

    scripts/kaizen.sh "what went wrong, in one sentence"
    scripts/kaizen.sh --from <your-agent-label> "..."   # from a subagent

The problem only, never the fix. `/after-task-kaizen` sweeps this file when
the work merges, classifies each line, and designs the eradication. Subagents
should append here too, naming themselves, so the sweep can tell one agent
struggling from four agents hitting the same wall.

This file is gitignored and is deleted once the kaizen pull request is open.
- [2026-10-29 13:23] `hook:no-discarding-reset` ran a discarding git command on a checkout the hook could not read
- [2026-10-29 13:23] `kaizen-216` pretool-no-discarding-reset printed 'the hook itself failed while reading the checkout' for a plain git checkout -- README.md on a dirty tree, so its real message never shows
- [2026-10-29 13:41] `hook:no-swallowed-push` piped git push or git commit into another command, throwing away its exit status
- [2026-10-29 13:44] `kaizen-216` after-task-kaizen asks for a one-line entry in docs/dantotsus/README.md, which has no index, and to link the inventory from a Notable section its own template does not have
