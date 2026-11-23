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

Session: ccccdae2-20de-528e-99e3-e1c000e1285b

- [2026-11-23 19:23] `transcript-389` scripts/kaizen/operator-messages.ts fails with a JSON SyntaxError on spilled list_events files, because the saved result now starts with an <other-session> untrusted-data envelope line before the JSON.
- [2026-11-23 19:24] `transcript-389` scripts/kaizen/operator-messages.core.ts reports Skill-tool bodies (user events starting 'Base directory for this skill:') as operator messages.
- [2026-11-23 19:25] `transcript-389` scripts/kaizen/operator-messages.core.ts reports compaction summaries ('This session is being continued from a previous conversation') as operator messages.
- [2026-11-23 19:26] `hook:no-swallowed-push` sent git push or git commit errors to /dev/null
- [2026-11-23 19:31] `main` The screens-shown stop hook blocked a turn that wrote 'side by side' to describe the art-picking procedure, not a screen comparison.
- [2026-11-23 19:33] `transcript-389` scripts/kaizen/operator-messages.core.ts reports isSynthetic subagent '[Image: original WxH...]' notes as operator messages; it should drop events with isSynthetic or agent_id.
