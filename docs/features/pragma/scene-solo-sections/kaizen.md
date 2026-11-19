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

Session: 6064bf61-7727-5eb2-af38-4dfb7c945360

- [2026-11-19 08:45] `technical-validator` mutate-changed.sh apps/pragma picked up another agent's untracked scene-swipe.core.ts from the shared working tree and failed on its survivor, so the run's exit code did not grade this branch alone
- [2026-11-19 09:01] `technical-validator-r2` scripts/mutate-changed.sh prints dozens of failing-test lines marked covered 0 for files outside the changed set, burying the per-file mutation table at the end of a passing run.
- [2026-11-19 09:06] `hook:visual-validation` opened a pull request changing a front end without a visual-validation report
- [2026-11-19 09:12] `visual-validator` Pragma persists its query cache in localStorage, so a chart written through the API during validation showed stale content in Scene Mode until the pragma.query-cache key was removed by hand.
- [2026-11-19 13:50] `main` Mockups wrote member and instrument as words (Gui garde la batterie) where pragma shows a member mark and an instrument glyph; operator says it happens too often
- [2026-11-19 14:06] `visual-validator-transitions` A transition note written straight through the API never reached Scene Mode after a reload, because the persisted pragma.query-cache in localStorage served the old note without refetching, so test data changes need that key cleared.
- [2026-11-19 14:06] `technical-validator-transitions` A console.log inside a probe Vitest file under the pragma core project printed nothing to the run output, so a probe had to fail an assertion to show its values.
- [2026-11-19 14:11] `visual-validator-transitions` scripts/phone.sh drag only goes element to element, so testing a swipe threshold in px (64 px, 1.5 ratio) meant writing a CDP swipe script in the scratchpad again, as the 0906 run had already done.
- [2026-11-19 14:11] `visual-validator-transitions` A swipe script that sets the phone metrics on its own CDP connection drops them on close, which reset the chart scroll, so a swipe meant to start inside a tab block landed elsewhere until the scroll was redone inside the same connection.
- [2026-11-19 14:26] `visual-validator-r2` A custom CDP swipe script left the phone session at 1200 px wide when it closed its connection, so a later eval measured the tab block at the wrong width until set viewport 375 812 ran again.
