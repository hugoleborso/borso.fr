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

Session: f47ead30-d793-5e2c-8005-198eb451cfc5

- [2026-11-14 20:44] `phone-drag` scripts/phone.sh touch run twice on one page reports every event twice, because each run leaves its document listeners behind and they still call the binding
- [2026-11-14 20:47] `main` The knowledge hook printed the Dashboard artifact entry after scripts/kaizen.sh sweep-input, whose output only quoted friction lines that mention a dashboard
- [2026-11-14 20:50] `phone-drag` a touch drag on react-chessboard dispatches touchend to the piece node React already removed on drop, so a document listener never hears it and a probe must also listen on the dragged element
- [2026-11-14 20:51] `phone-drag` setsid run in the background forks, so $! is not the process group of the server it starts and a stop by that PID misses it
