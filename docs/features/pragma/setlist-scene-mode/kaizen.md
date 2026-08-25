# KAIZEN — friction log for this task

Append one line per friction event, as it happens, with:

    scripts/kaizen.sh "what went wrong, in one sentence"
    scripts/kaizen.sh --from <your-agent-label> "..."   # from a subagent

The problem only, never the fix. `/after-task-dantotsus` sweeps this file when
the work merges, classifies each line, and designs the eradication. Subagents
should append here too, naming themselves, so the sweep can tell one agent
struggling from four agents hitting the same wall.

This file is gitignored and is deleted once the kaizen pull request is open.

- [17:18] `main` a front-end .adapter.ts holding module-level mutable state is rejected by unicorn/no-top-level-assignment-in-function, whose allowlist covers api adapters and site *.store.ts only; the fix (a factory closure) is not discoverable from the message
- [17:18] `main` the local dev database kept an admin_credentials row from an earlier seed, so the seeded password did not work and the login said only Wrong password; recovering it meant deleting the app_config row by hand
- [17:18] `main` the preview seed fixture shipped chart: null for every song, so Mode Scene had nothing to render on any preview deploy and no screenshot of it was possible without hand-writing charts first
- [17:18] `main` argent gesture-swipe answers with its own help text on Chromium instead of an error naming gesture-scroll, so a failed swipe reads as a wrong flag rather than a wrong tool
