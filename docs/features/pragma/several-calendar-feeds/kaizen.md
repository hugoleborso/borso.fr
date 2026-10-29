# KAIZEN — friction log for this task

Append one line per friction event, as it happens, with:

    scripts/kaizen.sh "what went wrong, in one sentence"
    scripts/kaizen.sh --from <your-agent-label> "..."   # from a subagent

The problem only, never the fix. `/after-task-kaizen` sweeps this file when
the work merges, classifies each line, and designs the eradication. Subagents
should append here too, naming themselves, so the sweep can tell one agent
struggling from four agents hitting the same wall.

This file is gitignored and is deleted once the kaizen pull request is open.

- [2026-10-29 14:28] `hook:no-swallowed-push` piped git push or git commit into another command, throwing away its exit status
- [2026-10-29 14:31] `hook:no-swallowed-push` piped git push or git commit into another command, throwing away its exit status
- [2026-10-29 14:35] `technical-validator` The pragma core run under --changed exited 1 once from an unhandled 'window is not defined' in SetlistSongPicker.test.tsx (a debounce timer firing after teardown), a file outside the diff, and passed on rerun.
- [2026-10-29 14:42] `technical-validator` HEAD moved from 1f8c003e to e0513542 (a .gitignore-only chore commit) while the round-1 review was running, so the Reviewed SHA and the branch tip disagree.
- [2026-10-29 14:58] `technical-validator-2` Proving a site regression (inline ref cleanup cancelling a debounce) needed a hand-built jsdom probe in the scratchpad, because the validator may not add a test file inside the repo and vitest only collects files under apps/.
- [2026-10-29 15:07] `visual-validator` On pnpm dev the preview seed attaches zero calendar feeds (summary calendarFeeds: 0) because its fixture addresses are http://localhost, which the feed-address rule refuses, so a validator starts with no named calendars to look at.
- [2026-10-29 15:16] `visual-validator` The calendar feed reader refuses every non-public host, so on pnpm dev no fixture feed can ever be read and a validator needs third-party public ICS feeds plus direct dev-database writes to exercise busy time and named failing calendars.
- [2026-10-29 15:22] `hook:no-broad-kill` reached for pkill or killall on a machine other agents share
