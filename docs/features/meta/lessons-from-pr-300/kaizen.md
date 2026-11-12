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

Session: 2ad21149-51d3-5fff-98e8-0e9474b187e4
- [2026-11-12 00:17] `kaizen-300` vitest --changed and mutate-changed.sh both diff from the merge base, so a synthetic merge commit cannot stand in as a base and a base below a merge of main cannot be narrowed by choosing another ref.
- [2026-11-12 00:17] `kaizen-300` The sweep prompt says round 1 failed on spec claims without tests in both features, and the four reports hold one non-blocking D row and no blocking finding.
- [2026-11-12 00:17] `kaizen-300` get_session reads a final context of 158,701 tokens after a compaction where the same session read 760,192 for the PR 292 row, so the feature-cost cell no longer measures the size of the last calls.
