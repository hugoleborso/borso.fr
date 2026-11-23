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

Session: 6860bc60-c041-5253-a0f2-bac223a89dc2
- [2026-11-23 13:07] `main` Mockups redrew the rest of the pragma home from memory (copy, cards, nav) instead of drawing the change over a capture of the real screen.
- [2026-11-23 13:23] `impl` The naming lint rejected a test helper twice (list… then find…) before get… passed; the verb table in docs/standards/01-naming.md is not shown in the first error.
- [2026-11-23 13:42] `technical-validator` The branch head moved by a commit while round 1 was running, so the review had to pin the recorded SHA and check the new commit separately.
- [2026-11-23 13:47] `main` The persisted query cache buster was not bumped for a new response field although a knowledge entry names the rule; nothing ties the buster to the response types.
- [2026-11-23 13:49] `visual-validator` agent-browser network route never reached pragma's /api/streaks because the site batches GETs through POST /api/read-batch, so mocking a read needs a fetch-wrapping init script.
- [2026-11-23 13:49] `visual-validator` Pragma's persisted query cache (pragma.query-cache in localStorage) restores old streak data across reloads, so a mocked payload shows only after clearing that key.
